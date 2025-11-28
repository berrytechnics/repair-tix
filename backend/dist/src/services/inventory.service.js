import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { BadRequestError } from "../config/errors.js";
function toInventoryItem(item) {
    return {
        id: item.id,
        locationId: item.location_id,
        sku: item.sku,
        name: item.name,
        description: item.description,
        category: item.category,
        subcategory: item.subcategory,
        brand: item.brand,
        model: item.model,
        compatibleWith: item.compatible_with,
        costPrice: item.cost_price,
        sellingPrice: item.selling_price,
        quantity: item.quantity,
        reorderLevel: item.reorder_level,
        location: item.location,
        supplier: item.supplier,
        supplierPartNumber: item.supplier_part_number,
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    };
}
export class InventoryService {
    async findAll(companyId, searchQuery, locationId) {
        let query = db
            .selectFrom("inventory_items")
            .selectAll()
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (searchQuery) {
            const search = `%${searchQuery.toLowerCase()}%`;
            query = query.where((eb) => eb.or([
                eb("sku", "ilike", search),
                eb("name", "ilike", search),
                eb("category", "ilike", search),
                eb("brand", "ilike", search),
                eb("model", "ilike", search),
            ]));
        }
        if (locationId !== undefined) {
            if (locationId === null) {
                query = query.where("location_id", "is", null);
            }
            else {
                query = query.where("location_id", "=", locationId);
            }
        }
        const items = await query.execute();
        return items.map(toInventoryItem);
    }
    async findById(id, companyId) {
        const item = await db
            .selectFrom("inventory_items")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return item ? toInventoryItem(item) : null;
    }
    async create(data, companyId, locationId) {
        const location = await db
            .selectFrom("locations")
            .select("id")
            .where("id", "=", locationId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!location) {
            throw new BadRequestError("Location not found or does not belong to company");
        }
        const existing = await db
            .selectFrom("inventory_items")
            .select("id")
            .where("sku", "=", data.sku)
            .where("company_id", "=", companyId)
            .where("location_id", "=", locationId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (existing) {
            throw new BadRequestError(`SKU ${data.sku} already exists at this location`);
        }
        const item = await db
            .insertInto("inventory_items")
            .values({
            id: uuidv4(),
            company_id: companyId,
            location_id: locationId,
            sku: data.sku,
            name: data.name,
            description: data.description || null,
            category: data.category,
            subcategory: data.subcategory || null,
            brand: data.brand || null,
            model: data.model || null,
            compatible_with: data.compatibleWith || null,
            cost_price: data.costPrice,
            selling_price: data.sellingPrice,
            quantity: data.quantity ?? 0,
            reorder_level: data.reorderLevel ?? 5,
            location: data.location || null,
            supplier: data.supplier || null,
            supplier_part_number: data.supplierPartNumber || null,
            is_active: data.isActive ?? true,
            created_at: sql `now()`,
            updated_at: sql `now()`,
            deleted_at: null,
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        return toInventoryItem(item);
    }
    async update(id, data, companyId) {
        const existing = await db
            .selectFrom("inventory_items")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!existing) {
            return null;
        }
        if (data.sku !== undefined && data.sku !== existing.sku) {
            const currentLocationId = existing.location_id;
            const skuExists = await db
                .selectFrom("inventory_items")
                .select("id")
                .where("sku", "=", data.sku)
                .where("company_id", "=", companyId)
                .where("location_id", "=", currentLocationId)
                .where("id", "!=", id)
                .where("deleted_at", "is", null)
                .executeTakeFirst();
            if (skuExists) {
                throw new BadRequestError(`SKU ${data.sku} already exists at this location`);
            }
        }
        let updateQuery = db
            .updateTable("inventory_items")
            .set({
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (data.sku !== undefined) {
            updateQuery = updateQuery.set({ sku: data.sku });
        }
        if (data.name !== undefined) {
            updateQuery = updateQuery.set({ name: data.name });
        }
        if (data.description !== undefined) {
            updateQuery = updateQuery.set({ description: data.description || null });
        }
        if (data.category !== undefined) {
            updateQuery = updateQuery.set({ category: data.category });
        }
        if (data.subcategory !== undefined) {
            updateQuery = updateQuery.set({ subcategory: data.subcategory || null });
        }
        if (data.brand !== undefined) {
            updateQuery = updateQuery.set({ brand: data.brand || null });
        }
        if (data.model !== undefined) {
            updateQuery = updateQuery.set({ model: data.model || null });
        }
        if (data.compatibleWith !== undefined) {
            updateQuery = updateQuery.set({ compatible_with: data.compatibleWith || null });
        }
        if (data.costPrice !== undefined) {
            updateQuery = updateQuery.set({ cost_price: data.costPrice });
        }
        if (data.sellingPrice !== undefined) {
            updateQuery = updateQuery.set({ selling_price: data.sellingPrice });
        }
        if (data.locationId !== undefined) {
            if (data.locationId !== null) {
                const location = await db
                    .selectFrom("locations")
                    .select("id")
                    .where("id", "=", data.locationId)
                    .where("company_id", "=", companyId)
                    .where("deleted_at", "is", null)
                    .executeTakeFirst();
                if (!location) {
                    throw new BadRequestError("Location not found or does not belong to company");
                }
                if (existing.location_id !== data.locationId) {
                    const skuExists = await db
                        .selectFrom("inventory_items")
                        .select("id")
                        .where("sku", "=", existing.sku)
                        .where("company_id", "=", companyId)
                        .where("location_id", "=", data.locationId)
                        .where("id", "!=", id)
                        .where("deleted_at", "is", null)
                        .executeTakeFirst();
                    if (skuExists) {
                        throw new BadRequestError(`SKU ${existing.sku} already exists at the new location`);
                    }
                }
            }
            updateQuery = updateQuery.set({ location_id: data.locationId });
        }
        if (data.reorderLevel !== undefined) {
            updateQuery = updateQuery.set({ reorder_level: data.reorderLevel });
        }
        if (data.location !== undefined) {
            updateQuery = updateQuery.set({ location: data.location || null });
        }
        if (data.supplier !== undefined) {
            updateQuery = updateQuery.set({ supplier: data.supplier || null });
        }
        if (data.supplierPartNumber !== undefined) {
            updateQuery = updateQuery.set({ supplier_part_number: data.supplierPartNumber || null });
        }
        if (data.isActive !== undefined) {
            updateQuery = updateQuery.set({ is_active: data.isActive });
        }
        const updated = await updateQuery.returningAll().executeTakeFirst();
        return updated ? toInventoryItem(updated) : null;
    }
    async delete(id, companyId) {
        const item = await db
            .selectFrom("inventory_items")
            .select(["id", "quantity"])
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!item) {
            return false;
        }
        if (item.quantity !== 0) {
            throw new BadRequestError("Cannot delete inventory item with non-zero quantity. Quantity must be 0.");
        }
        const result = await db
            .updateTable("inventory_items")
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
    async adjustQuantity(id, delta, companyId) {
        const item = await db
            .selectFrom("inventory_items")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!item) {
            throw new BadRequestError("Inventory item not found");
        }
        const newQuantity = item.quantity + delta;
        const updated = await db
            .updateTable("inventory_items")
            .set({
            quantity: newQuantity,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .returningAll()
            .executeTakeFirstOrThrow();
        return toInventoryItem(updated);
    }
}
export default new InventoryService();
//# sourceMappingURL=inventory.service.js.map