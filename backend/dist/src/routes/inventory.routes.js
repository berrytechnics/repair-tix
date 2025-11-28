import express from "express";
import { NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireLocationContext } from "../middlewares/location.middleware.js";
import { requireManagerOrAdmin, requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import inventoryService from "../services/inventory.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createInventoryValidation, updateInventoryValidation, } from "../validators/inventory.validator.js";
const router = express.Router();
router.use(validateRequest);
router.use(requireTenantContext);
router.get("/", requireLocationContext, asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const locationId = req.locationId;
    const searchQuery = req.query.query;
    const items = await inventoryService.findAll(companyId, searchQuery, locationId);
    res.json({ success: true, data: items });
}));
router.get("/:id", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const item = await inventoryService.findById(id, companyId);
    if (!item) {
        throw new NotFoundError("Inventory item not found");
    }
    res.json({ success: true, data: item });
}));
router.post("/", requireLocationContext, validate(createInventoryValidation), requireManagerOrAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const locationId = req.locationId;
    const item = await inventoryService.create(req.body, companyId, locationId);
    res.status(201).json({ success: true, data: item });
}));
router.put("/:id", requireLocationContext, validate(updateInventoryValidation), requireManagerOrAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const item = await inventoryService.update(id, req.body, companyId);
    if (!item) {
        throw new NotFoundError("Inventory item not found");
    }
    res.json({ success: true, data: item });
}));
router.delete("/:id", requireLocationContext, requireRole(["admin"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const deleted = await inventoryService.delete(id, companyId);
    if (!deleted) {
        throw new NotFoundError("Inventory item not found");
    }
    res.json({
        success: true,
        data: { message: "Inventory item deleted successfully" },
    });
}));
export default router;
//# sourceMappingURL=inventory.routes.js.map