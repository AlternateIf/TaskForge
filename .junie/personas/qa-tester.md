### Persona: QA / Tester — Anil

#### Background

- **Role**: Senior QA Engineer at a fintech company
- **Experience**: 6 years in manual and automated testing; experienced with Jira bug workflows and test management tools (TestRail, Zephyr)
- **Tech comfort**: High; comfortable with APIs, CI pipelines, and scripting

#### Goals

- Log, triage, and track bugs with clear links to the tasks or features they affect
- Manage test cases and test runs within the same tool as task management — no context switching
- Get visibility into regression trends and defect density per release
- Integrate QA workflows into the team's existing sprint process

#### Pain Points

- Bug trackers that are separate from task management create duplicate work and broken links
- No structured way to link a bug to a specific task, user story, or release
- Test case management is always a separate tool with its own login and data model
- Developers close bugs without verifiable test evidence — no proof of fix
- CI test results live only in GitHub Actions / GitLab CI with no connection to task status
- No way to see which test cases cover the code changed in a PR
- Release sign-off requires manually checking CI pass rates across multiple repos and PRs

#### Usage Scenarios

1. **Bug filing**: Discovers a defect during testing, creates an issue linked to the parent task with severity, steps to reproduce, expected vs. actual behavior, screenshots, and environment details. The issue auto-appears on the sprint board.
2. **Test run management**: Creates a test plan for a release, adds test cases (manual and automated), executes them, and marks pass/fail with evidence. Blocked test cases automatically flag the linked task.
3. **Regression tracking**: Runs a report showing defect count by severity per sprint over the last 6 releases to identify regression trends. Drills into a spike to see which component introduced the most bugs.
4. **Release sign-off**: Reviews the release dashboard showing all linked bugs (open, fixed, verified), test pass rate, and outstanding blockers. Adds a sign-off approval or flags remaining issues before deployment.
5. **CI integration**: Automated test results from the CI pipeline are pushed to TaskForge via the API, automatically updating test case statuses and creating bug issues for new failures.
6. **PR test coverage**: Opens a task linked to a PR and sees which test cases cover the changed code, which CI test suites ran, and their pass/fail status — all without leaving TaskForge.
7. **Release CI overview**: During release sign-off, views aggregate CI pass rates across all linked PRs for the release. Flags any PR with failing tests or pending reviews before approving.
