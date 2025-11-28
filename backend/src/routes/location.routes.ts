import express, { Request, Response } from "express";
import { NotFoundError } from "../config/errors";
import { validateRequest } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/rbac.middleware";
import { requireTenantContext } from "../middlewares/tenant.middleware";
import { validate } from "../middlewares/validation.middleware";
import locationService from "../services/location.service";
import userService from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createLocationValidation,
  updateLocationValidation,
} from "../validators/location.validator";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /locations - List all company locations
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locations = await locationService.findAll(companyId);
    res.json({ success: true, data: locations });
  })
);

// GET /locations/:id - Get location by ID
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const location = await locationService.findById(id, companyId);
    if (!location) {
      throw new NotFoundError("Location not found");
    }
    res.json({ success: true, data: location });
  })
);

// GET /locations/:id/users - Get all users assigned to a location (admin only)
router.get(
  "/:id/users",
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: locationId } = req.params;
    const users = await userService.getLocationUsers(locationId, companyId);
    res.json({ success: true, data: users });
  })
);

// POST /locations - Create location (admin only)
router.post(
  "/",
  validate(createLocationValidation),
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const location = await locationService.create(companyId, req.body);
    res.status(201).json({ success: true, data: location });
  })
);

// PUT /locations/:id - Update location (admin only)
router.put(
  "/:id",
  validate(updateLocationValidation),
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const location = await locationService.update(id, companyId, req.body);
    if (!location) {
      throw new NotFoundError("Location not found");
    }
    res.json({ success: true, data: location });
  })
);

// DELETE /locations/:id - Delete location (admin only)
router.delete(
  "/:id",
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await locationService.delete(id, companyId);
    if (!deleted) {
      throw new NotFoundError("Location not found");
    }
    res.json({
      success: true,
      data: { message: "Location deleted successfully" },
    });
  })
);

export default router;

