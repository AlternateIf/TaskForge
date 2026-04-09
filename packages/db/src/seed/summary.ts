/**
 * Summary output for seed completion.
 *
 * Prints profile, fixture counts, MFA status guidance, and dev credentials.
 */

import { CORE_COUNTS, SAMPLE_COUNTS } from './fixture-metadata.js';
import type { SeedProfile } from './options.js';

const KNOWN_PASSWORD = 'Taskforge123!';

const DEV_USER_EMAILS = [
  'owner@acme.taskforge.local',
  'admin@acme.taskforge.local',
  'member@acme.taskforge.local',
  'owner@globex.taskforge.local',
  'admin@globex.taskforge.local',
  'member@globex.taskforge.local',
  'qa@taskforge.local',
  'viewer@acme.taskforge.local',
  'contractor@globex.taskforge.local',
  'support@taskforge.local',
];

export function printSeedSummary(profile: SeedProfile): void {
  console.log('\n=========================================================');
  console.log('Seed complete.');
  console.log(`Profile: ${profile}`);
  console.log('=========================================================\n');

  console.log('Fixture counts:');
  console.log(`  Users:                  ${CORE_COUNTS.users}`);
  console.log(`  Organizations:          ${CORE_COUNTS.organizations}`);
  console.log(`  Roles:                  ${CORE_COUNTS.roles}`);
  console.log(`  Permissions:            ${CORE_COUNTS.permissions}`);
  console.log(`  Role assignments:       ${CORE_COUNTS.roleAssignments}`);
  console.log(`  Direct grants:          ${CORE_COUNTS.permissionAssignments}`);
  console.log(`  Invitations:            ${CORE_COUNTS.invitations}`);
  console.log(`  Projects:               ${CORE_COUNTS.projects}`);
  console.log(`  Project members:        ${CORE_COUNTS.projectMembers}`);
  console.log(`  Tasks:                  ${CORE_COUNTS.tasks}`);
  console.log(`  Comments:               ${CORE_COUNTS.comments}`);
  console.log(`  Notifications:          ${CORE_COUNTS.notifications}`);

  if (profile === 'core+sample') {
    console.log('\nSample fixtures (additional):');
    console.log(`  Projects:               ${SAMPLE_COUNTS.projects}`);
    console.log(`  Tasks:                  ${SAMPLE_COUNTS.tasks}`);
    console.log(`  Comments:               ${SAMPLE_COUNTS.comments}`);
    console.log(`  Notifications:          ${SAMPLE_COUNTS.notifications}`);
  }

  console.log('\nMFA status:');
  console.log('  All seeded users have MFA DISABLED.');
  console.log('  Users must set up MFA manually via Settings if needed.');
  console.log('  No seeded orgs have MFA enforcement enabled.\n');

  console.log('Known dev credentials:');
  console.log(`  Password (all password-enabled users): ${KNOWN_PASSWORD}`);
  console.log('  Users:');
  for (const email of DEV_USER_EMAILS) {
    console.log(`    - ${email}`);
  }
  console.log('');
}
