import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { BadRequestError, NotFoundError } from "../config/errors.js";
import inventoryService from "./inventory.service.js";
function toInventoryTransfer(transfer) {
    return {
        id: transfer.id,
        fromLocationId: transfer.from_location_id,
        toLocationId: transfer.to_location_id,
        inventoryItemId: transfer.inventory_item_id,
        quantity: transfer.quantity,
        transferredBy: transfer.transferred_by,
        status: transfer.status,
        notes: transfer.notes,
        createdAt: transfer.created_at,
        updatedAt: transfer.updated_at,
    };
}
export class InventoryTransferService {
    async findAll(companyId, status, fromLocationId, toLocationId) {
        let query = db
            .selectFrom("inventory_transfers")
            .innerJoin("locations as from_location", "from_location.id", "inventory_transfers.from_location_id")
            .innerJoin("locations as to_location", "to_location.id", "inventory_transfers.to_location_id")
            .innerJoin("inventory_items", "inventory_items.id", "inventory_transfers.inventory_item_id")
            .innerJoin("users", "users.id", "inventory_transfers.transferred_by")
            .select([
            "inventory_transfers.id",
            "inventory_transfers.from_location_id",
            "inventory_transfers.to_location_id",
            "inventory_transfers.inventory_item_id",
            "inventory_transfers.quantity",
            "inventory_transfers.transferred_by",
            "inventory_transfers.status",
            "inventory_transfers.notes",
            "inventory_transfers.created_at",
            "inventory_transfers.updated_at",
        ])
            .where("from_location.company_id", "=", companyId)
            .where("to_location.company_id", "=", companyId);
        if (status) {
            query = query.where("inventory_transfers.status", "=", status);
        }
        if (fromLocationId) {
            query = query.where("inventory_transfers.from_location_id", "=", fromLocationId);
        }
        if (toLocationId) {
            query = query.where("inventory_transfers.to_location_id", "=", toLocationId);
        }
        const transfers = await query
            .orderBy("inventory_transfers.created_at", "desc")
            .execute();
        const transfersWithJoins = await Promise.all(transfers.map(async (transfer) => {
            const baseTransfer = toInventoryTransfer(transfer);
            const fromLocation = await db
                .selectFrom("locations")
                .select(["id", "name"])
                .where("id", "=", transfer.from_location_id)
                .executeTakeFirst();
            const toLocation = await db
                .selectFrom("locations")
                .select(["id", "name"])
                .where("id", "=", transfer.to_location_id)
                .executeTakeFirst();
            const inventoryItem = await db
                .selectFrom("inventory_items")
                .select(["id", "sku", "name"])
                .where("id", "=", transfer.inventory_item_id)
                .executeTakeFirst();
            const user = await db
                .selectFrom("users")
                .select(["id", "first_name", "last_name", "email"])
                .where("id", "=", transfer.transferred_by)
                .executeTakeFirst();
            return {
                ...baseTransfer,
                fromLocation: fromLocation
                    ? { id: fromLocation.id, name: fromLocation.name }
                    : undefined,
                toLocation: toLocation
                    ? { id: toLocation.id, name: toLocation.name }
                    : undefined,
                inventoryItem: inventoryItem
                    ? { id: inventoryItem.id, sku: inventoryItem.sku, name: inventoryItem.name }
                    : undefined,
                transferredByUser: user
                    ? {
                        id: user.id,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        email: user.email,
                    }
                    : undefined,
            };
        }));
        return transfersWithJoins;
    }
    async findById(id, companyId) {
        const transfer = await db
            .selectFrom("inventory_transfers")
            .innerJoin("locations as from_location", "from_location.id", "inventory_transfers.from_location_id")
            .innerJoin("locations as to_location", "to_location.id", "inventory_transfers.to_location_id")
            .select([
            "inventory_transfers.id",
            "inventory_transfers.from_location_id",
            "inventory_transfers.to_location_id",
            "inventory_transfers.inventory_item_id",
            "inventory_transfers.quantity",
            "inventory_transfers.transferred_by",
            "inventory_transfers.status",
            "inventory_transfers.notes",
            "inventory_transfers.created_at",
            "inventory_transfers.updated_at",
        ])
            .where("inventory_transfers.id", "=", id)
            .where("from_location.company_id", "=", companyId)
            .where("to_location.company_id", "=", companyId)
            .executeTakeFirst();
        if (!transfer) {
            return null;
        }
        const baseTransfer = toInventoryTransfer(transfer);
        const fromLocation = await db
            .selectFrom("locations")
            .select(["id", "name"])
            .where("id", "=", transfer.from_location_id)
            .executeTakeFirst();
        const toLocation = await db
            .selectFrom("locations")
            .select(["id", "name"])
            .where("id", "=", transfer.to_location_id)
            .executeTakeFirst();
        const inventoryItem = await db
            .selectFrom("inventory_items")
            .select(["id", "sku", "name"])
            .where("id", "=", transfer.inventory_item_id)
            .executeTakeFirst();
        const user = await db
            .selectFrom("users")
            .select(["id", "first_name", "last_name", "email"])
            .where("id", "=", transfer.transferred_by)
            .executeTakeFirst();
        return {
            ...baseTransfer,
            fromLocation: fromLocation
                ? { id: fromLocation.id, name: fromLocation.name }
                : undefined,
            toLocation: toLocation
                ? { id: toLocation.id, name: toLocation.name }
                : undefined,
            inventoryItem: inventoryItem
                ? { id: inventoryItem.id, sku: inventoryItem.sku, name: inventoryItem.name }
                : undefined,
            transferredByUser: user
                ? {
                    id: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                }
                : undefined,
        };
    }
    async create(data, companyId, userId) {
        if (data.fromLocationId === data.toLocationId) {
            throw new BadRequestError("From and to locations must be different");
        }
        if (data.quantity <= 0) {
            throw new BadRequestError("Quantity must be greater than 0");
        }
        const fromLocation = await db
            .selectFrom("locations")
            .select(["id", "company_id"])
            .where("id", "=", data.fromLocationId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!fromLocation || fromLocation.company_id !== companyId) {
            throw new BadRequestError("From location not found or does not belong to company");
        }
        const toLocation = await db
            .selectFrom("locations")
            .select(["id", "company_id"])
            .where("id", "=", data.toLocationId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!toLocation || toLocation.company_id !== companyId) {
            throw new BadRequestError("To location not found or does not belong to company");
        }
        const inventoryItem = await db
            .selectFrom("inventory_items")
            .selectAll()
            .where("id", "=", data.inventoryItemId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!inventoryItem) {
            throw new BadRequestError("Inventory item not found or does not belong to company");
        }
        if (inventoryItem.location_id !== data.fromLocationId) {
            throw new BadRequestError("Inventory item is not at the source location");
        }
        if (inventoryItem.quantity < data.quantity) {
            throw new BadRequestError(`Insufficient quantity. Available: ${inventoryItem.quantity}, Requested: ${data.quantity}`);
        }
        const transfer = await db
            .insertInto("inventory_transfers")
            .values({
            id: uuidv4(),
            from_location_id: data.fromLocationId,
            to_location_id: data.toLocationId,
            inventory_item_id: data.inventoryItemId,
            quantity: data.quantity,
            transferred_by: userId,
            status: "pending",
            notes: data.notes || null,
            created_at: sql `now()`,
            updated_at: sql `now()`,
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        await inventoryService.adjustQuantity(data.inventoryItemId, -data.quantity, companyId);
        return this.findById(transfer.id, companyId);
    }
    async complete(id, companyId) {
        const transfer = await db
            .selectFrom("inventory_transfers")
            .innerJoin("locations as from_location", "from_location.id", "inventory_transfers.from_location_id")
            .innerJoin("locations as to_location", "to_location.id", "inventory_transfers.to_location_id")
            .selectAll("inventory_transfers")
            .where("inventory_transfers.id", "=", id)
            .where("from_location.company_id", "=", companyId)
            .where("to_location.company_id", "=", companyId)
            .executeTakeFirst();
        if (!transfer) {
            throw new NotFoundError("Inventory transfer not found");
        }
        if (transfer.status !== "pending") {
            throw new BadRequestError(`Cannot complete transfer with status "${transfer.status}". Only pending transfers can be completed.`);
        }
        const inventoryItem = await db
            .selectFrom("inventory_items")
            .selectAll()
            .where("id", "=", transfer.inventory_item_id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!inventoryItem) {
            throw new BadRequestError("Inventory item not found");
        }
        const itemAtDestination = await db
            .selectFrom("inventory_items")
            .selectAll()
            .where("sku", "=", inventoryItem.sku)
            .where("location_id", "=", transfer.to_location_id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (itemAtDestination && itemAtDestination.id !== inventoryItem.id) {
            await inventoryService.adjustQuantity(itemAtDestination.id, transfer.quantity, companyId);
        }
        else {
            await db
                .updateTable("inventory_items")
                .set({
                location_id: transfer.to_location_id,
                updated_at: sql `now()`,
            })
                .where("id", "=", transfer.inventory_item_id)
                .where("company_id", "=", companyId)
                .execute();
            await inventoryService.adjustQuantity(transfer.inventory_item_id, transfer.quantity, companyId);
        }
        const updated = await db
            .updateTable("inventory_transfers")
            .set({
            status: "completed",
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirstOrThrow();
        return this.findById(updated.id, companyId);
    }
    async cancel(id, companyId) {
        const transfer = await db
            .selectFrom("inventory_transfers")
            .innerJoin("locations as from_location", "from_location.id", "inventory_transfers.from_location_id")
            .innerJoin("locations as to_location", "to_location.id", "inventory_transfers.to_location_id")
            .selectAll("inventory_transfers")
            .where("inventory_transfers.id", "=", id)
            .where("from_location.company_id", "=", companyId)
            .where("to_location.company_id", "=", companyId)
            .executeTakeFirst();
        if (!transfer) {
            throw new NotFoundError("Inventory transfer not found");
        }
        if (transfer.status !== "pending") {
            throw new BadRequestError(`Cannot cancel transfer with status "${transfer.status}". Only pending transfers can be cancelled.`);
        }
        await inventoryService.adjustQuantity(transfer.inventory_item_id, transfer.quantity, companyId);
        const updated = await db
            .updateTable("inventory_transfers")
            .set({
            status: "cancelled",
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirstOrThrow();
        return this.findById(updated.id, companyId);
    }
}
export default new InventoryTransferService();
//# sourceMappingURL=inventory-transfer.service.js.map