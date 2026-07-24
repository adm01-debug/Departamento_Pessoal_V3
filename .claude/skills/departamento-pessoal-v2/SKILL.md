```markdown
# departamento-pessoal-v2 Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `departamento-pessoal-v2` repository, a TypeScript-based React project. You'll learn how to write code that fits the project's style, structure your files, use imports/exports, write and locate tests, and follow commit message conventions.

## Coding Conventions

### File Naming
- Use **camelCase** for all file and folder names.
  - Example: `userProfile.tsx`, `employeeList.ts`

### Import Style
- Use **alias imports** rather than relative paths where possible.
  - Example:
    ```typescript
    import { EmployeeCard } from '@components/EmployeeCard';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // Good
    export const EmployeeList = () => { ... };

    // Avoid default exports
    // export default EmployeeList;
    ```

### Commit Messages
- Follow **Conventional Commits**.
- Use type prefixes (e.g., `fix:`).
- Keep commit messages concise (average 77 characters).
  - Example:
    ```
    fix: correct salary calculation for overtime hours
    ```

## Workflows

_No automated workflows detected in repository._

## Testing Patterns

- **Test File Pattern:** All test files use the `*.test.*` naming convention.
  - Example: `userProfile.test.tsx`
- **Testing Framework:** Not explicitly detected; follow standard React/TypeScript testing practices.
- **Test Placement:** Place test files alongside the modules they test or in a dedicated `__tests__` directory.

  Example test file:
  ```typescript
  import { render } from '@testing-library/react';
  import { EmployeeList } from './employeeList';

  test('renders employee names', () => {
    // test implementation
  });
  ```

## Commands
| Command      | Purpose                                       |
|--------------|-----------------------------------------------|
| /test        | Run all tests in the codebase                 |
| /lint        | Lint the codebase for style and errors        |
| /commit      | Guide for writing a conventional commit       |
```
