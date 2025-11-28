import express from "express";
import { NotFoundError, } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireLocationContext } from "../middlewares/location.middleware.js";
import { requireAdmin, requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import invoiceService from "../services/invoice.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createInvoiceValidation, updateInvoiceValidation, createInvoiceItemValidation, updateInvoiceItemValidation, markInvoicePaidValidation, } from "../validators/invoice.validator.js";
const router = express.Router();
router.use(validateRequest);
router.use(requireTenantContext);
router.get("/", requireLocationContext, requireRole(["admin", "manager", "technician"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const locationId = req.locationId;
    const customerId = req.query.customerId;
    const status = req.query.status;
    const ticketId = req.query.ticketId;
    const invoices = await invoiceService.findAll(companyId, customerId, status, locationId, ticketId);
    res.json({ success: true, data: invoices });
}));
router.get("/:id", requireRole(["admin", "manager", "technician"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const invoice = await invoiceService.findById(id, companyId);
    if (!invoice) {
        throw new NotFoundError("Invoice not found");
    }
    res.json({ success: true, data: invoice });
}));
router.post("/", requireLocationContext, validate(createInvoiceValidation), requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const locationId = req.locationId;
    const invoice = await invoiceService.create(req.body, companyId, locationId);
    res.status(201).json({ success: true, data: invoice });
}));
router.put("/:id", requireLocationContext, validate(updateInvoiceValidation), requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const invoice = await invoiceService.update(id, req.body, companyId);
    if (!invoice) {
        throw new NotFoundError("Invoice not found");
    }
    res.json({ success: true, data: invoice });
}));
router.delete("/:id", requireLocationContext, requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const deleted = await invoiceService.delete(id, companyId);
    if (!deleted) {
        throw new NotFoundError("Invoice not found");
    }
    res.json({
        success: true,
        data: { message: "Invoice deleted successfully" },
    });
}));
router.post("/:id/items", requireLocationContext, validate(createInvoiceItemValidation), requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const item = await invoiceService.createInvoiceItem({
        invoiceId: id,
        ...req.body,
    }, companyId);
    res.status(201).json({ success: true, data: item });
}));
router.put("/:id/items/:itemId", requireLocationContext, validate(updateInvoiceItemValidation), requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id, itemId } = req.params;
    const item = await invoiceService.updateInvoiceItem(id, itemId, req.body, companyId);
    if (!item) {
        throw new NotFoundError("Invoice item not found");
    }
    res.json({ success: true, data: item });
}));
router.delete("/:id/items/:itemId", requireLocationContext, requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id, itemId } = req.params;
    const deleted = await invoiceService.deleteInvoiceItem(id, itemId, companyId);
    if (!deleted) {
        throw new NotFoundError("Invoice item not found");
    }
    res.json({
        success: true,
        data: { message: "Invoice item deleted successfully" },
    });
}));
router.post("/:id/paid", requireLocationContext, validate(markInvoicePaidValidation), requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const invoice = await invoiceService.markInvoiceAsPaid(id, req.body, companyId);
    if (!invoice) {
        throw new NotFoundError("Invoice not found");
    }
    res.json({ success: true, data: invoice });
}));
export default router;
//# sourceMappingURL=invoice.routes.js.map