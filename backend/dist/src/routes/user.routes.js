import express from "express";
import { BadRequestError, NotFoundError, UnauthorizedError, } from "../config/errors.js";
import { getPermissionsForRole, getPermissionsMatrix } from "../config/permissions.js";
import permissionService from "../services/permission.service.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import companyService from "../services/company.service.js";
import invitationService from "../services/invitation.service.js";
import locationService from "../services/location.service.js";
import userService from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateNewJWTToken } from "../utils/auth.js";
import { loginValidation, registerValidation } from "../validators/user.validator.js";
const router = express.Router();
function formatUserForResponse(user) {
    const userWithSnakeCase = user;
    return {
        id: userWithSnakeCase.id,
        currentLocationId: userWithSnakeCase.current_location_id || null,
        firstName: userWithSnakeCase.first_name,
        lastName: userWithSnakeCase.last_name,
        email: userWithSnakeCase.email,
        role: userWithSnakeCase.role,
    };
}
router.post("/login", validate(loginValidation), asyncHandler(async (req, res) => {
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
            refreshToken: token,
        },
    });
}));
router.post("/register", validate(registerValidation), asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, companyName, invitationToken, role } = req.body;
    let company;
    let userRole = role || "technician";
    if (invitationToken) {
        const validation = await invitationService.isTokenValid(invitationToken, email);
        if (!validation.valid || !validation.invitation) {
            throw new BadRequestError(validation.error || "Invalid invitation");
        }
        const invitation = validation.invitation;
        const companyResult = await companyService.findById(invitation.companyId);
        if (!companyResult) {
            throw new BadRequestError("Company not found for invitation");
        }
        company = companyResult;
        userRole = invitation.role;
        await invitationService.markAsUsed(invitationToken);
    }
    else if (companyName) {
        const subdomain = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const existingCompany = await companyService.findBySubdomain(subdomain);
        if (existingCompany) {
            throw new BadRequestError("Company with this name already exists. Please use an invitation to join.");
        }
        company = await companyService.create({
            name: companyName,
            subdomain: subdomain,
            plan: "free",
            status: "active",
        });
        userRole = "admin";
    }
    else {
        throw new BadRequestError("Either companyName or invitationToken is required");
    }
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
            refreshToken: token,
        },
    });
}));
router.get("/me", validateRequest, requireTenantContext, asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new UnauthorizedError("User not found");
    }
    const companyId = req.companyId;
    if (!companyId) {
        throw new UnauthorizedError("Company context required");
    }
    const formattedUser = formatUserForResponse(user);
    const permissions = await getPermissionsForRole(user.role, companyId);
    res.json({
        success: true,
        data: {
            ...formattedUser,
            permissions,
        },
    });
}));
router.get("/technicians", validateRequest, requireTenantContext, asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const technicians = await userService.findTechnicians(companyId);
    const formattedTechnicians = technicians.map(formatUserForResponse);
    res.json({
        success: true,
        data: formattedTechnicians,
    });
}));
router.get("/permissions/matrix", validateRequest, requireTenantContext, requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    if (!companyId) {
        throw new UnauthorizedError("Company context required");
    }
    const matrix = await getPermissionsMatrix(companyId);
    res.json({
        success: true,
        data: matrix,
    });
}));
router.put("/permissions/role/:role", validateRequest, requireTenantContext, requireAdmin(), asyncHandler(async (req, res) => {
    const { role } = req.params;
    const { permissions } = req.body;
    const companyId = req.companyId;
    if (!companyId) {
        throw new UnauthorizedError("Company context required");
    }
    const validRoles = ["admin", "manager", "technician", "frontdesk"];
    if (!validRoles.includes(role)) {
        throw new BadRequestError(`Invalid role: ${role}`);
    }
    if (!Array.isArray(permissions)) {
        throw new BadRequestError("Permissions must be an array");
    }
    if (!permissions.every((p) => typeof p === "string")) {
        throw new BadRequestError("All permissions must be strings");
    }
    await permissionService.updateRolePermissions(role, permissions, companyId);
    res.json({
        success: true,
        message: `Permissions updated for role: ${role}`,
    });
}));
router.post("/:id/locations", validateRequest, requireTenantContext, requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id: userId } = req.params;
    const { locationId } = req.body;
    if (!locationId) {
        throw new BadRequestError("locationId is required");
    }
    const assigned = await userService.assignLocation(userId, locationId, companyId);
    if (!assigned) {
        throw new NotFoundError("User or location not found, or user does not belong to company");
    }
    res.json({
        success: true,
        data: { message: "User assigned to location successfully" },
    });
}));
router.delete("/:id/locations/:locationId", validateRequest, requireTenantContext, requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id: userId, locationId } = req.params;
    const removed = await userService.removeLocation(userId, locationId, companyId);
    if (!removed) {
        throw new NotFoundError("User or location not found, or user does not belong to company");
    }
    res.json({
        success: true,
        data: { message: "User removed from location successfully" },
    });
}));
router.put("/me/location", validateRequest, requireTenantContext, asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const currentUser = req.user;
    if (!currentUser) {
        throw new UnauthorizedError("User not found");
    }
    const { locationId } = req.body;
    const updated = await userService.setCurrentLocation(currentUser.id, locationId || null, companyId);
    if (!updated) {
        throw new BadRequestError("Failed to set current location. Location may not exist or you may not have access to it.");
    }
    const updatedUser = await userService.findById(currentUser.id);
    if (!updatedUser) {
        throw new NotFoundError("User not found");
    }
    res.json({
        success: true,
        data: {
            currentLocationId: updatedUser.current_location_id,
            message: "Current location updated successfully",
        },
    });
}));
router.get("/me/locations", validateRequest, requireTenantContext, asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const currentUser = req.user;
    if (!currentUser) {
        throw new UnauthorizedError("User not found");
    }
    try {
        if (currentUser.role === "admin") {
            const allLocations = await locationService.findAll(companyId);
            res.json({
                success: true,
                data: allLocations.map((loc) => ({
                    id: loc.id,
                    name: loc.name
                })),
            });
        }
        else {
            const locations = await userService.getUserLocations(currentUser.id, companyId);
            res.json({
                success: true,
                data: locations,
            });
        }
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("does not exist")) {
            res.json({
                success: true,
                data: [],
            });
        }
        else {
            throw error;
        }
    }
}));
router.get("/:id/locations", validateRequest, requireTenantContext, asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id: userId } = req.params;
    const currentUser = req.user;
    if (!currentUser) {
        throw new UnauthorizedError("User not found");
    }
    if (currentUser.role !== "admin" && currentUser.id !== userId) {
        throw new UnauthorizedError("You can only view your own locations");
    }
    const locations = await userService.getUserLocations(userId, companyId);
    res.json({
        success: true,
        data: locations,
    });
}));
export default router;
//# sourceMappingURL=user.routes.js.map