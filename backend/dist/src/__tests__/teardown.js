import { closeConnection } from "../config/connection.js";
export default async function globalTeardown() {
    try {
        await closeConnection();
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    catch (error) {
        console.error("Error during test teardown:", error);
    }
}
//# sourceMappingURL=teardown.js.map