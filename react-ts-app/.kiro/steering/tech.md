# Technology Stack

## Core Framework
- **React 19.3.0** - UI library for building component-based interfaces
- **TypeScript 7.0.2** - Type-safe JavaScript development
- **Vite 8.3.2** - Next-generation build tool and dev server

## Build & Tooling
- **@vitejs/plugin-react 6.1.1** - React plugin for Vite
- **Node.js 16+** - Runtime requirement

## Type Definitions
- **@types/react 19.3.0**
- **@types/react-dom 19.3.0**

## Configuration Details
- **Target**: ES2020
- **Module System**: ESNext
- **JSX Runtime**: react-jsx (automatic)
- **Strict Mode**: Enabled (strict TypeScript checking)
- **Module Resolution**: bundler

## Common Commands

### Development
```bash
npm run dev
```
Starts the Vite development server with HMR at http://localhost:5173

### Building
```bash
npm run build
```
Runs TypeScript type checking (`tsc`) then builds for production with Vite

### Preview
```bash
npm run preview
```
Serves the production build locally for testing before deployment

### Installation
```bash
npm install
```
Installs all dependencies

## TypeScript Configuration
- **Strict Mode**: Enabled
- **No Unused Locals**: Enforced (`noUnusedLocals: true`)
- **No Unused Parameters**: Enforced (`noUnusedParameters: true`)
- **No Fallthrough Cases**: Enforced (`noFallthroughCasesInSwitch: true`)
- **Isolated Modules**: Enabled for single-file transpilation
- **Implicit Any**: Not allowed (strict mode)

## Build Output
- Development: Served from memory with HMR
- Production: Optimized build output in `dist/` directory
