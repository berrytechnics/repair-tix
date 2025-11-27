import api, { ApiResponse } from ".";

// Inventory interfaces
export interface InventoryItem {
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
  createdAt: string;
  updatedAt: string;
}

// Inventory API functions
export const getInventory = async (
  params?: URLSearchParams
): Promise<ApiResponse<InventoryItem[]>> => {
  const url = params ? `/inventory?${params.toString()}` : "/inventory";
  const response = await api.get<ApiResponse<InventoryItem[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch inventory");
};

export const searchInventory = async (
  query: string
): Promise<ApiResponse<InventoryItem[]>> => {
  const response = await api.get<ApiResponse<InventoryItem[]>>(
    `/inventory?query=${encodeURIComponent(query)}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to search inventory");
};

