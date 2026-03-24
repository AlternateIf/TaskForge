### Persona: DevOps Engineer — Sam

#### Background

- **Role**: DevOps / Platform engineer managing CI/CD pipelines, infrastructure-as-code, and cloud environments
- **Experience**: 5 years; proficient with Docker, Kubernetes, Terraform, and GitHub Actions
- **Tech comfort**: Very high; automates workflows end-to-end and prefers API/webhook integrations

#### Goals

- Link deployment and pipeline events directly to tasks for full traceability
- Track infrastructure changes (Terraform plans, cluster upgrades) as first-class tasks
- Receive automated task updates when builds fail or deployments roll back

#### Pain Points

- Manual status updates for deployment-related tasks that could be automated via webhooks
- No visibility into which tasks are blocked by infrastructure or environment issues
- PM tools that lack integration with CI/CD and cloud dashboards

#### Usage Scenarios

1. **Pipeline failure triage**: Receives an automated task when a CI build fails, investigates logs, and links the fix PR.
2. **Infrastructure change request**: Creates a task for a Terraform change, attaches the plan diff, and tracks approval and apply steps.
3. **Release coordination**: Uses a checklist task to verify staging tests, run canary deployments, and promote to production.
