import { body } from "express-validator";

/**
 * Validation rules for creating an inventory item
 * Placeholder for future use
 */
export const createInventoryValidation = [
  body("sku")
    .exists()
    .withMessage("SKU is required")
    .trim()
    .notEmpty()
    .withMessage("SKU is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("SKU must be between 1 and 50 characters"),
  body("name")
    .exists()
    .withMessage("Name is required")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),
  body("category")
    .exists()
    .withMessage("Category is required")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Category must be between 1 and 100 characters"),
  body("costPrice")
    .exists()
    .withMessage("Cost price is required")
    .isFloat({ min: 0 })
    .withMessage("Cost price must be a positive number"),
  body("sellingPrice")
    .exists()
    .withMessage("Selling price is required")
    .isFloat({ min: 0 })
    .withMessage("Selling price must be a positive number"),
  body("quantity")
    .optional()
    .isInt()
    .withMessage("Quantity must be an integer (negative values allowed for backordered items)"),
  body("reorderLevel")
    .exists()
    .withMessage("Reorder level is required")
    .isInt({ min: 0 })
    .withMessage("Reorder level must be a non-negative integer"),
  body("isTaxable")
    .optional()
    .isBoolean()
    .withMessage("isTaxable must be a boolean"),
  body("trackQuantity")
    .optional()
    .isBoolean()
    .withMessage("trackQuantity must be a boolean"),
];

/**
 * Validation rules for updating an inventory item
 * Placeholder for future use
 */
export const updateInventoryValidation = [
  body("sku")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("SKU cannot be empty")
    .isLength({ min: 1, max: 50 })
    .withMessage("SKU must be between 1 and 50 characters"),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),
  body("category")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category cannot be empty")
    .isLength({ min: 1, max: 100 })
    .withMessage("Category must be between 1 and 100 characters"),
  body("costPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Cost price must be a positive number"),
  body("sellingPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Selling price must be a positive number"),
  // Quantity should not be directly updated - use purchase orders or adjustQuantity method
  // Removed quantity from update validation
  body("reorderLevel")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Reorder level must be a non-negative integer"),
  body("isTaxable")
    .optional()
    .isBoolean()
    .withMessage("isTaxable must be a boolean"),
  body("trackQuantity")
    .optional()
    .isBoolean()
    .withMessage("trackQuantity must be a boolean"),
  body("locationId")
    .optional({ values: "falsy" })
    .custom((value) => {
      // If empty string, null, or undefined, skip validation (allows unsetting location)
      if (!value || value === "") {
        return true;
      }
      // Otherwise, validate as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("Location ID must be a valid UUID");
      }
      return true;
    }),
];

