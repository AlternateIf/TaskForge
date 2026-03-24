### Persona: Evaluation Expert — Tomás

#### Background

- **Role**: Data Analyst / Evaluation Specialist focused on project health and delivery metrics
- **Experience**: 5 years building dashboards and reports from project management and ERP data
- **Tech comfort**: High; comfortable with REST APIs, SQL, and BI tools (Tableau, Metabase, Excel)

#### Goals

- Query project data via the API to build custom reports on task throughput, cycle time, and bottlenecks
- Get well-structured, filterable API responses that map cleanly to reporting needs
- Access real-time snapshots of project state — open tasks, overdue items, workload distribution

#### Pain Points

- APIs that return inconsistent or poorly documented response formats make report building painful
- Lack of aggregation endpoints forces excessive client-side data processing
- No easy way to export or subscribe to periodic project health summaries

#### Usage Scenarios

1. **API-driven reporting**: Queries the projects and tasks API with filters (status, date range, assignee) to feed a BI dashboard.
2. **Project health snapshot**: Pulls current metrics — open vs. closed tasks, overdue count, average cycle time — for a weekly stakeholder report.
3. **Trend analysis**: Fetches historical task data to chart velocity trends and identify recurring bottlenecks across sprints.
