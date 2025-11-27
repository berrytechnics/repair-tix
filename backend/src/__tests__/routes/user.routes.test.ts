import request from "supertest";
import app from "../../app";
import userService from "../../services/user.service";
import { generateNewJWTToken } from "../../utils/auth";

// Mock the user service, company service, and invitation service
jest.mock("../../services/user.service");
jest.mock("../../services/company.service");
jest.mock("../../services/invitation.service");
jest.mock("../../utils/auth");

const mockedUserService = userService as jest.Mocked<typeof userService>;
const mockedGenerateJWTToken = generateNewJWTToken as jest.MockedFunction<
  typeof generateNewJWTToken
>;

describe("User Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    // Mock user with snake_case fields as returned by the service
    const MOCK_COMPANY_ID = "550e8400-e29b-41d4-a716-446655440099";
    const mockUser = {
      id: "user-123",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      role: "technician" as const,
      active: true,
      company_id: MOCK_COMPANY_ID,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } as any;

    it("should login successfully with valid credentials", async () => {
      mockedUserService.authenticate.mockResolvedValue(mockUser);
      mockedGenerateJWTToken.mockReturnValue("mock-jwt-token");

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "john@example.com",
          password: "password123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: "user-123",
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            role: "technician",
          },
          accessToken: "mock-jwt-token",
          refreshToken: "mock-jwt-token",
        },
      });
      expect(mockedUserService.authenticate).toHaveBeenCalledWith(
        "john@example.com",
        "password123"
      );
      expect(mockedGenerateJWTToken).toHaveBeenCalledWith(mockUser);
    });

    it("should return 401 for invalid credentials", async () => {
      mockedUserService.authenticate.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "john@example.com",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: { message: "Invalid credentials" },
      });
      expect(mockedUserService.authenticate).toHaveBeenCalledWith(
        "john@example.com",
        "wrongpassword"
      );
      expect(mockedGenerateJWTToken).not.toHaveBeenCalled();
    });

    it("should return 400 for missing email", async () => {
      mockedUserService.authenticate.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          password: "password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
      expect(response.body.error.errors).toHaveProperty("email");
      expect(response.body.error.errors.email).toBe("Email is required");
    });

    it("should return 400 for missing password", async () => {
      mockedUserService.authenticate.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "john@example.com",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
      expect(response.body.error.errors).toHaveProperty("password");
      expect(response.body.error.errors.password).toBe("Password is required");
    });
  });

  describe("POST /api/auth/register", () => {
    // Mock user with snake_case fields as returned by the service
    const MOCK_COMPANY_ID = "550e8400-e29b-41d4-a716-446655440099";
    const mockNewUser = {
      id: "user-456",
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com",
      role: "technician" as const,
      active: true,
      company_id: MOCK_COMPANY_ID,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } as any;

    it("should register a new user with company creation (first user becomes admin)", async () => {
      // Mock company service
      const companyService = require("../../services/company.service");
      jest.spyOn(companyService.default, "findBySubdomain").mockResolvedValue(null);
      jest.spyOn(companyService.default, "create").mockResolvedValue({
        id: MOCK_COMPANY_ID,
        name: "Test Company",
        subdomain: "test-company",
        plan: "free",
        status: "active",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const adminUser = {
        ...mockNewUser,
        role: "admin" as const,
      };

      mockedUserService.create.mockResolvedValue(adminUser);
      mockedGenerateJWTToken.mockReturnValue("mock-jwt-token");

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          companyName: "Test Company",
          password: "Password123",
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: "user-456",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane@example.com",
            role: "admin",
          },
          accessToken: "mock-jwt-token",
          refreshToken: "mock-jwt-token",
        },
      });
      expect(mockedUserService.create).toHaveBeenCalledWith({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        password: "Password123",
        companyId: MOCK_COMPANY_ID,
        role: "admin",
      });
      expect(mockedGenerateJWTToken).toHaveBeenCalledWith(adminUser);
    });

    it("should register a new user with invitation token", async () => {
      // Mock invitation service
      const invitationService = require("../../services/invitation.service");
      const mockInvitation = {
        id: "invitation-123",
        companyId: MOCK_COMPANY_ID,
        email: "jane@example.com",
        token: "valid-token-123",
        role: "technician" as const,
        invitedBy: "admin-user-id",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(invitationService.default, "isTokenValid").mockResolvedValue({
        valid: true,
        invitation: mockInvitation,
      });
      jest.spyOn(invitationService.default, "markAsUsed").mockResolvedValue(true);

      // Mock company service
      const companyService = require("../../services/company.service");
      jest.spyOn(companyService.default, "findById").mockResolvedValue({
        id: MOCK_COMPANY_ID,
        name: "Existing Company",
        subdomain: "existing-company",
        plan: "free",
        status: "active",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockedUserService.create.mockResolvedValue(mockNewUser);
      mockedGenerateJWTToken.mockReturnValue("mock-jwt-token");

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          invitationToken: "valid-token-123",
          password: "Password123",
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: "user-456",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane@example.com",
            role: "technician",
          },
          accessToken: "mock-jwt-token",
          refreshToken: "mock-jwt-token",
        },
      });
      expect(invitationService.default.isTokenValid).toHaveBeenCalledWith(
        "valid-token-123",
        "jane@example.com"
      );
      expect(invitationService.default.markAsUsed).toHaveBeenCalledWith("valid-token-123");
      expect(mockedUserService.create).toHaveBeenCalledWith({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        password: "Password123",
        companyId: MOCK_COMPANY_ID,
        role: "technician",
      });
    });

    it("should return 400 for invalid invitation token", async () => {
      // Mock invitation service
      const invitationService = require("../../services/invitation.service");
      jest.spyOn(invitationService.default, "isTokenValid").mockResolvedValue({
        valid: false,
        invitation: null,
        error: "Invalid invitation token",
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          invitationToken: "invalid-token",
          password: "Password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invalid invitation token");
    });

    it("should return 400 when neither companyName nor invitationToken provided", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          password: "Password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
      expect(response.body.error.errors).toHaveProperty("_error");
    });

    it("should return 400 when both companyName and invitationToken provided", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          companyName: "Test Company",
          invitationToken: "token-123",
          password: "Password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
      expect(response.body.error.errors).toHaveProperty("_error");
    });

    it("should return 400 when registration fails", async () => {
      // Mock company service
      const companyService = require("../../services/company.service");
      jest.spyOn(companyService.default, "findBySubdomain").mockResolvedValue(null);
      jest.spyOn(companyService.default, "create").mockResolvedValue({
        id: MOCK_COMPANY_ID,
        name: "Test Company",
        subdomain: "test-company",
        plan: "free",
        status: "active",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockedUserService.create.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          companyName: "Test Company",
          password: "Password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Registration failed");
    });

    it("should handle service errors", async () => {
      // Mock company service
      const companyService = require("../../services/company.service");
      jest.spyOn(companyService.default, "findBySubdomain").mockResolvedValue(null);
      jest.spyOn(companyService.default, "create").mockResolvedValue({
        id: MOCK_COMPANY_ID,
        name: "Test Company",
        subdomain: "test-company",
        plan: "free",
        status: "active",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockedUserService.create.mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          companyName: "Test Company",
          password: "Password123",
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: { message: "Database error" },
      });
      expect(mockedUserService.create).toHaveBeenCalled();
    });
  });
});

