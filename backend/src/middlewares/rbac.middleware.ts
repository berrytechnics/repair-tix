import { NextFunction, Request, Response, RequestHandler } from "express";
import { ForbiddenError } from "../config/errors.js";
import { UserRole } from "../config/types.js";
import { UserWithoutPassword } from "../services/user.service.js";

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



