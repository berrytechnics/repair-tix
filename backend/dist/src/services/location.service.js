import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
function toLocation(location) {
    return {
        id: location.id,
        company_id: location.company_id,
        name: location.name,
        address: location.address,
        phone: location.phone,
        email: location.email,
        is_active: location.is_active,
        createdAt: location.created_at,
        updatedAt: location.updated_at,
    };
}
export class LocationService {
    async findAll(companyId) {
        const locations = await db
            .selectFrom("locations")
            .selectAll()
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .orderBy("name", "asc")
            .execute();
        return locations.map(toLocation);
    }
    async findById(id, companyId) {
        const location = await db
            .selectFrom("locations")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!location) {
            return null;
        }
        return toLocation(location);
    }
    async create(companyId, data) {
        const location = await db
            .insertInto("locations")
            .values({
            id: uuidv4(),
            company_id: companyId,
            name: data.name,
            address: data.address || null,
            phone: data.phone || null,
            email: data.email || null,
            is_active: data.isActive !== undefined ? data.isActive : true,
            created_at: sql `now()`,
            updated_at: sql `now()`,
            deleted_at: null,
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        return toLocation(location);
    }
    async update(id, companyId, data) {
        const existing = await this.findById(id, companyId);
        if (!existing) {
            return null;
        }
        let updateQuery = db
            .updateTable("locations")
            .set({
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (data.name !== undefined) {
            updateQuery = updateQuery.set({ name: data.name });
        }
        if (data.address !== undefined) {
            updateQuery = updateQuery.set({ address: data.address || null });
        }
        if (data.phone !== undefined) {
            updateQuery = updateQuery.set({ phone: data.phone || null });
        }
        if (data.email !== undefined) {
            updateQuery = updateQuery.set({ email: data.email || null });
        }
        if (data.isActive !== undefined) {
            updateQuery = updateQuery.set({ is_active: data.isActive });
        }
        const updated = await updateQuery.returningAll().executeTakeFirst();
        return updated ? toLocation(updated) : null;
    }
    async delete(id, companyId) {
        const existing = await this.findById(id, companyId);
        if (!existing) {
            return false;
        }
        const result = await db
            .updateTable("locations")
            .set({
            deleted_at: sql `now()`,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return !!result;
    }
}
export default new LocationService();
//# sourceMappingURL=location.service.js.map