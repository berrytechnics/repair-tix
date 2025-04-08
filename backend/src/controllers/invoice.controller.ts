import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { CustomerModel } from "../models/customer.model";
import { InventoryItemModel } from "../models/inventoryItem.model";
import {
  InvoiceAttributes,
  InvoiceCreationAttributes,
  InvoiceModel,
} from "../models/invoice.model";
import {
  InvoiceItemCreationAttributes,
  InvoiceItemModel,
} from "../models/invoiceItem.model";
import { TicketModel } from "../models/ticket.model";

// Define types for query parameters and request bodies
interface InvoiceQueryParams {
  page?: string;
  limit?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface InvoiceItemInput {
  id?: string;
  invoiceId?: string;
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  type: "part" | "service" | "other";
}

interface PaginationMeta {
  totalInvoices: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

interface PaymentDetails {
  paymentMethod: string;
  paymentReference?: string;
  paidDate?: Date;
  notes?: string;
}

/**
 * Get all invoices with optional filtering and pagination
 * @route GET /api/invoices
 * @access Private
 */
export const getInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "20",
      status,
      customerId,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "DESC",
    }: InvoiceQueryParams = req.query;

    // Build where clause for filtering
    const whereClause: {
      status?: InvoiceAttributes["status"];
      customerId?: string;
      createdAt?: { [Op.between]: Date[] };
    } = {};

    if (status) {
      whereClause.status = status as InvoiceAttributes["status"];
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    // Parse pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Fetch invoices with pagination and includes
    const { count, rows: invoices } = await InvoiceModel.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: CustomerModel,
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: TicketModel,
          attributes: ["id", "deviceType", "deviceBrand", "deviceModel"],
        },
        {
          model: InvoiceItemModel,
          attributes: ["id", "description", "quantity", "unitPrice"],
        },
      ],
      order: [[sortBy, sortOrder]],
      limit: limitNum,
      offset: offset,
    });

    const meta: PaginationMeta = {
      totalInvoices: count,
      currentPage: pageNum,
      totalPages: Math.ceil(count / limitNum),
      pageSize: limitNum,
    };

    res.status(200).json({
      success: true,
      data: invoices,
      meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single invoice by ID
 * @route GET /api/invoices/:id
 * @access Private
 */
export const getInvoiceById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await InvoiceModel.findByPk(id, {
      include: [
        {
          model: CustomerModel,
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: TicketModel,
          attributes: ["id", "deviceType", "deviceBrand", "deviceModel"],
        },
        {
          model: InvoiceItemModel,
          include: [
            {
              model: InventoryItemModel,
              attributes: ["id", "name", "serialNumber"],
            },
          ],
        },
      ],
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new invoice
 * @route POST /api/invoices
 * @access Private
 */
export const createInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      customerId,
      ticketId,
      status = "draft",
      issueDate = new Date(),
      dueDate,
      subtotal = 0,
      taxRate = 0,
      discountAmount = 0,
      notes,
      invoiceItems = [],
    }: InvoiceCreationAttributes & {
      invoiceItems?: InvoiceItemInput[];
    } = req.body;

    // Validate customer exists
    const customer = await CustomerModel.findByPk(customerId);
    if (!customer) {
      res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
      return;
    }

    // Optional ticket validation
    if (ticketId) {
      const ticket = await TicketModel.findByPk(ticketId);
      if (!ticket) {
        res.status(400).json({
          success: false,
          message: "Invalid ticket ID",
        });
        return;
      }
    }

    // Calculate totals
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Create invoice
    const invoice = await InvoiceModel.create({
      customerId,
      ticketId,
      status,
      issueDate,
      dueDate,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      totalAmount,
      notes,
    });

    // Add invoice items if provided
    if (invoiceItems.length > 0) {
      const invoiceItemsWithInvoiceId: InvoiceItemCreationAttributes[] =
        invoiceItems.map((item) => ({
          invoiceId: invoice.id,
          inventoryItemId: item.inventoryItemId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          type: item.type,
        }));
      await InvoiceItemModel.bulkCreate(invoiceItemsWithInvoiceId);
    }

    // Fetch the full invoice with associations
    const fullInvoice = await InvoiceModel.findByPk(invoice.id, {
      include: [{ model: CustomerModel }, { model: InvoiceItemModel }],
    });

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: fullInvoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing invoice
 * @route PUT /api/invoices/:id
 * @access Private
 */
export const updateInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: Partial<InvoiceCreationAttributes> = req.body;

    // Validate customer if provided
    if (updateData.customerId) {
      const customer = await CustomerModel.findByPk(updateData.customerId);
      if (!customer) {
        res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
        return;
      }
    }

    // Validate ticket if provided
    if (updateData.ticketId) {
      const ticket = await TicketModel.findByPk(updateData.ticketId);
      if (!ticket) {
        res.status(400).json({
          success: false,
          message: "Invalid ticket ID",
        });
        return;
      }
    }

    // Find existing invoice
    const existingInvoice = await InvoiceModel.findByPk(id);
    if (!existingInvoice) {
      res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
      return;
    }

    // Recalculate totals if relevant fields are updated
    const subtotal = updateData.subtotal ?? existingInvoice.subtotal;
    const taxRate = updateData.taxRate ?? existingInvoice.taxRate;
    const discountAmount =
      updateData.discountAmount ?? existingInvoice.discountAmount;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Update invoice
    await existingInvoice.update({
      ...updateData,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      totalAmount,
    });

    // Fetch updated invoice with associations
    const updatedInvoice = await InvoiceModel.findByPk(id, {
      include: [{ model: CustomerModel }, { model: InvoiceItemModel }],
    });

    res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      data: updatedInvoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an invoice (soft delete)
 * @route DELETE /api/invoices/:id
 * @access Private
 */
export const deleteInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Find existing invoice
    const existingInvoice = await InvoiceModel.findByPk(id);
    if (!existingInvoice) {
      res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
      return;
    }

    // Soft delete the invoice
    await existingInvoice.update({
      status: "cancelled",
      deletedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add an item to an invoice
 * @route POST /api/invoices/:id/items
 * @access Private
 */
export const addInvoiceItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: invoiceId } = req.params;
    const itemData: InvoiceItemInput = req.body;

    // Validate invoice exists
    const invoice = await InvoiceModel.findByPk(invoiceId);
    if (!invoice) {
      res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
      return;
    }

    // Optional inventory item validation
    if (itemData.inventoryItemId) {
      const inventoryItem = await InventoryItemModel.findByPk(
        itemData.inventoryItemId
      );
      if (!inventoryItem) {
        res.status(400).json({
          success: false,
          message: "Invalid inventory item ID",
        });
        return;
      }
    }

    // Create invoice item
    const newInvoiceItem = await InvoiceItemModel.create({
      invoiceId,
      inventoryItemId: itemData.inventoryItemId,
      description: itemData.description,
      quantity: itemData.quantity,
      unitPrice: itemData.unitPrice,
      discountPercent: itemData.discountPercent,
      type: itemData.type,
    });

    // Recalculate invoice totals
    const invoiceItems = await InvoiceItemModel.findAll({
      where: { invoiceId },
      attributes: [
        [
          invoice.sequelize.fn(
            "SUM",
            invoice.sequelize.literal("quantity * unit_price")
          ),
          "subtotal",
        ],
      ],
    });

    const subtotal = invoiceItems[0].get("subtotal") as number;
    const taxAmount = (subtotal * invoice.taxRate) / 100;
    const totalAmount = subtotal + taxAmount - invoice.discountAmount;

    await invoice.update({
      subtotal,
      taxAmount,
      totalAmount,
    });

    res.status(201).json({
      success: true,
      message: "Invoice item added successfully",
      data: newInvoiceItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing invoice item
 * @route PUT /api/invoices/:id/items/:itemId
 * @access Private
 */
export const updateInvoiceItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: invoiceId, itemId } = req.params;
    const updateData: Partial<InvoiceItemInput> = req.body;

    // Validate invoice and invoice item exist
    const invoiceItem = await InvoiceItemModel.findOne({
      where: { id: itemId, invoiceId },
    });

    if (!invoiceItem) {
      res.status(404).json({
        success: false,
        message: "Invoice item not found",
      });
      return;
    }

    // Optional inventory item validation
    if (updateData.inventoryItemId) {
      const inventoryItem = await InventoryItemModel.findByPk(
        updateData.inventoryItemId
      );
      if (!inventoryItem) {
        res.status(400).json({
          success: false,
          message: "Invalid inventory item ID",
        });
        return;
      }
    }

    // Update invoice item
    await invoiceItem.update({
      inventoryItemId: updateData.inventoryItemId,
      description: updateData.description,
      quantity: updateData.quantity,
      unitPrice: updateData.unitPrice,
      discountPercent: updateData.discountPercent,
      type: updateData.type,
    });

    // Recalculate invoice totals
    const invoice = await InvoiceModel.findByPk(invoiceId);
    if (!invoice) {
      res.status(404).json({
        success: false,
        message: "Associated invoice not found",
      });
      return;
    }

    const invoiceItems = await InvoiceItemModel.findAll({
      where: { invoiceId },
      attributes: [
        [
          invoice.sequelize.fn(
            "SUM",
            invoice.sequelize.literal("quantity * unit_price")
          ),
          "subtotal",
        ],
      ],
    });

    const subtotal = invoiceItems[0].get("subtotal") as number;
    const taxAmount = (subtotal * invoice.taxRate) / 100;
    const totalAmount = subtotal + taxAmount - invoice.discountAmount;

    await invoice.update({
      subtotal,
      taxAmount,
      totalAmount,
    });

    res.status(200).json({
      success: true,
      message: "Invoice item updated successfully",
      data: invoiceItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove an item from an invoice
 * @route DELETE /api/invoices/:id/items/:itemId
 * @access Private
 */
export const removeInvoiceItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: invoiceId, itemId } = req.params;

    // Validate invoice and invoice item exist
    const invoiceItem = await InvoiceItemModel.findOne({
      where: { id: itemId, invoiceId },
    });

    if (!invoiceItem) {
      res.status(404).json({
        success: false,
        message: "Invoice item not found",
      });
      return;
    }

    // Delete the invoice item
    await invoiceItem.destroy();

    // Recalculate invoice totals
    const invoice = await InvoiceModel.findByPk(invoiceId);
    if (!invoice) {
      res.status(404).json({
        success: false,
        message: "Associated invoice not found",
      });
      return;
    }

    const invoiceItems = await InvoiceItemModel.findAll({
      where: { invoiceId },
      attributes: [
        [
          invoice.sequelize.fn(
            "SUM",
            invoice.sequelize.literal("quantity * unit_price")
          ),
          "subtotal",
        ],
      ],
    });

    const subtotal = (invoiceItems[0].get("subtotal") as number) || 0;
    const taxAmount = (subtotal * invoice.taxRate) / 100;
    const totalAmount = subtotal + taxAmount - invoice.discountAmount;

    await invoice.update({
      subtotal,
      taxAmount,
      totalAmount,
    });

    res.status(200).json({
      success: true,
      message: "Invoice item removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark an invoice as paid
 * @route POST /api/invoices/:id/paid
 * @access Private
 */
export const markInvoiceAsPaid = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const paymentDetails: PaymentDetails = req.body;

    // Find existing invoice
    const invoice = await InvoiceModel.findByPk(id);
    if (!invoice) {
      res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
      return;
    }

    // Check if invoice is already paid
    if (invoice.status === "paid") {
      res.status(400).json({
        success: false,
        message: "Invoice is already marked as paid",
      });
      return;
    }

    // Update invoice with payment details
    await invoice.update({
      status: "paid",
      paymentMethod: paymentDetails.paymentMethod,
      paymentReference: paymentDetails.paymentReference,
      paidDate: paymentDetails.paidDate || new Date(),
      paymentNotes: paymentDetails.notes,
    });

    // Fetch updated invoice with associations
    const updatedInvoice = await InvoiceModel.findByPk(id, {
      include: [{ model: CustomerModel }, { model: InvoiceItemModel }],
    });

    res.status(200).json({
      success: true,
      message: "Invoice marked as paid successfully",
      data: updatedInvoice,
    });
  } catch (error) {
    next(error);
  }
};
