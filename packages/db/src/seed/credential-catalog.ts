/**
 * Credential catalog — central printable login matrix for summary + tests.
 *
 * Groups demo credentials by org + role for discoverable seed output.
 */

export interface CredentialEntry {
  org: string;
  role: string;
  email: string;
  hasPassword: boolean;
}

export const DEMO_CREDENTIALS: CredentialEntry[] = [
  // ── Global ──────────────────────────────────────────────────────
  { org: 'Global', role: 'Super Admin', email: 'superadmin@taskforge.local', hasPassword: true },

  // ── TaskForge Agency ───────────────────────────────────────────
  {
    org: 'TaskForge Agency',
    role: 'Org Owner',
    email: 'owner@taskforge-agency.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'TaskForge Agency',
    role: 'Project Admin',
    email: 'projectadmin@taskforge-agency.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'TaskForge Agency',
    role: 'Backend Developer',
    email: 'backend1@taskforge-agency.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'TaskForge Agency',
    role: 'Frontend Developer',
    email: 'frontend1@taskforge-agency.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'TaskForge Agency',
    role: 'Designer',
    email: 'designer1@taskforge-agency.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'TaskForge Agency',
    role: 'QA Engineer',
    email: 'qa1@taskforge-agency.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'TaskForge Agency',
    role: 'DevOps/SRE',
    email: 'devops1@taskforge-agency.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'TaskForge Agency',
    role: 'Support Engineer',
    email: 'support1@taskforge-agency.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'TaskForge Agency',
    role: 'Product Manager',
    email: 'pm1@taskforge-agency.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'TaskForge Agency',
    role: 'SEO Specialist',
    email: 'seo1@taskforge-agency.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'TaskForge Agency',
    role: 'Auth Flow Manager',
    email: 'auth1@taskforge-agency.taskforge.local',
    hasPassword: true,
  },

  // ── Acme Corp ──────────────────────────────────────────────────
  { org: 'Acme Corp', role: 'Org Owner', email: 'owner@acme.taskforge.local', hasPassword: true },
  {
    org: 'Acme Corp',
    role: 'Project Admin',
    email: 'projectadmin@acme.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Acme Corp',
    role: 'Backend Developer',
    email: 'backend1@acme.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Acme Corp',
    role: 'Frontend Developer',
    email: 'frontend1@acme.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Acme Corp',
    role: 'Designer',
    email: 'designer1@acme.taskforge.local',
    hasPassword: true,
  },
  { org: 'Acme Corp', role: 'QA Engineer', email: 'qa1@acme.taskforge.local', hasPassword: true },
  {
    org: 'Acme Corp',
    role: 'DevOps/SRE',
    email: 'devops1@acme.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Acme Corp',
    role: 'Product Manager',
    email: 'pm1@acme.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Acme Corp',
    role: 'Customer Reporter',
    email: 'reporter1@acme.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Acme Corp',
    role: 'Customer Stakeholder',
    email: 'stakeholder1@acme.taskforge.local',
    hasPassword: true,
  },

  // ── Globex Inc ─────────────────────────────────────────────────
  {
    org: 'Globex Inc',
    role: 'Org Owner',
    email: 'owner@globex.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Globex Inc',
    role: 'Project Admin',
    email: 'projectadmin@globex.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Globex Inc',
    role: 'Backend Developer',
    email: 'backend1@globex.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Globex Inc',
    role: 'Frontend Developer',
    email: 'frontend1@globex.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Globex Inc',
    role: 'Designer',
    email: 'designer1@globex.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Globex Inc',
    role: 'SEO Specialist',
    email: 'seo1@globex.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Globex Inc',
    role: 'Product Manager',
    email: 'pm1@globex.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Globex Inc',
    role: 'Customer Reporter',
    email: 'reporter1@globex.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Globex Inc',
    role: 'Customer Stakeholder',
    email: 'stakeholder1@globex.taskforge.local',
    hasPassword: true,
  },

  // ── Soylent Corp ───────────────────────────────────────────────
  {
    org: 'Soylent Corp',
    role: 'Org Owner',
    email: 'owner@soylent.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Soylent Corp',
    role: 'Project Admin',
    email: 'projectadmin@soylent.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Soylent Corp',
    role: 'Backend Developer',
    email: 'backend1@soylent.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Soylent Corp',
    role: 'Support Engineer',
    email: 'support1@soylent.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Soylent Corp',
    role: 'Customer Reporter',
    email: 'reporter1@soylent.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Soylent Corp',
    role: 'Customer Stakeholder',
    email: 'stakeholder1@soylent.taskforge.local',
    hasPassword: true,
  },

  // ── Umbrella Corp ──────────────────────────────────────────────
  {
    org: 'Umbrella Corp',
    role: 'Org Owner',
    email: 'owner@umbrella.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Umbrella Corp',
    role: 'Project Admin',
    email: 'projectadmin@umbrella.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Umbrella Corp',
    role: 'Backend Developer',
    email: 'backend1@umbrella.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Umbrella Corp',
    role: 'QA Engineer',
    email: 'qa1@umbrella.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Umbrella Corp',
    role: 'DevOps/SRE',
    email: 'devops1@umbrella.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Umbrella Corp',
    role: 'Customer Reporter',
    email: 'reporter1@umbrella.taskforge.local',
    hasPassword: true,
  },
  {
    org: 'Umbrella Corp',
    role: 'Customer Stakeholder',
    email: 'stakeholder1@umbrella.taskforge.local',
    hasPassword: true,
  },
];

/**
 * Group credentials by organization for display.
 */
export function groupCredentialsByOrg(): Map<string, CredentialEntry[]> {
  const map = new Map<string, CredentialEntry[]>();
  for (const entry of DEMO_CREDENTIALS) {
    const existing = map.get(entry.org) ?? [];
    existing.push(entry);
    map.set(entry.org, existing);
  }
  return map;
}
