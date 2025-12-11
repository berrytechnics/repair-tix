# Architecture & Patterns

## Project Overview
This is a full-stack electronics repair business management system with:
- **Backend**: Node.js + Express + TypeScript + PostgreSQL + Kysely
- **Frontend**: Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- **Architecture**: Multi-tenant with company/location isolation, RBAC, layered architecture

## Request Flow
```
HTTP Request
  ↓
Route Handler
  ↓
Authentication Middleware (JWT)
  ↓
RBAC Middleware (Permissions)
  ↓
Tenant Middleware (Company/Location isolation)
  ↓
Validation Middleware
  ↓
Service Layer (Business logic)
  ↓
Database (Kysely queries)
  ↓
Response
```

## Multi-Tenancy
The system supports multiple companies, each with:
- Multiple locations
- Company-specific role permissions
- Isolated data (customers, tickets, invoices, etc.)
- Location-based filtering

## Creating a New Feature

### Backend Flow
1. Define types in `config/types.ts` if needed
2. Create validator in `validators/`
3. Create service in `services/`
4. Create routes in `routes/`
5. Add route to `app.ts`
6. Write tests

### Frontend Flow
1. Create API functions in `lib/api/`
2. Create components in `components/` or pages in `app/`
3. Add forms with React Hook Form + Zod
4. Style with Tailwind CSS
5. Write tests

## Error Handling Pattern

### Backend
```typescript
try {
  const result = await service.create(data);
  res.json({ success: true, data: result });
} catch (error) {
  if (error instanceof BadRequestError) {
    res.status(400).json({ success: false, error: { message: error.message } });
  } else {
    logger.error("Unexpected error", error);
    res.status(500).json({ success: false, error: { message: "Internal server error" } });
  }
}
```

### Frontend
```typescript
try {
  const result = await api.createTicket(data);
  // Handle success
} catch (error) {
  setError(getErrorMessage(error));
}
```

