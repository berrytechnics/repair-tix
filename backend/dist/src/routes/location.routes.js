import express from "express";
import { NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import locationService from "../services/location.service.js";
import userService from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createLocationValidation, updateLocationValidation, } from "../validators/location.validator.js";
const router = express.Router();
router.use(validateRequest);
router.use(requireTenantContext);
router.get("/", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const locations = await locationService.findAll(companyId);
    res.json({ success: true, data: locations });
}));
router.get("/:id", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const location = await locationService.findById(id, companyId);
    if (!location) {
        throw new NotFoundError("Location not found");
    }
    res.json({ success: true, data: location });
}));
router.get("/:id/users", requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id: locationId } = req.params;
    const users = await userService.getLocationUsers(locationId, companyId);
    res.json({ success: true, data: users });
}));
router.post("/", validate(createLocationValidation), requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const location = await locationService.create(companyId, req.body);
    res.status(201).json({ success: true, data: location });
}));
router.put("/:id", validate(updateLocationValidation), requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const location = await locationService.update(id, companyId, req.body);
    if (!location) {
        throw new NotFoundError("Location not found");
    }
    res.json({ success: true, data: location });
}));
router.delete("/:id", requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const deleted = await locationService.delete(id, companyId);
    if (!deleted) {
        throw new NotFoundError("Location not found");
    }
    res.json({
        success: true,
        data: { message: "Location deleted successfully" },
    });
}));
export default router;
//# sourceMappingURL=location.routes.js.map