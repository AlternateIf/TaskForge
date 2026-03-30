### Persona: Backend Developer — Marcus
#### Quick Card (Load First)

- **Implementation read depth**: Read this section first. Open the full persona only when this role is directly impacted by the change.
- **Planning read depth**: Use the full persona during persona meetings and sprint planning.
- **Top goals**: Track API endpoints and service-level tasks with clear technical specs ; Link tasks to pull requests, CI pipeline runs, and deployment events
- **Top pain points**: Tasks that mix frontend and backend work without clear separation ; No easy way to attach or reference API contracts (OpenAPI specs) in tasks


#### Background

- **Role**: Backend developer working on APIs, microservices, and data pipelines
- **Experience**: 5 years; strong in Node.js/Python, database design, and message queues
- **Tech comfort**: High; prefers CLI and API-first tools, automates everything possible

#### Goals

- Track API endpoints and service-level tasks with clear technical specs
- Link tasks to pull requests, CI pipeline runs, and deployment events
- Monitor dependencies between backend services and flag blockers early

#### Pain Points

- Tasks that mix frontend and backend work without clear separation
- No easy way to attach or reference API contracts (OpenAPI specs) in tasks
- Lack of integration with monitoring/alerting tools for production issues

#### Usage Scenarios

1. **API development**: Creates sub-tasks per endpoint, attaches OpenAPI spec snippets, and links to the PR.
2. **Incident follow-up**: Converts a production alert into a task, links related logs, and tracks the root-cause fix.
3. **Database migration**: Tracks migration scripts as tasks with rollback plans documented in comments.
