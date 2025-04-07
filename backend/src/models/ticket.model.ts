import {
  Association,
  BelongsToCreateAssociationMixin,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  DataTypes,
  HasOneCreateAssociationMixin,
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin,
  Model,
  Op,
  Optional,
  Sequelize,
} from "sequelize";

// Import related models types
import { CustomerModel } from "./customer.model";
import { InvoiceModel } from "./invoice.model";
import { UserModel } from "./user.model";

// Status and priority enums
export type TicketStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

// These are all the attributes in the Ticket model
export interface TicketAttributes {
  id: string;
  ticketNumber: string;
  customerId: string;
  technicianId?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  deviceType: string;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  serialNumber?: string | null;
  issueDescription: string;
  diagnosticNotes?: string | null;
  repairNotes?: string | null;
  estimatedCompletionDate?: Date | null;
  completedDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

// Some attributes are optional in `Ticket.build` and `Ticket.create` calls
export type TicketCreationAttributes = Optional<
  TicketAttributes,
  | "id"
  | "ticketNumber"
  | "technicianId"
  | "status"
  | "priority"
  | "deviceBrand"
  | "deviceModel"
  | "serialNumber"
  | "diagnosticNotes"
  | "repairNotes"
  | "estimatedCompletionDate"
  | "completedDate"
>;

export class TicketModel
  extends Model<TicketAttributes, TicketCreationAttributes>
  implements TicketAttributes
{
  public id!: string;
  public ticketNumber!: string;
  public customerId!: string;
  public technicianId?: string;
  public status!: TicketStatus;
  public priority!: TicketPriority;
  public deviceType!: string;
  public deviceBrand?: string;
  public deviceModel?: string;
  public serialNumber?: string;
  public issueDescription!: string;
  public diagnosticNotes?: string;
  public repairNotes?: string;
  public estimatedCompletionDate?: Date;
  public completedDate?: Date;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;

  // Associations
  public getCustomer!: BelongsToGetAssociationMixin<CustomerModel>;
  public setCustomer!: BelongsToSetAssociationMixin<CustomerModel, string>;
  public createCustomer!: BelongsToCreateAssociationMixin<CustomerModel>;

  public getTechnician!: BelongsToGetAssociationMixin<UserModel>;
  public setTechnician!: BelongsToSetAssociationMixin<UserModel, string>;
  public createTechnician!: BelongsToCreateAssociationMixin<UserModel>;

  public getInvoice!: HasOneGetAssociationMixin<InvoiceModel>;
  public setInvoice!: HasOneSetAssociationMixin<InvoiceModel, string>;
  public createInvoice!: HasOneCreateAssociationMixin<InvoiceModel>;

  // You can also pre-declare possible inclusions, these will only be populated if you
  // actively include a relation.
  public readonly customer?: CustomerModel;
  public readonly technician?: UserModel;
  public readonly invoice?: InvoiceModel;

  public static associations: {
    customer: Association<TicketModel, CustomerModel>;
    technician: Association<TicketModel, UserModel>;
    invoice: Association<TicketModel, InvoiceModel>;
  };

  // Helper methods
  public deviceFullName(): string {
    const parts = [this.deviceType];
    if (this.deviceBrand) parts.push(this.deviceBrand);
    if (this.deviceModel) parts.push(this.deviceModel);
    return parts.join(" ");
  }

  public isComplete(): boolean {
    return this.status === "completed" && this.completedDate !== null;
  }
}

export default function (sequelize: Sequelize): typeof TicketModel {
  TicketModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      ticketNumber: {
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
      technicianId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      status: {
        type: DataTypes.ENUM(
          "new",
          "assigned",
          "in_progress",
          "on_hold",
          "completed",
          "cancelled"
        ),
        defaultValue: "new",
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "urgent"),
        defaultValue: "medium",
      },
      deviceType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      deviceBrand: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      deviceModel: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      serialNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      issueDescription: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      diagnosticNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      repairNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      estimatedCompletionDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ticket",
      tableName: "tickets",
      timestamps: true,
      paranoid: true, // Soft delete
      underscored: true,
      hooks: {
        beforeCreate: async (ticket: TicketModel) => {
          // Generate ticket number (e.g., REP-20230501-001)
          const today = new Date();
          const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

          // Count tickets created today to generate sequence
          const todayTickets = await sequelize.models.ticket.count({
            where: {
              createdAt: {
                [Op.gte]: new Date(today.setHours(0, 0, 0, 0)),
                [Op.lt]: new Date(today.setHours(23, 59, 59, 999)),
              },
            },
          });

          const sequence = String(todayTickets + 1).padStart(3, "0");
          ticket.ticketNumber = `REP-${dateStr}-${sequence}`;
        },
      },
      indexes: [
        {
          unique: true,
          fields: ["ticketNumber"],
        },
        {
          fields: ["customerId"],
        },
        {
          fields: ["technicianId"],
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

  return TicketModel;
}
