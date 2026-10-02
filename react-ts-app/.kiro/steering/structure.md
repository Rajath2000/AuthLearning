# Project Structure

## Directory Layout

```
react-ts-app/
├── src/                      # Application source code
│   ├── App.tsx              # Main App component (React component)
│   ├── App.css              # App component styles
│   ├── main.tsx             # Entry point that mounts React to DOM
│   └── index.css            # Global styles
├── index.html               # HTML entry point (loads main.tsx)
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript compiler configuration
├── tsconfig.node.json       # TypeScript config for Node scripts
├── package.json             # Dependencies and scripts
├── package-lock.json        # Locked dependency versions
├── README.md                # Project documentation
└── .gitignore               # Git ignore rules
```

## Conventions

### Source Organization
- All application code lives in `src/`
- Components use `.tsx` extension (TypeScript + JSX)
- Styles use `.css` files co-located with components
- Global styles in `src/index.css`

### File Naming
- Components: PascalCase (e.g., `App.tsx`, `Button.tsx`)
- Utilities/helpers: camelCase (e.g., `utils.ts`)
- CSS files: match component name (e.g., `App.css` for `App.tsx`)

### Imports & Exports
- Components export as default: `export default App`
- Use ES6 module syntax throughout
- Relative imports within `src/`

### HTML Entry Point
- Single HTML entry point at `index.html`
- Root div with id="app" for React mounting
- Script tag references `src/main.tsx`

## Configuration Files

### vite.config.ts
- React plugin enabled for JSX transformation
- Minimalist setup; uses Vite defaults

### tsconfig.json
- Strict type checking enabled
- Target: ES2020 with modern DOM types
- Isolated modules for better build performance
- JSX set to react-jsx (automatic runtime)

## Output
- Production build output: `dist/` directory (not tracked in git)
- Development runs from memory via Vite dev server
