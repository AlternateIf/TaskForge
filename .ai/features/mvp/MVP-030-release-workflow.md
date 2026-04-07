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

### Tag validation rules
- **Stable tag regex**: `^v[0-9]+\.[0-9]+\.[0-9]+$`
- **Pre-release tag regex**: `^v[0-9]+\.[0-9]+\.[0-9]+-(alpha|beta|rc)\.[0-9]+$`
- **Invalid tags**: Workflow fails fast with a clear error message.
- **Source of truth**: Release version is parsed only from `github.ref_name` (never from commit message or branch name).
- **Branch safety**: Tag commit must be reachable from `main` to prevent accidental releases from stale or detached histories.
- **Tag trust**: Protected tag pattern `v*` is required; signed tags are recommended.

### Release workflow (`release.yml`)

**Trigger**: Push of a tag matching `v*`

**Steps**:
```
1. Checkout (at exact tag ref)
2. Validate tag format and determine release type (stable vs pre-release)
3. Verify tagged commit is on main lineage
4. Setup Node.js 22 + pnpm
5. Install dependencies
6. Run full CI gate:
   - Biome lint + format check
   - TypeScript type check (turbo build)
   - Tests
   - Dependency audit (--audit-level=high)
7. Run security gate:
   - Secret scan
   - Dependency review / vulnerability scan
   - Dockerfile misconfiguration scan
8. Build Docker images:
   - taskforge/api:<version>
   - taskforge/worker:<version>
   - taskforge/web:<version>
9. Tag Docker images:
   - Stable release: also tag as `latest`
   - Pre-release: version tag only (no `latest`)
10. Generate artifact integrity data:
   - If registry push is disabled: attach SHA256 checksums for exported image tarballs or build artifacts
   - If registry push is enabled later: attach published image digests
11. Create GitHub Release:
   - Title: tag name (e.g., "v0.1.0")
   - Body: auto-generated from release.yml config
   - Pre-release flag: true if tag matches pre-release pattern
   - Artifacts: checksums (MVP), digests (future when registry push is enabled)
12. Enforce idempotency:
   - If a release for the same tag already exists, fail fast unless explicitly rerun in "update existing release" mode
```

### Workflow permissions
Release workflow should use least-privilege GitHub token scopes:
- `contents: write` (create/update GitHub Release)
- `packages: write` (required once registry publishing is enabled)
- `id-token: write` (required once provenance/signing is enabled)
- `attestations: write` (future, if artifact attestations are enabled)

### Idempotency and rerun policy
- Duplicate tag pushes must not create duplicate releases.
- Default behavior: fail if release already exists for the tag.
- Optional manual override: `workflow_dispatch` input to update release notes/artifacts in place.
- Re-run must preserve original version and pre-release/stable classification.

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

### Rollback and hotfix policy
- Releases are immutable by version tag. Do not retag different commits under the same version.
- Bad release handling:
  - Mark GitHub Release as deprecated/superseded.
  - Create a follow-up patch tag (`vX.Y.(Z+1)`, for example `v1.4.3` -> `v1.4.4`) from the fix commit.
  - Update release notes with a "Known Issues" or "Superseded by" notice.
- If `latest` was updated by mistake, publish a corrective stable release instead of force-moving tags.

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
- Artifact signing and provenance attestations (Sigstore/Cosign + SLSA provenance)

## Acceptance Criteria
- [ ] Pushing a `v*` tag triggers the release workflow
- [ ] Only valid semver tags (`vX.Y.Z` and `vX.Y.Z-(alpha|beta|rc).N`) are accepted
- [ ] Invalid tags fail fast with a clear error
- [ ] Tagged commit must be on `main` lineage
- [ ] Full CI suite runs before release is created
- [ ] Security gate runs before release creation
- [ ] CI failure prevents the release from being created
- [ ] GitHub Release is created with auto-generated categorized changelog
- [ ] Stable tags create a stable release
- [ ] Pre-release tags (`-alpha`, `-beta`, `-rc`) create a pre-release
- [ ] Docker images are built and tagged with the version
- [ ] Stable releases also tag Docker images as `latest`
- [ ] Pre-releases do not update the `latest` Docker tag
- [ ] Release title matches the tag name
- [ ] PR labels correctly categorize changelog entries
- [ ] Release artifacts include verifiable integrity data (checksums in MVP; registry digests when available)
- [ ] Duplicate tag runs are idempotent and do not create duplicate releases
- [ ] Workflow permissions are minimal and explicitly defined
- [ ] Unit tests cover version parsing utilities and Docker tag generation logic
