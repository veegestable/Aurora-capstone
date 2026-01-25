---
description: Run strict quality checks on the mobile project before committing.
---

# Quality Check Workflow

Follow this workflow to ensure your code meets the project's standards before pushing any changes.

## 1. Type Checking
Ensure there are no TypeScript errors in the mobile project.
```bash
cd mobile
npm run typecheck
```
*Fix any errors reported by the compiler.*

## 2. Linting (Future Implementation)
// TODO: Once strictly compatible eslint is confirmed
Running lint helps catch common bugs and style issues.
```bash
cd mobile
npx eslint . --ext .ts,.tsx
```

## 3. Manual Verification Checklist
- [ ] **No `any` types**: Search for `: any` and replace with specific types.
- [ ] **No Console Logs**: Remove `console.log` statements used for debugging.
- [ ] **Strict Mode**: Verify `tsconfig.json` has `"strict": true` (it should stay this way).
- [ ] **Error Handling**: Ensure new async calls have `try/catch`.
- [ ] **Imports**: Remove unused imports.

## 4. Run Tests (If available)
If you have written tests, run them now.
```bash
cd mobile
npm test
```
