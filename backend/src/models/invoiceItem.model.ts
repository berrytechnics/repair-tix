import {
  Association,
  BelongsToCreateAssociationMixin,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  DataTypes,
  Model,
  Optional,
  Sequelize,
} from "sequelize";

// Import related models types
import { InventoryItemModel } from "./inventoryItem.model";
import { InvoiceModel } from "./invoice.model";

// These are all the attributes in the InvoiceItem model
export interface InvoiceItemAttributes {
  id: string;
  invoiceId: string;
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  subtotal: number;
  type: "part" | "service" | "other";
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `InvoiceItem.build` and `InvoiceItem.create` calls
export type InvoiceItemCreationAttributes = Optional<
  InvoiceItemAttributes,
  "id" | "inventoryItemId" | "discountPercent" | "discountAmount" | "subtotal"
>;

export class InvoiceItemModel
  extends Model<InvoiceItemAttributes, InvoiceItemCreationAttributes>
  implements InvoiceItemAttributes
{
  public id!: string;
  public invoiceId!: string;
  public inventoryItemId?: string;
  public description!: string;
  public quantity!: number;
  public unitPrice!: number;
  public discountPercent!: number;
  public discountAmount!: number;
  public subtotal!: number;
  public type!: "part" | "service" | "other";

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public getInvoice!: BelongsToGetAssociationMixin<InvoiceModel>;
  public setInvoice!: BelongsToSetAssociationMixin<InvoiceModel, string>;
  public createInvoice!: BelongsToCreateAssociationMixin<InvoiceModel>;

  public getInventoryItem!: BelongsToGetAssociationMixin<InventoryItemModel>;
  public setInventoryItem!: BelongsToSetAssociationMixin<
    InventoryItemModel,
    string
  >;
  public createInventoryItem!: BelongsToCreateAssociationMixin<InventoryItemModel>;

  // You can also pre-declare possible inclusions, these will only be populated if you
  // actively include a relation.
  public readonly invoice?: InvoiceModel;
  public readonly inventoryItem?: InventoryItemModel;

  public static associations: {
    invoice: Association<InvoiceItemModel, InvoiceModel>;
    inventoryItem: Association<InvoiceItemModel, InventoryItemModel>;
  };

  // Helper methods
  public calculateSubtotal(): number {
    const lineTotal = this.quantity * this.unitPrice;
    this.discountAmount = (lineTotal * this.discountPercent) / 100;
    this.subtotal = lineTotal - this.discountAmount;
    return this.subtotal;
  }
}

export default function (sequelize: Sequelize): typeof InvoiceItemModel {
  InvoiceItemModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      invoiceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "invoices",
          key: "id",
        },
      },
      inventoryItemId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "inventory_items",
          key: "id",
        },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      discountPercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
      },
      discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      type: {
        type: DataTypes.ENUM("part", "service", "other"),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "invoiceItem",
      tableName: "invoice_items",
      timestamps: true,
      paranoid: false, // We don't need soft delete for invoice items
      underscored: true,
      hooks: {
        beforeCreate: (item: InvoiceItemModel) => {
          item.calculateSubtotal();
        },
        beforeUpdate: (item: InvoiceItemModel) => {
          if (
            item.changed("quantity") ||
            item.changed("unitPrice") ||
            item.changed("discountPercent")
          ) {
            item.calculateSubtotal();
          }
        },
      },
      indexes: [
        {
          fields: ["invoiceId"],
        },
        {
          fields: ["inventoryItemId"],
        },
      ],
    }
  );

  return InvoiceItemModel;
}
