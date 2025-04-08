"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("invoices", "payment_notes", {
    type: Sequelize.TEXT,
    allowNull: true,
    comment: "Additional notes related to the payment of the invoice",
  });
}
export async function down(queryInterface) {
  await queryInterface.removeColumn("invoices", "payment_notes");
}
