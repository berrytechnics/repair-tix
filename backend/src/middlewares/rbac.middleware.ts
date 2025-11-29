import { NextFunction, Request, Response, RequestHandler } from "express";
import { ForbiddenError } from "../config/errors.js";
import { UserRole } from "../config/types.js";
import { UserWithoutPassword } from "../services/user.service.js";
import { getPermissionsForRole } from "../config/permissions.js";

/**
 * Middleware factory that checks if user has one of the specified roles
 * Must be used after validateRequest and requireTenantContext middleware
 */
export function requireRole(roles: UserRole | UserRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as UserWithoutPassword | undefined;
      
      if (!user) {
        return next(new ForbiddenError("Authentication required"));
      }
      
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(user.role)) {
        return next(new ForbiddenError(
          `Access denied. Required role: ${allowedRoles.join(" or ")}`
        ));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Convenience middleware for admin-only routes
 */
export function requireAdmin(): RequestHandler {
  return requireRole("admin");
}

/**
 * Convenience middleware for manager/admin routes
 */
export function requireManagerOrAdmin(): RequestHandler {
  return requireRole(["admin", "manager"]);
}

/**
 * Convenience middleware for technician, manager, or admin routes
 */
export function requireTechnicianOrAbove(): RequestHandler {
  return requireRole(["admin", "manager", "technician"]);
}

/**
 * Middleware factory that checks if user has a specific permission
 * Must be used after validateRequest and requireTenantContext middleware
 */
export function requirePermission(permission: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as UserWithoutPassword | undefined;
      const companyId = req.companyId;

      if (!user || !companyId) {
        return next(new ForbiddenError("Authentication and company context required"));
      }

      // Get permissions for user's role in their company
      const permissions = await getPermissionsForRole(user.role, companyId);

      if (!permissions.includes(permission)) {
        return next(new ForbiddenError(
          `Access denied. Required permission: ${permission}`
        ));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}



