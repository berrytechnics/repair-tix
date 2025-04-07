import { Options } from "sequelize";

interface DbConfig extends Options {
  database: string;
  username: string;
  password: string;
  host: string;
  port: number;
}

const config: DbConfig = {
  database: process.env.DB_NAME || "repair_business",
  username: process.env.DB_USER || "repair_admin",
  password: process.env.DB_PASSWORD || "repair_password",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

export default config;
