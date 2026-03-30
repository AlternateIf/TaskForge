### Persona: Evaluation Expert — Tomás
#### Quick Card (Load First)

- **Implementation read depth**: Read this section first. Open the full persona only when this role is directly impacted by the change.
- **Planning read depth**: Use the full persona during persona meetings and sprint planning.
- **Top goals**: Build **custom reports** within TaskForge — selecting data sources, columns, filters, groupings, and chart types without needing external BI tools ; Save, share, and schedule reports for automatic delivery to stakeholders
- **Top pain points**: APIs that return inconsistent or poorly documented response formats make report building painful ; Lack of aggregation endpoints forces excessive client-side data processing


#### Background

- **Role**: Data Analyst / Evaluation Specialist focused on project health and delivery metrics
- **Experience**: 5 years building dashboards and reports from project management and ERP data
- **Tech comfort**: High; comfortable with REST APIs, SQL, and BI tools (Tableau, Metabase, Excel)

#### Goals

- Build **custom reports** within TaskForge — selecting data sources, columns, filters, groupings, and chart types without needing external BI tools
- Save, share, and schedule reports for automatic delivery to stakeholders
- Query project data via the API to feed external dashboards when needed
- Get well-structured, filterable API responses that map cleanly to reporting needs
- Access real-time snapshots of project state — open tasks, overdue items, workload distribution

#### Custom Reporting Features He Expects

1. **Report builder** — drag-and-drop or form-based interface to create reports by selecting entities (tasks, projects, users, time entries), columns, filters, and sort order
2. **Grouping & aggregation** — group results by any field (status, assignee, priority, label, project, custom field) with aggregation functions (count, sum, average, min, max)
3. **Chart types** — bar, line, pie, stacked bar, burndown, and table views selectable per report
4. **Calculated fields** — define derived columns (e.g., "days overdue = today - due date", "completion rate = done / total")
5. **Cross-project reporting** — single report spanning multiple projects, programs, or portfolios
6. **Filters with dynamic values** — filter by relative dates ("last 7 days", "this sprint"), current user, or parameterized inputs
7. **Scheduled delivery** — configure reports to run on a schedule and deliver via email or in-app notification
8. **Export formats** — PDF, CSV, and Excel export for any report
9. **Saved & shared reports** — save report configurations, share with team members or roles, and pin to dashboards
10. **Report templates** — pre-built report templates (velocity, burndown, workload, overdue tasks) as starting points

#### Pain Points

- APIs that return inconsistent or poorly documented response formats make report building painful
- Lack of aggregation endpoints forces excessive client-side data processing
- No easy way to export or subscribe to periodic project health summaries
- Tools that only offer canned reports with no customization — his teams always need "one more filter" or "one more grouping"
- Having to export raw data to Excel or Tableau for every non-trivial report slows down decision-making

#### Usage Scenarios

1. **Custom report creation**: Opens the report builder, selects "Tasks" as the data source, adds columns (title, assignee, status, priority, due date, time logged), filters to a specific project and date range, groups by assignee, and adds a bar chart showing task count per person.
2. **Scheduled stakeholder report**: Configures a weekly report showing completed vs. planned tasks across all active projects, with a burndown chart and overdue task list. Schedules it for Monday 8 AM delivery to the leadership distribution list.
3. **Ad-hoc analysis**: Builds a one-off report filtering tasks by a custom field ("client region") grouped by status to identify which regions have the most blocked work. Exports to CSV for further analysis.
4. **API-driven reporting**: Queries the projects and tasks API with filters (status, date range, assignee) to feed an external BI dashboard for cross-tool correlation.
5. **Trend analysis**: Creates a line chart report tracking average cycle time per sprint over the last 6 months to identify recurring bottlenecks.
