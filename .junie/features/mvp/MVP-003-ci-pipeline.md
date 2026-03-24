# MVP-003: GitHub Actions CI Pipeline

## Description
Set up the GitHub Actions CI workflow that runs on every push and PR: lint, type-check, test, bundle size check, and dependency vulnerability scan.

## Personas
- **Kai (Performance)**: Bundle size checks catch regressions early
- **Nadia (Security)**: Dependency audit catches known vulnerabilities
- **Sam (DevOps)**: Automated quality gate before merging

## Dependencies
- MVP-001 (monorepo, Biome, tsconfig)

## Scope

### Files to create
```
.github/
└── workflows/
    └── ci.yml
```

### Pipeline steps
```yaml
name: CI
on: [push, pull_request]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Node.js 20
      - Setup pnpm
      - pnpm install (with cache)
      - Biome lint + format check
      - TypeScript type check (tsc --noEmit per package)
      - Unit + integration tests (vitest --coverage)
      - Upload coverage report
      - Bundle size check (web build, check gzipped size)
        - Warn at 250KB, fail at 500KB
      - Dependency vulnerability scan (pnpm audit --audit-level=high)
      - Build all packages
```

### Bundle size check
After `pnpm --filter web build`, check the output:
```bash
# Get total gzipped size of dist/assets/*.js
BUNDLE_SIZE=$(find apps/web/dist/assets -name '*.js' -exec gzip -c {} \; | wc -c)
if [ $BUNDLE_SIZE -gt 524288 ]; then echo "FAIL: bundle > 500KB"; exit 1; fi
if [ $BUNDLE_SIZE -gt 262144 ]; then echo "WARN: bundle > 250KB"; fi
```

### Caching
- pnpm store cache (keyed by lockfile hash)
- Turborepo remote cache (optional, can enable later)

## Acceptance Criteria
- [ ] CI runs on push to any branch and on PRs
- [ ] Lint failure blocks merge
- [ ] Type errors block merge
- [ ] Test failure blocks merge
- [ ] Bundle size > 500KB blocks merge
- [ ] High/critical vulnerability blocks merge
- [ ] Pipeline completes in under 5 minutes for a clean run
- [ ] pnpm cache is restored between runs
