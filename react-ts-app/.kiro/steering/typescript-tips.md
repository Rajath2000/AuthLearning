---
inclusion: auto
name: TypeScript Tips & Patterns
description: Advanced TypeScript patterns and best practices for React
---

# TypeScript Tips & Patterns for React

## Type Definitions

### Props Interface Pattern
```typescript
// ✅ Good: Explicit interface
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  onClick: () => void
  children: React.ReactNode
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', ...props }) => {
  return <button className={`btn btn-${variant}`} {...props} />
}
```

### Union Types for Variants
```typescript
type ButtonProps = 
  | { variant: 'primary'; onClick: () => void }
  | { variant: 'secondary'; disabled: true }

// This enforces that secondary buttons must be disabled
const Button: React.FC<ButtonProps> = (props) => {
  // TypeScript knows exactly what properties are available
  return <button />
}
```

### Generic Components
```typescript
// Generic list component that works with any item type
interface ListProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  keyExtractor: (item: T) => string | number
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map(item => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}

// Usage
interface User {
  id: number
  name: string
}

const users: User[] = [{ id: 1, name: 'Alice' }]

<List
  items={users}
  renderItem={user => user.name}
  keyExtractor={user => user.id}
/>
```

## Common Type Patterns

### Event Handlers
```typescript
// ✅ Good: Type event handlers properly
const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
  e.preventDefault()
  console.log('Clicked')
}

const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
  const value = e.currentTarget.value
  console.log(value)
}

const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
  e.preventDefault()
  const formData = new FormData(e.currentTarget)
}
```

### Optional Props
```typescript
// ✅ Good: Use optional properties
interface CardProps {
  title: string
  description?: string // Optional
  image?: {
    src: string
    alt: string
  }
}

const Card: React.FC<CardProps> = ({ title, description, image }) => {
  return (
    <div className="card">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {image && <img src={image.src} alt={image.alt} />}
    </div>
  )
}
```

### Discriminated Unions
```typescript
// Perfect for status states
type Status = 
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; error: Error }
  | { state: 'success'; data: unknown }

const useAsync = (): Status => {
  // ...
}

// Usage with type narrowing
const { state, error, data } = useAsync()

switch (state) {
  case 'idle':
    return <p>Ready to load</p>
  case 'loading':
    return <p>Loading...</p>
  case 'error':
    return <p>Error: {error.message}</p>
  case 'success':
    return <p>Data: {JSON.stringify(data)}</p>
}
```

### Const Assertions
```typescript
// ✅ Good: Use as const for literal types
const SIZES = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
} as const

type Size = typeof SIZES[keyof typeof SIZES] // 'sm' | 'md' | 'lg'

interface ButtonProps {
  size: Size
}
```

### Record Type
```typescript
// Good for object types with known keys
type Theme = 'light' | 'dark'

const colors: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#000000',
}

// Type-safe access
const lightColor = colors['light'] // ✅ OK
// const invalid = colors['other'] // ❌ Error
```

## Hook Typing

### useState with Proper Types
```typescript
// ✅ Good: Explicit type annotation
const [count, setCount] = useState<number>(0)

const [user, setUser] = useState<User | null>(null)

const [filters, setFilters] = useState<{
  search: string
  category: string
  sort: 'asc' | 'desc'
}>({
  search: '',
  category: 'all',
  sort: 'asc',
})
```

### useCallback with Correct Types
```typescript
interface HandlerParams {
  id: number
  name: string
}

const handleAction = useCallback((params: HandlerParams): void => {
  console.log(params)
}, [])
```

### Custom Hook Return Types
```typescript
interface UseAuthReturn {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null)

  return {
    user,
    isAuthenticated: user !== null,
    login: async (email, password) => {
      // Implementation
    },
    logout: () => {
      setUser(null)
    },
  }
}
```

## Utility Types

### Partial - Make All Properties Optional
```typescript
interface User {
  id: number
  name: string
  email: string
}

type PartialUser = Partial<User>

const updateUser = (updates: PartialUser) => {
  // Any combination of User properties
}
```

### Pick - Select Specific Properties
```typescript
type UserPreview = Pick<User, 'id' | 'name'>
// { id: number; name: string }
```

### Omit - Exclude Specific Properties
```typescript
type UserWithoutId = Omit<User, 'id'>
// { name: string; email: string }
```

### Readonly - Make Properties Immutable
```typescript
type ReadonlyUser = Readonly<User>

// Or per property
interface Config {
  readonly apiUrl: string
  readonly port: number
}
```

### ReturnType - Extract Return Type
```typescript
const getValue = (): { count: number; name: string } => ({
  count: 1,
  name: 'test',
})

type Value = ReturnType<typeof getValue>
// { count: number; name: string }
```

## Advanced Patterns

### Exhaustiveness Checking
```typescript
type Status = 'pending' | 'success' | 'error'

const getMessage = (status: Status): string => {
  switch (status) {
    case 'pending':
      return 'Loading...'
    case 'success':
      return 'Done!'
    case 'error':
      return 'Failed'
    // If you forget a case, TypeScript won't complain by default
    // Use this to enforce checking all cases:
    default:
      const _exhaustive: never = status
      return _exhaustive
  }
}
```

### Template Literal Types
```typescript
// Event handler factory with type-safe event names
type ElementEvent<T> = T extends HTMLElement 
  ? keyof HTMLElementEventMap 
  : never

const addEventListener = <T extends HTMLElement>(
  element: T,
  event: ElementEvent<T>,
  handler: EventListener
) => {
  element.addEventListener(event as string, handler)
}
```

### Conditional Types
```typescript
// Extract type from an array
type Flatten<T> = T extends Array<infer U> ? U : T

type Str = Flatten<string[]> // string
type Num = Flatten<number> // number
```

## Typing Common Scenarios

### API Response
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

const fetchUser = async (id: number): Promise<ApiResponse<User>> => {
  // ...
}
```

### Form Data
```typescript
interface FormData {
  email: string
  password: string
  rememberMe: boolean
}

type FormErrors = Partial<Record<keyof FormData, string>>

const [errors, setErrors] = useState<FormErrors>({})
```

### Component Props with Children
```typescript
interface ContainerProps {
  children: React.ReactNode
}

interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
}
```

## Tips & Tricks

1. **Use `as const` to narrow types** - Helpful for limited values
2. **Leverage `keyof` operator** - Type-safe object key access
3. **Type your callbacks early** - Prevents bugs and aids IDE autocomplete
4. **Use satisfies operator** - Validate without changing inferred type
5. **Extract types from implementations** - Use `typeof` and `ReturnType`
6. **Create reusable type helpers** - Reduce repetition with utility types
7. **Use discriminated unions** - More robust than optional properties
8. **Strict mode benefits** - Enable strict: true in tsconfig.json

## Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [TypeScript Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
