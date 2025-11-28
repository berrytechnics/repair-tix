import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import assetService from "./asset.service.js";
function toTicket(ticket) {
    return {
        id: ticket.id,
        locationId: ticket.location_id,
        assetId: ticket.asset_id,
        ticketNumber: ticket.ticket_number,
        customerId: ticket.customer_id,
        technicianId: ticket.technician_id,
        status: ticket.status,
        priority: ticket.priority,
        deviceType: ticket.device_type,
        deviceBrand: ticket.device_brand,
        deviceModel: ticket.device_model,
        serialNumber: ticket.serial_number,
        issueDescription: ticket.issue_description,
        diagnosticNotes: ticket.diagnostic_notes,
        repairNotes: ticket.repair_notes,
        estimatedCompletionDate: ticket.estimated_completion_date,
        completedDate: ticket.completed_date,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
    };
}
async function generateTicketNumber(companyId) {
    const prefix = "TKT";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
    const ticketNumber = `${prefix}-${timestamp}-${random}`;
    const existing = await db
        .selectFrom("tickets")
        .select("id")
        .where("ticket_number", "=", ticketNumber)
        .where("company_id", "=", companyId)
        .executeTakeFirst();
    if (existing) {
        return generateTicketNumber(companyId);
    }
    return ticketNumber;
}
export class TicketService {
    async findAll(companyId, customerId, status, locationId) {
        let query = db
            .selectFrom("tickets")
            .selectAll()
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (customerId) {
            query = query.where("customer_id", "=", customerId);
        }
        if (status) {
            query = query.where("status", "=", status);
        }
        if (locationId !== undefined) {
            if (locationId === null) {
                query = query.where("location_id", "is", null);
            }
            else {
                query = query.where("location_id", "=", locationId);
            }
        }
        const tickets = await query.execute();
        return tickets.map(toTicket);
    }
    async findById(id, companyId) {
        const ticket = await db
            .selectFrom("tickets")
            .selectAll()
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        return ticket ? toTicket(ticket) : null;
    }
    async create(data, companyId, locationId) {
        const location = await db
            .selectFrom("locations")
            .select("id")
            .where("id", "=", locationId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();
        if (!location) {
            throw new Error("Location not found or does not belong to company");
        }
        let deviceType = data.deviceType;
        let deviceBrand = data.deviceBrand || null;
        let deviceModel = data.deviceModel || null;
        let serialNumber = data.serialNumber || null;
        let assetId = data.assetId || null;
        if (data.assetId) {
            const asset = await assetService.findById(data.assetId, companyId);
            if (!asset) {
                throw new Error("Asset not found or does not belong to company");
            }
            if (asset.customerId !== data.customerId) {
                throw new Error("Asset does not belong to the specified customer");
            }
            deviceType = asset.deviceType;
            deviceBrand = asset.deviceBrand;
            deviceModel = asset.deviceModel;
            serialNumber = asset.serialNumber;
            assetId = asset.id;
        }
        const ticketNumber = await generateTicketNumber(companyId);
        const ticket = await db
            .insertInto("tickets")
            .values({
            id: uuidv4(),
            company_id: companyId,
            location_id: locationId,
            asset_id: assetId,
            ticket_number: ticketNumber,
            customer_id: data.customerId,
            technician_id: data.technicianId || null,
            status: data.status || "new",
            priority: data.priority || "medium",
            device_type: deviceType,
            device_brand: deviceBrand,
            device_model: deviceModel,
            serial_number: serialNumber,
            issue_description: data.issueDescription,
            diagnostic_notes: data.diagnosticNotes || null,
            repair_notes: data.repairNotes || null,
            estimated_completion_date: data.estimatedCompletionDate
                ? new Date(data.estimatedCompletionDate).toISOString()
                : null,
            completed_date: data.completedDate
                ? new Date(data.completedDate).toISOString()
                : null,
            created_at: sql `now()`,
            updated_at: sql `now()`,
            deleted_at: null,
        })
            .returningAll()
            .executeTakeFirstOrThrow();
        return toTicket(ticket);
    }
    async update(id, data, companyId) {
        let updateQuery = db
            .updateTable("tickets")
            .set({
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null);
        if (data.customerId !== undefined) {
            updateQuery = updateQuery.set({ customer_id: data.customerId });
        }
        if (data.assetId !== undefined) {
            if (data.assetId !== null) {
                const asset = await assetService.findById(data.assetId, companyId);
                if (!asset) {
                    throw new Error("Asset not found or does not belong to company");
                }
                const currentTicket = await this.findById(id, companyId);
                if (currentTicket && asset.customerId !== currentTicket.customerId) {
                    throw new Error("Asset does not belong to the ticket's customer");
                }
            }
            updateQuery = updateQuery.set({ asset_id: data.assetId });
        }
        if (data.locationId !== undefined) {
            if (data.locationId !== null) {
                const location = await db
                    .selectFrom("locations")
                    .select("id")
                    .where("id", "=", data.locationId)
                    .where("company_id", "=", companyId)
                    .where("deleted_at", "is", null)
                    .executeTakeFirst();
                if (!location) {
                    throw new Error("Location not found or does not belong to company");
                }
            }
            updateQuery = updateQuery.set({ location_id: data.locationId });
        }
        if (data.technicianId !== undefined) {
            updateQuery = updateQuery.set({ technician_id: data.technicianId || null });
        }
        if (data.status !== undefined) {
            updateQuery = updateQuery.set({ status: data.status });
        }
        if (data.priority !== undefined) {
            updateQuery = updateQuery.set({ priority: data.priority });
        }
        if (data.deviceType !== undefined) {
            updateQuery = updateQuery.set({ device_type: data.deviceType });
        }
        if (data.deviceBrand !== undefined) {
            updateQuery = updateQuery.set({ device_brand: data.deviceBrand || null });
        }
        if (data.deviceModel !== undefined) {
            updateQuery = updateQuery.set({ device_model: data.deviceModel || null });
        }
        if (data.serialNumber !== undefined) {
            updateQuery = updateQuery.set({ serial_number: data.serialNumber || null });
        }
        if (data.issueDescription !== undefined) {
            updateQuery = updateQuery.set({ issue_description: data.issueDescription });
        }
        if (data.diagnosticNotes !== undefined) {
            updateQuery = updateQuery.set({ diagnostic_notes: data.diagnosticNotes || null });
        }
        if (data.repairNotes !== undefined) {
            updateQuery = updateQuery.set({ repair_notes: data.repairNotes || null });
        }
        if (data.estimatedCompletionDate !== undefined) {
            updateQuery = updateQuery.set({
                estimated_completion_date: data.estimatedCompletionDate
                    ? new Date(data.estimatedCompletionDate).toISOString()
                    : null,
            });
        }
        if (data.completedDate !== undefined) {
            updateQuery = updateQuery.set({
                completed_date: data.completedDate
                    ? new Date(data.completedDate).toISOString()
                    : null,
            });
        }
        const updated = await updateQuery
            .returningAll()
            .executeTakeFirst();
        return updated ? toTicket(updated) : null;
    }
    async delete(id, companyId) {
        const result = await db
            .updateTable("tickets")
            .set({
            deleted_at: sql `now()`,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .returningAll()
            .executeTakeFirst();
        return !!result;
    }
    async assignTechnician(id, technicianId, companyId) {
        const updated = await db
            .updateTable("tickets")
            .set({
            technician_id: technicianId,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .returningAll()
            .executeTakeFirst();
        return updated ? toTicket(updated) : null;
    }
    async updateStatus(id, status, companyId) {
        const updated = await db
            .updateTable("tickets")
            .set({
            status: status,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .returningAll()
            .executeTakeFirst();
        return updated ? toTicket(updated) : null;
    }
    async addDiagnosticNotes(id, notes, companyId) {
        const current = await this.findById(id, companyId);
        if (!current) {
            return null;
        }
        const updatedNotes = current.diagnosticNotes
            ? `${current.diagnosticNotes}\n\n${notes}`
            : notes;
        const updated = await db
            .updateTable("tickets")
            .set({
            diagnostic_notes: updatedNotes,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .returningAll()
            .executeTakeFirst();
        return updated ? toTicket(updated) : null;
    }
    async addRepairNotes(id, notes, companyId) {
        const current = await this.findById(id, companyId);
        if (!current) {
            return null;
        }
        const updatedNotes = current.repairNotes
            ? `${current.repairNotes}\n\n${notes}`
            : notes;
        const updated = await db
            .updateTable("tickets")
            .set({
            repair_notes: updatedNotes,
            updated_at: sql `now()`,
        })
            .where("id", "=", id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .returningAll()
            .executeTakeFirst();
        return updated ? toTicket(updated) : null;
    }
}
export default new TicketService();
//# sourceMappingURL=ticket.service.js.map