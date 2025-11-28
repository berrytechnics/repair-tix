import express from "express";
import { NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireLocationContext } from "../middlewares/location.middleware.js";
import { requireManagerOrAdmin } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import inventoryTransferService from "../services/inventory-transfer.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createTransferValidation, } from "../validators/inventory-transfer.validator.js";
const router = express.Router();
router.use(validateRequest);
router.use(requireTenantContext);
router.get("/", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const status = req.query.status;
    const fromLocation = req.query.fromLocation;
    const toLocation = req.query.toLocation;
    const transfers = await inventoryTransferService.findAll(companyId, status, fromLocation, toLocation);
    res.json({ success: true, data: transfers });
}));
router.get("/:id", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const transfer = await inventoryTransferService.findById(id, companyId);
    if (!transfer) {
        throw new NotFoundError("Inventory transfer not found");
    }
    res.json({ success: true, data: transfer });
}));
router.post("/", requireLocationContext, validate(createTransferValidation), requireManagerOrAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const user = req.user;
    const transfer = await inventoryTransferService.create(req.body, companyId, user.id);
    res.status(201).json({ success: true, data: transfer });
}));
router.post("/:id/complete", requireManagerOrAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const transfer = await inventoryTransferService.complete(id, companyId);
    res.json({ success: true, data: transfer });
}));
router.post("/:id/cancel", requireManagerOrAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const transfer = await inventoryTransferService.cancel(id, companyId);
    res.json({ success: true, data: transfer });
}));
export default router;
//# sourceMappingURL=inventory-transfer.routes.js.map