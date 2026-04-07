# MVP-031: Auto-Create GitHub Issues for New Feature Files

## Description
A GitHub Actions workflow that automatically creates a GitHub Issue whenever a new feature markdown file is pushed to `.ai/features/` on the `main` branch. The issue includes the feature title, a shortened description, a link to the markdown file, and acceptance criteria if present.

## Personas
- **Niko (SCM Integrator)**: Bidirectional traceability between feature specs and GitHub Issues
- **Sam (DevOps)**: Lightweight CI workflow with path-filtered triggers
- **Sarah (Project Manager)**: Clear issue titles and labels for tracking
- **Anil (QA)**: Searchable feature IDs and duplicate prevention

## Dependencies
- MVP-003 (CI pipeline exists)
- GitHub repository with Issues enabled

## Scope

### Files to create/modify
```
.github/workflows/feature-issue.yml   # GitHub Actions workflow
```

### Workflow details

**Trigger**: `push` to `main` branch, path filter `.ai/features/**/*.md`

**Detection logic**:
1. Use `git diff --name-only --diff-filter=A HEAD~1 HEAD` to find only **newly added** files (not modified)
2. Filter to `.ai/features/**/*.md` paths
3. Skip if no new feature files detected

**For each new feature file**:
1. **Parse the file**:
   - Extract title from the first `# heading` line
   - Extract the feature ID from the filename (e.g., `MVP-031` from `MVP-031-auto-feature-issues.md`)
   - Extract the first paragraph after `## Description` as the shortened description (max ~200 chars)
   - Extract `## Acceptance Criteria` section if present
2. **Check for duplicates**:
   - Search existing issues with `gh issue list --search "FEATURE-ID in:title"`
   - Skip creation if an issue with the same feature ID already exists
3. **Create the issue**:
   - Title: `[FEATURE-ID] Feature title` (e.g., `[MVP-031] Auto-Create GitHub Issues for New Feature Files`)
   - Body:
     ```markdown
     ## Description
     <shortened description from file>

     ## Spec
     [View full specification](<link to .md file on main branch>)

     ## Acceptance Criteria
     <acceptance criteria from file, if present>

     ---
     *Auto-generated from `path/to/feature.md`*
     ```
   - Labels: `feature` + phase label based on folder:
     - `.ai/features/mvp/` → `mvp`
     - `.ai/features/phase2/` → `phase-2`
     - `.ai/features/phase3/` → `phase-3`

### Label setup
The workflow should create missing labels on first run using `gh label create` with `--force` (idempotent).

| Label | Color | Description |
|-------|-------|-------------|
| `feature` | `#3B82F6` | Feature specification |
| `mvp` | `#10B981` | MVP phase |
| `phase-2` | `#F59E0B` | Phase 2 |
| `phase-3` | `#8B5CF6` | Phase 3 |

### Permissions
The workflow needs `issues: write` and `contents: read` permissions.

## Acceptance Criteria
- [x] Pushing a new `.md` file to `.ai/features/mvp/` on `main` creates a GitHub Issue
- [x] Issue title contains the feature ID and name extracted from the `# heading`
- [x] Issue body includes a shortened description and link to the feature file
- [x] Issue body includes acceptance criteria section when present in the feature file
- [x] Labels are auto-assigned based on the feature's phase folder
- [x] Modifying an existing feature file does NOT create a duplicate issue
- [x] Pushing the same feature file again does NOT create a duplicate issue (title search)
- [x] Workflow only triggers on pushes to `main`, not on PR branches
- [x] Workflow handles multiple new feature files in a single commit
