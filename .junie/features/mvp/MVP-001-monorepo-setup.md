# MVP-001: Monorepo & Tooling Setup

## Description
Initialize the Turborepo monorepo with pnpm workspaces, Biome configuration, shared TypeScript config, and the base package structure.

## Personas
- **Marcus (Backend)**, **Priya (Frontend)**: Need a consistent, fast dev environment
- **Kai (Performance)**: Turborepo caching speeds up builds

## Dependencies
None — this is the foundation.

## Scope

### Files to create
```
TaskForge/
├── package.json              # Root: scripts (dev, build, test, lint), devDependencies
├── pnpm-workspace.yaml       # Workspace: apps/*, packages/*
├── turbo.json                # Pipelines: build, test, lint, dev
├── biome.json                # Linting + formatting rules
├── tsconfig.base.json        # Shared TypeScript config (strict, paths)
├── .gitignore
├── .nvmrc                    # Node.js 20 LTS
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json     # Extends tsconfig.base.json
│   │   └── src/
│   │       └── index.ts      # Placeholder entry
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── main.tsx      # Placeholder entry
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts
│   ├── db/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts
│   └── email-templates/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
```

### Configuration details

**turbo.json pipelines:**
- `build`: depends on `^build` (build dependencies first)
- `test`: depends on `build`
- `lint`: no dependencies (runs in parallel)
- `dev`: persistent, no cache

**biome.json:**
- Indent: 2 spaces
- Quote style: single
- Semicolons: always
- Organize imports: enabled
- Recommended lint rules enabled

**tsconfig.base.json:**
- Target: ES2022
- Module: ESNext
- Strict: true
- skipLibCheck: true
- Path aliases: `@taskforge/shared`, `@taskforge/db`, `@taskforge/email-templates`

### Scripts (root package.json)
```json
{
  "dev": "turbo dev",
  "build": "turbo build",
  "test": "turbo test",
  "test:coverage": "turbo test -- --coverage",
  "lint": "biome check .",
  "lint:fix": "biome check --write .",
  "clean": "turbo clean"
}
```

## Acceptance Criteria
- [ ] `pnpm install` completes successfully
- [ ] `pnpm lint` runs Biome across all packages
- [ ] `pnpm build` builds all packages in dependency order
- [ ] Each package can import from `@taskforge/shared`
- [ ] TypeScript strict mode enabled everywhere
- [ ] `.gitignore` covers node_modules, dist, .env, .turbo
