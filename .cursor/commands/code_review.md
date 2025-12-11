# Code Review Checklist

## Overview
Comprehensive checklist for conducting thorough code reviews to ensure quality, security, and maintainability. Review both backend and frontend code against project-specific conventions.

## Review Categories

### Functionality
- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No obvious bugs or logic errors
- [ ] API responses follow consistent format: `{ success: boolean, data?: T, error?: { message, errors? } }`
- [ ] Loading and error states are handled in frontend

### Code Quality
- [ ] Code is readable and well-structured
- [ ] Functions are small and focused
- [ ] Variable names are descriptive
- [ ] No code duplication
- [ ] Follows project conventions
- [ ] Imports are organized (external → internal, alphabetical)
- [ ] JSDoc comments for complex functions
- [ ] Early returns used for error cases

### Type Safety
- [ ] TypeScript strict mode compliance
- [ ] All functions have proper type annotations
- [ ] No `any` types (unless absolutely necessary)
- [ ] Interfaces/types match backend DTOs (frontend)
- [ ] Proper typing for API responses (`ApiResponse<T>`)
- [ ] Props are properly typed (React components)

### Backend-Specific
- [ ] **ESM imports**: All imports use `.js` extensions
- [ ] **Layered architecture**: Routes → Middlewares → Services → Database
- [ ] **Route handlers**: Use `asyncHandler` wrapper
- [ ] **Middleware order**: `validateRequest` → `requireTenantContext` → `requireLocationContext` → `requireRole/requireAdmin` → `validate`
- [ ] **Multi-tenancy**: All database queries filter by `companyId`
- [ ] **RBAC**: Permissions checked before operations
- [ ] **Services**: Business logic in services, not routes
- [ ] **Database**: Use Kysely (no raw SQL)
- [ ] **DTOs**: CreateXDto/UpdateXDto defined for service inputs
- [ ] **Error handling**: Uses custom error classes (`BadRequestError`, `NotFoundError`, etc.)
- [ ] **Validation**: Uses `express-validator` in validators directory
- [ ] **Snake_case conversion**: DB columns converted to camelCase in service layer
- [ ] **Transactions**: Used for multi-step operations

### Frontend-Specific
- [ ] **Next.js**: Uses App Router (`app/` directory)
- [ ] **Client components**: Has `"use client"` directive when needed
- [ ] **Server components**: No directive (default)
- [ ] **Path aliases**: Uses `@/*` for imports
- [ ] **Forms**: Uses React Hook Form + Zod validation
- [ ] **Styling**: Uses Tailwind CSS (not custom CSS)
- [ ] **Dark mode**: Supports `dark:` prefix classes
- [ ] **API calls**: Uses axios instance from `lib/api/index.ts`
- [ ] **Error handling**: Uses `getErrorMessage()` helper
- [ ] **State**: Uses Zustand for global, hooks for local
- [ ] **Components**: Functional components with hooks
- [ ] **Loading states**: Handled appropriately
- [ ] **Type safety**: Interfaces match backend DTOs

### Security
- [ ] No obvious security vulnerabilities
- [ ] Input validation is present (express-validator backend, Zod frontend)
- [ ] Sensitive data is handled properly
- [ ] No hardcoded secrets
- [ ] **Multi-tenancy**: Data isolation verified (companyId filtering)
- [ ] **RBAC**: Permissions checked before operations
- [ ] **Authentication**: JWT tokens validated
- [ ] **Authorization**: Role/permission checks in place
- [ ] **SQL injection**: Parameterized queries (Kysely handles this)
- [ ] **XSS**: Input sanitized, output escaped
- [ ] **Logs**: No sensitive data in logs (passwords, tokens)
- [ ] **Environment variables**: Used for secrets (not hardcoded)
- [ ] **Rate limiting**: Applied to API endpoints

### Testing
- [ ] Tests written for new features
- [ ] Tests cover success and error cases
- [ ] Edge cases tested
- [ ] Backend: Tests in `__tests__/` directory
- [ ] Frontend: Unit tests in `__tests__/`, E2E in `e2e/`
- [ ] External services mocked (email, payment providers)
- [ ] Test data cleaned up after tests
- [ ] Descriptive test names

### Architecture & Patterns
- [ ] Follows layered architecture (backend)
- [ ] Routes only handle HTTP, delegate to services
- [ ] Services contain business logic
- [ ] Database queries in services, not routes
- [ ] Middleware applied in correct order
- [ ] No business logic in route handlers
- [ ] Components are focused and reusable (frontend)
- [ ] API functions separated from components

### Performance
- [ ] No unnecessary database queries
- [ ] Database queries are efficient (indexes considered)
- [ ] No N+1 query problems
- [ ] Frontend: Components optimized (memoization if needed)
- [ ] Frontend: Images optimized (Next.js Image component)
- [ ] Large lists paginated or virtualized
- [ ] API responses are appropriately sized

### Documentation
- [ ] Complex logic is commented
- [ ] API endpoints documented
- [ ] JSDoc for complex functions
- [ ] Comments explain "why" not "what"