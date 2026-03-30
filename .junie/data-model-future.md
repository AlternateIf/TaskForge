# TaskForge — Data Model (Future: Phase 2/3)

This document captures entities primarily used for Phase 2/3 planning.

## Extended Delivery Domains
- **Issue**: bug/defect workflows linked to tasks/releases.
- **Release**: release planning/status/sign-off metadata.
- **TaskFeedback**: external/customer feedback lifecycle.

## Testing Domains
- **TestCase**, **TestPlan**, **TestPlanCase**, **TestRun**, **TestExecution**: test management and execution evidence model.

## Customization and Reporting
- **CustomFieldDefinition**, **CustomFieldValue**: user-defined schema extensions.
- **Dashboard**, **DashboardWidget**, **SavedReport**: configurable analytics surfaces.

## Time and Resource Management
- **TimeEntry**, **Timesheet**, **BillingRate**.
- **UserSkill**, **UserAvailability**, **WorkloadAlert**.
- **Baseline**, **Scenario** for planning variance and what-if modelling.

## Governance and Approval
- **ApprovalWorkflow**, **ApprovalStage**, **ApprovalStageApprover**, **ApprovalRequest**, **ApprovalDecision**.
- **RetentionPolicy** for data lifecycle governance.

## Files, Webhooks, and Integration
- **DocumentAnnotation** for proofing/commenting.
- **Webhook**, **WebhookDelivery** for outbound event integrations.
- **OAuthApp** for third-party app authorization.
- **ImportJob** for bulk ingestion workflows.
- **AlertIngestionConfig** for external alert pipelines.

## Program/Portfolio and Intake
- **Portfolio**, **Program**, **ProgramProject** for enterprise hierarchy.
- **RequestQueue**, **RequestSubmission** for structured intake flows.

## Planning Rule
- Use this doc in planning and architecture discussions for non-MVP scope.
- Avoid loading it during standard MVP implementation unless a future-facing decision is being made.
