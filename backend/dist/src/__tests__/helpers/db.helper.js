import { db } from "../../config/connection.js";
export async function cleanupTestData(testIds) {
    if (testIds.invoiceItemIds && testIds.invoiceItemIds.length > 0) {
        await db
            .deleteFrom("invoice_items")
            .where("id", "in", testIds.invoiceItemIds)
            .execute();
    }
    if (testIds.invoiceIds && testIds.invoiceIds.length > 0) {
        await db
            .deleteFrom("invoice_items")
            .where("invoice_id", "in", testIds.invoiceIds)
            .execute();
    }
    if (testIds.customerIds && testIds.customerIds.length > 0) {
        const customerIds = testIds.customerIds;
        await db
            .deleteFrom("invoice_items")
            .where("invoice_id", "in", (eb) => eb
            .selectFrom("invoices")
            .select("id")
            .where("customer_id", "in", customerIds))
            .execute();
    }
    if (testIds.ticketIds && testIds.ticketIds.length > 0) {
        const ticketIds = testIds.ticketIds;
        await db
            .deleteFrom("invoice_items")
            .where("invoice_id", "in", (eb) => eb
            .selectFrom("invoices")
            .select("id")
            .where("ticket_id", "in", ticketIds))
            .execute();
    }
    if (testIds.invoiceIds && testIds.invoiceIds.length > 0) {
        await db
            .deleteFrom("invoices")
            .where("id", "in", testIds.invoiceIds)
            .execute();
    }
    if (testIds.customerIds && testIds.customerIds.length > 0) {
        await db
            .deleteFrom("invoices")
            .where("customer_id", "in", testIds.customerIds)
            .execute();
    }
    if (testIds.ticketIds && testIds.ticketIds.length > 0) {
        await db
            .deleteFrom("invoices")
            .where("ticket_id", "in", testIds.ticketIds)
            .execute();
    }
    if (testIds.ticketIds && testIds.ticketIds.length > 0) {
        await db
            .deleteFrom("tickets")
            .where("id", "in", testIds.ticketIds)
            .execute();
    }
    if (testIds.customerIds && testIds.customerIds.length > 0) {
        await db
            .deleteFrom("customers")
            .where("id", "in", testIds.customerIds)
            .execute();
    }
    if (testIds.userIds && testIds.userIds.length > 0) {
        await db
            .deleteFrom("user_locations")
            .where("user_id", "in", testIds.userIds)
            .execute();
    }
    if (testIds.locationIds && testIds.locationIds.length > 0) {
        await db
            .deleteFrom("user_locations")
            .where("location_id", "in", testIds.locationIds)
            .execute();
    }
    if (testIds.invitationIds && testIds.invitationIds.length > 0) {
        await db
            .deleteFrom("invitations")
            .where("id", "in", testIds.invitationIds)
            .execute();
    }
    if (testIds.userIds && testIds.userIds.length > 0) {
        await db
            .deleteFrom("users")
            .where("id", "in", testIds.userIds)
            .execute();
    }
    if (testIds.companyIds && testIds.companyIds.length > 0) {
        await db
            .deleteFrom("users")
            .where("company_id", "in", testIds.companyIds)
            .execute();
    }
    if (testIds.locationIds && testIds.locationIds.length > 0) {
        await db
            .deleteFrom("locations")
            .where("id", "in", testIds.locationIds)
            .execute();
    }
    if (testIds.companyIds && testIds.companyIds.length > 0) {
        await db
            .deleteFrom("locations")
            .where("company_id", "in", testIds.companyIds)
            .execute();
    }
    if (testIds.companyIds && testIds.companyIds.length > 0) {
        await db
            .deleteFrom("companies")
            .where("id", "in", testIds.companyIds)
            .execute();
    }
}
export function getTestDb() {
    return db;
}
//# sourceMappingURL=db.helper.js.map