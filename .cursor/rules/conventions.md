# Code Conventions

## File Naming
- **Backend**: `kebab-case.ts` (e.g., `ticket.service.ts`, `user.routes.ts`)
- **Frontend**: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- **Tests**: `*.test.ts` or `*.test.tsx`
- **Routes**: `*.routes.ts` (backend), `page.tsx` (frontend App Router)

## Import Organization
- Group imports: external packages → internal modules
- Alphabetical within groups
- Use absolute imports with path aliases in frontend (`@/lib/...`)
- Use relative imports in backend (`../config/...`)

## Environment Variables
- Backend: `.env` in `backend/` directory
- Frontend: `.env.local` in `frontend/` directory (prefix with `NEXT_PUBLIC_` for client-side)
- Never commit `.env` files
- Document required variables in deployment docs

## Code Quality Checklist
When making changes, ensure:
- ✅ **Always** maintain type safety
- ✅ **Always** respect multi-tenancy (filter by companyId)
- ✅ **Always** check permissions
- ✅ **Always** validate inputs
- ✅ **Always** handle errors gracefully
- ✅ **Always** write tests for new features
- ✅ **Always** update types if database schema changes
- ✅ **Always** use `.js` extensions in backend imports
- ✅ **Always** follow the layered architecture pattern

## Comments & Documentation
- Add JSDoc comments for complex functions
- Document API endpoints with clear descriptions
- Explain "why" not "what" in comments
- Keep comments up-to-date with code changes

