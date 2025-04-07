import {
  Association,
  DataTypes,
  HasManyAddAssociationMixin,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  Model,
  Optional,
  Sequelize,
} from "sequelize";

// Import related models types
import { InvoiceItemModel } from "./invoiceItem.model";

// These are all the attributes in the InventoryItem model
export interface InventoryItemAttributes {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  compatibleWith?: string[];
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  location?: string;
  supplier?: string;
  supplierPartNumber?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// Some attributes are optional in `InventoryItem.build` and `InventoryItem.create` calls
export interface InventoryItemCreationAttributes
  extends Optional<
    InventoryItemAttributes,
    | "id"
    | "description"
    | "subcategory"
    | "brand"
    | "model"
    | "compatibleWith"
    | "reorderLevel"
    | "location"
    | "supplier"
    | "supplierPartNumber"
    | "isActive"
  > {}

export class InventoryItemModel
  extends Model<InventoryItemAttributes, InventoryItemCreationAttributes>
  implements InventoryItemAttributes
{
  public id!: string;
  public sku!: string;
  public name!: string;
  public description?: string;
  public category!: string;
  public subcategory?: string;
  public brand?: string;
  public model?: string;
  public compatibleWith?: string[];
  public costPrice!: number;
  public sellingPrice!: number;
  public quantity!: number;
  public reorderLevel!: number;
  public location?: string;
  public supplier?: string;
  public supplierPartNumber?: string;
  public isActive!: boolean;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;

  // Associations
  public getInvoiceItems!: HasManyGetAssociationsMixin<InvoiceItemModel>;
  public addInvoiceItem!: HasManyAddAssociationMixin<InvoiceItemModel, number>;
  public hasInvoiceItem!: HasManyHasAssociationMixin<InvoiceItemModel, number>;
  public countInvoiceItems!: HasManyCountAssociationsMixin;
  public createInvoiceItem!: HasManyCreateAssociationMixin<InvoiceItemModel>;

  // You can also pre-declare possible inclusions, these will only be populated if you
  // actively include a relation.
  public readonly invoiceItems?: InvoiceItemModel[];

  public static associations: {
    invoiceItems: Association<InventoryItemModel, InvoiceItemModel>;
  };

  // Helper methods
  public getMarginPercentage(): number {
    if (this.costPrice === 0) return 0;
    return ((this.sellingPrice - this.costPrice) / this.costPrice) * 100;
  }

  public isLowStock(): boolean {
    return this.quantity <= this.reorderLevel;
  }

  public stockValue(): number {
    return this.quantity * this.costPrice;
  }
}

export default function (sequelize: Sequelize): typeof InventoryItemModel {
  InventoryItemModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      sku: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      subcategory: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      brand: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      model: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      compatibleWith: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      costPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      sellingPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reorderLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      supplier: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      supplierPartNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "inventoryItem",
      tableName: "inventory_items",
      timestamps: true,
      paranoid: true, // Soft delete
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["sku"],
        },
        {
          fields: ["category"],
        },
        {
          fields: ["brand", "model"],
        },
        {
          fields: ["isActive"],
        },
      ],
    }
  );

  return InventoryItemModel;
}
