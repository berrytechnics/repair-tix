import express from "express";
import { BadRequestError, NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import invitationService from "../services/invitation.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createInvitationValidation } from "../validators/invitation.validator.js";
const router = express.Router();
router.use(validateRequest);
router.use(requireTenantContext);
router.post("/", validate(createInvitationValidation), requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const userId = req.user.id;
    const { email, role, expiresAt } = req.body;
    const existingInvitation = await invitationService.findByEmailAndCompany(email, companyId);
    if (existingInvitation) {
        throw new BadRequestError("An active invitation already exists for this email address");
    }
    const invitation = await invitationService.create(companyId, { email, role, expiresAt: expiresAt ? new Date(expiresAt) : undefined }, userId);
    res.status(201).json({
        success: true,
        data: invitation,
    });
}));
router.get("/", requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const invitations = await invitationService.findAll(companyId);
    res.json({
        success: true,
        data: invitations,
    });
}));
router.delete("/:id", requireAdmin(), asyncHandler(async (req, res) => {
    const companyId = req.companyId;
    const { id } = req.params;
    const revoked = await invitationService.revoke(id, companyId);
    if (!revoked) {
        throw new NotFoundError("Invitation not found");
    }
    res.json({
        success: true,
        data: { message: "Invitation revoked successfully" },
    });
}));
export default router;
//# sourceMappingURL=invitation.routes.js.map