import express from "express";
import { NotFoundError, BadRequestError, } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireLocationContext } from "../middlewares/location.middleware.js";
import { requireAdmin, requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import ticketService from "../services/ticket.service.js";
import customerService from "../services/customer.service.js";
import userService from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createTicketValidation, updateTicketValidation, assignTechnicianValidation, updateStatusValidation, addDiagnosticNotesValidation, addRepairNotesValidation, } from "../validators/ticket.validator.js";
function formatUserForResponse(user) {
    const userWithSnakeCase = user;
    return {
        id: userWithSnakeCase.id,
        firstName: userWithSnakeCase.first_name,
        lastName: userWithSnakeCase.last_name,
        email: userWithSnakeCase.email,
        role: userWithSnakeCase.role,
    };
}
const router = express.Router();
router.use(validateRequest);
router.use(requireTenantContext);
router.get("/", requireLocationContext, asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const locationId = req.locationId;
    const customerId = req.query.customerId;
    const status = req.query.status;
    const tickets = await ticketService.findAll(companyId, customerId, status, locationId);
    const ticketsWithRelations = await Promise.all(tickets.map(async (ticket) => {
        const customer = await customerService.findById(ticket.customerId, companyId);
        let technician = null;
        if (ticket.technicianId) {
            technician = await userService.findById(ticket.technicianId);
        }
        const formattedTechnician = technician ? formatUserForResponse(technician) : null;
        return {
            ...ticket,
            customer: customer
                ? {
                    id: customer.id,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email,
                    phone: customer.phone || undefined,
                }
                : null,
            technician: formattedTechnician
                ? {
                    id: formattedTechnician.id,
                    firstName: formattedTechnician.firstName,
                    lastName: formattedTechnician.lastName,
                    email: formattedTechnician.email,
                }
                : undefined,
        };
    }));
    res.json({ success: true, data: ticketsWithRelations });
}));
router.get("/:id", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const ticket = await ticketService.findById(id, companyId);
    if (!ticket) {
        throw new NotFoundError("Ticket not found");
    }
    const customer = await customerService.findById(ticket.customerId, companyId);
    let technician = null;
    if (ticket.technicianId) {
        technician = await userService.findById(ticket.technicianId);
    }
    const formattedTechnician = technician ? formatUserForResponse(technician) : null;
    const response = {
        ...ticket,
        customer: customer
            ? {
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                phone: customer.phone || undefined,
            }
            : null,
        technician: formattedTechnician
            ? {
                id: formattedTechnician.id,
                firstName: formattedTechnician.firstName,
                lastName: formattedTechnician.lastName,
                email: formattedTechnician.email,
            }
            : undefined,
    };
    res.json({ success: true, data: response });
}));
router.post("/", requireLocationContext, validate(createTicketValidation), requireRole(["admin", "technician", "frontdesk"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const locationId = req.locationId;
    const ticket = await ticketService.create(req.body, companyId, locationId);
    res.status(201).json({ success: true, data: ticket });
}));
router.put("/:id", requireLocationContext, validate(updateTicketValidation), requireRole(["admin", "technician"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const ticket = await ticketService.update(id, req.body, companyId);
    if (!ticket) {
        throw new NotFoundError("Ticket not found");
    }
    res.json({ success: true, data: ticket });
}));
router.post("/:id/assign", requireLocationContext, validate(assignTechnicianValidation), requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const { technicianId } = req.body;
    if (technicianId) {
        const technician = await userService.findById(technicianId);
        if (!technician) {
            throw new NotFoundError("Technician not found");
        }
        if (technician.company_id !== companyId) {
            throw new BadRequestError("Technician must belong to the same company");
        }
        if (technician.role !== "technician" && technician.role !== "admin") {
            throw new BadRequestError("User must be a technician or admin to be assigned to a ticket");
        }
    }
    const ticket = await ticketService.assignTechnician(id, technicianId || null, companyId);
    if (!ticket) {
        throw new NotFoundError("Ticket not found");
    }
    let technician = null;
    if (ticket.technicianId) {
        technician = await userService.findById(ticket.technicianId);
    }
    const formattedTechnician = technician ? formatUserForResponse(technician) : null;
    res.json({
        success: true,
        data: {
            ...ticket,
            technician: formattedTechnician
                ? {
                    id: formattedTechnician.id,
                    firstName: formattedTechnician.firstName,
                    lastName: formattedTechnician.lastName,
                    email: formattedTechnician.email,
                }
                : undefined,
        },
    });
}));
router.post("/:id/status", requireLocationContext, validate(updateStatusValidation), requireRole(["admin", "technician", "manager"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const { status } = req.body;
    const ticket = await ticketService.updateStatus(id, status, companyId);
    if (!ticket) {
        throw new NotFoundError("Ticket not found");
    }
    res.json({
        success: true,
        data: ticket,
    });
}));
router.post("/:id/diagnostic-notes", requireLocationContext, validate(addDiagnosticNotesValidation), requireRole(["admin", "technician"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const { notes } = req.body;
    const ticket = await ticketService.addDiagnosticNotes(id, notes, companyId);
    if (!ticket) {
        throw new NotFoundError("Ticket not found");
    }
    res.json({
        success: true,
        data: ticket,
    });
}));
router.post("/:id/repair-notes", requireLocationContext, validate(addRepairNotesValidation), requireRole(["admin", "technician"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const { notes } = req.body;
    const ticket = await ticketService.addRepairNotes(id, notes, companyId);
    if (!ticket) {
        throw new NotFoundError("Ticket not found");
    }
    res.json({
        success: true,
        data: ticket,
    });
}));
router.delete("/:id", requireLocationContext, requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const deleted = await ticketService.delete(id, companyId);
    if (!deleted) {
        throw new NotFoundError("Ticket not found");
    }
    res.json({
        success: true,
        data: { message: "Ticket deleted successfully" },
    });
}));
export default router;
//# sourceMappingURL=ticket.routes.js.map