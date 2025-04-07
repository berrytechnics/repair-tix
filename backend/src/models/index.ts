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

// Create Sequelize instance
export const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
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
