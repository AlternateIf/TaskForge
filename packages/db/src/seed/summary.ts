/**
 * Summary output for seed completion.
 *
 * Prints profile, fixture counts, MFA status guidance, and demo credentials
 * grouped by org + role.
 */

import { groupCredentialsByOrg } from './credential-catalog.js';
import { KNOWN_PASSWORD } from './dataset-config.js';
import { CORE_COUNTS, SAMPLE_COUNTS } from './fixture-metadata.js';
import type { SeedProfile } from './options.js';

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
  console.log(`  Org members:            ${CORE_COUNTS.organizationMembers}`);
  console.log(`  Role assignments:       ${CORE_COUNTS.roleAssignments}`);
  console.log(`  Direct grants:          ${CORE_COUNTS.permissionAssignments}`);
  console.log(`  Invitations:            ${CORE_COUNTS.invitations}`);
  console.log(`  Projects:               ${CORE_COUNTS.projects}`);
  console.log(`  Project members:        ${CORE_COUNTS.projectMembers}`);
  console.log(`  Labels:                 ${CORE_COUNTS.labels}`);
  console.log(`  Tasks:                  ${CORE_COUNTS.tasks}`);
  console.log(`  Task labels:            ${CORE_COUNTS.taskLabels}`);
  console.log(`  Task watchers:          ${CORE_COUNTS.taskWatchers}`);
  console.log(`  Task dependencies:      ${CORE_COUNTS.taskDependencies}`);
  console.log(`  Checklists:             ${CORE_COUNTS.checklists}`);
  console.log(`  Checklist items:        ${CORE_COUNTS.checklistItems}`);
  console.log(`  Comments:               ${CORE_COUNTS.comments}`);
  console.log(`  Comment mentions:       ${CORE_COUNTS.commentMentions}`);
  console.log(`  Activity log:           ${CORE_COUNTS.activityLog}`);
  console.log(`  Notification prefs:     ${CORE_COUNTS.notificationPreferences}`);
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

  console.log('=========================================================');
  console.log('Demo credentials');
  console.log(`Password (all password-enabled users): ${KNOWN_PASSWORD}`);
  console.log('=========================================================\n');

  const grouped = groupCredentialsByOrg();
  for (const [org, entries] of grouped) {
    console.log(`  ${org}:`);
    for (const entry of entries) {
      console.log(`    ${entry.role.padEnd(22)} → ${entry.email}`);
    }
    console.log('');
  }
}
