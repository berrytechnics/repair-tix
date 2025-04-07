import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { Customer, Ticket, User } from "../models";
import { BadRequestError, NotFoundError } from "../types/errors";

/**
 * Get all tickets
 */
export const getTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Implement filtering based on query params
    const filters: Record<string, unknown> = {};

    // Filter by status if provided
    if (req.query.status) {
      filters.status = req.query.status;
    }

    // Filter by technician if provided
    if (req.query.technicianId) {
      filters.technicianId = req.query.technicianId;
    }

    // Filter by customer if provided
    if (req.query.customerId) {
      filters.customerId = req.query.customerId;
    }

    // Filter by priority if provided
    if (req.query.priority) {
      filters.priority = req.query.priority;
    }

    const tickets = await Ticket.findAll({
      where: filters,
      include: [
        {
          model: User,
          as: "technician",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ticket by ID
 */
export const getTicketById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findByPk(id, {
      include: [
        {
          model: User,
          as: "technician",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
      ],
    });

    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new ticket with manual ticket number generation
 */
export const createTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      customerId,
      technicianId,
      deviceType,
      deviceBrand,
      deviceModel,
      serialNumber,
      issueDescription,
      priority = "medium",
    } = req.body;

    // Validate customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new BadRequestError(`Customer with ID ${customerId} not found`);
    }

    // Validate technician exists if provided
    if (technicianId) {
      const technician = await User.findByPk(technicianId);
      if (!technician) {
        throw new BadRequestError(
          `Technician with ID ${technicianId} not found`
        );
      }

      // Check if technician has role 'technician' or 'admin'
      const role = technician.get("role");
      if (role !== "technician" && role !== "admin") {
        throw new BadRequestError(
          `User with ID ${technicianId} is not a technician`
        );
      }
    }

    // Manually generate ticket number (similar to hook logic)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    // Create separate date objects for start and end of day
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Count tickets created today to generate sequence
    const todayTickets = await Ticket.count({
      where: {
        createdAt: {
          [Op.gte]: todayStart,
          [Op.lt]: todayEnd,
        },
      },
    });

    const sequence = String(todayTickets + 1).padStart(3, "0");
    const ticketNumber = `REP-${dateStr}-${sequence}`;

    // Create ticket with the manually generated ticket number
    const ticket = await Ticket.create({
      customerId,
      technicianId,
      deviceType,
      deviceBrand,
      deviceModel,
      serialNumber,
      issueDescription,
      priority,
      status: technicianId ? "assigned" : "new",
      diagnosticNotes: JSON.stringify([]),
      repairNotes: JSON.stringify([]),
      ticketNumber, // Add the manually generated ticket number
    });

    // Fetch the created ticket with relations
    const createdTicket = await Ticket.findByPk(ticket.get("id"), {
      include: [
        {
          model: User,
          as: "technician",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: createdTicket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ticket
 */
export const updateTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      customerId,
      technicianId,
      deviceType,
      deviceBrand,
      deviceModel,
      serialNumber,
      issueDescription,
      status,
      priority,
      estimatedCompletionDate,
      completedDate,
    } = req.body;

    // Find ticket
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Validate customer exists if provided
    if (customerId) {
      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        throw new BadRequestError(`Customer with ID ${customerId} not found`);
      }
    }

    // Validate technician exists if provided
    if (technicianId) {
      const technician = await User.findByPk(technicianId);
      if (!technician) {
        throw new BadRequestError(
          `Technician with ID ${technicianId} not found`
        );
      }

      // Check if technician has role 'technician' or 'admin'
      const role = technician.get("role");
      if (role !== "technician" && role !== "admin") {
        throw new BadRequestError(
          `User with ID ${technicianId} is not a technician`
        );
      }
    }

    // Update ticket
    await ticket.update({
      customerId: customerId || ticket.get("customerId"),
      technicianId: technicianId || ticket.get("technicianId"),
      deviceType: deviceType || ticket.get("deviceType"),
      deviceBrand: deviceBrand || ticket.get("deviceBrand"),
      deviceModel: deviceModel || ticket.get("deviceModel"),
      serialNumber: serialNumber || ticket.get("serialNumber"),
      issueDescription: issueDescription || ticket.get("issueDescription"),
      status: status || ticket.get("status"),
      priority: priority || ticket.get("priority"),
      estimatedCompletionDate:
        estimatedCompletionDate || ticket.get("estimatedCompletionDate"),
      completedDate: completedDate || ticket.get("completedDate"),
    });

    // Fetch the updated ticket with relations
    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        {
          model: User,
          as: "technician",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: updatedTicket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete ticket (soft delete)
 */
export const deleteTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Find ticket
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Soft delete (assuming Sequelize is configured for paranoid deletion)
    await ticket.destroy();

    res.status(200).json({
      success: true,
      message: `Ticket with ID ${id} has been deleted`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign technician to ticket
 */
export const assignTechnician = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { technicianId, notes } = req.body;

    // Find ticket
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Validate technician exists
    const technician = await User.findByPk(technicianId);
    if (!technician) {
      throw new BadRequestError(`Technician with ID ${technicianId} not found`);
    }

    // Check if technician has role 'technician' or 'admin'
    const role = technician.get("role");
    if (role !== "technician" && role !== "admin") {
      throw new BadRequestError(
        `User with ID ${technicianId} is not a technician`
      );
    }

    // Update ticket
    await ticket.update({
      technicianId,
      status: "assigned",
    });

    // Add assignment note if provided
    if (notes) {
      const currentNotes = JSON.parse(ticket.get("diagnosticNotes") || "[]");
      const assignmentNote = {
        date: new Date().toISOString(),
        userId: req.currentUser?.id,
        userName: `${req.currentUser?.firstName} ${req.currentUser?.lastName}`,
        note: `Assigned to technician ${technician.get(
          "firstName"
        )} ${technician.get("lastName")}. ${notes}`,
      };

      await ticket.update({
        diagnosticNotes: JSON.stringify([...currentNotes, assignmentNote]),
      });
    }

    // Fetch the updated ticket with relations
    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        {
          model: User,
          as: "technician",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: updatedTicket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ticket status
 */
export const updateTicketStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Find ticket
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Update ticket status
    const oldStatus = ticket.get("status");
    await ticket.update({ status });

    // Add status change note if provided
    if (notes || oldStatus !== status) {
      const currentNotes = JSON.parse(ticket.get("diagnosticNotes") || "[]");
      const statusNote = {
        date: new Date().toISOString(),
        userId: req.currentUser?.id,
        userName: `${req.currentUser?.firstName} ${req.currentUser?.lastName}`,
        note: `Status changed from ${oldStatus} to ${status}. ${notes || ""}`,
      };

      await ticket.update({
        diagnosticNotes: JSON.stringify([...currentNotes, statusNote]),
      });
    }

    // If status is 'completed', set completedDate
    if (status === "completed" && !ticket.get("completedDate")) {
      await ticket.update({
        completedDate: new Date(),
      });
    }

    // Fetch the updated ticket with relations
    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        {
          model: User,
          as: "technician",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: updatedTicket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add diagnostic note to ticket
 */
export const addDiagnosticNote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    // Find ticket
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Add diagnostic note
    const currentNotes = JSON.parse(ticket.get("diagnosticNotes") || "[]");
    const newNote = {
      date: new Date().toISOString(),
      userId: req.currentUser?.id,
      userName: `${req.currentUser?.firstName} ${req.currentUser?.lastName}`,
      note,
    };

    await ticket.update({
      diagnosticNotes: JSON.stringify([...currentNotes, newNote]),
    });

    // Fetch the updated ticket with relations
    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        {
          model: User,
          as: "technician",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: updatedTicket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add repair note to ticket
 */
export const addRepairNote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    // Find ticket
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Add repair note
    const currentNotes = JSON.parse(ticket.get("repairNotes") || "[]");
    const newNote = {
      date: new Date().toISOString(),
      userId: req.currentUser?.id,
      userName: `${req.currentUser?.firstName} ${req.currentUser?.lastName}`,
      note,
    };

    await ticket.update({
      repairNotes: JSON.stringify([...currentNotes, newNote]),
    });

    // Fetch the updated ticket with relations
    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        {
          model: User,
          as: "technician",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: User,
          as: "customer",
          attributes: ["id", "firstName", "lastName", "email", "phone"],
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: updatedTicket,
    });
  } catch (error) {
    next(error);
  }
};
