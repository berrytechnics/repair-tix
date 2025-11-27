// Authentication helpers for integration tests
import { generateNewJWTToken } from "../../utils/auth";
import { UserWithoutPassword } from "../../services/user.service";
import { createTestUser, getUserById } from "./seed.helper";
import { UserRole } from "../../config/types";

/**
 * Create a test user and return the user object and JWT token
 */
export async function createAuthenticatedUser(
  companyId: string,
  role: UserRole = "technician",
  overrides?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  }
): Promise<{
  userId: string;
  user: UserWithoutPassword;
  token: string;
}> {
  const userId = await createTestUser(companyId, {
    ...overrides,
    role,
  });

  const userRecord = await getUserById(userId);
  if (!userRecord) {
    throw new Error("Failed to create test user");
  }

  // Convert to UserWithoutPassword format
  // Use the same approach as user.service.ts - cast the entire object
  const user: UserWithoutPassword = {
    id: userRecord.id as unknown as string,
    company_id: userRecord.company_id as unknown as string,
    firstName: userRecord.first_name,
    lastName: userRecord.last_name,
    email: userRecord.email,
    role: userRecord.role,
    active: userRecord.active,
    createdAt: userRecord.created_at,
    updatedAt: userRecord.updated_at,
    deletedAt: userRecord.deleted_at,
  } as unknown as UserWithoutPassword;

  const token = generateNewJWTToken(user);

  return {
    userId,
    user,
    token,
  };
}

/**
 * Get authorization header for supertest requests
 */
export function getAuthHeader(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Create multiple test users with different roles
 */
export async function createTestUsersWithRoles(
  companyId: string
): Promise<{
  admin: { userId: string; user: UserWithoutPassword; token: string };
  frontdesk: { userId: string; user: UserWithoutPassword; token: string };
  technician: { userId: string; user: UserWithoutPassword; token: string };
}> {
  const admin = await createAuthenticatedUser(companyId, "admin", {
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
  });

  const frontdesk = await createAuthenticatedUser(companyId, "frontdesk", {
    email: "frontdesk@test.com",
    firstName: "Frontdesk",
    lastName: "User",
  });

  const technician = await createAuthenticatedUser(companyId, "technician", {
    email: "technician@test.com",
    firstName: "Technician",
    lastName: "User",
  });

  return {
    admin,
    frontdesk,
    technician,
  };
}

