// src/config/database.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config();

// Check if we're running in a Docker environment
const isDocker = process.env.IS_DOCKER === "true";

const config = {
  development: {
    username: process.env.DB_USER || "repair_admin",
    password: process.env.DB_PASSWORD || "repair_password",
    database: process.env.DB_NAME || "repair_business",
    // Use 'postgres' as host when in Docker, 'localhost' otherwise
    host: process.env.DB_HOST || (isDocker ? "postgres" : "localhost"),
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

// Export the entire config object for sequelize-cli
module.exports = config;
