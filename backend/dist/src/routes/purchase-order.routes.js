import express from "express";
import { NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireManagerOrAdmin, requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import purchaseOrderService from "../services/purchase-order.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createPurchaseOrderValidation, receivePurchaseOrderValidation, updatePurchaseOrderValidation, } from "../validators/purchase-order.validator.js";
const router = express.Router();
router.use(validateRequest);
router.use(requireTenantContext);
router.get("/", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const status = req.query.status;
    const searchQuery = req.query.query;
    const pos = await purchaseOrderService.findAll(companyId, status, searchQuery);
    res.json({ success: true, data: pos });
}));
router.get("/:id", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const po = await purchaseOrderService.findById(id, companyId);
    if (!po) {
        throw new NotFoundError("Purchase order not found");
    }
    res.json({ success: true, data: po });
}));
router.post("/", validate(createPurchaseOrderValidation), requireManagerOrAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const po = await purchaseOrderService.create(req.body, companyId);
    res.status(201).json({ success: true, data: po });
}));
router.put("/:id", validate(updatePurchaseOrderValidation), requireManagerOrAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const po = await purchaseOrderService.update(id, req.body, companyId);
    if (!po) {
        throw new NotFoundError("Purchase order not found");
    }
    res.json({ success: true, data: po });
}));
router.delete("/:id", requireRole(["admin"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const deleted = await purchaseOrderService.delete(id, companyId);
    if (!deleted) {
        throw new NotFoundError("Purchase order not found");
    }
    res.json({
        success: true,
        data: { message: "Purchase order deleted successfully" },
    });
}));
router.post("/:id/receive", validate(receivePurchaseOrderValidation), requireManagerOrAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const po = await purchaseOrderService.receive(id, req.body, companyId);
    res.json({ success: true, data: po });
}));
router.post("/:id/cancel", requireManagerOrAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const po = await purchaseOrderService.cancel(id, companyId);
    res.json({ success: true, data: po });
}));
export default router;
//# sourceMappingURL=purchase-order.routes.js.map