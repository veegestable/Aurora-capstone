---
trigger: always_on
---

# Coding Standards & Best Practices

This document outlines the coding standards and best practices for the Aurora Capstone project. Adhering to these rules ensures code consistency, reduces bugs, and improves maintainability.

## 1. Core Technologies & Strict Mode
- **Typescript**: All code must be written in TypeScript.
  - **Strict Mode**: `strict: true` is enabled in `tsconfig.json`. Do not disable it.
  - **No `any`**: Avoid using `any`. Use specific types or `unknown` with proper type narrowing.
  - **Interfaces vs Types**: Prefer `interface` for object definitions and `type` for unions/primitives.

## 2. React Components
- **Functional Components**: Use functional components with hooks. Class components are forbidden.
- **Hooks Rules**:
  - Only call hooks at the top level.
  - Custom hooks should start with `use`.
  - Thoroughly handle dependency arrays in `useEffect` and `useCallback`.
- **Props**:
  - Define props with Interfaces.
  - Destructure props in the function signature.
  - Use `React.FC` or explicitly type `PropsWithChildren` if children are needed, though explicit prop typing is preferred.

## 3. Styling
- **Tailwind CSS**: Use Tailwind utility classes for all styling.
  - Avoid `StyleSheet.create` unless absolutely necessary for complex animations or dynamic values that Tailwind cannot handle smoothly.
  - Use `nativewind` for React Native compatibility.
- **Consistency**: Group related utility classes logically (e.g., layout, spacing, typography, colors).

## 4. State Management
- **Local State**: Use `useState` for simple component-local state.
- **Global State**: Use Context API or designated state management stores for global data.
- **Optimistic Updates**: When performing mutations (likes, saves), update the UI immediately before waiting for the server response. Rollback on failure.

## 5. Async Operations & Error Handling
- **Async/Await**: Prefer `async/await` over `.then()`.
- **Try/Catch**: Wrap all async operations in `try/catch` blocks.
- **User Feedback**: Always provide user feedback (toats, alerts, or error UI states) when an operation fails.
- **Loading States**: Explicitly handle loading states (`isLoading` flags) to prevent UI freezes.

## 6. Code Structure & Naming
- **File Names**:
  - Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
  - Hooks: `camelCase.ts` (e.g., `useAuth.ts`)
  - Utilities: `camelCase.ts` (e.g., `dateFormatter.ts`)
- **Variable Names**:
  - `camelCase` for variables and functions.
  - `UPPER_SNAKE_CASE` for constants.
  - Boolean variables should start with `is`, `has`, `should` (e.g., `isVisible`, `hasError`).
- **Exports**: Prefer Named Exports over Default Exports for better refactoring support (except for Pages/Screens where default export is often convention).

## 7. Comments & Documentation
- **JSDoc**: Use JSDoc `/** ... */` for complex functions, defining parameters and return values.
- **Inline Comments**: specific, "why" comments for non-obvious logic. Avoid "what" comments that just repeat the code.

## 8. Accessibility (a11y)
- **Labels**: Ensure all interactive elements (Buttons, Inputs) have `aria-label` or `accessibilityLabel`.
- **Hints**: Use `accessibilityHint` for complex interactions.

## 9. Performance
- **Memoization**: Use `useMemo` for expensive calculations and `useCallback` for functions passed as props to memoized components.
- **Lists**: Always use `FlatList` or `SectionList` for long lists, never `ScrollView` with `map()`.
