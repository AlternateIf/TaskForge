/**
 * Project builder — deterministic projects, workflows, workflow statuses, labels.
 */

import type * as schema from '../../schema/index.js';
import { ORG_CATALOG, type OrgSlug, PROJECT_TEMPLATES } from '../dataset-config.js';
import {
  ALL_PROJECT_IDS,
  ORG_IDS,
  PROJECT_IDS,
  USER_IDS,
  WORKFLOW_IDS,
  WORKFLOW_STATUS_IDS,
  id,
} from '../id-registry.js';

const BASE_TIME = new Date('2026-03-01T09:00:00.000Z');

function at(minutesFromBase: number): Date {
  return new Date(BASE_TIME.getTime() + minutesFromBase * 60_000);
}

// Map org slug to org ID
const SLUG_TO_ORG_ID: Record<OrgSlug, string> = {
  'taskforge-agency': ORG_IDS.taskforgeAgency,
  'acme-corp': ORG_IDS.acmeCorp,
  'globex-inc': ORG_IDS.globexInc,
  'soylent-corp': ORG_IDS.soylentCorp,
  'umbrella-corp': ORG_IDS.umbrellaCorp,
};

const SLUG_TO_OWNER: Record<OrgSlug, string> = {
  'taskforge-agency': USER_IDS.taskforgeAgencyOwner,
  'acme-corp': USER_IDS.acmeCorpOwner,
  'globex-inc': USER_IDS.globexIncOwner,
  'soylent-corp': USER_IDS.soylentCorpOwner,
  'umbrella-corp': USER_IDS.umbrellaCorpOwner,
};

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function buildProjects(): (typeof schema.projects.$inferInsert)[] {
  const result: (typeof schema.projects.$inferInsert)[] = [];
  const allProjectIdStrs = Object.values(PROJECT_IDS);
  let projectIndex = 0;

  for (const orgDef of ORG_CATALOG) {
    const templates = PROJECT_TEMPLATES[orgDef.slug];
    if (!templates) continue;
    const orgId = SLUG_TO_ORG_ID[orgDef.slug];
    const owner = SLUG_TO_OWNER[orgDef.slug];

    for (const tmpl of templates) {
      const projectId = allProjectIdStrs[projectIndex];
      result.push({
        id: projectId,
        organizationId: orgId,
        name: tmpl.name,
        slug: tmpl.slug,
        description: tmpl.description,
        color: tmpl.color,
        icon: tmpl.icon,
        status: 'active' as const,
        createdBy: owner,
        createdAt: at(50 + projectIndex),
        updatedAt: at(50 + projectIndex),
      });
      projectIndex++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Workflows (one default workflow per project)
// ---------------------------------------------------------------------------

export function buildWorkflows(): (typeof schema.workflows.$inferInsert)[] {
  const result: (typeof schema.workflows.$inferInsert)[] = [];
  let counter = 0;

  for (const projectId of ALL_PROJECT_IDS) {
    const workflowId = WORKFLOW_IDS[projectId];
    result.push({
      id: workflowId,
      projectId,
      name: 'Default',
      isDefault: true,
      createdAt: at(60 + counter),
      updatedAt: at(60 + counter),
    });
    counter++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Workflow statuses (4 per workflow: To Do, In Progress, Review, Done)
// ---------------------------------------------------------------------------

export function buildWorkflowStatuses(): (typeof schema.workflowStatuses.$inferInsert)[] {
  const result: (typeof schema.workflowStatuses.$inferInsert)[] = [];
  let counter = 0;

  for (const projectId of ALL_PROJECT_IDS) {
    const statuses = WORKFLOW_STATUS_IDS[projectId];
    const workflowId = WORKFLOW_IDS[projectId];

    result.push(
      {
        id: statuses.todo,
        workflowId,
        name: 'To Do',
        color: '#64748B',
        position: 0,
        isInitial: true,
        isFinal: false,
        isValidated: false,
        createdAt: at(70 + counter),
      },
      {
        id: statuses.inProgress,
        workflowId,
        name: 'In Progress',
        color: '#3B82F6',
        position: 1,
        isInitial: false,
        isFinal: false,
        isValidated: false,
        createdAt: at(71 + counter),
      },
      {
        id: statuses.review,
        workflowId,
        name: 'Review',
        color: '#F59E0B',
        position: 2,
        isInitial: false,
        isFinal: false,
        isValidated: true,
        createdAt: at(72 + counter),
      },
      {
        id: statuses.done,
        workflowId,
        name: 'Done',
        color: '#10B981',
        position: 3,
        isInitial: false,
        isFinal: true,
        isValidated: false,
        createdAt: at(73 + counter),
      },
    );
    counter += 4;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Labels (deterministic per project, ~2-3 labels each)
// ---------------------------------------------------------------------------

export function buildLabels(): (typeof schema.labels.$inferInsert)[] {
  const result: (typeof schema.labels.$inferInsert)[] = [];
  let labelIdCounter = 801;

  // Standard label sets per project theme
  const labelSets: Record<string, Array<{ name: string; color: string }>> = {
    [PROJECT_IDS.tfPlatform]: [
      { name: 'Platform', color: '#2563EB' },
      { name: 'API', color: '#7C3AED' },
      { name: 'Urgent', color: '#EA580C' },
    ],
    [PROJECT_IDS.tfSecurityProgram]: [
      { name: 'Security', color: '#DC2626' },
      { name: 'Compliance', color: '#059669' },
    ],
    [PROJECT_IDS.tfAuthService]: [
      { name: 'Auth', color: '#7C3AED' },
      { name: 'MFA', color: '#2563EB' },
    ],
    [PROJECT_IDS.tfInfrastructure]: [
      { name: 'Infra', color: '#059669' },
      { name: 'CI/CD', color: '#0284C7' },
      { name: 'Observability', color: '#0F766E' },
    ],
    [PROJECT_IDS.acmeMobileLaunch]: [
      { name: 'Launch', color: '#2563EB' },
      { name: 'Mobile', color: '#7C3AED' },
      { name: 'Urgent', color: '#EA580C' },
    ],
    [PROJECT_IDS.acmePlatformReliability]: [
      { name: 'Reliability', color: '#059669' },
      { name: 'Backend', color: '#0284C7' },
    ],
    [PROJECT_IDS.acmeWebRefresh]: [
      { name: 'Frontend', color: '#7C3AED' },
      { name: 'Performance', color: '#D97706' },
    ],
    [PROJECT_IDS.acmePaymentGateway]: [
      { name: 'Payments', color: '#D97706' },
      { name: 'PCI', color: '#DC2626' },
    ],
    [PROJECT_IDS.acmeCustomerPortal]: [
      { name: 'Portal', color: '#0891B2' },
      { name: 'Self-Service', color: '#2563EB' },
    ],
    [PROJECT_IDS.acmeApiV2]: [
      { name: 'API', color: '#4F46E5' },
      { name: 'Versioning', color: '#7C3AED' },
    ],
    [PROJECT_IDS.globexCustomerOps]: [
      { name: 'Support', color: '#D97706' },
      { name: 'Automation', color: '#1D4ED8' },
      { name: 'Escalation', color: '#BE123C' },
    ],
    [PROJECT_IDS.globexSecurityProgram]: [
      { name: 'Security', color: '#DC2626' },
      { name: 'MFA', color: '#2563EB' },
    ],
    [PROJECT_IDS.globexMarketingHub]: [
      { name: 'Marketing', color: '#7C3AED' },
      { name: 'Content', color: '#059669' },
    ],
    [PROJECT_IDS.globexProductCatalog]: [
      { name: 'Catalog', color: '#2563EB' },
      { name: 'Search', color: '#D97706' },
    ],
    [PROJECT_IDS.globexDataPipeline]: [
      { name: 'Data', color: '#059669' },
      { name: 'ETL', color: '#0284C7' },
    ],
    [PROJECT_IDS.soylentEnterpriseSupport]: [
      { name: 'Support', color: '#D97706' },
      { name: 'SLA', color: '#DC2626' },
    ],
    [PROJECT_IDS.soylentMigrationEngine]: [
      { name: 'Migration', color: '#7C3AED' },
      { name: 'Onboarding', color: '#0891B2' },
    ],
    [PROJECT_IDS.soylentComplianceSuite]: [
      { name: 'Compliance', color: '#DC2626' },
      { name: 'Audit', color: '#059669' },
    ],
    [PROJECT_IDS.soylentApiGateway]: [
      { name: 'API', color: '#2563EB' },
      { name: 'Integration', color: '#D97706' },
    ],
    [PROJECT_IDS.umbrellaThreatIntel]: [
      { name: 'Threats', color: '#DC2626' },
      { name: 'Intel', color: '#7C3AED' },
    ],
    [PROJECT_IDS.umbrellaPenTestTracker]: [
      { name: 'Pentest', color: '#7C3AED' },
      { name: 'Findings', color: '#EA580C' },
    ],
    [PROJECT_IDS.umbrellaIncidentResponse]: [
      { name: 'Incident', color: '#DC2626' },
      { name: 'Response', color: '#059669' },
    ],
  };

  for (const [projectId, labels] of Object.entries(labelSets)) {
    for (const label of labels) {
      result.push({
        id: id(labelIdCounter++),
        projectId,
        name: label.name,
        color: label.color,
        createdAt: at(100),
      });
    }
  }

  return result;
}

/**
 * Returns a map from label ID → projectId for task-label relationships.
 */
export function getLabelIdToProjectIdMap(): Map<string, string> {
  const result = new Map<string, string>();
  const labels = buildLabels();
  for (const label of labels) {
    const labelId = label.id as string;
    result.set(labelId, label.projectId);
  }
  return result;
}
