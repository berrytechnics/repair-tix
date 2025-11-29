import { body } from "express-validator";

/**
 * Validation rules for creating a location
 */
export const createLocationValidation = [
  body("name")
    .exists()
    .withMessage("Name is required")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Address must not exceed 255 characters"),
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must not exceed 20 characters"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Email must be a valid email address")
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

/**
 * Validation rules for updating a location
 */
export const updateLocationValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Address must not exceed 255 characters"),
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must not exceed 20 characters"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Email must be a valid email address")
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];



