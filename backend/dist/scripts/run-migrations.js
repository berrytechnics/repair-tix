import dotenv from "dotenv";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();
const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "repair_business",
    user: process.env.DB_USER || "repair_admin",
    password: process.env.DB_PASSWORD || "repair_password",
    port: parseInt(process.env.DB_PORT || "5432", 10),
});
async function runMigrations() {
    const client = await pool.connect();
    try {
        let migrationsDir = join(__dirname, "../../database/migrations");
        if (!existsSync(migrationsDir)) {
            migrationsDir = join(__dirname, "../database/migrations");
            if (!existsSync(migrationsDir)) {
                migrationsDir = join(process.cwd(), "database/migrations");
            }
        }
        const files = readdirSync(migrationsDir)
            .filter((file) => file.endsWith(".sql"))
            .sort();
        console.log(`Found ${files.length} migration files`);
        for (const file of files) {
            const filePath = join(migrationsDir, file);
            const sql = readFileSync(filePath, "utf-8");
            console.log(`Running migration: ${file}`);
            try {
                await client.query(sql);
                console.log(`✓ Migration ${file} completed successfully`);
            }
            catch (error) {
                if (error instanceof Error && error.message.includes("already exists")) {
                    console.log(`⚠ Migration ${file} skipped (already applied)`);
                }
                else {
                    console.error(`✗ Migration ${file} failed:`, error);
                    throw error;
                }
            }
        }
        console.log("\n✓ All migrations completed successfully");
    }
    finally {
        client.release();
        await pool.end();
    }
}
runMigrations().catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
});
//# sourceMappingURL=run-migrations.js.map