import dotenv from "dotenv";
import app from "./app";
import { sequelize } from "./models";
import logger from "./utils/logger";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

async function assertDatabaseConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info("Database connection has been established successfully.");
  } catch (error) {
    logger.error("Unable to connect to the database:", error);
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  try {
    await assertDatabaseConnection();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("SIGINT signal received: closing HTTP server");
  await sequelize.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  await sequelize.close();
  process.exit(0);
});
