import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
function toAsset(asset) {
    return {
        id: asset.id,
        customerId: asset.customer_id,
        deviceType: asset.device_type,
        deviceBrand: asset.device_brand,
        deviceModel: asset.device_model,
        serialNumber: asset.serial_number,
        notes: asset.notes,
        createdAt: asset.created_at,
        updatedAt: asset.updated_at,
    };
}
export class AssetService {
    async findAll(companyId, customerId) {
        let query = db
            .selectFrom("assets")
            .selectAll()
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (customerId) {
            query = query.where("customer_id", "=", customerId);
        }
        const assets = await query.execute();
        return assets.map(toAsset);
    }
    async findById(id, companyId) {
        const asset = await db
            .selectFrom("assets")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return asset ? toAsset(asset) : null;
    }
    async create(data, companyId, customerId) {
        const customer = await db
            .selectFrom("customers")
            .select("id")
            .where("id", "=", customerId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!customer) {
            throw new Error("Customer not found or does not belong to company");
        }
        const asset = await db
            .insertInto("assets")
            .values({
            id: uuidv4(),
            company_id: companyId,
            customer_id: customerId,
            device_type: data.deviceType,
            device_brand: data.deviceBrand || null,
            device_model: data.deviceModel || null,
            serial_number: data.serialNumber || null,
            notes: data.notes || null,
            created_at: sql `now()`,
            updated_at: sql `now()`,
            deleted_at: null,
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        return toAsset(asset);
    }
    async update(id, data, companyId) {
        let updateQuery = db
            .updateTable("assets")
            .set({
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (data.deviceType !== undefined) {
            updateQuery = updateQuery.set({ device_type: data.deviceType });
        }
        if (data.deviceBrand !== undefined) {
            updateQuery = updateQuery.set({ device_brand: data.deviceBrand || null });
        }
        if (data.deviceModel !== undefined) {
            updateQuery = updateQuery.set({ device_model: data.deviceModel || null });
        }
        if (data.serialNumber !== undefined) {
            updateQuery = updateQuery.set({
                serial_number: data.serialNumber || null,
            });
        }
        if (data.notes !== undefined) {
            updateQuery = updateQuery.set({ notes: data.notes || null });
        }
        const updated = await updateQuery
            .returningAll()
            .executeTakeFirst();
        return updated ? toAsset(updated) : null;
    }
    async delete(id, companyId) {
        const result = await db
            .updateTable("assets")
            .set({
            deleted_at: sql `now()`,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .returningAll()
            .executeTakeFirst();
        return !!result;
    }
}
export default new AssetService();
//# sourceMappingURL=asset.service.js.map