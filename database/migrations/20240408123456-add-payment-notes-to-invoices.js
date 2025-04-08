"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("invoices", "paymentNotes", {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Additional notes related to the payment of the invoice",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("invoices", "paymentNotes");
  },
};
