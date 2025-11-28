import express from "express";
import { BadRequestError, NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireAdmin, requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import assetService from "../services/asset.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createAssetValidation, updateAssetValidation, } from "../validators/asset.validator.js";
const router = express.Router();
router.use(validateRequest);
router.use(requireTenantContext);
router.get("/", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const customerId = req.query.customerId;
    const assets = await assetService.findAll(companyId, customerId);
    res.json({ success: true, data: assets });
}));
router.get("/:id", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const asset = await assetService.findById(id, companyId);
    if (!asset) {
        throw new NotFoundError("Asset not found");
    }
    res.json({ success: true, data: asset });
}));
router.post("/", validate(createAssetValidation), requireRole(["admin", "frontdesk"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { customerId } = req.body;
    if (!customerId) {
        throw new BadRequestError("Customer ID is required");
    }
    const asset = await assetService.create(req.body, companyId, customerId);
    res.status(201).json({ success: true, data: asset });
}));
router.put("/:id", validate(updateAssetValidation), requireRole(["admin", "frontdesk"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const asset = await assetService.update(id, req.body, companyId);
    if (!asset) {
        throw new NotFoundError("Asset not found");
    }
    res.json({ success: true, data: asset });
}));
router.delete("/:id", requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const deleted = await assetService.delete(id, companyId);
    if (!deleted) {
        throw new NotFoundError("Asset not found");
    }
    res.json({
        success: true,
        data: { message: "Asset deleted successfully" },
    });
}));
export default router;
//# sourceMappingURL=asset.routes.js.map