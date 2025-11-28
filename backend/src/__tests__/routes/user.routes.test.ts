import request from "supertest";
import app from "../../app";
import { cleanupTestData } from "../helpers/db.helper";
import {
  createTestCompany,
  createTestUser,
  createTestInvitation,
  createTestLocation,
  assignUserToLocation,
} from "../helpers/seed.helper";
import { createAuthenticatedUser, createTestUsersWithRoles, getAuthHeader } from "../helpers/auth.helper";
import { db } from "../../config/connection";
import invitationService from "../../services/invitation.service";

describe("User Routes Integration Tests", () => {
  let testCompanyIds: string[] = [];
  let testUserIds: string[] = [];
  let testInvitationIds: string[] = [];

  afterEach(async () => {
    // Clean up all test data
    await cleanupTestData({
      companyIds: testCompanyIds,
      userIds: testUserIds,
      invitationIds: testInvitationIds,
    });
    testCompanyIds = [];
    testUserIds = [];
    testInvitationIds = [];
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      // Create test company
      const companyId = await createTestCompany();
      testCompanyIds.push(companyId);

      // Create test user with known password
      const password = "password123";
      const userId = await createTestUser(companyId, {
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        password: password,
        role: "technician",
      });
      testUserIds.push(userId);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "john@example.com",
          password: password,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe("john@example.com");
      expect(response.body.data.user.firstName).toBe("John");
      expect(response.body.data.user.lastName).toBe("Doe");
      expect(response.body.data.user.role).toBe("technician");
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it("should return 401 for invalid credentials", async () => {
      // Create test company
      const companyId = await createTestCompany();
      testCompanyIds.push(companyId);

      // Create test user
      const userId = await createTestUser(companyId, {
        email: "john@example.com",
        password: "correctpassword",
      });
      testUserIds.push(userId);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "john@example.com",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invalid credentials");
    });

    it("should return 400 for missing email", async () => {
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
    it("should register a new user with company creation (first user becomes admin)", async () => {
      // Use unique company name to avoid conflicts
      const uniqueCompanyName = `Test Company ${Date.now()}`;
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: `jane-${Date.now()}@example.com`,
          companyName: uniqueCompanyName,
          password: "Password123",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.firstName).toBe("Jane");
      expect(response.body.data.user.lastName).toBe("Smith");
      expect(response.body.data.user.role).toBe("admin"); // First user becomes admin
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Track created company and user for cleanup
      if (response.body.data.user.id) {
        testUserIds.push(response.body.data.user.id);
        // Get company ID from user's company_id in database
        const user = await db
          .selectFrom("users")
          .select("company_id")
          .where("id", "=", response.body.data.user.id)
          .executeTakeFirst();
        if (user) {
          testCompanyIds.push(user.company_id as unknown as string);
        }
      }
    });

    it("should register a new user with invitation token", async () => {
      // Skip if invitations table doesn't exist
      try {
        await db.selectFrom("invitations").select("id").limit(1).execute();
      } catch (error: unknown) {
        const err = error as { message?: string };
        if (err.message?.includes("does not exist")) {
          console.warn("Skipping invitation test - invitations table does not exist");
          return;
        }
        throw error;
      }

      // Create test company
      const companyId = await createTestCompany();
      testCompanyIds.push(companyId);

      // Create admin user to invite
      const adminUser = await createAuthenticatedUser(companyId, "admin", {
        email: "admin@test.com",
        firstName: "Admin",
        lastName: "User",
      });
      testUserIds.push(adminUser.userId);

      // Create invitation
      const invitation = await createTestInvitation(companyId, adminUser.userId, {
        email: "jane@example.com",
        role: "technician",
      });
      testInvitationIds.push(invitation.id);

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          invitationToken: invitation.token,
          password: "Password123",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe("jane@example.com");
      expect(response.body.data.user.firstName).toBe("Jane");
      expect(response.body.data.user.lastName).toBe("Smith");
      expect(response.body.data.user.role).toBe("technician"); // Role from invitation
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      if (response.body.data.user.id) {
        testUserIds.push(response.body.data.user.id);
      }

      // Verify invitation was marked as used
      const usedInvitation = await invitationService.findByToken(invitation.token);
      expect(usedInvitation?.usedAt).toBeDefined();
    });

    it("should return 400 for invalid invitation token", async () => {
      // Skip if invitations table doesn't exist
      try {
        await db.selectFrom("invitations").select("id").limit(1).execute();
      } catch (error: unknown) {
        const err = error as { message?: string };
        if (err.message?.includes("does not exist")) {
          console.warn("Skipping invitation test - invitations table does not exist");
          return;
        }
        throw error;
      }

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
      // Use unique company name
      const uniqueCompanyName = `Test Company ${Date.now()}`;
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: `jane-${Date.now()}@example.com`,
          companyName: uniqueCompanyName,
          invitationToken: "token-123",
          password: "Password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
      expect(response.body.error.errors).toHaveProperty("_error");
    });

    it("should allow same email in different companies", async () => {
      // Create test company
      const companyId = await createTestCompany();
      testCompanyIds.push(companyId);

      // Create existing user in first company
      const existingUserId = await createTestUser(companyId, {
        email: "jane@example.com",
      });
      testUserIds.push(existingUserId);

      // Try to register with same email but different company
      // This should succeed because email uniqueness is per-company, not global
      const uniqueCompanyName = `Test Company ${Date.now()}`;
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          companyName: uniqueCompanyName,
          password: "Password123",
        });

      // Should succeed because emails are unique per-company, not globally
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe("jane@example.com");

      // Track created user and company for cleanup
      if (response.body.data.user.id) {
        testUserIds.push(response.body.data.user.id);
        const user = await db
          .selectFrom("users")
          .select("company_id")
          .where("id", "=", response.body.data.user.id)
          .executeTakeFirst();
        if (user) {
          testCompanyIds.push(user.company_id as unknown as string);
        }
      }
    });
  });

  describe("Location Assignment Endpoints", () => {
    let testCompanyId: string;
    let adminToken: string;
    let technicianToken: string;
    let testLocationIds: string[] = [];
    let testUserIds: string[] = [];

    beforeEach(async () => {
      testCompanyId = await createTestCompany();
      testCompanyIds.push(testCompanyId);

      const users = await createTestUsersWithRoles(testCompanyId);
      adminToken = users.admin.token;
      technicianToken = users.technician.token;
      testUserIds.push(users.admin.userId, users.technician.userId, users.frontdesk.userId);
    });

    afterEach(async () => {
      testLocationIds = [];
      testUserIds = [];
    });

    describe("POST /api/users/:id/locations", () => {
      it("should assign user to location as admin", async () => {
        const locationId = await createTestLocation(testCompanyId);
        testLocationIds.push(locationId);
        const targetUserId = testUserIds[1]; // technician

        const response = await request(app)
          .post(`/api/users/${targetUserId}/locations`)
          .set(getAuthHeader(adminToken))
          .send({ locationId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it("should return 403 for non-admin user", async () => {
        const locationId = await createTestLocation(testCompanyId);
        testLocationIds.push(locationId);
        const targetUserId = testUserIds[1];

        const response = await request(app)
          .post(`/api/users/${targetUserId}/locations`)
          .set(getAuthHeader(technicianToken))
          .send({ locationId });

        expect(response.status).toBe(403);
      });

      it("should return 404 for non-existent location", async () => {
        const fakeLocationId = "00000000-0000-0000-0000-000000000000";
        const targetUserId = testUserIds[1];

        const response = await request(app)
          .post(`/api/users/${targetUserId}/locations`)
          .set(getAuthHeader(adminToken))
          .send({ locationId: fakeLocationId });

        expect(response.status).toBe(404);
      });
    });

    describe("DELETE /api/users/:id/locations/:locationId", () => {
      it("should remove user from location as admin", async () => {
        const locationId = await createTestLocation(testCompanyId);
        testLocationIds.push(locationId);
        const targetUserId = testUserIds[1];

        // First assign user to location
        await assignUserToLocation(targetUserId, locationId);

        const response = await request(app)
          .delete(`/api/users/${targetUserId}/locations/${locationId}`)
          .set(getAuthHeader(adminToken));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it("should return 403 for non-admin user", async () => {
        const locationId = await createTestLocation(testCompanyId);
        testLocationIds.push(locationId);
        const targetUserId = testUserIds[1];

        const response = await request(app)
          .delete(`/api/users/${targetUserId}/locations/${locationId}`)
          .set(getAuthHeader(technicianToken));

        expect(response.status).toBe(403);
      });
    });

    describe("GET /api/users/:id/locations", () => {
      it("should return user's assigned locations", async () => {
        const location1Id = await createTestLocation(testCompanyId, { name: "Location 1" });
        const location2Id = await createTestLocation(testCompanyId, { name: "Location 2" });
        testLocationIds.push(location1Id, location2Id);
        const targetUserId = testUserIds[1];

        // Assign user to locations
        await assignUserToLocation(targetUserId, location1Id);
        await assignUserToLocation(targetUserId, location2Id);

        const response = await request(app)
          .get(`/api/users/${targetUserId}/locations`)
          .set(getAuthHeader(adminToken));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(2);
        const names = response.body.data.map((l: { name: string }) => l.name);
        expect(names).toContain("Location 1");
        expect(names).toContain("Location 2");
      });

      it("should allow users to view their own locations", async () => {
        const locationId = await createTestLocation(testCompanyId);
        testLocationIds.push(locationId);
        const targetUserId = testUserIds[1]; // technician

        await assignUserToLocation(targetUserId, locationId);

        const response = await request(app)
          .get(`/api/users/${targetUserId}/locations`)
          .set(getAuthHeader(technicianToken));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it("should return 401 for user viewing another user's locations", async () => {
        const locationId = await createTestLocation(testCompanyId);
        testLocationIds.push(locationId);
        const targetUserId = testUserIds[0]; // admin
        const _viewerUserId = testUserIds[1]; // technician

        await assignUserToLocation(targetUserId, locationId);

        // Create token for technician viewing admin's locations
        // This user should NOT have access to view admin's locations
        const viewerUser = await createAuthenticatedUser(testCompanyId, "technician", {
          email: "viewer@test.com",
        });
        testUserIds.push(viewerUser.userId); // Add to cleanup list

        const response = await request(app)
          .get(`/api/users/${targetUserId}/locations`)
          .set(getAuthHeader(viewerUser.token));

        expect(response.status).toBe(401);
      });
    });

    describe("PUT /api/users/me/location", () => {
      it("should set current location for user", async () => {
        const locationId = await createTestLocation(testCompanyId, { name: "Test Location" });
        testLocationIds.push(locationId);
        const targetUserId = testUserIds[1]; // technician

        // Assign user to location first (they already have a default location from createTestUsersWithRoles)
        await assignUserToLocation(targetUserId, locationId);

        const response = await request(app)
          .put("/api/users/me/location")
          .set(getAuthHeader(technicianToken))
          .send({ locationId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.currentLocationId).toBe(locationId);
      });

      it("should return 400 for location user doesn't have access to", async () => {
        const locationId = await createTestLocation(testCompanyId);
        testLocationIds.push(locationId);
        // Don't assign user to location

        const response = await request(app)
          .put("/api/users/me/location")
          .set(getAuthHeader(technicianToken))
          .send({ locationId });

        expect(response.status).toBe(400);
      });

      it("should allow admin to set any company location", async () => {
        const locationId = await createTestLocation(testCompanyId);
        testLocationIds.push(locationId);
        // Admin doesn't need to be assigned

        const response = await request(app)
          .put("/api/users/me/location")
          .set(getAuthHeader(adminToken))
          .send({ locationId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe("GET /api/users/me/locations", () => {
      it("should return all company locations for admin", async () => {
        const location1Id = await createTestLocation(testCompanyId, { name: "Location 1" });
        const location2Id = await createTestLocation(testCompanyId, { name: "Location 2" });
        testLocationIds.push(location1Id, location2Id);

        const response = await request(app)
          .get("/api/users/me/locations")
          .set(getAuthHeader(adminToken));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(2);
        const names = response.body.data.map((l: { name: string }) => l.name);
        expect(names).toContain("Location 1");
        expect(names).toContain("Location 2");
      });

      it("should return only assigned locations for non-admin user", async () => {
        const location1Id = await createTestLocation(testCompanyId, { name: "Location 1" });
        const location2Id = await createTestLocation(testCompanyId, { name: "Location 2" });
        testLocationIds.push(location1Id, location2Id);

        // The technician already has a default location from createTestUsersWithRoles
        // Assign user to only one additional location
        await assignUserToLocation(testUserIds[1], location1Id);

        const response = await request(app)
          .get("/api/users/me/locations")
          .set(getAuthHeader(technicianToken));

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        const names = response.body.data.map((l: { name: string }) => l.name);
        // Technician should see their default location AND Location 1, but NOT Location 2
        expect(names).toContain("Location 1");
        expect(names).not.toContain("Location 2");
        // Should have at least 2 locations (default + Location 1)
        expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      });
    });
  });
});
