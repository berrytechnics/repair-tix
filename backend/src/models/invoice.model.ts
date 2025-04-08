import {
  Association,
  BelongsToCreateAssociationMixin,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  DataTypes,
  HasManyAddAssociationMixin,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  Model,
  Op,
  Optional,
  Sequelize,
} from "sequelize";

// Import related models types
import { CustomerModel } from "./customer.model";
import { InvoiceItemModel } from "./invoiceItem.model";
import { TicketModel } from "./ticket.model";

// Status enum
export type InvoiceStatus =
  | "draft"
  | "issued"
  | "paid"
  | "overdue"
  | "cancelled";

// These are all the attributes in the Invoice model
export interface InvoiceAttributes {
  id: string;
  invoiceNumber: string;
  customerId: string;
  ticketId?: string;
  status: InvoiceStatus;
  issueDate?: Date;
  dueDate?: Date;
  paidDate?: Date;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// Some attributes are optional in `Invoice.build` and `Invoice.create` calls
export type InvoiceCreationAttributes = Optional<
  InvoiceAttributes,
  | "id"
  | "invoiceNumber"
  | "ticketId"
  | "status"
  | "issueDate"
  | "dueDate"
  | "paidDate"
  | "subtotal"
  | "taxRate"
  | "taxAmount"
  | "discountAmount"
  | "totalAmount"
  | "notes"
  | "paymentMethod"
  | "paymentReference"
  | "paymentNotes"
>;

export class InvoiceModel
  extends Model<InvoiceAttributes, InvoiceCreationAttributes>
  implements InvoiceAttributes
{
  public id!: string;
  public invoiceNumber!: string;
  public customerId!: string;
  public ticketId?: string;
  public status!: InvoiceStatus;
  public issueDate?: Date;
  public dueDate?: Date;
  public paidDate?: Date;
  public subtotal!: number;
  public taxRate!: number;
  public taxAmount!: number;
  public discountAmount!: number;
  public totalAmount!: number;
  public notes?: string;
  public paymentMethod?: string;
  public paymentReference?: string;
  public paymentNotes?: string;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;

  // Associations
  public getCustomer!: BelongsToGetAssociationMixin<CustomerModel>;
  public setCustomer!: BelongsToSetAssociationMixin<CustomerModel, string>;
  public createCustomer!: BelongsToCreateAssociationMixin<CustomerModel>;

  public getTicket!: BelongsToGetAssociationMixin<TicketModel>;
  public setTicket!: BelongsToSetAssociationMixin<TicketModel, string>;
  public createTicket!: BelongsToCreateAssociationMixin<TicketModel>;

  public getInvoiceItems!: HasManyGetAssociationsMixin<InvoiceItemModel>;
  public addInvoiceItem!: HasManyAddAssociationMixin<InvoiceItemModel, number>;
  public hasInvoiceItem!: HasManyHasAssociationMixin<InvoiceItemModel, number>;
  public countInvoiceItems!: HasManyCountAssociationsMixin;
  public createInvoiceItem!: HasManyCreateAssociationMixin<InvoiceItemModel>;

  // You can also pre-declare possible inclusions, these will only be populated if you
  // actively include a relation.
  public readonly customer?: CustomerModel;
  public readonly ticket?: TicketModel;
  public readonly invoiceItems?: InvoiceItemModel[];

  public static associations: {
    customer: Association<InvoiceModel, CustomerModel>;
    ticket: Association<InvoiceModel, TicketModel>;
    invoiceItems: Association<InvoiceModel, InvoiceItemModel>;
  };

  // Helper methods
  public isPaid(): boolean {
    return this.status === "paid" && this.paidDate !== null;
  }

  public isOverdue(): boolean {
    if (this.status === "paid" || this.status === "cancelled") return false;
    if (!this.dueDate) return false;

    return new Date() > this.dueDate;
  }

  public recalculateTotals(): void {
    // This would be used after adding/removing invoice items
    // In a real application, you'd calculate based on the associated items
    this.taxAmount = (this.subtotal * this.taxRate) / 100;
    this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;
  }
}

export default function (sequelize: Sequelize): typeof InvoiceModel {
  InvoiceModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "customers",
          key: "id",
        },
      },
      ticketId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "tickets",
          key: "id",
        },
      },
      status: {
        type: DataTypes.ENUM("draft", "issued", "paid", "overdue", "cancelled"),
        defaultValue: "draft",
      },
      issueDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      paidDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      taxRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      paymentMethod: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      paymentReference: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      paymentNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "invoice",
      tableName: "invoices",
      timestamps: true,
      paranoid: true, // Soft delete
      underscored: true,
      hooks: {
        beforeCreate: async (invoice: InvoiceModel) => {
          // Generate invoice number (e.g., INV-20230501-001)
          const today = new Date();
          const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

          // Count invoices created today to generate sequence
          const todayInvoices = await sequelize.models.invoice.count({
            where: {
              createdAt: {
                [Op.gte]: new Date(today.setHours(0, 0, 0, 0)),
                [Op.lt]: new Date(today.setHours(23, 59, 59, 999)),
              },
            },
          });

          const sequence = String(todayInvoices + 1).padStart(3, "0");
          invoice.invoiceNumber = `INV-${dateStr}-${sequence}`;
        },
        beforeSave: (invoice: InvoiceModel) => {
          // Recalculate totals before save
          invoice.recalculateTotals();
        },
      },
      indexes: [
        {
          unique: true,
          fields: ["invoiceNumber"],
        },
        {
          fields: ["customerId"],
        },
        {
          fields: ["ticketId"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["createdAt"],
        },
      ],
    }
  );

  return InvoiceModel;
}
