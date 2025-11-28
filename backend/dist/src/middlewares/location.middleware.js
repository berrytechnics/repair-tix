import { ForbiddenError } from "../config/errors.js";
import { db } from "../config/connection.js";
export async function userHasLocationAccess(userId, locationId, companyId, userRole) {
    if (userRole === "admin") {
        const location = await db
            .selectFrom("locations")
            .select("id")
            .where("id", "=", locationId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return !!location;
    }
    const assignment = await db
        .selectFrom("user_locations")
        .innerJoin("locations", "user_locations.location_id", "locations.id")
        .select("user_locations.user_id")
        .where("user_locations.user_id", "=", userId)
        .where("user_locations.location_id", "=", locationId)
        .where("locations.company_id", "=", companyId)
        .where("locations.deleted_at", "is", null)
        .executeTakeFirst();
    return !!assignment;
}
export async function requireLocationContext(req, res, next) {
    try {
        const user = req.user;
        const companyId = req.companyId;
        if (!user || !companyId) {
            return next(new ForbiddenError("User and company context required"));
        }
        const currentLocationId = user.current_location_id;
        if (!currentLocationId) {
            return next(new ForbiddenError("User must have a current location set"));
        }
        const hasAccess = await userHasLocationAccess(user.id, currentLocationId, companyId, user.role);
        if (!hasAccess) {
            return next(new ForbiddenError("User does not have access to this location"));
        }
        req.locationId = currentLocationId;
        next();
    }
    catch (error) {
        next(error);
    }
}
export async function optionalLocationContext(req, res, next) {
    try {
        const user = req.user;
        const companyId = req.companyId;
        if (!user || !companyId) {
            return next(new ForbiddenError("User and company context required"));
        }
        const currentLocationId = user.current_location_id;
        if (currentLocationId) {
            const hasAccess = await userHasLocationAccess(user.id, currentLocationId, companyId, user.role);
            if (!hasAccess) {
                return next(new ForbiddenError("User does not have access to this location"));
            }
            req.locationId = currentLocationId;
        }
        next();
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=location.middleware.js.map