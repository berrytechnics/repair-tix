import express from "express";
import { BadRequestError, NotFoundError, } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireAdmin, requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import assetService from "../services/asset.service.js";
import customerService from "../services/customer.service.js";
import invoiceService from "../services/invoice.service.js";
import ticketService from "../services/ticket.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createCustomerValidation, updateCustomerValidation, } from "../validators/customer.validator.js";
const router = express.Router();
router.use(validateRequest);
router.use(requireTenantContext);
router.get("/", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const searchQuery = req.query.query;
    const customers = await customerService.findAll(companyId, searchQuery);
    res.json({ success: true, data: customers });
}));
router.get("/search", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const query = req.query.query;
    if (!query) {
        throw new BadRequestError("Search query is required");
    }
    const customers = await customerService.findAll(companyId, query);
    res.json({ success: true, data: customers });
}));
router.get("/:id", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const customer = await customerService.findById(id, companyId);
    if (!customer) {
        throw new NotFoundError("Customer not found");
    }
    res.json({ success: true, data: customer });
}));
router.post("/", validate(createCustomerValidation), requireRole(["admin", "frontdesk"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const customer = await customerService.create(req.body, companyId);
    res.status(201).json({ success: true, data: customer });
}));
router.put("/:id", validate(updateCustomerValidation), requireRole(["admin", "frontdesk"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const customer = await customerService.update(id, req.body, companyId);
    if (!customer) {
        throw new NotFoundError("Customer not found");
    }
    res.json({ success: true, data: customer });
}));
router.delete("/:id", requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const deleted = await customerService.delete(id, companyId);
    if (!deleted) {
        throw new NotFoundError("Customer not found");
    }
    res.json({
        success: true,
        data: { message: "Customer deleted successfully" },
    });
}));
router.get("/:id/tickets", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const tickets = await ticketService.findAll(companyId, id, undefined);
    res.json({ success: true, data: tickets });
}));
router.get("/:id/invoices", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const invoices = await invoiceService.findAll(companyId, id, undefined);
    res.json({ success: true, data: invoices });
}));
router.get("/:id/assets", asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const assets = await assetService.findAll(companyId, id);
    res.json({ success: true, data: assets });
}));
export default router;
//# sourceMappingURL=customer.routes.js.map