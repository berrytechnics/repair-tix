# Security Rules

## Best Practices
- Always validate and sanitize user input
- Use parameterized queries (Kysely handles this automatically)
- Check permissions before operations
- Use HTTPS in production
- Sanitize logs (remove sensitive data)
- Rate limit API endpoints
- Use Helmet for security headers

## Authentication & Authorization
- All endpoints (except `/user/register`, `/user/login`, and `/health`) require authentication via JWT token
- Use `Authorization: Bearer <token>` header
- Validate tokens in `validateRequest` middleware
- Check permissions using RBAC middleware before operations

## Data Isolation
- **Always** filter by `companyId` in database queries
- Never expose data from other companies
- Use tenant middleware to ensure proper isolation
- Validate location access for location-scoped resources

## Input Validation
- Validate all user inputs
- Use express-validator for backend validation
- Use Zod schemas for frontend validation
- Sanitize strings (trim, escape)
- Validate UUIDs, emails, and other formats
- Set appropriate length limits

## Sensitive Data
- Never log passwords, tokens, or sensitive user data
- Use encryption for sensitive data at rest
- Use environment variables for secrets (never commit `.env` files)
- Hash passwords with bcrypt
- Use secure session storage for tokens

