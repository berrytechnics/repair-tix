import { NextFunction, Request, Response } from "express";
import { Op, Sequelize } from "sequelize";

import { InventoryItemModel } from "../models/inventoryItem.model";
import { BadRequestError, NotFoundError } from "../types/errors";

/**
 * Get all inventory items
 */
export const getInventoryItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Implement filtering based on query params
    const filters: Record<string, unknown> = {};

    // Filter by category if provided
    if (req.query.category) {
      filters.category = req.query.category;
    }

    // Filter by brand if provided
    if (req.query.brand) {
      filters.brand = req.query.brand;
    }

    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === "true";
    }

    // Filter by low stock status if provided
    if (req.query.lowStock === "true") {
      filters.quantity = {
        [Op.lte]: Sequelize.col("reorderLevel"),
      };
    }

    const inventoryItems = await InventoryItemModel.findAll({
      where: filters,
      order: [["name", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: inventoryItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory item by ID
 */
export const getInventoryItemById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const inventoryItem = await InventoryItemModel.findByPk(id);

    if (!inventoryItem) {
      throw new NotFoundError(`Inventory item with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: inventoryItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new inventory item
 */
export const createInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      sku,
      name,
      description,
      category,
      subcategory,
      brand,
      model,
      compatibleWith,
      costPrice,
      sellingPrice,
      quantity,
      reorderLevel,
      location,
      supplier,
      supplierPartNumber,
    } = req.body;

    // Check if SKU already exists
    const existingItem = await InventoryItemModel.findOne({
      where: { sku },
    });

    if (existingItem) {
      throw new BadRequestError(`Item with SKU ${sku} already exists`);
    }

    // Create inventory item
    const inventoryItem = await InventoryItemModel.create({
      sku,
      name,
      description,
      category,
      subcategory,
      brand,
      model,
      compatibleWith,
      costPrice,
      sellingPrice,
      quantity,
      reorderLevel,
      location,
      supplier,
      supplierPartNumber,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: inventoryItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update inventory item
 */
export const updateInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      sku,
      name,
      description,
      category,
      subcategory,
      brand,
      model,
      compatibleWith,
      costPrice,
      sellingPrice,
      quantity,
      reorderLevel,
      location,
      supplier,
      supplierPartNumber,
      isActive,
    } = req.body;

    // Find inventory item
    const inventoryItem = await InventoryItemModel.findByPk(id);
    if (!inventoryItem) {
      throw new NotFoundError(`Inventory item with ID ${id} not found`);
    }

    // If SKU is being changed, check if the new SKU already exists
    if (sku && sku !== inventoryItem.sku) {
      const existingItem = await InventoryItemModel.findOne({
        where: {
          sku,
          id: { [Op.ne]: id }, // Not this item
        },
      });

      if (existingItem) {
        throw new BadRequestError(`Item with SKU ${sku} already exists`);
      }
    }

    // Update inventory item
    await inventoryItem.update({
      sku: sku || inventoryItem.sku,
      name: name || inventoryItem.name,
      description:
        description !== undefined ? description : inventoryItem.description,
      category: category || inventoryItem.category,
      subcategory:
        subcategory !== undefined ? subcategory : inventoryItem.subcategory,
      brand: brand !== undefined ? brand : inventoryItem.brand,
      model: model !== undefined ? model : inventoryItem.model,
      compatibleWith:
        compatibleWith !== undefined
          ? compatibleWith
          : inventoryItem.compatibleWith,
      costPrice: costPrice !== undefined ? costPrice : inventoryItem.costPrice,
      sellingPrice:
        sellingPrice !== undefined ? sellingPrice : inventoryItem.sellingPrice,
      quantity: quantity !== undefined ? quantity : inventoryItem.quantity,
      reorderLevel:
        reorderLevel !== undefined ? reorderLevel : inventoryItem.reorderLevel,
      location: location !== undefined ? location : inventoryItem.location,
      supplier: supplier !== undefined ? supplier : inventoryItem.supplier,
      supplierPartNumber:
        supplierPartNumber !== undefined
          ? supplierPartNumber
          : inventoryItem.supplierPartNumber,
      isActive: isActive !== undefined ? isActive : inventoryItem.isActive,
    });

    // Fetch the updated item
    const updatedItem = await InventoryItemModel.findByPk(id);

    res.status(200).json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete inventory item (soft delete)
 */
export const deleteInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Find inventory item
    const inventoryItem = await InventoryItemModel.findByPk(id);
    if (!inventoryItem) {
      throw new NotFoundError(`Inventory item with ID ${id} not found`);
    }

    // Soft delete (assuming Sequelize is configured for paranoid deletion)
    await inventoryItem.destroy();

    res.status(200).json({
      success: true,
      message: `Inventory item with ID ${id} has been deleted`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Adjust inventory item quantity
 */
export const adjustInventoryQuantity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    // Find inventory item
    const inventoryItem = await InventoryItemModel.findByPk(id);
    if (!inventoryItem) {
      throw new NotFoundError(`Inventory item with ID ${id} not found`);
    }

    // Calculate new quantity
    const newQuantity = inventoryItem.quantity + adjustment;

    // Prevent negative inventory (unless explicitly allowed in business logic)
    if (newQuantity < 0) {
      throw new BadRequestError(
        `Cannot adjust quantity below zero. Current quantity: ${inventoryItem.quantity}, Requested adjustment: ${adjustment}`
      );
    }

    // Update inventory quantity
    await inventoryItem.update({
      quantity: newQuantity,
    });

    // TODO: Log inventory adjustment in a separate table if needed
    // This would track who made the change, when, and why
    // Similar to how notes are tracked in the ticket system

    // Fetch the updated item
    const updatedItem = await InventoryItemModel.findByPk(id);

    res.status(200).json({
      success: true,
      data: updatedItem,
      adjustment: {
        previousQuantity: inventoryItem.quantity,
        adjustment,
        newQuantity,
        reason,
        timestamp: new Date().toISOString(),
        userId: req.currentUser?.id,
        userName: req.currentUser
          ? `${req.currentUser.firstName} ${req.currentUser.lastName}`
          : "System",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get low stock inventory items
 */
export const getLowStockItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lowStockItems = await InventoryItemModel.findAll({
      where: {
        quantity: {
          [Op.lte]: Sequelize.col("reorderLevel"),
        },
        isActive: true,
      },
      order: [
        // Order by most critical (greatest difference between reorder level and current quantity)
        [Sequelize.literal("(reorder_level - quantity)"), "DESC"],
        ["name", "ASC"],
      ],
    });

    res.status(200).json({
      success: true,
      data: lowStockItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search inventory items
 */
export const searchInventoryItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { term } = req.query;

    if (!term || typeof term !== "string") {
      throw new BadRequestError("Search term is required");
    }

    const items = await InventoryItemModel.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${term}%` } },
          { sku: { [Op.iLike]: `%${term}%` } },
          { description: { [Op.iLike]: `%${term}%` } },
          { brand: { [Op.iLike]: `%${term}%` } },
          { model: { [Op.iLike]: `%${term}%` } },
          { category: { [Op.iLike]: `%${term}%` } },
          { subcategory: { [Op.iLike]: `%${term}%` } },
        ],
      },
      order: [["name", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory stats
 */
export const getInventoryStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get total count of inventory items
    const totalItems = await InventoryItemModel.count({
      where: { isActive: true },
    });

    // Get count of low stock items
    const lowStockCount = await InventoryItemModel.count({
      where: {
        quantity: {
          [Op.lte]: Sequelize.col("reorderLevel"),
        },
        isActive: true,
      },
    });

    // Get total inventory value
    const allItems = await InventoryItemModel.findAll({
      where: { isActive: true },
      attributes: ["quantity", "costPrice"],
    });

    const totalValue = allItems.reduce((sum, item) => {
      return sum + Number(item.quantity) * Number(item.costPrice);
    }, 0);

    // Get total retail value
    const totalRetailValue = allItems.reduce((sum, item) => {
      return sum + Number(item.quantity) * Number(item.sellingPrice);
    }, 0);

    // Get count by category
    const categories = await InventoryItemModel.findAll({
      where: { isActive: true },
      attributes: [
        "category",
        [Sequelize.fn("count", Sequelize.col("id")), "count"],
      ],
      group: ["category"],
      order: [[Sequelize.literal("count"), "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        lowStockCount,
        totalValue,
        totalRetailValue,
        potentialProfit: totalRetailValue - totalValue,
        categories: categories.map((cat) => ({
          category: cat.get("category"),
          count: cat.get("count"),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
