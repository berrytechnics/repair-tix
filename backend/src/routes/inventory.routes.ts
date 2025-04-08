import express, { Router } from "express";
import { body } from "express-validator";
import { requireAuth } from "../middlewares/required-auth";
import { validateRequest } from "../middlewares/validate-request";

// Import controllers
import {
  adjustInventoryQuantity,
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItemById,
  getInventoryItems,
  getInventoryStats,
  getLowStockItems,
  searchInventoryItems,
  updateInventoryItem,
} from "../controllers/inventory.controller";

const router: Router = express.Router();

/**
 * @route GET /api/inventory
 * @desc Get all inventory items
 * @access Private
 */
router.get("/", requireAuth, getInventoryItems);

/**
 * @route GET /api/inventory/low-stock
 * @desc Get low stock inventory items
 * @access Private
 */
router.get("/low-stock", requireAuth, getLowStockItems);

/**
 * @route GET /api/inventory/search
 * @desc Search inventory items
 * @access Private
 */
router.get("/search", requireAuth, searchInventoryItems);

/**
 * @route GET /api/inventory/stats
 * @desc Get inventory statistics
 * @access Private
 */
router.get("/stats", requireAuth, getInventoryStats);

/**
 * @route GET /api/inventory/:id
 * @desc Get inventory item by ID
 * @access Private
 */
router.get("/:id", requireAuth, getInventoryItemById);

/**
 * @route POST /api/inventory
 * @desc Create new inventory item
 * @access Private
 */
router.post(
  "/",
  requireAuth,
  [
    body("sku").notEmpty().withMessage("SKU is required"),
    body("name").notEmpty().withMessage("Name is required"),
    body("category").notEmpty().withMessage("Category is required"),
    body("costPrice").isNumeric().withMessage("Cost price must be a number"),
    body("sellingPrice")
      .isNumeric()
      .withMessage("Selling price must be a number"),
    body("quantity")
      .isInt({ min: 0 })
      .withMessage("Quantity must be a non-negative integer"),
    body("reorderLevel")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Reorder level must be a non-negative integer"),
    body("description").optional(),
    body("subcategory").optional(),
    body("brand").optional(),
    body("model").optional(),
    body("compatibleWith")
      .optional()
      .isArray()
      .withMessage("Compatible with must be an array"),
    body("location").optional(),
    body("supplier").optional(),
    body("supplierPartNumber").optional(),
  ],
  validateRequest,
  createInventoryItem
);

/**
 * @route PUT /api/inventory/:id
 * @desc Update inventory item
 * @access Private
 */
router.put(
  "/:id",
  requireAuth,
  [
    body("sku").optional().notEmpty().withMessage("SKU cannot be empty"),
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("category")
      .optional()
      .notEmpty()
      .withMessage("Category cannot be empty"),
    body("costPrice")
      .optional()
      .isNumeric()
      .withMessage("Cost price must be a number"),
    body("sellingPrice")
      .optional()
      .isNumeric()
      .withMessage("Selling price must be a number"),
    body("quantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Quantity must be a non-negative integer"),
    body("reorderLevel")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Reorder level must be a non-negative integer"),
    body("description").optional(),
    body("subcategory").optional(),
    body("brand").optional(),
    body("model").optional(),
    body("compatibleWith")
      .optional()
      .isArray()
      .withMessage("Compatible with must be an array"),
    body("location").optional(),
    body("supplier").optional(),
    body("supplierPartNumber").optional(),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Is active must be a boolean"),
  ],
  validateRequest,
  updateInventoryItem
);

/**
 * @route DELETE /api/inventory/:id
 * @desc Delete inventory item (soft delete)
 * @access Private
 */
router.delete("/:id", requireAuth, deleteInventoryItem);

/**
 * @route POST /api/inventory/:id/adjust
 * @desc Adjust inventory item quantity
 * @access Private
 */
router.post(
  "/:id/adjust",
  requireAuth,
  [
    body("adjustment").isInt().withMessage("Adjustment must be an integer"),
    body("reason").notEmpty().withMessage("Reason is required"),
  ],
  validateRequest,
  adjustInventoryQuantity
);

export default router;
