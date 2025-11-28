import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import logger from "./logger.js";
export const db = new Kysely({
    dialect: new PostgresDialect({
        pool: new Pool({
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: parseInt(process.env.DB_PORT || "5432", 10),
            max: 10,
            idleTimeoutMillis: process.env.NODE_ENV === "test" ? 1000 : 30000,
            connectionTimeoutMillis: 2000,
        }),
    }),
    log: (event) => {
        if (process.env.NODE_ENV === "development") {
            logger.debug(`Executing query: ${event.query.sql}`);
            if (event.query.parameters && event.query.parameters.length > 0) {
                logger.debug("Parameters:", event.query.parameters);
            }
        }
    },
});
export async function testConnection() {
    try {
        await db
            .selectFrom("users")
            .select(sql `count(*)`.as("count"))
            .executeTakeFirst();
        logger.info("Database connection successful");
        return true;
    }
    catch (error) {
        logger.error("Database connection failed:", error);
        return false;
    }
}
export async function closeConnection() {
    try {
        await db.destroy();
        logger.info("Database connection closed");
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    catch (error) {
        logger.error("Error closing database connection:", error);
    }
}
export default db;
//# sourceMappingURL=connection.js.map