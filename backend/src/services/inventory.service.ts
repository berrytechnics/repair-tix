// src/services/inventory.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { BadRequestError } from "../config/errors.js";
import { InventoryItemTable } from "../config/types.js";

// Input DTOs
export interface CreateInventoryItemDto {
  sku: string;
  name: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  compatibleWith?: string[] | null;
  costPrice: number;
  sellingPrice: number;
  quantity?: number; // Allow negative for backordered items
  reorderLevel?: number;
  location?: string | null;
  supplier?: string | null;
  supplierPartNumber?: string | null;
  isActive?: boolean;
  isTaxable?: boolean;
  trackQuantity?: boolean;
}

export interface UpdateInventoryItemDto {
  sku?: string;
  name?: string;
  description?: string | null;
  category?: string;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  compatibleWith?: string[] | null;
  costPrice?: number;
  sellingPrice?: number;
  // Note: quantity should not be directly updated - use purchase orders or adjustQuantity
  reorderLevel?: number;
  locationId?: string | null;
  location?: string | null; // Keep for physical location description
  supplier?: string | null;
  supplierPartNumber?: string | null;
  isActive?: boolean;
  isTaxable?: boolean;
  trackQuantity?: boolean;
}

// Output type - converts snake_case to camelCase
// Use string for ID since that's what Kysely returns at runtime
export type InventoryItem = Omit<
  InventoryItemTable,
  | "id"
  | "company_id"
  | "location_id"
  | "sku"
  | "name"
  | "description"
  | "category"
  | "subcategory"
  | "brand"
  | "model"
  | "compatible_with"
  | "cost_price"
  | "selling_price"
  | "quantity"
  | "reorder_level"
  | "location"
  | "supplier"
  | "supplier_part_number"
  | "is_active"
  | "is_taxable"
  | "track_quantity"
  | "created_at"
  | "updated_at"
  | "deleted_at"
> & {
  id: string;
  locationId: string | null;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  compatibleWith: string[] | null;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  location: string | null; // Keep for backward compatibility (physical location description)
  supplier: string | null;
  supplierPartNumber: string | null;
  isActive: boolean;
  isTaxable: boolean;
  trackQuantity: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to InventoryItem (snake_case to camelCase)
function toInventoryItem(item: {
  id: string;
  company_id: string;
  location_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  compatible_with: string[] | null;
  cost_price: number;
  selling_price: number;
  quantity: number;
  reorder_level: number;
  location: string | null;
  supplier: string | null;
  supplier_part_number: string | null;
  is_active: boolean;
  is_taxable: boolean;
  track_quantity: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): InventoryItem {
  return {
    id: item.id as string,
    locationId: item.location_id as string | null,
    sku: item.sku,
    name: item.name,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory,
    brand: item.brand,
    model: item.model,
    compatibleWith: item.compatible_with,
    costPrice: item.cost_price,
    sellingPrice: item.selling_price,
    quantity: item.quantity,
    reorderLevel: item.reorder_level,
    location: item.location,
    supplier: item.supplier,
    supplierPartNumber: item.supplier_part_number,
    isActive: item.is_active,
    isTaxable: item.is_taxable,
    trackQuantity: item.track_quantity,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export class InventoryService {
  async findAll(
    companyId: string,
    searchQuery?: string,
    locationId?: string | null
  ): Promise<InventoryItem[]> {
    let query = db
      .selectFrom("inventory_items")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (searchQuery) {
      const search = `%${searchQuery.toLowerCase()}%`;
      query = query.where((eb) =>
        eb.or([
          eb("sku", "ilike", search),
          eb("name", "ilike", search),
          eb("category", "ilike", search),
          eb("brand", "ilike", search),
          eb("model", "ilike", search),
        ])
      );
    }

    if (locationId !== undefined) {
      if (locationId === null) {
        query = query.where("location_id", "is", null);
      } else {
        query = query.where("location_id", "=", locationId);
      }
    }

    const items = await query.execute();
    return items.map(toInventoryItem);
  }

  async findById(id: string, companyId: string): Promise<InventoryItem | null> {
    const item = await db
      .selectFrom("inventory_items")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return item ? toInventoryItem(item) : null;
  }

  async create(data: CreateInventoryItemDto, companyId: string, locationId: string): Promise<InventoryItem> {
    // Verify location belongs to company
    const location = await db
      .selectFrom("locations")
      .select("id")
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      throw new BadRequestError("Location not found or does not belong to company");
    }

    // Check SKU uniqueness within company (company-wide, not location-specific)
    const existing = await db
      .selectFrom("inventory_items")
      .select("id")
      .where("sku", "=", data.sku)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (existing) {
      throw new BadRequestError(`SKU ${data.sku} already exists in this company`);
    }

    const item = await db
      .insertInto("inventory_items")
      .values({
        id: uuidv4(),
        company_id: companyId,
        location_id: locationId,
        sku: data.sku,
        name: data.name,
        description: data.description || null,
        category: data.category,
        subcategory: data.subcategory || null,
        brand: data.brand || null,
        model: data.model || null,
        compatible_with: data.compatibleWith || null,
        cost_price: data.costPrice,
        selling_price: data.sellingPrice,
        quantity: data.quantity ?? 0, // Allow negative for backordered items
        reorder_level: data.reorderLevel ?? 5,
        location: data.location || null, // Keep for physical location description
        supplier: data.supplier || null,
        supplier_part_number: data.supplierPartNumber || null,
        is_active: data.isActive ?? true,
        is_taxable: data.isTaxable !== undefined ? data.isTaxable : true,
        track_quantity: data.trackQuantity !== undefined ? data.trackQuantity : true,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toInventoryItem(item);
  }

  async update(id: string, data: UpdateInventoryItemDto, companyId: string): Promise<InventoryItem | null> {
    // Check if item exists
    const existing = await db
      .selectFrom("inventory_items")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!existing) {
      return null;
    }

    // If SKU is being updated, check uniqueness within company (company-wide)
    if (data.sku !== undefined && data.sku !== existing.sku) {
      const skuExists = await db
        .selectFrom("inventory_items")
        .select("id")
        .where("sku", "=", data.sku)
        .where("company_id", "=", companyId)
        .where("id", "!=", id)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      if (skuExists) {
        throw new BadRequestError(`SKU ${data.sku} already exists in this company`);
      }
    }

    let updateQuery = db
      .updateTable("inventory_items")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (data.sku !== undefined) {
      updateQuery = updateQuery.set({ sku: data.sku });
    }
    if (data.name !== undefined) {
      updateQuery = updateQuery.set({ name: data.name });
    }
    if (data.description !== undefined) {
      updateQuery = updateQuery.set({ description: data.description || null });
    }
    if (data.category !== undefined) {
      updateQuery = updateQuery.set({ category: data.category });
    }
    if (data.subcategory !== undefined) {
      updateQuery = updateQuery.set({ subcategory: data.subcategory || null });
    }
    if (data.brand !== undefined) {
      updateQuery = updateQuery.set({ brand: data.brand || null });
    }
    if (data.model !== undefined) {
      updateQuery = updateQuery.set({ model: data.model || null });
    }
    if (data.compatibleWith !== undefined) {
      updateQuery = updateQuery.set({ compatible_with: data.compatibleWith || null });
    }
    // Track if we need to sync pricing
    let needsPriceSync = false;
    let newSellingPrice = existing.selling_price;
    let newCostPrice = existing.cost_price;

    if (data.costPrice !== undefined) {
      updateQuery = updateQuery.set({ cost_price: data.costPrice });
      newCostPrice = data.costPrice;
      needsPriceSync = true;
    }
    if (data.sellingPrice !== undefined) {
      updateQuery = updateQuery.set({ selling_price: data.sellingPrice });
      newSellingPrice = data.sellingPrice;
      needsPriceSync = true;
    }
    // Note: quantity is intentionally excluded - should be updated via purchase orders or adjustQuantity
    if (data.locationId !== undefined) {
      // If setting location, verify it belongs to company
      if (data.locationId !== null) {
        const location = await db
          .selectFrom("locations")
          .select("id")
          .where("id", "=", data.locationId)
          .where("company_id", "=", companyId)
          .where("deleted_at", "is", null)
          .executeTakeFirst();

        if (!location) {
          throw new BadRequestError("Location not found or does not belong to company");
        }

        // Note: SKU uniqueness is company-wide, so no need to check per location
      }
      updateQuery = updateQuery.set({ location_id: data.locationId });
    }
    if (data.reorderLevel !== undefined) {
      updateQuery = updateQuery.set({ reorder_level: data.reorderLevel });
    }
    if (data.location !== undefined) {
      updateQuery = updateQuery.set({ location: data.location || null });
    }
    if (data.supplier !== undefined) {
      updateQuery = updateQuery.set({ supplier: data.supplier || null });
    }
    if (data.supplierPartNumber !== undefined) {
      updateQuery = updateQuery.set({ supplier_part_number: data.supplierPartNumber || null });
    }
    if (data.isActive !== undefined) {
      updateQuery = updateQuery.set({ is_active: data.isActive });
    }
    if (data.isTaxable !== undefined) {
      updateQuery = updateQuery.set({ is_taxable: data.isTaxable });
    }
    if (data.trackQuantity !== undefined) {
      updateQuery = updateQuery.set({ track_quantity: data.trackQuantity });
    }

    const updated = await updateQuery.returningAll().executeTakeFirst();

    // Sync pricing across all locations with same SKU if prices were updated
    if (needsPriceSync && updated) {
      await this.syncPricingAcrossLocations(existing.sku, companyId, newSellingPrice, newCostPrice);
    }

    return updated ? toInventoryItem(updated) : null;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    // Check if item exists and quantity is 0
    const item = await db
      .selectFrom("inventory_items")
      .select(["id", "quantity"])
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!item) {
      return false;
    }

    if (item.quantity !== 0) {
      throw new BadRequestError("Cannot delete inventory item with non-zero quantity. Quantity must be 0.");
    }

    const result = await db
      .updateTable("inventory_items")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return !!result;
  }

  /**
   * Adjust inventory quantity (used by purchase orders and other processes)
   * Allows negative quantities for backordered items
   * Only adjusts if track_quantity is true
   */
  async adjustQuantity(id: string, delta: number, companyId: string): Promise<InventoryItem> {
    const item = await db
      .selectFrom("inventory_items")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!item) {
      throw new BadRequestError("Inventory item not found");
    }

    // If track_quantity is false, don't adjust quantity
    if (!item.track_quantity) {
      return toInventoryItem(item);
    }

    const newQuantity = item.quantity + delta;

    const updated = await db
      .updateTable("inventory_items")
      .set({
        quantity: newQuantity,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return toInventoryItem(updated);
  }

  /**
   * Sync pricing across all locations for a given SKU
   * Ensures company-wide pricing consistency
   */
  private async syncPricingAcrossLocations(
    sku: string,
    companyId: string,
    sellingPrice: number,
    costPrice: number
  ): Promise<void> {
    await db
      .updateTable("inventory_items")
      .set({
        selling_price: sellingPrice,
        cost_price: costPrice,
        updated_at: sql`now()`,
      })
      .where("sku", "=", sku)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .execute();
  }

  /**
   * Update cost using dollar-cost averaging when receiving purchase orders
   * Formula: new_cost = ((current_quantity * current_cost) + (received_quantity * received_cost)) / (current_quantity + received_quantity)
   * Only updates if track_quantity is true
   */
  async updateCostWithDollarCostAverage(
    inventoryItemId: string,
    receivedQuantity: number,
    receivedCost: number,
    companyId: string
  ): Promise<InventoryItem> {
    const item = await db
      .selectFrom("inventory_items")
      .selectAll()
      .where("id", "=", inventoryItemId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!item) {
      throw new BadRequestError("Inventory item not found");
    }

    // Only update cost if track_quantity is true
    if (!item.track_quantity) {
      return toInventoryItem(item);
    }

    const currentQuantity = item.quantity;
    const currentCost = Number(item.cost_price);

    // Calculate new average cost
    // If current quantity is 0 or negative, use received cost directly
    const newCost =
      currentQuantity <= 0
        ? receivedCost
        : (currentQuantity * currentCost + receivedQuantity * receivedCost) /
          (currentQuantity + receivedQuantity);

    // Update cost for this item
    const updated = await db
      .updateTable("inventory_items")
      .set({
        cost_price: newCost,
        updated_at: sql`now()`,
      })
      .where("id", "=", inventoryItemId)
      .where("company_id", "=", companyId)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Sync cost across all locations with same SKU
    await this.syncPricingAcrossLocations(item.sku, companyId, item.selling_price, newCost);

    return toInventoryItem(updated);
  }
}

export default new InventoryService();

