// src/services/inventory.service.ts
import { db } from "../config/connection";
import { InventoryItemTable } from "../config/types";

// Output type - converts snake_case to camelCase
// Use string for ID since that's what Kysely returns at runtime
export type InventoryItem = Omit<
  InventoryItemTable,
  | "id"
  | "company_id"
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
  | "created_at"
  | "updated_at"
  | "deleted_at"
> & {
  id: string;
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
  location: string | null;
  supplier: string | null;
  supplierPartNumber: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to InventoryItem (snake_case to camelCase)
function toInventoryItem(item: {
  id: string;
  company_id: string;
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
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): InventoryItem {
  return {
    id: item.id as string,
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
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export class InventoryService {
  async findAll(companyId: string, searchQuery?: string): Promise<InventoryItem[]> {
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

    const items = await query.execute();
    return items.map(toInventoryItem);
  }
}

export default new InventoryService();

