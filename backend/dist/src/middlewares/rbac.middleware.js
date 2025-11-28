import { ForbiddenError } from "../config/errors.js";
export function requireRole(roles) {
    return (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                return next(new ForbiddenError("Authentication required"));
            }
            const allowedRoles = Array.isArray(roles) ? roles : [roles];
            if (!allowedRoles.includes(user.role)) {
                return next(new ForbiddenError(`Access denied. Required role: ${allowedRoles.join(" or ")}`));
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
export function requireAdmin() {
    return requireRole("admin");
}
export function requireManagerOrAdmin() {
    return requireRole(["admin", "manager"]);
}
export function requireTechnicianOrAbove() {
    return requireRole(["admin", "manager", "technician"]);
}
//# sourceMappingURL=rbac.middleware.js.map