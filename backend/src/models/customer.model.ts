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
import { InvoiceModel } from "./invoice.model";
import { TicketModel } from "./ticket.model";

// These are all the attributes in the Customer model
export interface CustomerAttributes {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// Some attributes are optional in `Customer.build` and `Customer.create` calls
export type CustomerCreationAttributes = Optional<
  CustomerAttributes,
  "id" | "phone" | "address" | "city" | "state" | "zipCode" | "notes"
>;

export class CustomerModel
  extends Model<CustomerAttributes, CustomerCreationAttributes>
  implements CustomerAttributes
{
  public id!: string;
  public firstName!: string;
  public lastName!: string;
  public email!: string;
  public phone?: string;
  public address?: string;
  public city?: string;
  public state?: string;
  public zipCode?: string;
  public notes?: string;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | undefined;

  // Associations
  public getTickets!: HasManyGetAssociationsMixin<TicketModel>;
  public addTicket!: HasManyAddAssociationMixin<TicketModel, number>;
  public hasTicket!: HasManyHasAssociationMixin<TicketModel, number>;
  public countTickets!: HasManyCountAssociationsMixin;
  public createTicket!: HasManyCreateAssociationMixin<TicketModel>;

  public getInvoices!: HasManyGetAssociationsMixin<InvoiceModel>;
  public addInvoice!: HasManyAddAssociationMixin<InvoiceModel, number>;
  public hasInvoice!: HasManyHasAssociationMixin<InvoiceModel, number>;
  public countInvoices!: HasManyCountAssociationsMixin;
  public createInvoice!: HasManyCreateAssociationMixin<InvoiceModel>;

  // You can also pre-declare possible inclusions, these will only be populated if you
  // actively include a relation.
  public readonly tickets?: TicketModel[];
  public readonly invoices?: InvoiceModel[];

  public static associations: {
    tickets: Association<CustomerModel, TicketModel>;
    invoices: Association<CustomerModel, InvoiceModel>;
  };

  // Helper methods
  public fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public fullAddress(): string | null {
    if (!this.address) return null;

    const addressParts = [this.address];
    if (this.city) addressParts.push(this.city);
    if (this.state && this.zipCode)
      addressParts.push(`${this.state}, ${this.zipCode}`);
    else if (this.state) addressParts.push(this.state);
    else if (this.zipCode) addressParts.push(this.zipCode);

    return addressParts.join(", ");
  }
}

export default function (sequelize: Sequelize): typeof CustomerModel {
  CustomerModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      zipCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "customer",
      tableName: "customers",
      timestamps: true,
      paranoid: true, // Soft delete
      underscored: true,
      indexes: [
        {
          fields: ["email"],
        },
        {
          fields: ["phone"],
        },
        {
          fields: ["lastName", "firstName"],
        },
      ],
    }
  );

  return CustomerModel;
}
