# Backend Rules

## TypeScript & Module System
- Use **strict TypeScript** with ES modules (`type: "module"`)
- **Always use `.js` extensions in import statements** (ESM requirement)
  - ✅ `import { db } from "../config/connection.js";`
  - ❌ `import { db } from "../config/connection";`
- Target ES2022, use NodeNext module resolution
- All backend code is in `backend/src/`

## Architecture Layers
Follow the layered architecture pattern:
1. **Routes** (`routes/`) - Define endpoints, use middleware, call services
2. **Middlewares** (`middlewares/`) - Auth, RBAC, validation, tenant isolation
3. **Services** (`services/`) - Business logic and database operations
4. **Database** (`config/connection.ts`) - Kysely queries

## Route Handlers
- Use `asyncHandler` wrapper for all async route handlers
- Apply middleware in order: `validateRequest` → `requireTenantContext` → `requireLocationContext` → `requireRole/requireAdmin` → `validate`
- Always use tenant context (`req.companyId`) and location context (`req.locationId`) for data isolation
- Return consistent API responses: `{ success: true, data: ... }` or `{ success: false, error: { message, errors? } }`

## Services
- Services contain business logic and database operations
- Use Kysely for all database queries (type-safe SQL)
- Convert database snake_case to camelCase in service layer
- Define DTOs (CreateXDto, UpdateXDto) for service inputs
- Export output types that convert snake_case to camelCase
- Always validate inputs and throw appropriate errors (`BadRequestError`, `NotFoundError`, etc.)
- Use transactions for multi-step operations

## Error Handling
- Use custom error classes from `config/errors.ts`:
  - `BadRequestError` - Invalid input (400)
  - `NotFoundError` - Resource not found (404)
  - `UnauthorizedError` - Authentication required (401)
  - `ForbiddenError` - Insufficient permissions (403)
  - `ValidationError` - Validation failures (400)
- Always include descriptive error messages
- Log errors using Winston logger from `config/logger.ts`

## Validation
- Use `express-validator` for request validation
- Define validators in `validators/` directory
- Apply validation middleware after auth/RBAC middleware
- Return validation errors in format: `{ message: string, errors?: Record<string, string> }`

## Multi-Tenancy & RBAC
- **Always** filter by `companyId` in database queries
- Use `requireTenantContext` middleware to set `req.companyId`
- Use `requireLocationContext` middleware to set `req.locationId` (optional for superusers)
- Check permissions using `requireRole()` or `requireAdmin()` middleware
- Permissions are defined in `config/permissions.ts`
- Support superuser impersonation via `x-impersonate-company` header

## Database
- Use Kysely query builder (type-safe SQL)
- Database types are defined in `config/types.ts`
- Always use parameterized queries (Kysely handles this)
- Use transactions for operations that must be atomic
- Convert snake_case DB columns to camelCase in service layer

## Code Style
- Use async/await (no callbacks)
- Use descriptive variable names
- Add JSDoc comments for complex functions
- Group imports: external → internal, alphabetical within groups
- Use const assertions and proper TypeScript types
- Prefer early returns for error cases

