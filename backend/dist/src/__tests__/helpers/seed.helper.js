import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "../../config/connection.js";
export async function createTestCompany(overrides) {
    const companyId = uuidv4();
    const subdomain = overrides?.subdomain || `test-company-${companyId.slice(0, 8)}`;
    await db
        .insertInto("companies")
        .values({
        id: companyId,
        name: overrides?.name || "Test Company",
        subdomain: subdomain,
        plan: overrides?.plan || "free",
        status: overrides?.status || "active",
        settings: {},
        created_at: sql `now()`,
        updated_at: sql `now()`,
        deleted_at: null,
    })
        .execute();
    return companyId;
}
export async function createTestLocation(companyId, overrides) {
    const locationId = uuidv4();
    await db
        .insertInto("locations")
        .values({
        id: locationId,
        company_id: companyId,
        name: overrides?.name || "Test Location",
        address: overrides?.address || null,
        phone: overrides?.phone || null,
        email: overrides?.email || null,
        is_active: overrides?.isActive !== undefined ? overrides.isActive : true,
        created_at: sql `now()`,
        updated_at: sql `now()`,
        deleted_at: null,
    })
        .execute();
    return locationId;
}
export async function assignUserToLocation(userId, locationId) {
    await db
        .insertInto("user_locations")
        .values({
        user_id: userId,
        location_id: locationId,
        created_at: sql `now()`,
    })
        .onConflict((oc) => oc.doNothing())
        .execute();
}
export async function createTestUser(companyId, overrides) {
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(overrides?.password || "testpassword123", 10);
    await db
        .insertInto("users")
        .values({
        id: userId,
        company_id: companyId,
        current_location_id: overrides?.currentLocationId || null,
        first_name: overrides?.firstName || "Test",
        last_name: overrides?.lastName || "User",
        email: overrides?.email || `test-${userId}@example.com`,
        password: hashedPassword,
        role: overrides?.role || "technician",
        active: overrides?.active !== undefined ? overrides.active : true,
        created_at: sql `now()`,
        updated_at: sql `now()`,
        deleted_at: null,
    })
        .execute();
    return userId;
}
export async function createTestCustomer(companyId, overrides) {
    const customerId = uuidv4();
    await db
        .insertInto("customers")
        .values({
        id: customerId,
        company_id: companyId,
        first_name: overrides?.firstName || "Test",
        last_name: overrides?.lastName || "Customer",
        email: overrides?.email || `customer-${customerId}@example.com`,
        phone: overrides?.phone || null,
        address: overrides?.address || null,
        city: overrides?.city || null,
        state: overrides?.state || null,
        zip_code: overrides?.zipCode || null,
        notes: overrides?.notes || null,
        created_at: sql `now()`,
        updated_at: sql `now()`,
        deleted_at: null,
    })
        .execute();
    return customerId;
}
export async function getUserById(userId) {
    const user = await db
        .selectFrom("users")
        .selectAll()
        .where("id", "=", userId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();
    return user || null;
}
function generateTestTicketNumber() {
    const prefix = "TKT";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
    return `${prefix}-${timestamp}-${random}`;
}
function generateTestInvoiceNumber() {
    const prefix = "INV";
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
    return `${prefix}-${year}${month}-${timestamp}-${random}`;
}
export async function createTestTicket(companyId, customerId, overrides) {
    const ticketId = uuidv4();
    const ticketNumber = generateTestTicketNumber();
    await db
        .insertInto("tickets")
        .values({
        id: ticketId,
        company_id: companyId,
        location_id: overrides?.locationId || null,
        ticket_number: ticketNumber,
        customer_id: customerId,
        technician_id: overrides?.technicianId || null,
        status: overrides?.status || "new",
        priority: overrides?.priority || "medium",
        device_type: overrides?.deviceType || "iPhone",
        device_brand: overrides?.deviceBrand || null,
        device_model: overrides?.deviceModel || null,
        serial_number: overrides?.serialNumber || null,
        issue_description: overrides?.issueDescription || "Test issue description",
        diagnostic_notes: overrides?.diagnosticNotes || null,
        repair_notes: overrides?.repairNotes || null,
        estimated_completion_date: overrides?.estimatedCompletionDate
            ? overrides.estimatedCompletionDate.toISOString()
            : null,
        completed_date: overrides?.completedDate
            ? overrides.completedDate.toISOString()
            : null,
        created_at: sql `now()`,
        updated_at: sql `now()`,
        deleted_at: null,
    })
        .execute();
    return ticketId;
}
export async function createTestInvoice(companyId, customerId, overrides) {
    const invoiceId = uuidv4();
    const invoiceNumber = generateTestInvoiceNumber();
    const subtotal = overrides?.subtotal ?? 100.0;
    const taxRate = overrides?.taxRate ?? 8.5;
    const taxAmount = overrides?.taxAmount ?? subtotal * (taxRate / 100);
    const discountAmount = overrides?.discountAmount ?? 0;
    const totalAmount = overrides?.totalAmount ?? subtotal + taxAmount - discountAmount;
    await db
        .insertInto("invoices")
        .values({
        id: invoiceId,
        company_id: companyId,
        location_id: overrides?.locationId || null,
        invoice_number: invoiceNumber,
        customer_id: customerId,
        ticket_id: overrides?.ticketId || null,
        status: overrides?.status || "draft",
        issue_date: overrides?.issueDate
            ? overrides.issueDate.toISOString()
            : null,
        due_date: overrides?.dueDate
            ? overrides.dueDate.toISOString()
            : null,
        paid_date: overrides?.paidDate
            ? overrides.paidDate.toISOString()
            : null,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        notes: overrides?.notes || null,
        payment_method: overrides?.paymentMethod || null,
        payment_reference: overrides?.paymentReference || null,
        created_at: sql `now()`,
        updated_at: sql `now()`,
        deleted_at: null,
    })
        .execute();
    return invoiceId;
}
export async function createTestInvoiceItem(invoiceId, overrides) {
    const itemId = uuidv4();
    const description = overrides?.description || "Test item";
    const quantity = overrides?.quantity ?? 1;
    const unitPrice = overrides?.unitPrice ?? 50.0;
    const discountPercent = overrides?.discountPercent ?? 0;
    const itemSubtotal = quantity * unitPrice;
    const discountAmount = itemSubtotal * (discountPercent / 100);
    const finalSubtotal = itemSubtotal - discountAmount;
    await db
        .insertInto("invoice_items")
        .values({
        id: itemId,
        invoice_id: invoiceId,
        inventory_item_id: overrides?.inventoryItemId || null,
        description: description,
        quantity: quantity,
        unit_price: unitPrice,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        subtotal: finalSubtotal,
        type: overrides?.type || "service",
        created_at: sql `now()`,
        updated_at: sql `now()`,
    })
        .execute();
    return itemId;
}
export async function createTestInvitation(companyId, invitedBy, overrides) {
    const invitationId = uuidv4();
    const token = overrides?.token || crypto.randomBytes(32).toString("base64url");
    const expiresAt = overrides?.expiresAt !== undefined
        ? overrides.expiresAt
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db
        .insertInto("invitations")
        .values({
        id: invitationId,
        company_id: companyId,
        email: (overrides?.email || `invite-${invitationId}@example.com`).toLowerCase().trim(),
        token: token,
        role: overrides?.role || "technician",
        invited_by: invitedBy,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        used_at: null,
        created_at: sql `now()`,
        updated_at: sql `now()`,
        deleted_at: null,
    })
        .execute();
    return { id: invitationId, token };
}
//# sourceMappingURL=seed.helper.js.map