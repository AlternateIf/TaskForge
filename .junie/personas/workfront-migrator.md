### Persona: Workfront Migrator — Derek
#### Quick Card (Load First)

- **Implementation read depth**: Read this section first. Open the full persona only when this role is directly impacted by the change.
- **Planning read depth**: Use the full persona during persona meetings and sprint planning.
- **Top goals**: Replicate the Workfront workflows his teams depend on daily without disruption ; Maintain the depth of project planning and reporting he's accustomed to
- **Top pain points**: Previous migrations to simpler tools failed because they lacked features like approval chains, Gantt views, and resource planning — teams reverted to Workfront ; Losing historical data and custom field configurations during migration is a dealbreaker


#### Background

- **Role**: Senior Program Manager at an enterprise manufacturing company
- **Experience**: 10+ years managing complex, multi-team programs; 5 years as a daily Adobe Workfront (formerly Atlassian Workfront) power user
- **Tech comfort**: High for PM tooling; expects enterprise-grade features and configurability
- **Migration context**: His organization is moving away from Workfront due to rising costs and vendor lock-in; he needs TaskForge to replace his existing workflows without regression

#### Goals

- Replicate the Workfront workflows his teams depend on daily without disruption
- Maintain the depth of project planning and reporting he's accustomed to
- Onboard his teams quickly by providing familiar concepts and terminology
- Prove to leadership that TaskForge is a viable Workfront replacement

#### Workfront Features He Expects in TaskForge

1. **Portfolio & Program Management** — ability to group projects into programs and portfolios for strategic alignment and executive reporting
2. **Custom Request Queues** — intake forms where stakeholders submit work requests routed to the right team with custom fields
3. **Approval Workflows** — multi-stage approvals on tasks, documents, and proofs with defined approver chains
4. **Gantt Charts** — interactive timeline view with task dependencies, milestones, and critical path highlighting
5. **Resource Management** — workload balancing across team members with capacity planning and utilization views
6. **Custom Forms & Fields** — user-defined fields on tasks, projects, and issues to capture domain-specific data
7. **Timesheets & Time Tracking** — built-in time logging against tasks with approval workflows for billing and reporting
8. **Proofing & Document Review** — upload documents, annotate, comment, and run approval cycles inline
9. **Baseline & Variance Tracking** — snapshot a project plan and compare actual progress vs. the baseline
10. **Advanced Reporting & Dashboards** — drag-and-drop report builder with custom charts, filters, groupings, and scheduled email delivery
11. **Scenario Planner** — what-if analysis for project timelines and resource allocation before committing changes
12. **Automated Workflows (Fusion-like)** — trigger-based automations (e.g., when status changes to X, notify Y and update field Z)
13. **Issue / Bug Tracking** — separate issue type linked to tasks and projects with severity, priority, and resolution tracking
14. **Templates** — reusable project and task templates to standardize repeatable processes
15. **Audit Trail** — comprehensive log of who changed what and when, exportable for compliance
16. **Workfront Import** — API-based import from Workfront: projects, tasks (all fields), subtasks, custom fields + values, comments/activity history, file attachments, users/roles, time entries, and approval chains. Configurable field mapping (e.g., "Planned Completion Date" → "Due Date"). Import preview with validation before committing. Progress tracking and error log.
17. **Data Export** — export projects, tasks, and all associated data to CSV, JSON, and Workfront-compatible formats for backup, parallel running, or reverse migration
18. **Bidirectional Sync** — incremental sync between Workfront and TaskForge during transition periods so teams can adopt gradually without a hard cutover

#### Pain Points

- Previous migrations to simpler tools failed because they lacked features like approval chains, Gantt views, and resource planning — teams reverted to Workfront
- Losing historical data and custom field configurations during migration is a dealbreaker
- Lightweight tools that "look modern" but can't handle 500+ task projects with complex dependencies
- Tools that force a single methodology (pure Kanban or pure Scrum) — his teams use a hybrid approach
- Hard cutover migrations are too risky — needs parallel running with both tools until teams are confident in the switch
- Import tools that only support CSV and lose relationships, comments, and file attachments

#### Usage Scenarios

1. **Portfolio review meeting**: Opens the portfolio dashboard to compare progress, budget, and resource utilization across 12 active projects. Drills into a specific program's Gantt chart to show a timeline slip.
2. **Work intake**: A marketing stakeholder submits a creative request via a custom request queue. The request auto-routes to the design team's backlog with pre-filled custom fields and a due date based on SLA rules.
3. **Sprint + waterfall hybrid**: Plans a product launch using Gantt dependencies for the critical path while the development team uses a Kanban board for their sprint work — both views reflect the same underlying tasks.
4. **Approval cycle**: Uploads a deliverable to a task, triggers a three-stage approval (team lead, legal, client). Each approver gets notified, can comment, request changes, or approve — all tracked in the activity log.
5. **Month-end reporting**: Builds a custom report showing hours logged per project, variance from baseline estimates, and tasks completed vs. planned. Schedules it for automatic email delivery to stakeholders every Monday.
6. **Automation**: Sets up a workflow rule: when a task's status changes to "Ready for QA", automatically assign it to the QA lead, move it to the QA column, and send a Slack notification.
7. **Workfront import**: Connects TaskForge to the existing Workfront instance via API, configures field mapping for 15 custom fields, previews the data, and kicks off a full import of 12 projects with 3,000+ tasks, comments, and attachments. Monitors progress and resolves mapping errors.
8. **Parallel running**: During the 3-month transition, exports weekly snapshots from TaskForge back to Workfront-compatible format so teams still on Workfront can see updates. Once all teams are on TaskForge, disables the sync.
