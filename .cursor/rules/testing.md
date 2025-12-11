# Testing Rules

## Backend Tests
- Tests in `backend/src/__tests__/`
- Use Jest with `ts-jest`
- Use supertest for API endpoint testing
- Mock external services (email, payment providers)
- Test files: `*.test.ts`
- Use test database (configured via environment)

## Frontend Tests
- Unit tests in `frontend/src/__tests__/`
- Use Jest + React Testing Library
- E2E tests in `frontend/e2e/` using Playwright
- Mock Next.js router and API calls in unit tests
- Test files: `*.test.tsx` or `*.test.ts`

## Test Organization
- Group related tests with `describe` blocks
- Use descriptive test names: `it('should create a ticket when valid data is provided')`
- Test both success and error cases
- Test edge cases and boundary conditions
- Clean up test data after tests complete

