### Persona: Compliance Auditor — Hana
#### Quick Card (Load First)

- **Implementation read depth**: Read this section first. Open the full persona only when this role is directly impacted by the change.
- **Planning read depth**: Use the full persona during persona meetings and sprint planning.
- **Top goals**: Verify that all project activities are logged with immutable, timestamped audit trails ; Ensure data retention policies are enforced — nothing deleted prematurely, nothing kept beyond policy
- **Top pain points**: Tools that lack a complete audit trail — she can't prove who changed what and when ; No bulk export of audit data in a format external auditors accept (CSV, PDF with timestamps)


#### Background

- **Role**: Compliance Officer at a healthcare company subject to HIPAA and SOC 2 requirements
- **Experience**: 8 years in IT compliance and audit; works closely with legal, security, and engineering teams
- **Tech comfort**: Moderate; needs to navigate tools independently but won't write code or API queries

#### Goals

- Verify that all project activities are logged with immutable, timestamped audit trails
- Ensure data retention policies are enforced — nothing deleted prematurely, nothing kept beyond policy
- Export comprehensive access and change logs for external auditors on demand
- Confirm that role-based access controls are correctly enforced across all projects

#### Pain Points

- Tools that lack a complete audit trail — she can't prove who changed what and when
- No bulk export of audit data in a format external auditors accept (CSV, PDF with timestamps)
- User access changes aren't logged — she can't verify that a terminated employee's access was revoked promptly
- Data deletion is permanent with no soft-delete or retention period, making accidental or malicious deletion unrecoverable
- No way to enforce or verify data residency requirements for regulated clients

#### Usage Scenarios

1. **Quarterly audit**: Exports a full audit log for a specific project covering the last 90 days — every task creation, edit, deletion, status change, comment, and file upload with user, timestamp, and before/after values. Provides the CSV to external auditors.
2. **Access review**: Pulls a report of all users, their roles, and which projects they have access to. Cross-references with HR's active employee list to flag stale accounts. Verifies that role changes are logged.
3. **Data retention enforcement**: Configures a retention policy requiring that completed projects and their data are archived after 12 months and permanently deleted after 7 years. Verifies the policy is enforced automatically.
4. **Incident investigation**: After a data concern is raised, searches the audit trail for all actions by a specific user in a specific time window. Finds the exact sequence of changes and exports it as evidence.
5. **Compliance dashboard**: Views a compliance-focused dashboard showing metrics like accounts without MFA, projects missing required custom fields (e.g., data classification), and upcoming retention policy expirations.
