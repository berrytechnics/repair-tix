import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { NotFoundError } from "../config/errors.js";
function toInvoiceItem(item) {
    return {
        id: item.id,
        invoiceId: item.invoice_id,
        inventoryItemId: item.inventory_item_id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        discountPercent: item.discount_percent,
        discountAmount: item.discount_amount,
        subtotal: item.subtotal,
        type: item.type,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
    };
}
function toInvoice(invoice) {
    return {
        id: invoice.id,
        locationId: invoice.location_id,
        invoiceNumber: invoice.invoice_number,
        customerId: invoice.customer_id,
        ticketId: invoice.ticket_id,
        status: invoice.status,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        paidDate: invoice.paid_date,
        subtotal: invoice.subtotal,
        taxRate: invoice.tax_rate,
        taxAmount: invoice.tax_amount,
        discountAmount: invoice.discount_amount,
        totalAmount: invoice.total_amount,
        notes: invoice.notes,
        paymentMethod: invoice.payment_method,
        paymentReference: invoice.payment_reference,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
    };
}
async function generateInvoiceNumber(companyId) {
    const prefix = "INV";
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
    const timestamp = Date.now().toString().slice(-6);
    const invoiceNumber = `${prefix}-${year}${month}-${timestamp}`;
    const existing = await db
        .selectFrom("invoices")
        .select("id")
        .where("invoice_number", "=", invoiceNumber)
        .where("company_id", "=", companyId)
        .executeTakeFirst();
    if (existing) {
        return generateInvoiceNumber(companyId);
    }
    return invoiceNumber;
}
export class InvoiceService {
    async findAll(companyId, customerId, status, locationId, ticketId) {
        let query = db
            .selectFrom("invoices")
            .selectAll()
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (customerId) {
            query = query.where("customer_id", "=", customerId);
        }
        if (status) {
            query = query.where("status", "=", status);
        }
        if (locationId !== undefined) {
            if (locationId === null) {
                query = query.where("location_id", "is", null);
            }
            else {
                query = query.where("location_id", "=", locationId);
            }
        }
        if (ticketId) {
            query = query.where("ticket_id", "=", ticketId);
        }
        const invoices = await query.execute();
        return invoices.map(toInvoice);
    }
    async findById(id, companyId) {
        const invoice = await db
            .selectFrom("invoices")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!invoice) {
            return null;
        }
        const items = await db
            .selectFrom("invoice_items")
            .selectAll()
            .where("invoice_id", "=", id)
            .execute();
        const invoiceData = toInvoice(invoice);
        return {
            ...invoiceData,
            invoiceItems: items.map(toInvoiceItem),
        };
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
            throw new Error("Location not found or does not belong to company");
        }
        const invoiceNumber = await generateInvoiceNumber(companyId);
        const subtotal = data.subtotal ?? 0;
        const taxRate = data.taxRate ?? 0;
        const taxAmount = data.taxAmount ?? subtotal * (taxRate / 100);
        const discountAmount = data.discountAmount ?? 0;
        const totalAmount = data.totalAmount ?? subtotal + taxAmount - discountAmount;
        const invoice = await db
            .insertInto("invoices")
            .values({
            id: uuidv4(),
            company_id: companyId,
            location_id: locationId,
            invoice_number: invoiceNumber,
            customer_id: data.customerId,
            ticket_id: data.ticketId || null,
            status: data.status || "draft",
            issue_date: data.issueDate ? new Date(data.issueDate).toISOString() : null,
            due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
            paid_date: data.paidDate ? new Date(data.paidDate).toISOString() : null,
            subtotal: subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            total_amount: totalAmount,
            notes: data.notes || null,
            payment_method: data.paymentMethod || null,
            payment_reference: data.paymentReference || null,
            created_at: sql `now()`,
            updated_at: sql `now()`,
            deleted_at: null,
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        return toInvoice(invoice);
    }
    async update(id, data, companyId) {
        let updateQuery = db
            .updateTable("invoices")
            .set({
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (data.customerId !== undefined) {
            updateQuery = updateQuery.set({ customer_id: data.customerId });
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
                    throw new Error("Location not found or does not belong to company");
                }
            }
            updateQuery = updateQuery.set({ location_id: data.locationId });
        }
        if (data.ticketId !== undefined) {
            updateQuery = updateQuery.set({ ticket_id: data.ticketId || null });
        }
        if (data.status !== undefined) {
            updateQuery = updateQuery.set({ status: data.status });
        }
        if (data.subtotal !== undefined) {
            updateQuery = updateQuery.set({ subtotal: data.subtotal });
        }
        if (data.taxRate !== undefined) {
            updateQuery = updateQuery.set({ tax_rate: data.taxRate });
        }
        if (data.taxAmount !== undefined) {
            updateQuery = updateQuery.set({ tax_amount: data.taxAmount });
        }
        if (data.discountAmount !== undefined) {
            updateQuery = updateQuery.set({ discount_amount: data.discountAmount });
        }
        if (data.totalAmount !== undefined) {
            updateQuery = updateQuery.set({ total_amount: data.totalAmount });
        }
        if (data.issueDate !== undefined) {
            updateQuery = updateQuery.set({
                issue_date: data.issueDate ? new Date(data.issueDate).toISOString() : null,
            });
        }
        if (data.dueDate !== undefined) {
            updateQuery = updateQuery.set({
                due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
            });
        }
        if (data.paidDate !== undefined) {
            updateQuery = updateQuery.set({
                paid_date: data.paidDate ? new Date(data.paidDate).toISOString() : null,
            });
        }
        if (data.notes !== undefined) {
            updateQuery = updateQuery.set({ notes: data.notes || null });
        }
        if (data.paymentMethod !== undefined) {
            updateQuery = updateQuery.set({ payment_method: data.paymentMethod || null });
        }
        if (data.paymentReference !== undefined) {
            updateQuery = updateQuery.set({ payment_reference: data.paymentReference || null });
        }
        const updated = await updateQuery
            .returningAll()
            .executeTakeFirst();
        if (!updated) {
            return null;
        }
        const items = await db
            .selectFrom("invoice_items")
            .selectAll()
            .where("invoice_id", "=", id)
            .execute();
        const invoiceData = toInvoice(updated);
        return {
            ...invoiceData,
            invoiceItems: items.map(toInvoiceItem),
        };
    }
    async delete(id, companyId) {
        const result = await db
            .updateTable("invoices")
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
    async recalculateInvoiceTotals(invoiceId, companyId) {
        const items = await db
            .selectFrom("invoice_items")
            .selectAll()
            .where("invoice_id", "=", invoiceId)
            .execute();
        const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        const invoice = await db
            .selectFrom("invoices")
            .select(["tax_rate", "discount_amount"])
            .where("id", "=", invoiceId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!invoice) {
            throw new NotFoundError("Invoice not found");
        }
        const taxRate = Number(invoice.tax_rate);
        const discountAmount = Number(invoice.discount_amount);
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount - discountAmount;
        await db
            .updateTable("invoices")
            .set({
            subtotal: subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            updated_at: sql `now()`,
        })
            .where("id", "=", invoiceId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .execute();
    }
    async createInvoiceItem(data, companyId) {
        const invoice = await this.findById(data.invoiceId, companyId);
        if (!invoice) {
            throw new NotFoundError("Invoice not found");
        }
        const discountPercent = data.discountPercent ?? 0;
        const itemSubtotal = data.quantity * data.unitPrice;
        const discountAmount = itemSubtotal * (discountPercent / 100);
        const finalSubtotal = itemSubtotal - discountAmount;
        const item = await db
            .insertInto("invoice_items")
            .values({
            id: uuidv4(),
            invoice_id: data.invoiceId,
            inventory_item_id: data.inventoryItemId || null,
            description: data.description,
            quantity: data.quantity,
            unit_price: data.unitPrice,
            discount_percent: discountPercent,
            discount_amount: discountAmount,
            subtotal: finalSubtotal,
            type: data.type,
            created_at: sql `now()`,
            updated_at: sql `now()`,
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        await this.recalculateInvoiceTotals(data.invoiceId, companyId);
        return toInvoiceItem(item);
    }
    async updateInvoiceItem(invoiceId, itemId, data, companyId) {
        const invoice = await this.findById(invoiceId, companyId);
        if (!invoice) {
            throw new NotFoundError("Invoice not found");
        }
        const existingItem = await db
            .selectFrom("invoice_items")
            .selectAll()
            .where("id", "=", itemId)
            .where("invoice_id", "=", invoiceId)
            .executeTakeFirst();
        if (!existingItem) {
            throw new NotFoundError("Invoice item not found");
        }
        let updateQuery = db
            .updateTable("invoice_items")
            .set({
            updated_at: sql `now()`,
        })
            .where("id", "=", itemId)
            .where("invoice_id", "=", invoiceId);
        const description = data.description ?? existingItem.description;
        const quantity = data.quantity ?? existingItem.quantity;
        const unitPrice = data.unitPrice ?? Number(existingItem.unit_price);
        const discountPercent = data.discountPercent ?? Number(existingItem.discount_percent);
        const type = data.type ?? existingItem.type;
        const inventoryItemId = data.inventoryItemId !== undefined ? data.inventoryItemId : existingItem.inventory_item_id;
        const itemSubtotal = quantity * unitPrice;
        const discountAmount = itemSubtotal * (discountPercent / 100);
        const finalSubtotal = itemSubtotal - discountAmount;
        updateQuery = updateQuery.set({
            description: description,
            quantity: quantity,
            unit_price: unitPrice,
            discount_percent: discountPercent,
            discount_amount: discountAmount,
            subtotal: finalSubtotal,
            type: type,
            inventory_item_id: inventoryItemId,
        });
        const updated = await updateQuery.returningAll().executeTakeFirst();
        if (!updated) {
            return null;
        }
        await this.recalculateInvoiceTotals(invoiceId, companyId);
        return toInvoiceItem(updated);
    }
    async deleteInvoiceItem(invoiceId, itemId, companyId) {
        const invoice = await this.findById(invoiceId, companyId);
        if (!invoice) {
            throw new NotFoundError("Invoice not found");
        }
        const existingItem = await db
            .selectFrom("invoice_items")
            .select("id")
            .where("id", "=", itemId)
            .where("invoice_id", "=", invoiceId)
            .executeTakeFirst();
        if (!existingItem) {
            throw new NotFoundError("Invoice item not found");
        }
        const result = await db
            .deleteFrom("invoice_items")
            .where("id", "=", itemId)
            .where("invoice_id", "=", invoiceId)
            .executeTakeFirst();
        await this.recalculateInvoiceTotals(invoiceId, companyId);
        return !!result;
    }
    async markInvoiceAsPaid(invoiceId, data, companyId) {
        const invoice = await this.findById(invoiceId, companyId);
        if (!invoice) {
            throw new NotFoundError("Invoice not found");
        }
        const paidDate = data.paidDate ? new Date(data.paidDate).toISOString() : new Date().toISOString();
        const updated = await db
            .updateTable("invoices")
            .set({
            status: "paid",
            paid_date: paidDate,
            payment_method: data.paymentMethod,
            payment_reference: data.paymentReference || null,
            notes: data.notes || invoice.notes || null,
            updated_at: sql `now()`,
        })
            .where("id", "=", invoiceId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .returningAll()
            .executeTakeFirst();
        if (!updated) {
            return null;
        }
        const items = await db
            .selectFrom("invoice_items")
            .selectAll()
            .where("invoice_id", "=", invoiceId)
            .execute();
        const invoiceData = toInvoice(updated);
        return {
            ...invoiceData,
            invoiceItems: items.map(toInvoiceItem),
        };
    }
    async getInvoiceItems(invoiceId, companyId) {
        const invoice = await this.findById(invoiceId, companyId);
        if (!invoice) {
            throw new NotFoundError("Invoice not found");
        }
        const items = await db
            .selectFrom("invoice_items")
            .selectAll()
            .where("invoice_id", "=", invoiceId)
            .execute();
        return items.map(toInvoiceItem);
    }
}
export default new InvoiceService();
//# sourceMappingURL=invoice.service.js.map