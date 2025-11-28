import { ForbiddenError } from "../config/errors.js";
export function requireTenantContext(req, res, next) {
    try {
        const user = req.user;
        if (!user || !user.company_id) {
            return next(new ForbiddenError("User must belong to a company"));
        }
        req.companyId = user.company_id;
        next();
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=tenant.middleware.js.map