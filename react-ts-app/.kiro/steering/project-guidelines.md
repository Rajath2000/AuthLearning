---
inclusion: auto
name: Project Guidelines
description: Development standards and best practices for this React + TypeScript project
---

# React + TypeScript Project Guidelines

## Project Overview
This is a modern React application built with TypeScript and Vite. The project emphasizes type safety, component modularity, and best practices in React development.

## Development Environment

### Build & Development Tools
- **Build Tool**: Vite (Fast HMR and optimized builds)
- **Package Manager**: npm
- **Runtime**: Node.js 16+
- **TypeScript**: Strict mode enabled

### Available Scripts
```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Build for production with type checking
npm run preview  # Preview production build locally
```

## TypeScript Standards

### Configuration
- **Target**: ES2020
- **Module System**: ESNext with bundler resolution
- **Strict Mode**: Enabled (noImplicitAny, strictNullChecks, etc.)
- **JSX**: React 17+ new JSX transform

### Type Safety Rules
1. **No implicit any** - All types must be explicitly defined
2. **Proper typing** - Use interfaces/types for component props and state
3. **Type exports** - Export types alongside implementations
4. **Strict nulls** - Handle null/undefined explicitly

Example prop typing:
```typescript
interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}>
    {label}
  </button>
)
```

## React Component Standards

### Component Structure
1. **Functional components only** - Use function declarations or arrow functions
2. **Hooks for state** - Use `useState`, `useEffect`, `useContext`, etc.
3. **Props typing** - Always type component props with interfaces
4. **Memoization** - Use `React.memo` for performance-critical components

### File Organization
- Components in `/src/components` directory
- One component per file (unless very tightly coupled)
- Component file name matches component name (PascalCase)
- Styles co-located with components (`.css` or CSS-in-JS)

### Example Component
```typescript
import React, { useState } from 'react'
import './Counter.css'

interface CounterProps {
  initialValue?: number
}

const Counter: React.FC<CounterProps> = ({ initialValue = 0 }) => {
  const [count, setCount] = useState<number>(initialValue)

  return (
    <div className="counter">
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  )
}

export default Counter
```

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.css
│   └── Card/
│       ├── Card.tsx
│       └── Card.css
├── App.tsx              # Main App component
├── App.css              # App styling
├── main.tsx             # Application entry point
└── index.css            # Global styles
```

## Styling Approach

- **CSS Modules** - Use for component-scoped styles (recommended)
- **Global CSS** - Use for global styles and resets
- **CSS Variables** - Use for theming and design tokens

### CSS Best Practices
1. Use descriptive class names
2. Keep specificity low
3. Use flexbox/grid for layouts
4. Mobile-first responsive design

## Code Quality

### Naming Conventions
- **Components**: PascalCase (e.g., `UserCard.tsx`)
- **Files**: Match component name or use descriptive names
- **Variables/Functions**: camelCase (e.g., `handleClick`, `userData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Types/Interfaces**: PascalCase (e.g., `UserProps`, `APIResponse`)

### Best Practices
1. **Keep components small** - Aim for single responsibility
2. **Prop drilling** - Avoid deep nesting; consider context API or state management
3. **Performance** - Use React DevTools Profiler to identify bottlenecks
4. **Accessibility** - Use semantic HTML, ARIA labels where needed
5. **Comments** - Document complex logic, not obvious code

## When to Use What

### State Management
- **useState**: Simple component-level state
- **useReducer**: Complex state logic with multiple related values
- **useContext**: Shared state across component tree
- **External library**: Consider Redux, Zustand, or Jotai for large apps

### Side Effects
- **useEffect**: Data fetching, subscriptions, DOM manipulations
- **useLayoutEffect**: Synchronous layout effects (rare)
- **Custom hooks**: Extract reusable effect logic

## Common Patterns

### Custom Hooks
Extract reusable logic into custom hooks:
```typescript
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => setError(err))
      .finally(() => setLoading(false))
  }, [url])

  return { data, loading, error }
}
```

### Higher-Order Components (When Needed)
```typescript
function withTheme<P extends object>(Component: React.ComponentType<P>) {
  return (props: P) => (
    <ThemeProvider>
      <Component {...props} />
    </ThemeProvider>
  )
}
```

## Testing (When Added)
- Use Vitest for unit tests (recommended for Vite projects)
- React Testing Library for component testing
- Test behavior, not implementation details
- Aim for meaningful test coverage

## Performance Optimization

1. **Code splitting** - Use dynamic imports for large components
2. **Image optimization** - Use appropriate formats and sizes
3. **Memoization** - Use `React.memo`, `useMemo`, `useCallback` judiciously
4. **Bundle analysis** - Use Vite's built-in tools to analyze bundle size

## Git Workflow
- Create feature branches for new work
- Keep commits focused and well-described
- Squash related commits when appropriate
- Reference issues in commit messages when applicable

## Dependencies
Only add dependencies that are:
- Actively maintained
- Well-documented
- Necessary for the project
- Lightweight (consider impact on bundle size)

When proposing dependencies, evaluate:
- Bundle size impact
- TypeScript support
- Community adoption
- Maintenance status

## Resources
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev)
- [React Hooks API Reference](https://react.dev/reference/react)
