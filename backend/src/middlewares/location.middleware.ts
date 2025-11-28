import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../config/errors";
import { UserWithoutPassword } from "../services/user.service";
import { db } from "../config/connection";

/**
 * Helper function to check if user has access to a location
 * Admins have access to all company locations
 * Other users must be explicitly assigned to the location
 */
export async function userHasLocationAccess(
  userId: string,
  locationId: string,
  companyId: string,
  userRole: string
): Promise<boolean> {
  // Admins can access all company locations
  if (userRole === "admin") {
    // Verify location belongs to company
    const location = await db
      .selectFrom("locations")
      .select("id")
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    
    return !!location;
  }

  // Other users must be assigned to the location
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

/**
 * Middleware to extract and validate location context
 * Ensures user has access to their current location
 * Must be used after validateRequest and requireTenantContext middleware
 */
export async function requireLocationContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as UserWithoutPassword | undefined;
    const companyId = req.companyId;

    if (!user || !companyId) {
      return next(new ForbiddenError("User and company context required"));
    }

    const currentLocationId = user.current_location_id as unknown as string | undefined;

    if (!currentLocationId) {
      return next(new ForbiddenError("User must have a current location set"));
    }

    // Check if user has access to this location
    const hasAccess = await userHasLocationAccess(
      user.id,
      currentLocationId,
      companyId,
      user.role
    );

    if (!hasAccess) {
      return next(new ForbiddenError("User does not have access to this location"));
    }

    // Attach location_id to request for easy access in services
    req.locationId = currentLocationId;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional location context middleware
 * Same as requireLocationContext but allows null location
 * Useful for endpoints that work with or without location context
 */
export async function optionalLocationContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as UserWithoutPassword | undefined;
    const companyId = req.companyId;

    if (!user || !companyId) {
      return next(new ForbiddenError("User and company context required"));
    }

    const currentLocationId = user.current_location_id as unknown as string | undefined;

    if (currentLocationId) {
      // Check if user has access to this location
      const hasAccess = await userHasLocationAccess(
        user.id,
        currentLocationId,
        companyId,
        user.role
      );

      if (!hasAccess) {
        return next(new ForbiddenError("User does not have access to this location"));
      }

      // Attach location_id to request
      req.locationId = currentLocationId;
    }

    next();
  } catch (error) {
    next(error);
  }
}

