import express, { Router } from "express";
import { body } from "express-validator";
import { requireAuth } from "../middlewares/required-auth";
import { validateRequest } from "../middlewares/validate-request";

// Import controllers
import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  getCustomerTickets,
  searchCustomers,
  updateCustomer,
} from "../controllers/customer.controller";

const router: Router = express.Router();

/**
 * @route GET /api/customers
 * @desc Get all customers
 * @access Private
 */
router.get("/", requireAuth, getCustomers);

/**
 * @route GET /api/customers/search
 * @desc Search customers
 * @access Private
 */
router.get("/search", requireAuth, searchCustomers);

/**
 * @route GET /api/customers/:id
 * @desc Get customer by ID
 * @access Private
 */
router.get("/:id", requireAuth, getCustomerById);

/**
 * @route GET /api/customers/:id/tickets
 * @desc Get customer tickets
 * @access Private
 */
router.get("/:id/tickets", requireAuth, getCustomerTickets);

/**
 * @route POST /api/customers
 * @desc Create new customer
 * @access Private
 */
router.post(
  "/",
  requireAuth,
  [
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("phone").optional(),
    body("address").optional(),
    body("city").optional(),
    body("state").optional(),
    body("zipCode").optional(),
    body("notes").optional(),
  ],
  validateRequest,
  createCustomer
);

/**
 * @route PUT /api/customers/:id
 * @desc Update customer
 * @access Private
 */
router.put(
  "/:id",
  requireAuth,
  [
    body("firstName")
      .optional()
      .notEmpty()
      .withMessage("First name cannot be empty"),
    body("lastName")
      .optional()
      .notEmpty()
      .withMessage("Last name cannot be empty"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email"),
    body("phone").optional(),
    body("address").optional(),
    body("city").optional(),
    body("state").optional(),
    body("zipCode").optional(),
    body("notes").optional(),
  ],
  validateRequest,
  updateCustomer
);

/**
 * @route DELETE /api/customers/:id
 * @desc Delete customer (soft delete)
 * @access Private
 */
router.delete("/:id", requireAuth, deleteCustomer);

export default router;
