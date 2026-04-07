### Persona: SCM Integrator — Niko
#### Quick Card (Load First)

- **Implementation read depth**: Read this section first. Open the full persona only when this role is directly impacted by the change.
- **Planning read depth**: Use the full persona during persona meetings and sprint planning.
- **Top goals**: Bidirectional traceability between TaskForge tasks and GitHub/GitLab PRs, issues, branches, and commits ; Import existing GitHub/GitLab issues into TaskForge without losing context (labels, assignees, comments, linked PRs)
- **Top pain points**: Teams split between GitHub Issues and the PM tool — no single view of all work ; Manual copy-paste of issue references between tools wastes time and creates stale links


#### Background

- **Role**: Engineering Lead at a mid-size SaaS company running 30+ repositories across GitHub and GitLab
- **Experience**: 8 years in software engineering; manages teams that use both GitHub (for open-source and frontend) and GitLab (for backend and infrastructure, self-hosted)
- **Tech comfort**: Very high; lives in Git, CI/CD pipelines, and code review workflows daily

#### Goals

- Bidirectional traceability between TaskForge tasks and GitHub/GitLab PRs, issues, branches, and commits
- Import existing GitHub/GitLab issues into TaskForge without losing context (labels, assignees, comments, linked PRs)
- Export TaskForge tasks as GitHub/GitLab issues for teams that prefer working in their SCM tool
- Automate task status updates based on Git events (PR merged → task done, CI failed → task blocked)
- Single source of truth for project progress that includes code activity

#### Pain Points

- Teams split between GitHub Issues and the PM tool — no single view of all work
- Manual copy-paste of issue references between tools wastes time and creates stale links
- GitLab gets second-class treatment in PM tools that only integrate with GitHub
- No way to bulk-import historical GitHub/GitLab issues with their full context (comments, labels, linked PRs)
- PM tools that show PR links but not CI/CD pipeline status, review status, or merge conflicts
- Commit message parsing is brittle — wants explicit linking via UI or API, not just regex matching

#### Feature Expectations

1. **GitHub App + GitLab Integration** — first-class support for both platforms, not just GitHub
2. **PR/MR Linking** — link pull requests (GitHub) and merge requests (GitLab) to tasks via UI, API, or commit/branch naming convention
3. **Branch Linking** — auto-detect branches named after task IDs (e.g., `feature/TASK-123-add-auth`)
4. **Commit References** — parse commit messages for task IDs and show them in task activity
5. **CI/CD Status** — show pipeline/workflow status (pass/fail/running) on linked tasks
6. **Review Status** — show PR/MR review state (approved, changes requested, pending) on tasks
7. **Issue Import** — bulk import GitHub Issues and GitLab Issues into TaskForge with labels, assignees, comments, and linked PRs preserved
8. **Issue Export** — create GitHub/GitLab issues from TaskForge tasks (one-off or sync)
9. **Issue Sync** — bidirectional sync between TaskForge tasks and GitHub/GitLab issues for teams in transition
10. **Deployment Events** — ingest deployment webhooks and update task status on successful deploy
11. **Release Linking** — link TaskForge releases to GitHub Releases / GitLab tags
12. **Repository Browser** — view linked repos, recent commits, and open PRs from within a TaskForge project
13. **Status Automation** — configurable rules: "when PR merged → move task to Done", "when CI fails → add Blocked label"

#### Usage Scenarios

1. **Daily workflow**: Creates a task in TaskForge, clicks "Create branch" which generates a branch named `feature/TASK-456-user-auth` in GitHub. Opens a PR against main — the PR automatically appears in the task's activity feed with review status and CI checks.
2. **Issue migration**: Connects a GitHub repo to a TaskForge project, selects 200 open issues, previews the import mapping (GitHub labels → TaskForge labels, GitHub milestones → TaskForge releases), and imports them with full comment history.
3. **GitLab integration**: Backend team uses self-hosted GitLab. Niko connects it to TaskForge the same way as GitHub — MRs link to tasks, pipeline status shows on the task card, and deployment events update task status.
4. **Cross-platform project**: A project has frontend repos on GitHub and backend repos on GitLab. The TaskForge project view shows PRs/MRs from both platforms in a unified activity feed.
5. **Sprint review**: Opens the sprint board and sees each task card annotated with its PR status (green check = merged, yellow = in review, red = CI failing). No need to open GitHub/GitLab separately.
6. **Release coordination**: Links a TaskForge release to a GitHub Release. When the release is published on GitHub, TaskForge automatically updates the release status and notifies stakeholders.
7. **Export for contractors**: External contractors only have GitHub access. Niko exports selected TaskForge tasks as GitHub Issues so contractors can work in their familiar tool. Status changes sync back to TaskForge.
