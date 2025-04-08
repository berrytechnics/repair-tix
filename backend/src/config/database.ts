// src/config/database.ts
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Check if we're running in a Docker environment
const isDocker = process.env.IS_DOCKER === "true";

interface DatabaseConfig {
  development: {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
    dialect: "postgres";
    logging: boolean | ((msg: string) => void);
    pool: {
      max: number;
      min: number;
      acquire: number;
      idle: number;
    };
  };
  test: {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
    dialect: "postgres";
    logging: boolean;
    pool: {
      max: number;
      min: number;
      acquire: number;
      idle: number;
    };
  };
  production: {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
    dialect: "postgres";
    logging: boolean;
    pool: {
      max: number;
      min: number;
      acquire: number;
      idle: number;
    };
  };
}

const config: DatabaseConfig = {
  development: {
    username: process.env.DB_USER || "repair_admin",
    password: process.env.DB_PASSWORD || "repair_password",
    database: process.env.DB_NAME || "repair_business",
    // Use 'postgres' as host when in Docker, 'localhost' otherwise
    host: isDocker ? "postgres" : process.env.DB_HOST || "localhost",
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

// Export the appropriate config based on current environment
const env = process.env.NODE_ENV || "development";
export default config[env as keyof DatabaseConfig];
