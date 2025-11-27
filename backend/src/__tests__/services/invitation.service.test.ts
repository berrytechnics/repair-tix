import invitationService from "../../services/invitation.service";
import { db } from "../../config/connection";

// Mock the database connection
jest.mock("../../config/connection", () => ({
  db: {
    insertInto: jest.fn(),
    selectFrom: jest.fn(),
    updateTable: jest.fn(),
  },
}));

const mockedDb = db as jest.Mocked<typeof db>;

describe("InvitationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create an invitation with default expiration", async () => {
      const companyId = "company-123";
      const invitedBy = "user-123";
      const email = "test@example.com";
      const mockInvitation = {
        id: "invitation-123",
        company_id: companyId,
        email: email.toLowerCase(),
        token: "generated-token",
        role: "technician" as const,
        invited_by: invitedBy,
        expires_at: new Date(),
        used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      const mockInsertBuilder = {
        values: jest.fn().mockReturnThis(),
        returningAll: jest.fn().mockReturnThis(),
        executeTakeFirstOrThrow: jest.fn().mockResolvedValue(mockInvitation),
      };

      mockedDb.insertInto.mockReturnValue(mockInsertBuilder as any);

      const result = await invitationService.create(
        companyId,
        { email },
        invitedBy
      );

      expect(result).toBeDefined();
      expect(result.email).toBe(email.toLowerCase());
      expect(result.companyId).toBe(companyId);
      expect(result.role).toBe("technician");
      expect(mockedDb.insertInto).toHaveBeenCalledWith("invitations");
    });

    it("should create an invitation with custom role and expiration", async () => {
      const companyId = "company-123";
      const invitedBy = "user-123";
      const email = "admin@example.com";
      const customExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const mockInvitation = {
        id: "invitation-456",
        company_id: companyId,
        email: email.toLowerCase(),
        token: "generated-token-2",
        role: "admin" as const,
        invited_by: invitedBy,
        expires_at: customExpiresAt,
        used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      const mockInsertBuilder = {
        values: jest.fn().mockReturnThis(),
        returningAll: jest.fn().mockReturnThis(),
        executeTakeFirstOrThrow: jest.fn().mockResolvedValue(mockInvitation),
      };

      mockedDb.insertInto.mockReturnValue(mockInsertBuilder as any);

      const result = await invitationService.create(
        companyId,
        { email, role: "admin", expiresAt: customExpiresAt },
        invitedBy
      );

      expect(result).toBeDefined();
      expect(result.role).toBe("admin");
      expect(result.email).toBe(email.toLowerCase());
    });
  });

  describe("findByToken", () => {
    it("should find invitation by token", async () => {
      const token = "valid-token-123";
      const mockInvitation = {
        id: "invitation-123",
        company_id: "company-123",
        email: "test@example.com",
        token: token,
        role: "technician" as const,
        invited_by: "user-123",
        expires_at: new Date(),
        used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      const mockSelectBuilder = {
        selectAll: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue(mockInvitation),
      };

      mockedDb.selectFrom.mockReturnValue(mockSelectBuilder as any);

      const result = await invitationService.findByToken(token);

      expect(result).toBeDefined();
      expect(result?.token).toBe(token);
      expect(mockedDb.selectFrom).toHaveBeenCalledWith("invitations");
    });

    it("should return null if invitation not found", async () => {
      const token = "invalid-token";

      const mockSelectBuilder = {
        selectAll: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue(undefined),
      };

      mockedDb.selectFrom.mockReturnValue(mockSelectBuilder as any);

      const result = await invitationService.findByToken(token);

      expect(result).toBeNull();
    });
  });

  describe("markAsUsed", () => {
    it("should mark invitation as used", async () => {
      const token = "valid-token-123";

      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({ numUpdatedRows: 1 }),
      };

      mockedDb.updateTable.mockReturnValue(mockUpdateBuilder as any);

      const result = await invitationService.markAsUsed(token);

      expect(result).toBe(true);
      expect(mockedDb.updateTable).toHaveBeenCalledWith("invitations");
    });

    it("should return false if invitation not found or already used", async () => {
      const token = "invalid-token";

      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({ numUpdatedRows: 0 }),
      };

      mockedDb.updateTable.mockReturnValue(mockUpdateBuilder as any);

      const result = await invitationService.markAsUsed(token);

      expect(result).toBe(false);
    });
  });

  describe("isTokenValid", () => {
    it("should validate a valid token", async () => {
      const token = "valid-token";
      const email = "test@example.com";
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const mockInvitation = {
        id: "invitation-123",
        company_id: "company-123",
        email: email.toLowerCase(),
        token: token,
        role: "technician" as const,
        invited_by: "user-123",
        expires_at: futureDate,
        used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      const mockSelectBuilder = {
        selectAll: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue(mockInvitation),
      };

      mockedDb.selectFrom.mockReturnValue(mockSelectBuilder as any);

      const result = await invitationService.isTokenValid(token, email);

      expect(result.valid).toBe(true);
      expect(result.invitation).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should reject expired invitation", async () => {
      const token = "expired-token";
      const email = "test@example.com";
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockInvitation = {
        id: "invitation-123",
        company_id: "company-123",
        email: email.toLowerCase(),
        token: token,
        role: "technician" as const,
        invited_by: "user-123",
        expires_at: pastDate,
        used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      const mockSelectBuilder = {
        selectAll: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue(mockInvitation),
      };

      mockedDb.selectFrom.mockReturnValue(mockSelectBuilder as any);

      const result = await invitationService.isTokenValid(token, email);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invitation has expired");
    });

    it("should reject already used invitation", async () => {
      const token = "used-token";
      const email = "test@example.com";
      const mockInvitation = {
        id: "invitation-123",
        company_id: "company-123",
        email: email.toLowerCase(),
        token: token,
        role: "technician" as const,
        invited_by: "user-123",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        used_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      const mockSelectBuilder = {
        selectAll: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue(mockInvitation),
      };

      mockedDb.selectFrom.mockReturnValue(mockSelectBuilder as any);

      const result = await invitationService.isTokenValid(token, email);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invitation has already been used");
    });

    it("should reject invitation with mismatched email", async () => {
      const token = "valid-token";
      const email = "test@example.com";
      const wrongEmail = "wrong@example.com";
      const mockInvitation = {
        id: "invitation-123",
        company_id: "company-123",
        email: email.toLowerCase(),
        token: token,
        role: "technician" as const,
        invited_by: "user-123",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      const mockSelectBuilder = {
        selectAll: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue(mockInvitation),
      };

      mockedDb.selectFrom.mockReturnValue(mockSelectBuilder as any);

      const result = await invitationService.isTokenValid(token, wrongEmail);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Email does not match invitation");
    });
  });

  describe("findAll", () => {
    it("should return all invitations for a company", async () => {
      const companyId = "company-123";
      const mockInvitations = [
        {
          id: "invitation-1",
          company_id: companyId,
          email: "user1@example.com",
          token: "token-1",
          role: "technician" as const,
          invited_by: "user-123",
          expires_at: new Date(),
          used_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        {
          id: "invitation-2",
          company_id: companyId,
          email: "user2@example.com",
          token: "token-2",
          role: "frontdesk" as const,
          invited_by: "user-123",
          expires_at: new Date(),
          used_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      ];

      const mockSelectBuilder = {
        selectAll: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(mockInvitations),
      };

      mockedDb.selectFrom.mockReturnValue(mockSelectBuilder as any);

      const result = await invitationService.findAll(companyId);

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe("user1@example.com");
      expect(result[1].email).toBe("user2@example.com");
    });
  });

  describe("revoke", () => {
    it("should revoke an invitation", async () => {
      const id = "invitation-123";
      const companyId = "company-123";

      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({ numUpdatedRows: 1 }),
      };

      mockedDb.updateTable.mockReturnValue(mockUpdateBuilder as any);

      const result = await invitationService.revoke(id, companyId);

      expect(result).toBe(true);
      expect(mockedDb.updateTable).toHaveBeenCalledWith("invitations");
    });

    it("should return false if invitation not found", async () => {
      const id = "invalid-id";
      const companyId = "company-123";

      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest.fn().mockResolvedValue({ numUpdatedRows: 0 }),
      };

      mockedDb.updateTable.mockReturnValue(mockUpdateBuilder as any);

      const result = await invitationService.revoke(id, companyId);

      expect(result).toBe(false);
    });
  });
});

