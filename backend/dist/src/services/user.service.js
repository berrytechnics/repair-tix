import bcrypt from "bcryptjs";
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
function toUserWithoutPassword(user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}
export class UserService {
    async findById(id) {
        const user = await db
            .selectFrom("users")
            .select([
            "id",
            "company_id",
            "current_location_id",
            "first_name",
            "last_name",
            "email",
            "role",
            "active",
            "created_at",
            "updated_at",
            "deleted_at",
        ])
            .where("id", "=", id)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return user ? toUserWithoutPassword(user) : null;
    }
    async findByEmail(email) {
        const user = await db
            .selectFrom("users")
            .select([
            "id",
            "company_id",
            "current_location_id",
            "first_name",
            "last_name",
            "email",
            "role",
            "active",
            "created_at",
            "updated_at",
            "deleted_at",
        ])
            .where("email", "=", email)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return user ? toUserWithoutPassword(user) : null;
    }
    async create(data) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await db
            .insertInto("users")
            .values({
            id: uuidv4(),
            company_id: data.companyId,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            password: hashedPassword,
            role: data.role || "technician",
            active: data.active ?? true,
            created_at: sql `now()`,
            updated_at: sql `now()`,
            deleted_at: null,
        })
            .returning([
            "id",
            "company_id",
            "current_location_id",
            "first_name",
            "last_name",
            "email",
            "role",
            "active",
            "created_at",
            "updated_at",
            "deleted_at",
        ])
            .executeTakeFirstOrThrow();
        return toUserWithoutPassword(user);
    }
    async update(id, data) {
        let updateQuery = db
            .updateTable("users")
            .set({
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("deleted_at", "is", null);
        if (data.firstName !== undefined) {
            updateQuery = updateQuery.set({ first_name: data.firstName });
        }
        if (data.lastName !== undefined) {
            updateQuery = updateQuery.set({ last_name: data.lastName });
        }
        if (data.email !== undefined) {
            updateQuery = updateQuery.set({ email: data.email });
        }
        if (data.role !== undefined) {
            updateQuery = updateQuery.set({ role: data.role });
        }
        if (data.active !== undefined) {
            updateQuery = updateQuery.set({ active: data.active });
        }
        if (data.password !== undefined) {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            updateQuery = updateQuery.set({ password: hashedPassword });
        }
        const updated = await updateQuery
            .returning([
            "id",
            "company_id",
            "current_location_id",
            "first_name",
            "last_name",
            "email",
            "role",
            "active",
            "created_at",
            "updated_at",
            "deleted_at",
        ])
            .executeTakeFirst();
        return updated ? toUserWithoutPassword(updated) : null;
    }
    async delete(id) {
        const result = await db
            .updateTable("users")
            .set({
            deleted_at: sql `now()`,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return !!result;
    }
    async authenticate(email, password) {
        const user = await db
            .selectFrom("users")
            .selectAll()
            .where("email", "=", email)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!user)
            return null;
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid)
            return null;
        return toUserWithoutPassword(user);
    }
    async findTechnicians(companyId) {
        const users = await db
            .selectFrom("users")
            .select([
            "id",
            "company_id",
            "current_location_id",
            "first_name",
            "last_name",
            "email",
            "role",
            "active",
            "created_at",
            "updated_at",
            "deleted_at",
        ])
            .where("company_id", "=", companyId)
            .where("role", "=", "technician")
            .where("deleted_at", "is", null)
            .where("active", "=", true)
            .execute();
        return users.map(toUserWithoutPassword);
    }
    async assignLocation(userId, locationId, companyId) {
        const user = await this.findById(userId);
        if (!user || user.company_id !== companyId) {
            return false;
        }
        const location = await db
            .selectFrom("locations")
            .select("id")
            .where("id", "=", locationId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!location) {
            return false;
        }
        await db
            .insertInto("user_locations")
            .values({
            user_id: userId,
            location_id: locationId,
            created_at: sql `now()`,
        })
            .onConflict((oc) => oc.doNothing())
            .execute();
        return true;
    }
    async removeLocation(userId, locationId, companyId) {
        const user = await this.findById(userId);
        if (!user || user.company_id !== companyId) {
            return false;
        }
        const location = await db
            .selectFrom("locations")
            .select("id")
            .where("id", "=", locationId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!location) {
            return false;
        }
        const result = await db
            .deleteFrom("user_locations")
            .where("user_id", "=", userId)
            .where("location_id", "=", locationId)
            .executeTakeFirst();
        if (user.current_location_id === locationId) {
            await db
                .updateTable("users")
                .set({ current_location_id: null, updated_at: sql `now()` })
                .where("id", "=", userId)
                .execute();
        }
        return !!result;
    }
    async getUserLocations(userId, companyId) {
        const user = await this.findById(userId);
        if (!user || user.company_id !== companyId) {
            return [];
        }
        const locations = await db
            .selectFrom("user_locations")
            .innerJoin("locations", "user_locations.location_id", "locations.id")
            .select(["locations.id", "locations.name"])
            .where("user_locations.user_id", "=", userId)
            .where("locations.company_id", "=", companyId)
            .where("locations.deleted_at", "is", null)
            .orderBy("locations.name", "asc")
            .execute();
        return locations.map((loc) => ({
            id: loc.id,
            name: loc.name,
        }));
    }
    async getLocationUsers(locationId, companyId) {
        const location = await db
            .selectFrom("locations")
            .select("id")
            .where("id", "=", locationId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!location) {
            return [];
        }
        const users = await db
            .selectFrom("user_locations")
            .innerJoin("users", "user_locations.user_id", "users.id")
            .select([
            "users.id",
            "users.first_name",
            "users.last_name",
            "users.email",
        ])
            .where("user_locations.location_id", "=", locationId)
            .where("users.company_id", "=", companyId)
            .where("users.deleted_at", "is", null)
            .orderBy("users.last_name", "asc")
            .orderBy("users.first_name", "asc")
            .execute();
        return users.map((user) => ({
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
        }));
    }
    async setCurrentLocation(userId, locationId, companyId) {
        const user = await this.findById(userId);
        if (!user || user.company_id !== companyId) {
            return false;
        }
        if (locationId) {
            if (user.role === "admin") {
                const location = await db
                    .selectFrom("locations")
                    .select("id")
                    .where("id", "=", locationId)
                    .where("company_id", "=", companyId)
                    .where("deleted_at", "is", null)
                    .executeTakeFirst();
                if (!location) {
                    return false;
                }
            }
            else {
                const assignment = await db
                    .selectFrom("user_locations")
                    .select("user_id")
                    .where("user_id", "=", userId)
                    .where("location_id", "=", locationId)
                    .executeTakeFirst();
                if (!assignment) {
                    return false;
                }
            }
        }
        await db
            .updateTable("users")
            .set({
            current_location_id: locationId,
            updated_at: sql `now()`,
        })
            .where("id", "=", userId)
            .execute();
        return true;
    }
    async getCurrentLocation(userId, companyId) {
        const user = await this.findById(userId);
        if (!user || user.company_id !== companyId) {
            return null;
        }
        const currentLocationId = user.current_location_id;
        if (!currentLocationId) {
            return null;
        }
        const location = await db
            .selectFrom("locations")
            .select(["id", "name"])
            .where("id", "=", currentLocationId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!location) {
            return null;
        }
        return {
            id: location.id,
            name: location.name,
        };
    }
}
export default new UserService();
//# sourceMappingURL=user.service.js.map