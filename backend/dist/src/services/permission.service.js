import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { ROLE_PERMISSIONS } from "../config/permissions.js";
class PermissionService {
    async getPermissionsForRole(role, companyId) {
        const permissions = await db
            .selectFrom("role_permissions")
            .select("permission")
            .where("role", "=", role)
            .where("company_id", "=", companyId)
            .execute();
        return permissions.map((p) => p.permission);
    }
    async getPermissionsMatrix(companyId) {
        const allPermissions = await db
            .selectFrom("role_permissions")
            .select(["role", "permission"])
            .where("company_id", "=", companyId)
            .execute();
        const matrix = {
            admin: [],
            manager: [],
            technician: [],
            frontdesk: [],
        };
        for (const row of allPermissions) {
            if (row.role in matrix) {
                matrix[row.role].push(row.permission);
            }
        }
        Object.keys(matrix).forEach((role) => {
            matrix[role].sort();
        });
        return matrix;
    }
    async updateRolePermissions(role, permissions, companyId) {
        await db.transaction().execute(async (trx) => {
            await trx
                .deleteFrom("role_permissions")
                .where("role", "=", role)
                .where("company_id", "=", companyId)
                .execute();
            if (permissions.length > 0) {
                const inserts = permissions.map((permission) => ({
                    id: uuidv4(),
                    company_id: companyId,
                    role,
                    permission,
                }));
                await trx
                    .insertInto("role_permissions")
                    .values(inserts)
                    .execute();
            }
        });
    }
    async getAllAvailablePermissions() {
        const permissions = await db
            .selectFrom("role_permissions")
            .select("permission")
            .distinct()
            .execute();
        return permissions.map((p) => p.permission).sort();
    }
    async initializeCompanyPermissions(companyId) {
        const existing = await db
            .selectFrom("role_permissions")
            .select("id")
            .where("company_id", "=", companyId)
            .limit(1)
            .executeTakeFirst();
        if (existing) {
            return;
        }
        try {
            await sql `SELECT initialize_company_permissions(${companyId})`.execute(db);
        }
        catch {
            const inserts = [];
            const rolePermissions = ROLE_PERMISSIONS;
            for (const [role, permissions] of Object.entries(rolePermissions)) {
                for (const permission of permissions) {
                    inserts.push({
                        id: uuidv4(),
                        company_id: companyId,
                        role,
                        permission,
                    });
                }
            }
            if (inserts.length > 0) {
                await db
                    .insertInto("role_permissions")
                    .values(inserts)
                    .execute();
            }
        }
    }
}
export default new PermissionService();
//# sourceMappingURL=permission.service.js.map