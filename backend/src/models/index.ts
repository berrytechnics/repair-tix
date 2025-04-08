// src/models/index.ts
import { Sequelize } from "sequelize";
import config from "../config/database";
import logger from "../utils/logger";

// Import model factories
import defineCustomerModel from "./customer.model";
import defineInventoryItemModel from "./inventoryItem.model";
import defineInvoiceModel from "./invoice.model";
import defineInvoiceItemModel from "./invoiceItem.model";
import defineTicketModel from "./ticket.model";
import defineUserModel from "./user.model";

// Create Sequelize instance with environment variables taking precedence
export const sequelize = new Sequelize(
  process.env.DB_NAME || config.database,
  process.env.DB_USER || config.username,
  process.env.DB_PASSWORD || config.password,
  {
    host: process.env.DB_HOST || config.host,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    dialect: "postgres",
    logging: config.logging ? (msg) => logger.debug(msg) : false,
    pool: config.pool,
  }
);

// Initialize models
export const User = defineUserModel(sequelize);
export const Customer = defineCustomerModel(sequelize);
export const Ticket = defineTicketModel(sequelize);
export const InventoryItem = defineInventoryItemModel(sequelize);
export const Invoice = defineInvoiceModel(sequelize);
export const InvoiceItem = defineInvoiceItemModel(sequelize);

// Define relationships
User.hasMany(Ticket, { foreignKey: "technicianId" });
Ticket.belongsTo(User, { foreignKey: "technicianId", as: "technician" });

Customer.hasMany(Ticket, { foreignKey: "customerId" });
Ticket.belongsTo(Customer, { foreignKey: "customerId" });

Customer.hasMany(Invoice, { foreignKey: "customerId" });
Invoice.belongsTo(Customer, { foreignKey: "customerId" });

Ticket.hasOne(Invoice, { foreignKey: "ticketId" });
Invoice.belongsTo(Ticket, { foreignKey: "ticketId" });

Invoice.hasMany(InvoiceItem, { foreignKey: "invoiceId" });
InvoiceItem.belongsTo(Invoice, { foreignKey: "invoiceId" });

InventoryItem.hasMany(InvoiceItem, { foreignKey: "inventoryItemId" });
InvoiceItem.belongsTo(InventoryItem, { foreignKey: "inventoryItemId" });

export default {
  sequelize,
  Sequelize,
  User,
  Customer,
  Ticket,
  InventoryItem,
  Invoice,
  InvoiceItem,
};
