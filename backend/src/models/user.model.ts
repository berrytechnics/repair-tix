import bcrypt from "bcryptjs";
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
  UpdateOptions,
} from "sequelize";

// Import related models types
import { TicketModel } from "./ticket.model";

// These are all the attributes in the User model
export interface UserAttributes {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "admin" | "technician" | "frontdesk";
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// Some attributes are optional in `User.build` and `User.create` calls
export type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "role" | "active"
>;

export class UserModel
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  // Add required interface properties to avoid TypeScript errors
  public id!: string;
  public firstName!: string;
  public lastName!: string;
  public email!: string;
  public password!: string;
  public role!: "admin" | "technician" | "frontdesk";
  public active!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;

  // Define methods
  public fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.get("password"));
  }

  // Association methods
  public getTickets!: HasManyGetAssociationsMixin<TicketModel>;
  public addTicket!: HasManyAddAssociationMixin<TicketModel, number>;
  public hasTicket!: HasManyHasAssociationMixin<TicketModel, number>;
  public countTickets!: HasManyCountAssociationsMixin;
  public createTicket!: HasManyCreateAssociationMixin<TicketModel>;

  // You can also pre-declare possible inclusions, these will only be populated if you
  // actively include a relation.
  public readonly tickets?: TicketModel[];

  public static associations: {
    tickets: Association<UserModel, TicketModel>;
  };
}

export default function (sequelize: Sequelize): typeof UserModel {
  UserModel.init(
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
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("admin", "technician", "frontdesk"),
        defaultValue: "technician",
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "user",
      tableName: "users",
      timestamps: true,
      paranoid: true, // Soft delete
      underscored: true, // Add this to map camelCase to snake_case
      hooks: {
        beforeCreate: async (user: UserModel) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
        beforeUpdate: async (user: UserModel) => {
          if (user.changed("password")) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
        beforeSave: async (user: UserModel) => {
          // Additional safety check to ensure password is always hashed
          if (user.changed("password")) {
            // Check if the password looks unhashed (not a bcrypt hash)
            if (
              !user.password.startsWith("$2a$") &&
              !user.password.startsWith("$2b$")
            ) {
              user.password = await bcrypt.hash(user.password, 10);
            }
          }
        },
        beforeBulkUpdate: async (
          updateOptions: UpdateOptions<UserAttributes> & {
            attributes?: { password: string };
          }
        ) => {
          // Handle bulk updates that might include password changes
          if (updateOptions.attributes?.password) {
            // Only hash if it doesn't look like a bcrypt hash already
            updateOptions.attributes.password = await bcrypt.hash(
              updateOptions.attributes.password,
              10
            );
          }
        },
      },
      indexes: [
        {
          unique: true,
          fields: ["email"],
        },
      ],
    }
  );

  return UserModel;
}
