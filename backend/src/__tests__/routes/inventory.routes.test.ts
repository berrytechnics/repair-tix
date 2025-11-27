import request from "supertest";
import app from "../../app";
import inventoryService from "../../services/inventory.service";
import { verifyJWTToken } from "../../utils/auth";

// Mock the inventory service and auth
jest.mock("../../services/inventory.service");
jest.mock("../../utils/auth");

const mockedInventoryService = inventoryService as jest.Mocked<
  typeof inventoryService
>;
const mockedVerifyJWTToken = verifyJWTToken as jest.MockedFunction<
  typeof verifyJWTToken
>;

// Mock user for authentication
const MOCK_COMPANY_ID = "550e8400-e29b-41d4-a716-446655440099";
const mockUser = {
  id: "user-123",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  role: "technician" as const,
  active: true,
  company_id: MOCK_COMPANY_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Inventory Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authenticate all requests
    mockedVerifyJWTToken.mockResolvedValue(mockUser);
  });

  describe("GET /api/inventory", () => {
    it("should return list of inventory items", async () => {
      const mockItems = [
        {
          id: "item-1",
          sku: "SKU-001",
          name: "iPhone Screen",
          description: "Replacement screen for iPhone 12",
          category: "Screens",
          subcategory: "iPhone",
          brand: "Apple",
          model: "iPhone 12",
          compatibleWith: ["iPhone 12", "iPhone 12 Pro"] as string[],
          costPrice: 50.0,
          sellingPrice: 100.0,
          quantity: 10,
          reorderLevel: 5,
          location: "Warehouse A",
          supplier: "Supplier Co",
          supplierPartNumber: "SP-001",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "item-2",
          sku: "SKU-002",
          name: "Battery Pack",
          description: "Replacement battery",
          category: "Batteries",
          subcategory: null,
          brand: "Generic",
          model: null,
          compatibleWith: null,
          costPrice: 20.0,
          sellingPrice: 40.0,
          quantity: 25,
          reorderLevel: 10,
          location: "Warehouse B",
          supplier: "Battery Co",
          supplierPartNumber: "BAT-001",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockedInventoryService.findAll.mockResolvedValue(mockItems);

      const response = await request(app)
        .get("/api/inventory")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].sku).toBe("SKU-001");
      expect(response.body.data[0].name).toBe("iPhone Screen");
      expect(mockedInventoryService.findAll).toHaveBeenCalledWith(MOCK_COMPANY_ID, undefined);
    });

    it("should filter inventory items by search query", async () => {
      const mockItems = [
        {
          id: "item-1",
          sku: "SKU-001",
          name: "iPhone Screen",
          description: "Replacement screen for iPhone 12",
          category: "Screens",
          subcategory: "iPhone",
          brand: "Apple",
          model: "iPhone 12",
          compatibleWith: ["iPhone 12", "iPhone 12 Pro"] as string[],
          costPrice: 50.0,
          sellingPrice: 100.0,
          quantity: 10,
          reorderLevel: 5,
          location: "Warehouse A",
          supplier: "Supplier Co",
          supplierPartNumber: "SP-001",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockedInventoryService.findAll.mockResolvedValue(mockItems);

      const response = await request(app)
        .get("/api/inventory?query=iphone")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(mockedInventoryService.findAll).toHaveBeenCalledWith(MOCK_COMPANY_ID, "iphone");
    });

    it("should return empty array when no inventory items", async () => {
      mockedInventoryService.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get("/api/inventory")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(mockedInventoryService.findAll).toHaveBeenCalledWith(MOCK_COMPANY_ID, undefined);
    });

    it("should return 401 without authentication token", async () => {
      mockedVerifyJWTToken.mockResolvedValue(null);

      const response = await request(app).get("/api/inventory");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should return 403 with invalid token", async () => {
      mockedVerifyJWTToken.mockResolvedValue(null);

      const response = await request(app)
        .get("/api/inventory")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Unauthorized");
    });

    it("should filter by company_id", async () => {
      const mockItems = [
        {
          id: "item-1",
          sku: "SKU-001",
          name: "iPhone Screen",
          description: "Replacement screen",
          category: "Screens",
          subcategory: null,
          brand: "Apple",
          model: null,
          compatibleWith: null,
          costPrice: 50.0,
          sellingPrice: 100.0,
          quantity: 10,
          reorderLevel: 5,
          location: null,
          supplier: null,
          supplierPartNumber: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockedInventoryService.findAll.mockResolvedValue(mockItems);

      const response = await request(app)
        .get("/api/inventory")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(mockedInventoryService.findAll).toHaveBeenCalledWith(MOCK_COMPANY_ID, undefined);
    });
  });
});

