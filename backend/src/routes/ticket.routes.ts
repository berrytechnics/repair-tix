import express, { Router } from "express";
import { body } from "express-validator";
import {
  addDiagnosticNote,
  addRepairNote,
  assignTechnician,
  createTicket,
  deleteTicket,
  getTicketById,
  getTickets,
  updateTicket,
  updateTicketStatus,
} from "../controllers/ticket.controller";
import { requireAuth } from "../middlewares/required-auth";
import { validateRequest } from "../middlewares/validate-request";

const router: Router = express.Router();

/**
 * @route GET /api/tickets
 * @desc Get all tickets
 * @access Private
 */
router.get("/", requireAuth, getTickets);

/**
 * @route GET /api/tickets/:id
 * @desc Get ticket by ID
 * @access Private
 */
router.get("/:id", requireAuth, getTicketById);

/**
 * @route POST /api/tickets
 * @desc Create new ticket
 * @access Private
 */
router.post(
  "/",
  requireAuth,
  [
    body("customerId").isUUID().withMessage("Valid customer ID is required"),
    body("technicianId")
      .optional()
      .isUUID()
      .withMessage("Valid technician ID is required"),
    body("deviceType").notEmpty().withMessage("Device type is required"),
    body("deviceBrand").optional(),
    body("deviceModel").optional(),
    body("serialNumber").optional(),
    body("issueDescription")
      .notEmpty()
      .withMessage("Issue description is required"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Priority must be one of: low, medium, high, urgent"),
  ],
  validateRequest,
  createTicket
);

/**
 * @route PUT /api/tickets/:id
 * @desc Update ticket
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
    body("technicianId")
      .optional()
      .isUUID()
      .withMessage("Valid technician ID is required"),
    body("deviceType")
      .optional()
      .notEmpty()
      .withMessage("Device type cannot be empty"),
    body("deviceBrand").optional(),
    body("deviceModel").optional(),
    body("serialNumber").optional(),
    body("issueDescription")
      .optional()
      .notEmpty()
      .withMessage("Issue description cannot be empty"),
    body("diagnosticNotes").optional(),
    body("repairNotes").optional(),
    body("status")
      .optional()
      .isIn([
        "new",
        "assigned",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ])
      .withMessage(
        "Status must be one of: new, assigned, in_progress, on_hold, completed, cancelled"
      ),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Priority must be one of: low, medium, high, urgent"),
    body("estimatedCompletionDate")
      .optional()
      .isISO8601()
      .withMessage("Valid estimated completion date is required"),
    body("completedDate")
      .optional()
      .isISO8601()
      .withMessage("Valid completed date is required"),
  ],
  validateRequest,
  updateTicket
);

/**
 * @route DELETE /api/tickets/:id
 * @desc Delete ticket (soft delete)
 * @access Private
 */
router.delete("/:id", requireAuth, deleteTicket);

/**
 * @route POST /api/tickets/:id/assign
 * @desc Assign technician to ticket
 * @access Private
 */
router.post(
  "/:id/assign",
  requireAuth,
  [
    body("technicianId")
      .isUUID()
      .withMessage("Valid technician ID is required"),
    body("notes").optional(),
  ],
  validateRequest,
  assignTechnician
);

/**
 * @route POST /api/tickets/:id/status
 * @desc Update ticket status
 * @access Private
 */
router.post(
  "/:id/status",
  requireAuth,
  [
    body("status")
      .isIn([
        "new",
        "assigned",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ])
      .withMessage(
        "Status must be one of: new, assigned, in_progress, on_hold, completed, cancelled"
      ),
    body("notes").optional(),
  ],
  validateRequest,
  updateTicketStatus
);

/**
 * @route POST /api/tickets/:id/diagnostic
 * @desc Add diagnostic note to ticket
 * @access Private
 */
router.post(
  "/:id/diagnostic",
  requireAuth,
  [body("note").notEmpty().withMessage("Diagnostic note is required")],
  validateRequest,
  addDiagnosticNote
);

/**
 * @route POST /api/tickets/:id/repair
 * @desc Add repair note to ticket
 * @access Private
 */
router.post(
  "/:id/repair",
  requireAuth,
  [body("note").notEmpty().withMessage("Repair note is required")],
  validateRequest,
  addRepairNote
);

export default router;
