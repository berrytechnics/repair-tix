import express, { Router } from "express";
import { body } from "express-validator";
import { requireAuth } from "../middlewares/required-auth";
import { validateRequest } from "../middlewares/validate-request";

// Import controllers
import {
  addInvoiceItem,
  createInvoice,
  deleteInvoice,
  getInvoiceById,
  getInvoices,
  markInvoiceAsPaid,
  removeInvoiceItem,
  updateInvoice,
  updateInvoiceItem,
} from "../controllers/invoice.controller";

const router: Router = express.Router();

/**
 * @route GET /api/invoices
 * @desc Get all invoices
 * @access Private
 */
router.get("/", requireAuth, getInvoices);

/**
 * @route GET /api/invoices/:id
 * @desc Get invoice by ID
 * @access Private
 */
router.get("/:id", requireAuth, getInvoiceById);

/**
 * @route POST /api/invoices
 * @desc Create new invoice
 * @access Private
 */
router.post(
  "/",
  requireAuth,
  [
    body("customerId").isUUID().withMessage("Valid customer ID is required"),
    body("ticketId")
      .optional()
      .isUUID()
      .withMessage("Valid ticket ID is required"),
    body("issueDate")
      .optional()
      .isISO8601()
      .withMessage("Valid issue date is required"),
    body("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Valid due date is required"),
    body("subtotal")
      .optional()
      .isNumeric()
      .withMessage("Subtotal must be a number"),
    body("taxRate")
      .optional()
      .isNumeric()
      .withMessage("Tax rate must be a number"),
    body("discountAmount")
      .optional()
      .isNumeric()
      .withMessage("Discount amount must be a number"),
    body("notes").optional(),
  ],
  validateRequest,
  createInvoice
);

/**
 * @route PUT /api/invoices/:id
 * @desc Update invoice
 * @access Private
 */
router.put(
  "/:id",
  requireAuth,
  [
    body("customerId")
      .optional()
      .isUUID()
      .withMessage("Valid customer ID is required"),
    body("ticketId")
      .optional()
      .isUUID()
      .withMessage("Valid ticket ID is required"),
    body("issueDate")
      .optional()
      .isISO8601()
      .withMessage("Valid issue date is required"),
    body("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Valid due date is required"),
    body("subtotal")
      .optional()
      .isNumeric()
      .withMessage("Subtotal must be a number"),
    body("taxRate")
      .optional()
      .isNumeric()
      .withMessage("Tax rate must be a number"),
    body("discountAmount")
      .optional()
      .isNumeric()
      .withMessage("Discount amount must be a number"),
    body("notes").optional(),
    body("status")
      .optional()
      .isIn(["draft", "issued", "paid", "overdue", "cancelled"])
      .withMessage(
        "Status must be one of: draft, issued, paid, overdue, cancelled"
      ),
  ],
  validateRequest,
  updateInvoice
);

/**
 * @route DELETE /api/invoices/:id
 * @desc Delete invoice (soft delete)
 * @access Private
 */
router.delete("/:id", requireAuth, deleteInvoice);

/**
 * @route POST /api/invoices/:id/items
 * @desc Add item to invoice
 * @access Private
 */
router.post(
  "/:id/items",
  requireAuth,
  [
    body("inventoryItemId")
      .optional()
      .isUUID()
      .withMessage("Valid inventory item ID is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("unitPrice").isNumeric().withMessage("Unit price must be a number"),
    body("discountPercent")
      .optional()
      .isNumeric()
      .withMessage("Discount percent must be a number"),
    body("type")
      .isIn(["part", "service", "other"])
      .withMessage("Type must be one of: part, service, other"),
  ],
  validateRequest,
  addInvoiceItem
);

/**
 * @route PUT /api/invoices/:id/items/:itemId
 * @desc Update invoice item
 * @access Private
 */
router.put(
  "/:id/items/:itemId",
  requireAuth,
  [
    body("inventoryItemId")
      .optional()
      .isUUID()
      .withMessage("Valid inventory item ID is required"),
    body("description")
      .optional()
      .notEmpty()
      .withMessage("Description cannot be empty"),
    body("quantity")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("unitPrice")
      .optional()
      .isNumeric()
      .withMessage("Unit price must be a number"),
    body("discountPercent")
      .optional()
      .isNumeric()
      .withMessage("Discount percent must be a number"),
    body("type")
      .optional()
      .isIn(["part", "service", "other"])
      .withMessage("Type must be one of: part, service, other"),
  ],
  validateRequest,
  updateInvoiceItem
);

/**
 * @route DELETE /api/invoices/:id/items/:itemId
 * @desc Remove item from invoice
 * @access Private
 */
router.delete("/:id/items/:itemId", requireAuth, removeInvoiceItem);

/**
 * @route POST /api/invoices/:id/paid
 * @desc Mark invoice as paid
 * @access Private
 */
router.post(
  "/:id/paid",
  requireAuth,
  [
    body("paymentMethod").notEmpty().withMessage("Payment method is required"),
    body("paymentReference").optional(),
    body("paidDate")
      .optional()
      .isISO8601()
      .withMessage("Valid paid date is required"),
    body("notes").optional(),
  ],
  validateRequest,
  markInvoiceAsPaid
);

export default router;
