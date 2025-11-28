import { generateNewJWTToken } from "../../utils/auth.js";
import { createTestUser, getUserById, createTestLocation, assignUserToLocation } from "./seed.helper.js";
import userService from "../../services/user.service.js";
export async function createAuthenticatedUser(companyId, role = "technician", overrides) {
    const userId = await createTestUser(companyId, {
        firstName: overrides?.firstName,
        lastName: overrides?.lastName,
        email: overrides?.email,
        password: overrides?.password,
        role,
        currentLocationId: overrides?.locationId || null,
    });
    if (overrides?.locationId) {
        await assignUserToLocation(userId, overrides.locationId);
        await userService.setCurrentLocation(userId, overrides.locationId, companyId);
    }
    const userRecord = await getUserById(userId);
    if (!userRecord) {
        throw new Error("Failed to create test user");
    }
    const user = {
        id: userRecord.id,
        company_id: userRecord.company_id,
        current_location_id: userRecord.current_location_id,
        firstName: userRecord.first_name,
        lastName: userRecord.last_name,
        email: userRecord.email,
        role: userRecord.role,
        active: userRecord.active,
        createdAt: userRecord.created_at,
        updatedAt: userRecord.updated_at,
        deletedAt: userRecord.deleted_at,
    };
    const token = generateNewJWTToken(user);
    return {
        userId,
        user,
        token,
    };
}
export function getAuthHeader(token) {
    return {
        Authorization: `Bearer ${token}`,
    };
}
export async function createTestUsersWithRoles(companyId) {
    const defaultLocationId = await createTestLocation(companyId, {
        name: "Default Test Location",
    });
    const admin = await createAuthenticatedUser(companyId, "admin", {
        email: "admin@test.com",
        firstName: "Admin",
        lastName: "User",
    });
    const frontdesk = await createAuthenticatedUser(companyId, "frontdesk", {
        email: "frontdesk@test.com",
        firstName: "Frontdesk",
        lastName: "User",
    });
    const technician = await createAuthenticatedUser(companyId, "technician", {
        email: "technician@test.com",
        firstName: "Technician",
        lastName: "User",
    });
    await assignUserToLocation(admin.userId, defaultLocationId);
    await assignUserToLocation(frontdesk.userId, defaultLocationId);
    await assignUserToLocation(technician.userId, defaultLocationId);
    await userService.setCurrentLocation(admin.userId, defaultLocationId, companyId);
    await userService.setCurrentLocation(frontdesk.userId, defaultLocationId, companyId);
    await userService.setCurrentLocation(technician.userId, defaultLocationId, companyId);
    const adminUser = await getUserById(admin.userId);
    const frontdeskUser = await getUserById(frontdesk.userId);
    const technicianUser = await getUserById(technician.userId);
    if (!adminUser || !frontdeskUser || !technicianUser) {
        throw new Error("Failed to refresh test users");
    }
    const adminUpdated = {
        id: adminUser.id,
        company_id: adminUser.company_id,
        current_location_id: adminUser.current_location_id,
        firstName: adminUser.first_name,
        lastName: adminUser.last_name,
        email: adminUser.email,
        role: adminUser.role,
        active: adminUser.active,
        createdAt: adminUser.created_at,
        updatedAt: adminUser.updated_at,
        deletedAt: adminUser.deleted_at,
    };
    const frontdeskUpdated = {
        id: frontdeskUser.id,
        company_id: frontdeskUser.company_id,
        current_location_id: frontdeskUser.current_location_id,
        firstName: frontdeskUser.first_name,
        lastName: frontdeskUser.last_name,
        email: frontdeskUser.email,
        role: frontdeskUser.role,
        active: frontdeskUser.active,
        createdAt: frontdeskUser.created_at,
        updatedAt: frontdeskUser.updated_at,
        deletedAt: frontdeskUser.deleted_at,
    };
    const technicianUpdated = {
        id: technicianUser.id,
        company_id: technicianUser.company_id,
        current_location_id: technicianUser.current_location_id,
        firstName: technicianUser.first_name,
        lastName: technicianUser.last_name,
        email: technicianUser.email,
        role: technicianUser.role,
        active: technicianUser.active,
        createdAt: technicianUser.created_at,
        updatedAt: technicianUser.updated_at,
        deletedAt: technicianUser.deleted_at,
    };
    return {
        admin: {
            userId: admin.userId,
            user: adminUpdated,
            token: generateNewJWTToken(adminUpdated),
        },
        frontdesk: {
            userId: frontdesk.userId,
            user: frontdeskUpdated,
            token: generateNewJWTToken(frontdeskUpdated),
        },
        technician: {
            userId: technician.userId,
            user: technicianUpdated,
            token: generateNewJWTToken(technicianUpdated),
        },
        locationId: defaultLocationId,
    };
}
//# sourceMappingURL=auth.helper.js.map