// Test database helper for cleanup and utilities
import { Kysely } from "kysely";
import { Database } from "../../config/types";
import { db } from "../../config/connection";

/**
 * Clean up test data by deleting records created during tests
 * This ensures test isolation by removing all test data after each test
 */
export async function cleanupTestData(testIds: {
  companyIds?: string[];
  userIds?: string[];
  customerIds?: string[];
  ticketIds?: string[];
  invoiceIds?: string[];
  invoiceItemIds?: string[];
  invitationIds?: string[];
}): Promise<void> {
  // Delete in reverse order of dependencies
  // 1. Delete invoice items first (they depend on invoices)
  if (testIds.invoiceItemIds && testIds.invoiceItemIds.length > 0) {
    await db
      .deleteFrom("invoice_items")
      .where("id", "in", testIds.invoiceItemIds)
      .execute();
  }
  // Delete all invoice items for invoices we're cleaning up (in case some weren't tracked)
  if (testIds.invoiceIds && testIds.invoiceIds.length > 0) {
    await db
      .deleteFrom("invoice_items")
      .where("invoice_id", "in", testIds.invoiceIds)
      .execute();
  }
  // Delete invoice items for any invoices referencing customers we're cleaning
  if (testIds.customerIds && testIds.customerIds.length > 0) {
    const customerIds = testIds.customerIds; // Type guard
    await db
      .deleteFrom("invoice_items")
      .where("invoice_id", "in", (eb) =>
        eb
          .selectFrom("invoices")
          .select("id")
          .where("customer_id", "in", customerIds)
      )
      .execute();
  }
  // Delete invoice items for any invoices referencing tickets we're cleaning
  if (testIds.ticketIds && testIds.ticketIds.length > 0) {
    const ticketIds = testIds.ticketIds; // Type guard
    await db
      .deleteFrom("invoice_items")
      .where("invoice_id", "in", (eb) =>
        eb
          .selectFrom("invoices")
          .select("id")
          .where("ticket_id", "in", ticketIds)
      )
      .execute();
  }
  // 2. Delete invoices (they depend on customers and tickets)
  // Delete tracked invoices
  if (testIds.invoiceIds && testIds.invoiceIds.length > 0) {
    await db
      .deleteFrom("invoices")
      .where("id", "in", testIds.invoiceIds)
      .execute();
  }
  // Delete any invoices referencing customers we're cleaning (in case some weren't tracked)
  if (testIds.customerIds && testIds.customerIds.length > 0) {
    await db
      .deleteFrom("invoices")
      .where("customer_id", "in", testIds.customerIds)
      .execute();
  }
  // Delete any invoices referencing tickets we're cleaning
  if (testIds.ticketIds && testIds.ticketIds.length > 0) {
    await db
      .deleteFrom("invoices")
      .where("ticket_id", "in", testIds.ticketIds)
      .execute();
  }
  // 3. Delete tickets (they depend on customers)
  if (testIds.ticketIds && testIds.ticketIds.length > 0) {
    await db
      .deleteFrom("tickets")
      .where("id", "in", testIds.ticketIds)
      .execute();
  }
  // 4. Delete customers (they depend on companies)
  if (testIds.customerIds && testIds.customerIds.length > 0) {
    await db
      .deleteFrom("customers")
      .where("id", "in", testIds.customerIds)
      .execute();
  }
  // 5. Delete invitations (they depend on companies and users)
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
      .deleteFrom("companies")
      .where("id", "in", testIds.companyIds)
      .execute();
  }
}

/**
 * Get the main database instance for use in tests
 * This is the same instance the app uses
 */
export function getTestDb(): Kysely<Database> {
  return db;
}

