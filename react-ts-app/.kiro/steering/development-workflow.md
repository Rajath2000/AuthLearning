---
inclusion: auto
name: Development Workflow
description: Step-by-step guide for common development tasks
---

# Development Workflow Guide

## Getting Started

### Initial Setup
```bash
# Navigate to project
cd react-ts-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173` with hot module replacement (HMR) enabled.

## Creating Components

### Step 1: Create Component Directory
```bash
mkdir -p src/components/MyComponent
```

### Step 2: Create Component File
Create `src/components/MyComponent/MyComponent.tsx`:
```typescript
import React from 'react'
import './MyComponent.css'

interface MyComponentProps {
  title: string
}

const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return (
    <div className="my-component">
      <h2>{title}</h2>
    </div>
  )
}

export default MyComponent
```

### Step 3: Create Styles
Create `src/components/MyComponent/MyComponent.css`:
```css
.my-component {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.my-component h2 {
  margin: 0 0 0.5rem 0;
}
```

### Step 4: Create Index (Optional)
Create `src/components/MyComponent/index.ts`:
```typescript
export { default } from './MyComponent'
export type { MyComponentProps } from './MyComponent'
```

### Step 5: Use Component
Import and use in your app:
```typescript
import MyComponent from './components/MyComponent'

function App() {
  return <MyComponent title="Hello" />
}
```

## Adding State

### Simple State with useState
```typescript
import { useState } from 'react'

const Counter: React.FC = () => {
  const [count, setCount] = useState<number>(0)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  )
}
```

### Complex State with useReducer
```typescript
import { useReducer } from 'react'

interface State {
  count: number
  loading: boolean
}

type Action = 
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_LOADING'; payload: boolean }

const initialState: State = { count: 0, loading: false }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 }
    case 'DECREMENT':
      return { ...state, count: state.count - 1 }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    default:
      return state
  }
}

const MyComponent: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>-</button>
    </div>
  )
}
```

## Handling Side Effects

### Data Fetching
```typescript
import { useEffect, useState } from 'react'

interface User {
  id: number
  name: string
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (!response.ok) throw new Error('Failed to fetch')
        const data = await response.json()
        setUsers(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error}</p>

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

### Event Listeners
```typescript
useEffect(() => {
  const handleResize = () => {
    console.log('Window resized')
  }

  window.addEventListener('resize', handleResize)

  // Cleanup function
  return () => {
    window.removeEventListener('resize', handleResize)
  }
}, [])
```

## Performance Optimization

### Memoizing Components
```typescript
import { memo } from 'react'

interface ItemProps {
  id: number
  name: string
}

const Item = memo<ItemProps>(({ id, name }) => {
  return <li key={id}>{name}</li>
})

Item.displayName = 'Item'

export default Item
```

### Memoizing Values
```typescript
import { useMemo } from 'react'

const ExpensiveComponent: React.FC<{ items: string[] }> = ({ items }) => {
  const sortedItems = useMemo(() => {
    console.log('Sorting items...')
    return [...items].sort()
  }, [items])

  return <ul>{sortedItems.map(item => <li key={item}>{item}</li>)}</ul>
}
```

### Memoizing Callbacks
```typescript
import { useCallback } from 'react'

const Parent: React.FC = () => {
  const [count, setCount] = useState(0)

  const handleClick = useCallback(() => {
    setCount(c => c + 1)
  }, [])

  return <Child onClick={handleClick} />
}
```

## Building for Production

```bash
# Build the application
npm run build

# The output will be in the dist/ directory

# Preview the production build locally
npm run preview
```

## Debugging

### React DevTools
1. Install React DevTools browser extension
2. Open DevTools (F12)
3. Use the React Components tab to inspect component hierarchy
4. Use the Profiler tab to measure performance

### Using console in TypeScript
```typescript
// Type-safe logging
const debugLog = (message: string, data?: unknown): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${message}`, data)
  }
}
```

### Breakpoints
1. Open DevTools Sources tab
2. Set breakpoints directly in your code
3. Use conditional breakpoints with right-click

## Common Tasks

### Adding Global State with Context
```typescript
// contexts/ThemeContext.tsx
import { createContext, useContext, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light')

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
```

### Using Custom Hooks
```typescript
// hooks/useFetch.ts
import { useEffect, useState } from 'react'

interface UseFetchReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useFetch<T>(url: string): UseFetchReturn<T> {
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

// In component
const { data, loading, error } = useFetch<User>('/api/user')
```

## Troubleshooting

### HMR Not Working
- Check that `npm run dev` is running
- Verify no port conflicts (default: 5173)
- Clear browser cache (Ctrl+Shift+Del)
- Restart the dev server

### Type Errors
- Check `npm run build` for full TypeScript errors
- Hover over errors in editor for suggestions
- Review tsconfig.json strict settings

### Build Fails
- Check `npm run build` output for specific errors
- Ensure all dependencies are installed: `npm install`
- Clear node_modules and reinstall if needed: `rm -rf node_modules && npm install`

## Next Steps
- Add routing with React Router
- Implement state management with Zustand/Redux
- Add testing with Vitest and React Testing Library
- Configure environment variables for different deployments
