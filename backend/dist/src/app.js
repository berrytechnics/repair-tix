import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { HttpError, ValidationError } from "./config/errors.js";
import logger from "./config/logger.js";
import assetRoutes from "./routes/asset.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import inventoryTransferRoutes from "./routes/inventory-transfer.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import locationRoutes from "./routes/location.routes.js";
import purchaseOrderRoutes from "./routes/purchase-order.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import userRoutes from "./routes/user.routes.js";
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/api/auth", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory-transfers", inventoryTransferRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/locations", locationRoutes);
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});
app.use((req, res) => {
    res.status(404).json({ message: "Not Found" });
});
app.use((err, req, res, _next) => {
    logger.error(err.stack || err.message);
    const httpError = err instanceof HttpError
        ? err
        : new HttpError(err.message || "Internal Server Error", 500);
    const statusCode = httpError.statusCode;
    const message = httpError.message;
    const errorResponse = {
        success: false,
        error: {
            message,
            ...(httpError instanceof ValidationError && { errors: httpError.errors }),
            ...(process.env.NODE_ENV === "development" && { stack: httpError.stack }),
        },
    };
    res.status(statusCode).json(errorResponse);
});
export default app;
//# sourceMappingURL=app.js.map