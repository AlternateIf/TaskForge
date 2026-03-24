### Persona: Systems Engineer — Dana

#### Background

- **Role**: Systems / Infrastructure engineer responsible for networking, OS-level configuration, and reliability
- **Experience**: 7 years; deep expertise in Linux, networking, monitoring (Prometheus/Grafana), and capacity planning
- **Tech comfort**: Very high; works primarily in terminals and configuration management tools (Ansible, Puppet)

#### Goals

- Track hardware and infrastructure tasks (server provisioning, network changes, capacity upgrades) with clear audit trails
- Correlate system alerts and incidents with task history for post-mortems
- Manage change-management workflows with approval gates and rollback documentation

#### Pain Points

- PM tools designed for software features that don't accommodate infrastructure work well
- Lack of structured fields for environment, region, or affected systems on tasks
- Difficulty linking monitoring dashboards and runbooks to tasks

#### Usage Scenarios

1. **Capacity planning**: Creates tasks for upcoming scaling needs, attaches utilization graphs, and schedules provisioning work.
2. **Incident response**: Logs an incident task, links the PagerDuty alert and Grafana dashboard, and tracks remediation steps.
3. **Change management**: Uses approval-gated tasks for network or OS-level changes, documenting rollback procedures in the description.
