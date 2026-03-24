# MVP-030: GitHub Release Workflow

## Description
Automated release pipeline triggered by Git version tags. Runs full CI, builds Docker images, and creates a GitHub Release with categorized changelog and build artifacts.

## Personas
- **Sam (DevOps)**: Automated, repeatable releases with zero manual steps
- **Omar (Integration Developer)**: Clear release notes with breaking changes and API version info
- **Nadia (Security)**: CI gate before release, artifact checksums for integrity verification
- **Marcus (Backend)**: Conventional changelog categories from PR labels

## Dependencies
- MVP-001 (monorepo)
- MVP-002 (Docker Compose / Dockerfiles)
- MVP-003 (CI pipeline — reused as gate)

## Scope

### Files to create
```
.github/
├── workflows/
│   └── release.yml           # Release workflow triggered by version tags
├── release.yml               # Auto-generated release notes configuration
```

### Versioning strategy
- **Semantic versioning**: `MAJOR.MINOR.PATCH` (e.g., `v0.1.0`, `v1.0.0`)
- **Single product version**: The entire monorepo ships as one version. API, web, and worker are always released together.
- **Tag format**: `v*` (e.g., `v0.1.0`, `v1.2.3`)
- **Pre-release tags**: `v*-alpha.*`, `v*-beta.*`, `v*-rc.*` (e.g., `v0.1.0-alpha.1`, `v1.0.0-rc.2`)
- **SDK versioning**: Deferred to Phase 3 — will have its own publish workflow

### Release workflow (`release.yml`)

**Trigger**: Push of a tag matching `v*`

**Steps**:
```
1. Checkout (at exact tag ref)
2. Setup Node.js 22 + pnpm
3. Install dependencies
4. Run full CI gate:
   - Biome lint + format check
   - TypeScript type check (turbo build)
   - Tests
   - Dependency audit (--audit-level=high)
5. Build Docker images:
   - taskforge/api:<version>
   - taskforge/worker:<version>
   - taskforge/web:<version>
6. Tag Docker images:
   - Stable release: also tag as `latest`
   - Pre-release: version tag only (no `latest`)
7. Create GitHub Release:
   - Title: tag name (e.g., "v0.1.0")
   - Body: auto-generated from release.yml config
   - Pre-release flag: true if tag matches pre-release pattern
   - Artifacts: Docker image digests
```

### Release notes configuration (`.github/release.yml`)

Categories based on PR labels:
```yaml
changelog:
  categories:
    - title: "🚨 Breaking Changes"
      labels: [breaking]
    - title: "🚀 Features"
      labels: [feature, enhancement]
    - title: "🐛 Bug Fixes"
      labels: [bugfix, fix]
    - title: "🔒 Security"
      labels: [security]
    - title: "📦 Dependencies"
      labels: [dependencies]
    - title: "🏗️ Infrastructure"
      labels: [infrastructure, ci, devops]
    - title: "📝 Documentation"
      labels: [documentation]
    - title: "🧹 Other Changes"
      labels: ["*"]
```

### Docker image tagging rules

| Tag pushed | Docker tags | GitHub Release |
|---|---|---|
| `v1.2.3` | `1.2.3`, `1.2`, `1`, `latest` | Stable release |
| `v1.2.3-rc.1` | `1.2.3-rc.1` | Pre-release |
| `v1.2.3-alpha.1` | `1.2.3-alpha.1` | Pre-release |
| `v1.2.3-beta.1` | `1.2.3-beta.1` | Pre-release |

### How to create a release

```bash
# Stable release
git tag v0.1.0
git push origin v0.1.0

# Pre-release
git tag v0.1.0-rc.1
git push origin v0.1.0-rc.1
```

### Future additions (not in scope)
- Push Docker images to a container registry (GitHub Container Registry or Docker Hub)
- Attach OpenAPI spec JSON as a release artifact (once MVP-005 generates it)
- SDK publish workflow (Phase 3)
- Automated version bumping via a "release PR" pattern

## Acceptance Criteria
- [ ] Pushing a `v*` tag triggers the release workflow
- [ ] Full CI suite runs before release is created
- [ ] CI failure prevents the release from being created
- [ ] GitHub Release is created with auto-generated categorized changelog
- [ ] Stable tags create a stable release
- [ ] Pre-release tags (`-alpha`, `-beta`, `-rc`) create a pre-release
- [ ] Docker images are built and tagged with the version
- [ ] Stable releases also tag Docker images as `latest`
- [ ] Pre-releases do not update the `latest` Docker tag
- [ ] Release title matches the tag name
- [ ] PR labels correctly categorize changelog entries
