import express, { Request, Response } from "express";
import { NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireSuperuser } from "../middlewares/rbac.middleware.js";
import companyService from "../services/company.service.js";
import locationService from "../services/location.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

// GET /api/companies - List all companies (superuser only)
router.get(
  "/",
  validateRequest,
  requireSuperuser(),
  asyncHandler(async (req: Request, res: Response) => {
    const companies = await companyService.findAll();
    
    res.json({
      success: true,
      data: companies,
    });
  })
);

// GET /api/companies/:id - Get company details (superuser only)
router.get(
  "/:id",
  validateRequest,
  requireSuperuser(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const company = await companyService.findById(id);
    
    if (!company) {
      throw new NotFoundError("Company not found");
    }
    
    res.json({
      success: true,
      data: company,
    });
  })
);

// GET /api/companies/:id/locations - Get all locations for a company (superuser only)
router.get(
  "/:id/locations",
  validateRequest,
  requireSuperuser(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id: companyId } = req.params;
    
    // Verify company exists
    const company = await companyService.findById(companyId);
    if (!company) {
      throw new NotFoundError("Company not found");
    }
    
    // Get all locations for this company (includeRestricted = true for superusers)
    const locations = await locationService.findAll(companyId, true);
    
    res.json({
      success: true,
      data: locations,
    });
  })
);

// PATCH /api/companies/:id/locations/:locationId/free - Toggle free status for a location (superuser only)
router.patch(
  "/:id/locations/:locationId/free",
  validateRequest,
  requireSuperuser(),
  asyncHandler(async (req: Request, res: Response) => {
    const { id: companyId, locationId } = req.params;
    const { isFree } = req.body;
    
    if (typeof isFree !== "boolean") {
      res.status(400).json({
        success: false,
        error: { message: "isFree must be a boolean" },
      });
      return;
    }
    
    // Verify company exists
    const company = await companyService.findById(companyId);
    if (!company) {
      throw new NotFoundError("Company not found");
    }
    
    const location = await locationService.toggleFreeStatus(
      locationId,
      companyId,
      isFree
    );
    
    if (!location) {
      throw new NotFoundError("Location not found");
    }
    
    // Update subscription billing if needed
    try {
      const billingService = (await import("../services/billing.service.js")).default;
      await billingService.toggleLocationBilling(locationId, companyId, isFree);
    } catch (error) {
      // Log error but don't fail the location update
      console.error("Failed to update billing:", error);
    }
    
    res.json({
      success: true,
      data: location,
    });
  })
);

export default router;

