// src/config/database.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  development: {
    username: process.env.DB_USER || "repair_admin",
    password: process.env.DB_PASSWORD || "repair_password",
    database: process.env.DB_NAME || "repair_business",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    dialect: "postgres",
    logging: process.env.DB_LOGGING === "true",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  test: {
    username: process.env.TEST_DB_USER || "test_user",
    password: process.env.TEST_DB_PASSWORD || "test_password",
    database: process.env.TEST_DB_NAME || "test_db",
    host: process.env.TEST_DB_HOST || "localhost",
    port: parseInt(process.env.TEST_DB_PORT || "5432", 10),
    dialect: "postgres",
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  production: {
    username: process.env.DB_USER || "repair_admin",
    password: process.env.DB_PASSWORD || "repair_password",
    database: process.env.DB_NAME || "repair_business",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    dialect: "postgres",
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 10000,
    },
  },
};
