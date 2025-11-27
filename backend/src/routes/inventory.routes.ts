import express, { Request, Response } from "express";
import { validateRequest } from "../middlewares/auth.middleware";
import { requireTenantContext } from "../middlewares/tenant.middleware";
import inventoryService from "../services/inventory.service";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /api/inventory - List all inventory items (with optional search)
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const searchQuery = req.query.query as string | undefined;
    const items = await inventoryService.findAll(companyId, searchQuery);
    res.json({ success: true, data: items });
  })
);

export default router;

