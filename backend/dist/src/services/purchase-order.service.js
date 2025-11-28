import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { BadRequestError, NotFoundError } from "../config/errors.js";
import inventoryService from "./inventory.service.js";
function toPurchaseOrder(po) {
    return {
        id: po.id,
        poNumber: po.po_number,
        supplier: po.supplier,
        status: po.status,
        orderDate: po.order_date,
        expectedDeliveryDate: po.expected_delivery_date,
        receivedDate: po.received_date,
        notes: po.notes,
        totalAmount: po.total_amount,
        createdAt: po.created_at,
        updatedAt: po.updated_at,
    };
}
function toPurchaseOrderItem(item) {
    return {
        id: item.id,
        purchaseOrderId: item.purchase_order_id,
        inventoryItemId: item.inventory_item_id,
        quantityOrdered: item.quantity_ordered,
        quantityReceived: item.quantity_received,
        unitCost: item.unit_cost,
        subtotal: item.subtotal,
        notes: item.notes,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    };
}
async function generatePONumber(companyId) {
    const prefix = "PO";
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
    const timestamp = Date.now().toString().slice(-6);
    const poNumber = `${prefix}-${year}${month}-${timestamp}`;
    const existing = await db
        .selectFrom("purchase_orders")
        .select("id")
        .where("po_number", "=", poNumber)
        .where("company_id", "=", companyId)
        .executeTakeFirst();
    if (existing) {
        return generatePONumber(companyId);
    }
    return poNumber;
}
export class PurchaseOrderService {
    async findAll(companyId, status, searchQuery) {
        let query = db
            .selectFrom("purchase_orders")
            .selectAll()
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (status) {
            query = query.where("status", "=", status);
        }
        if (searchQuery) {
            const search = `%${searchQuery.toLowerCase()}%`;
            query = query.where((eb) => eb.or([
                eb("po_number", "ilike", search),
                eb("supplier", "ilike", search),
            ]));
        }
        const pos = await query.orderBy("created_at", "desc").execute();
        return pos.map(toPurchaseOrder);
    }
    async findById(id, companyId) {
        const po = await db
            .selectFrom("purchase_orders")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!po) {
            return null;
        }
        const items = await db
            .selectFrom("purchase_order_items")
            .selectAll()
            .where("purchase_order_id", "=", id)
            .execute();
        const purchaseOrder = toPurchaseOrder(po);
        purchaseOrder.items = items.map(toPurchaseOrderItem);
        return purchaseOrder;
    }
    async create(data, companyId) {
        const poNumber = await generatePONumber(companyId);
        if (!data.items || data.items.length === 0) {
            throw new BadRequestError("Purchase order must have at least one item");
        }
        const totalAmount = data.items.reduce((sum, item) => sum + item.quantityOrdered * item.unitCost, 0);
        const po = await db
            .insertInto("purchase_orders")
            .values({
            id: uuidv4(),
            company_id: companyId,
            po_number: poNumber,
            supplier: data.supplier,
            status: "draft",
            order_date: new Date(data.orderDate).toISOString(),
            expected_delivery_date: data.expectedDeliveryDate
                ? new Date(data.expectedDeliveryDate).toISOString()
                : null,
            received_date: null,
            notes: data.notes || null,
            total_amount: totalAmount,
            created_at: sql `now()`,
            updated_at: sql `now()`,
            deleted_at: null,
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        const items = await Promise.all(data.items.map(async (item) => {
            const subtotal = item.quantityOrdered * item.unitCost;
            return db
                .insertInto("purchase_order_items")
                .values({
                id: uuidv4(),
                purchase_order_id: po.id,
                inventory_item_id: item.inventoryItemId,
                quantity_ordered: item.quantityOrdered,
                quantity_received: 0,
                unit_cost: item.unitCost,
                subtotal: subtotal,
                notes: item.notes || null,
                created_at: sql `now()`,
                updated_at: sql `now()`,
            })
                .returningAll()
                .executeTakeFirstOrThrow();
        }));
        const purchaseOrder = toPurchaseOrder(po);
        purchaseOrder.items = items.map(toPurchaseOrderItem);
        return purchaseOrder;
    }
    async update(id, data, companyId) {
        const existing = await db
            .selectFrom("purchase_orders")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!existing) {
            return null;
        }
        if (existing.status !== "draft") {
            throw new BadRequestError("Only draft purchase orders can be updated");
        }
        let updateQuery = db
            .updateTable("purchase_orders")
            .set({
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (data.supplier !== undefined) {
            updateQuery = updateQuery.set({ supplier: data.supplier });
        }
        if (data.orderDate !== undefined) {
            updateQuery = updateQuery.set({
                order_date: new Date(data.orderDate).toISOString(),
            });
        }
        if (data.expectedDeliveryDate !== undefined) {
            updateQuery = updateQuery.set({
                expected_delivery_date: data.expectedDeliveryDate
                    ? new Date(data.expectedDeliveryDate).toISOString()
                    : null,
            });
        }
        if (data.notes !== undefined) {
            updateQuery = updateQuery.set({ notes: data.notes || null });
        }
        if (data.status !== undefined) {
            updateQuery = updateQuery.set({ status: data.status });
        }
        if (data.items !== undefined) {
            if (data.items.length === 0) {
                throw new BadRequestError("Purchase order must have at least one item");
            }
            await db
                .deleteFrom("purchase_order_items")
                .where("purchase_order_id", "=", id)
                .execute();
            let totalAmount = 0;
            for (const item of data.items) {
                const subtotal = item.quantityOrdered * item.unitCost;
                totalAmount += subtotal;
                await db
                    .insertInto("purchase_order_items")
                    .values({
                    id: uuidv4(),
                    purchase_order_id: id,
                    inventory_item_id: item.inventoryItemId,
                    quantity_ordered: item.quantityOrdered,
                    quantity_received: 0,
                    unit_cost: item.unitCost,
                    subtotal: subtotal,
                    notes: item.notes || null,
                    created_at: sql `now()`,
                    updated_at: sql `now()`,
                })
                    .execute();
            }
            updateQuery = updateQuery.set({ total_amount: totalAmount });
        }
        else {
            const items = await db
                .selectFrom("purchase_order_items")
                .selectAll()
                .where("purchase_order_id", "=", id)
                .execute();
            const totalAmount = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
            updateQuery = updateQuery.set({ total_amount: totalAmount });
        }
        const updated = await updateQuery.returningAll().executeTakeFirst();
        if (!updated) {
            return null;
        }
        const items = await db
            .selectFrom("purchase_order_items")
            .selectAll()
            .where("purchase_order_id", "=", id)
            .execute();
        const purchaseOrder = toPurchaseOrder(updated);
        purchaseOrder.items = items.map(toPurchaseOrderItem);
        return purchaseOrder;
    }
    async delete(id, companyId) {
        const existing = await db
            .selectFrom("purchase_orders")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!existing) {
            return false;
        }
        if (existing.status !== "draft") {
            throw new BadRequestError("Only draft purchase orders can be deleted");
        }
        const result = await db
            .updateTable("purchase_orders")
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
    async receive(id, data, companyId) {
        const po = await db
            .selectFrom("purchase_orders")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!po) {
            throw new NotFoundError("Purchase order not found");
        }
        if (po.status !== "ordered") {
            throw new BadRequestError("Only ordered purchase orders can be received");
        }
        const items = await db
            .selectFrom("purchase_order_items")
            .selectAll()
            .where("purchase_order_id", "=", id)
            .execute();
        for (const receivedItem of data.items) {
            const item = items.find((i) => i.id === receivedItem.id);
            if (!item) {
                throw new BadRequestError(`Purchase order item ${receivedItem.id} not found`);
            }
            if (receivedItem.quantityReceived < 0) {
                throw new BadRequestError("Quantity received cannot be negative");
            }
            if (receivedItem.quantityReceived > item.quantity_ordered) {
                throw new BadRequestError(`Quantity received (${receivedItem.quantityReceived}) cannot exceed quantity ordered (${item.quantity_ordered})`);
            }
        }
        for (const receivedItem of data.items) {
            const item = items.find((i) => i.id === receivedItem.id);
            if (!item)
                continue;
            const newSubtotal = receivedItem.quantityReceived * item.unit_cost;
            await db
                .updateTable("purchase_order_items")
                .set({
                quantity_received: receivedItem.quantityReceived,
                subtotal: newSubtotal,
                updated_at: sql `now()`,
            })
                .where("id", "=", receivedItem.id)
                .execute();
            await inventoryService.adjustQuantity(item.inventory_item_id, receivedItem.quantityReceived, companyId);
        }
        const updated = await db
            .updateTable("purchase_orders")
            .set({
            status: "received",
            received_date: sql `now()`,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .returningAll()
            .executeTakeFirstOrThrow();
        const updatedItems = await db
            .selectFrom("purchase_order_items")
            .selectAll()
            .where("purchase_order_id", "=", id)
            .execute();
        const purchaseOrder = toPurchaseOrder(updated);
        purchaseOrder.items = updatedItems.map(toPurchaseOrderItem);
        return purchaseOrder;
    }
    async cancel(id, companyId) {
        const po = await db
            .selectFrom("purchase_orders")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!po) {
            throw new NotFoundError("Purchase order not found");
        }
        if (po.status === "received" || po.status === "cancelled") {
            throw new BadRequestError(`Cannot cancel purchase order with status: ${po.status}`);
        }
        const updated = await db
            .updateTable("purchase_orders")
            .set({
            status: "cancelled",
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .returningAll()
            .executeTakeFirstOrThrow();
        const items = await db
            .selectFrom("purchase_order_items")
            .selectAll()
            .where("purchase_order_id", "=", id)
            .execute();
        const purchaseOrder = toPurchaseOrder(updated);
        purchaseOrder.items = items.map(toPurchaseOrderItem);
        return purchaseOrder;
    }
}
export default new PurchaseOrderService();
//# sourceMappingURL=purchase-order.service.js.map