### Persona: Dashboard Analyst — Mira
#### Quick Card (Load First)

- **Implementation read depth**: Read this section first. Open the full persona only when this role is directly impacted by the change.
- **Planning read depth**: Use the full persona during persona meetings and sprint planning.
- **Top goals**: Build **custom dashboards** that cluster, group, and visualize tasks across projects based on any combination of parameters ; Create purpose-built views for different audiences — executive summary, team workload, client delivery status
- **Top pain points**: Most tools offer a single rigid dashboard with no customization — she needs different views for different meetings and audiences ; Kanban boards are fine for one project but useless for cross-project visibility with custom grouping logic


#### Background

- **Role**: Operations Analyst at a consulting firm managing 20+ concurrent client projects
- **Experience**: 7 years in operations and business intelligence; former Jira and Monday.com power user
- **Tech comfort**: High for visual tooling; builds complex views and dashboards but prefers no-code configuration over writing queries

#### Goals

- Build **custom dashboards** that cluster, group, and visualize tasks across projects based on any combination of parameters
- Create purpose-built views for different audiences — executive summary, team workload, client delivery status
- Have dashboards update in real time as task data changes
- Share dashboards with specific users, roles, or as public read-only links for stakeholders

#### Custom Dashboard Features She Expects

1. **Dashboard builder** — create dashboards from scratch by adding, arranging, and resizing widget cards on a grid layout
2. **Widget types**:
   - **Task clusters** — group tasks by any field or combination of fields (status + priority, assignee + label, project + custom field) and display as cards, tables, or swimlanes
   - **Charts** — bar, pie, line, stacked, burndown, and burnup charts fed by live task data
   - **Metrics cards** — single-value KPIs (open tasks, overdue count, avg cycle time, utilization %)
   - **Activity feed** — filtered stream of recent changes across selected projects
   - **Saved report embed** — embed any report created in the report builder as a dashboard widget
3. **Custom grouping & clustering** — define how tasks are clustered using any combination of built-in or custom fields, with nested grouping (e.g., group by project, then by priority within each project)
4. **Filters & parameters** — dashboard-level filters that apply across all widgets (date range, project, team) plus per-widget overrides
5. **Conditional formatting** — color-code task cards or table rows based on rules (e.g., red if overdue, yellow if due within 3 days)
6. **Multiple dashboards** — create unlimited dashboards for different purposes (team standup, client review, personal workload)
7. **Auto-refresh** — dashboards poll for updates on a configurable interval or use real-time push
8. **Sharing & permissions** — share dashboards with individuals, teams, or roles; option for public read-only links
9. **Dashboard templates** — pre-built starting points (team overview, project health, personal workload) that can be customized

#### Pain Points

- Most tools offer a single rigid dashboard with no customization — she needs different views for different meetings and audiences
- Kanban boards are fine for one project but useless for cross-project visibility with custom grouping logic
- Tools that only let you filter but not cluster or pivot data force her to maintain parallel spreadsheets
- No way to combine tasks from multiple projects into a single view grouped by a custom parameter (e.g., "client region" or "business unit")
- Dashboards that are static snapshots rather than live views waste time with manual refreshes

#### Usage Scenarios

1. **Executive dashboard**: Builds a dashboard with a portfolio-level progress bar per project, a pie chart of task status distribution, a metrics card showing total overdue tasks, and a table of at-risk milestones — shares it as a read-only link with leadership.
2. **Team standup board**: Creates a dashboard clustering tasks by assignee, then by status within each assignee. Adds a widget showing tasks updated in the last 24 hours and another showing upcoming deadlines this week.
3. **Client delivery view**: Groups tasks across 5 projects for a single client by custom field "deliverable type" (design, development, QA, deployment), with conditional formatting highlighting anything overdue. Shares with the client via a public link.
4. **Cross-project clustering**: Defines a dashboard that pulls all tasks tagged with custom field "initiative = Q2 cost reduction", groups them by project and then by status, and displays a stacked bar chart showing progress per project.
5. **Personal workload**: Creates a personal dashboard showing her assigned tasks clustered by due date (overdue, today, this week, later), a burndown chart of her current sprint, and an activity feed for projects she watches.
