# Commit All Changes with Conventional Commits

## Overview
This command stages all changes and creates a single atomic commit using the Conventional Commits specification. It analyzes the changes to determine the appropriate commit type and generates a meaningful commit message.

## Conventional Commit Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Commit Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

## Execution Steps

1. **Check Git Status**
   - Run `git status` to see what files have changed
   - Verify there are changes to commit (exit if working tree is clean)

2. **Analyze Changes**
   - Review all modified, added, and deleted files
   - Determine the primary type of change:
     - If multiple types exist, use the most significant one
     - Priority: feat > fix > refactor > perf > test > docs > style > build > ci > chore
   - Identify affected scopes (e.g., `backend`, `frontend`, `database`, `deployment`)
   - Review file paths to understand the nature of changes

3. **Generate Commit Message**
   - Create a concise, imperative-mood description (e.g., "add user authentication" not "added user authentication")
   - Include scope if changes are scoped to a specific area
   - Add body if the change needs explanation (breaking changes, complex logic, etc.)
   - Include breaking changes footer if applicable: `BREAKING CHANGE: <description>`

4. **Stage All Changes**
   - Run `git add -A` to stage all changes (including deletions)
   - Verify staging with `git status --short`

5. **Create Atomic Commit**
   - Execute `git commit -m "<commit message>"`
   - Ensure all changes are committed in a single commit

## Examples

### Feature Addition
```
feat(backend): add user authentication middleware

Implement JWT-based authentication with role-based access control.
Add middleware for protecting routes and validating tokens.
```

### Bug Fix
```
fix(frontend): resolve invoice PDF generation issue

Fix missing data in PDF export when invoice has multiple line items.
Handle edge case where line items array was empty.
```

### Multiple Scopes
```
feat(backend,frontend): implement subscription management

Backend: Add subscription service and routes
Frontend: Create subscription management UI
```

### Breaking Change
```
feat(api): restructure authentication endpoints

BREAKING CHANGE: Authentication endpoints moved from /auth to /api/v1/auth
All clients must update their API calls to use the new base path.
```

## Notes
- Always use imperative mood in commit messages ("add" not "added", "fix" not "fixed")
- Keep the description under 72 characters when possible
- Use the body to explain "what" and "why", not "how"
- If changes span multiple types, choose the most significant one
- For WIP commits, use `chore` type with `wip:` prefix: `chore: wip: implement feature X`

