import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import permissionService from "./permission.service.js";
function toCompany(company) {
    return {
        id: company.id,
        name: company.name,
        subdomain: company.subdomain,
        plan: company.plan,
        status: company.status,
        settings: company.settings,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
    };
}
export class CompanyService {
    async findById(id) {
        const company = await db
            .selectFrom("companies")
            .selectAll()
            .where("id", "=", id)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return company ? toCompany(company) : null;
    }
    async findBySubdomain(subdomain) {
        const company = await db
            .selectFrom("companies")
            .selectAll()
            .where("subdomain", "=", subdomain)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return company ? toCompany(company) : null;
    }
    async create(data) {
        const subdomain = data.subdomain ||
            data.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
        const company = await db
            .insertInto("companies")
            .values({
            id: uuidv4(),
            name: data.name,
            subdomain: subdomain,
            plan: data.plan || "free",
            status: data.status || "active",
            settings: data.settings || {},
            created_at: sql `now()`,
            updated_at: sql `now()`,
            deleted_at: null,
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        try {
            await permissionService.initializeCompanyPermissions(company.id);
        }
        catch (error) {
            console.warn("Failed to initialize permissions for company:", error);
        }
        return toCompany(company);
    }
    async update(id, data) {
        let updateQuery = db
            .updateTable("companies")
            .set({
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("deleted_at", "is", null);
        if (data.name !== undefined) {
            updateQuery = updateQuery.set({ name: data.name });
        }
        if (data.subdomain !== undefined) {
            updateQuery = updateQuery.set({ subdomain: data.subdomain });
        }
        if (data.plan !== undefined) {
            updateQuery = updateQuery.set({ plan: data.plan });
        }
        if (data.status !== undefined) {
            updateQuery = updateQuery.set({ status: data.status });
        }
        if (data.settings !== undefined) {
            updateQuery = updateQuery.set({ settings: data.settings });
        }
        const updated = await updateQuery.returningAll().executeTakeFirst();
        return updated ? toCompany(updated) : null;
    }
    async delete(id) {
        const result = await db
            .updateTable("companies")
            .set({
            deleted_at: sql `now()`,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return !!result;
    }
}
export default new CompanyService();
//# sourceMappingURL=company.service.js.map