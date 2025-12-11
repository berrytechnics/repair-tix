# Frontend Rules

## Next.js & React
- Use **Next.js 14 App Router** (`app/` directory)
- Use **TypeScript** with strict mode
- Use **"use client"** directive for client components
- Use **Server Components** by default (no directive needed)
- Path aliases: `@/*` maps to `src/*`
- All frontend code is in `frontend/src/`

## Component Structure
- Components in `components/` directory
- Pages in `app/` directory (App Router)
- Use functional components with hooks
- Use TypeScript interfaces for props
- Prefer named exports for components

## State Management
- Use **Zustand** for global state (in `lib/`)
- Use React hooks (`useState`, `useEffect`, etc.) for local state
- Use React Context for theme and user context (`lib/ThemeContext.tsx`, `lib/UserContext.tsx`)

## Forms & Validation
- Use **React Hook Form** for form handling
- Use **Zod** for schema validation
- Define schemas in component files or separate schema files
- Show validation errors inline

## Styling
- Use **Tailwind CSS** utility classes
- Use `cn()` utility from `lib/utils.ts` for conditional classes
- Support dark mode via `dark:` prefix
- Use consistent spacing, colors, and typography from Tailwind config
- Prefer Tailwind classes over custom CSS

## API Calls
- Use axios instance from `lib/api/index.ts`
- API functions in `lib/api/` directory (e.g., `ticket.api.ts`)
- Always handle errors and show user-friendly messages
- Use `getErrorMessage()` helper for consistent error extraction
- Token management is handled automatically via interceptors

## Type Safety
- Define TypeScript interfaces for API responses
- Use `ApiResponse<T>` wrapper type for API responses
- Match backend DTOs in frontend interfaces
- Use proper typing for all props and state

## Code Style
- Use async/await for API calls
- Handle loading and error states
- Use early returns for conditional rendering
- Extract reusable logic into custom hooks
- Keep components focused and small

