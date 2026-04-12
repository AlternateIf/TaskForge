/**
 * Dataset configuration — target counts, org catalog, role catalog, deterministic constants.
 *
 * This is the single source of truth for the seeded dataset shape.
 * Builders and metadata both derive from these constants.
 */

// ---------------------------------------------------------------------------
// Target entity counts
// ---------------------------------------------------------------------------

export const TARGET_COUNTS = {
  organizations: 5,
  projects: 22,
  users: 67,
  tasks: 430,
  comments: 170,
  notifications: 120,
  taskWatchers: 215,
  taskDependencies: 90,
  commentMentions: 160,
} as const;

// ---------------------------------------------------------------------------
// Task type distribution (must sum to TARGET_COUNTS.tasks = 430)
// ---------------------------------------------------------------------------

export const TASK_TYPE_DISTRIBUTION = {
  bug: 110,
  feature: 140,
  chore: 80,
  incident: 45,
  technical_debt: 55,
} as const;

// ---------------------------------------------------------------------------
// Organization catalog
// ---------------------------------------------------------------------------

export type OrgSlug =
  | 'taskforge-agency'
  | 'acme-corp'
  | 'globex-inc'
  | 'soylent-corp'
  | 'umbrella-corp';

export interface OrgDefinition {
  name: string;
  slug: OrgSlug;
  settings: Record<string, unknown>;
  projectCount: number;
}

export const ORG_CATALOG: OrgDefinition[] = [
  {
    name: 'TaskForge Agency',
    slug: 'taskforge-agency',
    settings: {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      onboardingChecklistEnabled: true,
    },
    projectCount: 4,
  },
  {
    name: 'Acme Corp',
    slug: 'acme-corp',
    settings: {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      onboardingChecklistEnabled: true,
    },
    projectCount: 6,
  },
  {
    name: 'Globex Inc',
    slug: 'globex-inc',
    settings: {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      onboardingChecklistEnabled: true,
    },
    projectCount: 5,
  },
  {
    name: 'Soylent Corp',
    slug: 'soylent-corp',
    settings: {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      onboardingChecklistEnabled: true,
    },
    projectCount: 4,
  },
  {
    name: 'Umbrella Corp',
    slug: 'umbrella-corp',
    settings: {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      onboardingChecklistEnabled: true,
    },
    projectCount: 3,
  },
];

// ---------------------------------------------------------------------------
// Project templates per org
// ---------------------------------------------------------------------------

export const PROJECT_TEMPLATES: Record<
  OrgSlug,
  Array<{ name: string; slug: string; description: string; color: string; icon: string }>
> = {
  'taskforge-agency': [
    {
      name: 'Internal Platform',
      slug: 'internal-platform',
      description: 'Core platform features, APIs, and shared services.',
      color: '#2563EB',
      icon: 'layers',
    },
    {
      name: 'Security Program',
      slug: 'security-program',
      description: 'Security posture, vulnerability management, and compliance.',
      color: '#DC2626',
      icon: 'shield',
    },
    {
      name: 'Auth Service',
      slug: 'auth-service',
      description: 'Authentication, authorization, and identity management.',
      color: '#7C3AED',
      icon: 'key',
    },
    {
      name: 'Infrastructure',
      slug: 'infrastructure',
      description: 'Cloud infra, CI/CD, observability, and SRE tooling.',
      color: '#059669',
      icon: 'server',
    },
  ],
  'acme-corp': [
    {
      name: 'Acme Mobile Launch',
      slug: 'acme-mobile-launch',
      description: 'Cross-team launch plan for the Acme mobile app.',
      color: '#2563EB',
      icon: 'rocket',
    },
    {
      name: 'Acme Platform Reliability',
      slug: 'acme-platform-reliability',
      description: 'Reliability and observability improvements for platform APIs.',
      color: '#059669',
      icon: 'shield',
    },
    {
      name: 'Acme Web Refresh',
      slug: 'acme-web-refresh',
      description: 'Frontend redesign and performance optimization.',
      color: '#7C3AED',
      icon: 'layout',
    },
    {
      name: 'Acme Payment Gateway',
      slug: 'acme-payment-gateway',
      description: 'New payment processing integration and PCI compliance.',
      color: '#D97706',
      icon: 'credit-card',
    },
    {
      name: 'Acme Customer Portal',
      slug: 'acme-customer-portal',
      description: 'Self-service customer portal and account management.',
      color: '#0891B2',
      icon: 'users',
    },
    {
      name: 'Acme API v2',
      slug: 'acme-api-v2',
      description: 'Public API redesign with versioning and rate limiting.',
      color: '#4F46E5',
      icon: 'code',
    },
  ],
  'globex-inc': [
    {
      name: 'Globex Customer Ops',
      slug: 'globex-customer-ops',
      description: 'Service desk, escalation, and support workflow optimization.',
      color: '#D97706',
      icon: 'headset',
    },
    {
      name: 'Globex Security Program',
      slug: 'globex-security-program',
      description: 'Security backlog, MFA rollout, and response playbooks.',
      color: '#DC2626',
      icon: 'lock',
    },
    {
      name: 'Globex Marketing Hub',
      slug: 'globex-marketing-hub',
      description: 'Campaign management, analytics, and content workflows.',
      color: '#7C3AED',
      icon: 'megaphone',
    },
    {
      name: 'Globex Product Catalog',
      slug: 'globex-product-catalog',
      description: 'Product data management and search optimization.',
      color: '#2563EB',
      icon: 'package',
    },
    {
      name: 'Globex Data Pipeline',
      slug: 'globex-data-pipeline',
      description: 'ETL pipelines, data warehouse, and reporting.',
      color: '#059669',
      icon: 'database',
    },
  ],
  'soylent-corp': [
    {
      name: 'Soylent Enterprise Support',
      slug: 'soylent-enterprise-support',
      description: 'Tier 2/3 support escalation and SLA management.',
      color: '#D97706',
      icon: 'headset',
    },
    {
      name: 'Soylent Migration Engine',
      slug: 'soylent-migration-engine',
      description: 'Customer onboarding and data migration tooling.',
      color: '#7C3AED',
      icon: 'arrow-right',
    },
    {
      name: 'Soylent Compliance Suite',
      slug: 'soylent-compliance-suite',
      description: 'Regulatory compliance and audit trail management.',
      color: '#DC2626',
      icon: 'shield-check',
    },
    {
      name: 'Soylent API Gateway',
      slug: 'soylent-api-gateway',
      description: 'API management, throttling, and integration layer.',
      color: '#2563EB',
      icon: 'code',
    },
  ],
  'umbrella-corp': [
    {
      name: 'Umbrella Threat Intel',
      slug: 'umbrella-threat-intel',
      description: 'Threat intelligence aggregation and alerting.',
      color: '#DC2626',
      icon: 'alert-triangle',
    },
    {
      name: 'Umbrella Pen Test Tracker',
      slug: 'umbrella-pen-test-tracker',
      description: 'Penetration test scheduling, findings, and remediation.',
      color: '#7C3AED',
      icon: 'search',
    },
    {
      name: 'Umbrella Incident Response',
      slug: 'umbrella-incident-response',
      description: 'Incident response workflows and post-mortem tracking.',
      color: '#059669',
      icon: 'activity',
    },
  ],
};

// ---------------------------------------------------------------------------
// Functional role catalog (13 roles + 1 super admin)
// ---------------------------------------------------------------------------

export type FunctionalRole =
  | 'Super Admin'
  | 'Org Owner'
  | 'Project Admin'
  | 'Backend Developer'
  | 'Frontend Developer'
  | 'Designer'
  | 'SEO Specialist'
  | 'Auth Flow Manager'
  | 'QA Engineer'
  | 'DevOps/SRE'
  | 'Support Engineer'
  | 'Product Manager'
  | 'Customer Reporter'
  | 'Customer Stakeholder';

export const FUNCTIONAL_ROLES: FunctionalRole[] = [
  'Super Admin',
  'Org Owner',
  'Project Admin',
  'Backend Developer',
  'Frontend Developer',
  'Designer',
  'SEO Specialist',
  'Auth Flow Manager',
  'QA Engineer',
  'DevOps/SRE',
  'Support Engineer',
  'Product Manager',
  'Customer Reporter',
  'Customer Stakeholder',
];

// ---------------------------------------------------------------------------
// User distribution plan per org
// ---------------------------------------------------------------------------

/**
 * Internal staff roles (applied to TaskForge Agency and as cross-org members)
 * Customer roles (applied to customer orgs only)
 */
export const INTERNAL_ROLES: FunctionalRole[] = [
  'Backend Developer',
  'Frontend Developer',
  'Designer',
  'SEO Specialist',
  'Auth Flow Manager',
  'QA Engineer',
  'DevOps/SRE',
  'Support Engineer',
  'Product Manager',
];

export const CUSTOMER_ROLES: FunctionalRole[] = ['Customer Reporter', 'Customer Stakeholder'];

// Deterministic seed password hash for all demo users
export const KNOWN_PASSWORD_HASH = '$2b$12$NP8SI4Y.jSLTo2eJuqHEQOve7AzKxIiWPOX18lD2YaHMPcvzPicbu';
export const KNOWN_PASSWORD = 'Taskforge123!';

// Task type names for task generation
export type TaskTypeName = 'bug' | 'feature' | 'chore' | 'incident' | 'technical_debt';
export const TASK_TYPE_NAMES: TaskTypeName[] = [
  'bug',
  'feature',
  'chore',
  'incident',
  'technical_debt',
];
