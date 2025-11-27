import express, { Request, Response } from "express";
import {
  BadRequestError,
  UnauthorizedError,
} from "../config/errors";
import { getPermissionsForRole, getPermissionsMatrix } from "../config/permissions";
import { UserRole } from "../config/types";
import permissionService from "../services/permission.service";
import { validateRequest } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/rbac.middleware";
import { requireTenantContext } from "../middlewares/tenant.middleware";
import { validate } from "../middlewares/validation.middleware";
import companyService from "../services/company.service";
import invitationService from "../services/invitation.service";
import userService, { UserWithoutPassword } from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler";
import { generateNewJWTToken } from "../utils/auth";
import { loginValidation, registerValidation } from "../validators/user.validator";

const router = express.Router();

// Helper function to convert user from database format to API format
// UserWithoutPassword has snake_case fields at runtime (from database)
function formatUserForResponse(user: UserWithoutPassword) {
  // Type assertion needed because TypeScript types don't match runtime structure
  const userWithSnakeCase = user as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  
  return {
    id: userWithSnakeCase.id,
    firstName: userWithSnakeCase.first_name,
    lastName: userWithSnakeCase.last_name,
    email: userWithSnakeCase.email,
    role: userWithSnakeCase.role,
  };
}

router.post(
  "/login",
  validate(loginValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await userService.authenticate(email, password);
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }
    const token = generateNewJWTToken(user);
    const formattedUser = formatUserForResponse(user);
    
    res.json({
      success: true,
      data: {
        user: formattedUser,
        accessToken: token,
        refreshToken: token, // For now, using same token. Can be updated later for refresh token implementation
      },
    });
  })
);

router.post(
  "/register",
  validate(registerValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName, email, password, companyName, invitationToken, role } = req.body;
    
    let company;
    let userRole = role || "technician";
    
    // Path 1: Invitation-based registration (subsequent users)
    if (invitationToken) {
      // Validate invitation token
      const validation = await invitationService.isTokenValid(invitationToken, email);
      
      if (!validation.valid || !validation.invitation) {
        throw new BadRequestError(validation.error || "Invalid invitation");
      }
      
      const invitation = validation.invitation;
      
      // Get company from invitation
      const companyResult = await companyService.findById(invitation.companyId);
      if (!companyResult) {
        throw new BadRequestError("Company not found for invitation");
      }
      company = companyResult;
      
      // Use role from invitation
      userRole = invitation.role;
      
      // Mark invitation as used
      await invitationService.markAsUsed(invitationToken);
    }
    // Path 2: Company creation (first user)
    else if (companyName) {
      // Check if company already exists
      const subdomain = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const existingCompany = await companyService.findBySubdomain(subdomain);
      
      if (existingCompany) {
        throw new BadRequestError("Company with this name already exists. Please use an invitation to join.");
      }
      
      // Create new company
      company = await companyService.create({
        name: companyName,
        subdomain: subdomain,
        plan: "free",
        status: "active",
      });
      
      // First user automatically becomes admin
      userRole = "admin";
    } else {
      throw new BadRequestError("Either companyName or invitationToken is required");
    }
    
    // Create user with company_id
    const user = await userService.create({
      firstName,
      lastName,
      email,
      password,
      companyId: company.id,
      role: userRole,
    });
    
    if (!user) {
      throw new BadRequestError("Registration failed");
    }
    
    const token = generateNewJWTToken(user);
    const formattedUser = formatUserForResponse(user);
    
    res.status(201).json({
      success: true,
      data: {
        user: formattedUser,
        accessToken: token,
        refreshToken: token, // For now, using same token. Can be updated later for refresh token implementation
      },
    });
  })
);

router.get(
  "/me",
  validateRequest,
  requireTenantContext,
  asyncHandler(async (req: Request, res: Response) => {
    // User is attached to request by validateRequest middleware
    const user = req.user;
    if (!user) {
      throw new UnauthorizedError("User not found");
    }
    
    const companyId = req.companyId;
    if (!companyId) {
      throw new UnauthorizedError("Company context required");
    }
    
    const formattedUser = formatUserForResponse(user);
    
    // Get permissions for user's role in their company
    const permissions = await getPermissionsForRole(user.role, companyId);
    
    res.json({
      success: true,
      data: {
        ...formattedUser,
        permissions,
      },
    });
  })
);

router.get(
  "/technicians",
  validateRequest,
  requireTenantContext,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const technicians = await userService.findTechnicians(companyId);
    const formattedTechnicians = technicians.map(formatUserForResponse);
    
    res.json({
      success: true,
      data: formattedTechnicians,
    });
  })
);

// GET /api/users/permissions/matrix - Get full permissions matrix for current company (admin only)
router.get(
  "/permissions/matrix",
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId;
    if (!companyId) {
      throw new UnauthorizedError("Company context required");
    }
    
    const matrix = await getPermissionsMatrix(companyId);
    
    res.json({
      success: true,
      data: matrix,
    });
  })
);

// PUT /api/users/permissions/role/:role - Update permissions for a role in current company (admin only)
router.put(
  "/permissions/role/:role",
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.params;
    const { permissions } = req.body;
    const companyId = req.companyId;

    if (!companyId) {
      throw new UnauthorizedError("Company context required");
    }

    // Validate role
    const validRoles: UserRole[] = ["admin", "manager", "technician", "frontdesk"];
    if (!validRoles.includes(role as UserRole)) {
      throw new BadRequestError(`Invalid role: ${role}`);
    }

    // Validate permissions is an array
    if (!Array.isArray(permissions)) {
      throw new BadRequestError("Permissions must be an array");
    }

    // Validate all permissions are strings
    if (!permissions.every((p) => typeof p === "string")) {
      throw new BadRequestError("All permissions must be strings");
    }

    // Update permissions for this company
    await permissionService.updateRolePermissions(role as UserRole, permissions, companyId);

    res.json({
      success: true,
      message: `Permissions updated for role: ${role}`,
    });
  })
);

export default router;
