/**
 * Unit tests for summary credential grouping.
 */

import { describe, expect, it } from 'vitest';
import { DEMO_CREDENTIALS, groupCredentialsByOrg } from '../credential-catalog.js';

describe('credential-catalog', () => {
  describe('DEMO_CREDENTIALS', () => {
    it('has entries for all 5 organizations plus Global', () => {
      const orgs = new Set(DEMO_CREDENTIALS.map((e) => e.org));
      expect(orgs).toContain('Global');
      expect(orgs).toContain('TaskForge Agency');
      expect(orgs).toContain('Acme Corp');
      expect(orgs).toContain('Globex Inc');
      expect(orgs).toContain('Soylent Corp');
      expect(orgs).toContain('Umbrella Corp');
      expect(orgs.size).toBe(6);
    });

    it('every customer org has Customer Reporter entries', () => {
      const customerOrgs = ['Acme Corp', 'Globex Inc', 'Soylent Corp', 'Umbrella Corp'];
      for (const org of customerOrgs) {
        const reporters = DEMO_CREDENTIALS.filter(
          (e) => e.org === org && e.role === 'Customer Reporter',
        );
        expect(reporters.length).toBeGreaterThan(0);
      }
    });

    it('every customer org has Customer Stakeholder entries', () => {
      const customerOrgs = ['Acme Corp', 'Globex Inc', 'Soylent Corp', 'Umbrella Corp'];
      for (const org of customerOrgs) {
        const stakeholders = DEMO_CREDENTIALS.filter(
          (e) => e.org === org && e.role === 'Customer Stakeholder',
        );
        expect(stakeholders.length).toBeGreaterThan(0);
      }
    });

    it('every org has Org Owner entry', () => {
      const orgNames = [
        'TaskForge Agency',
        'Acme Corp',
        'Globex Inc',
        'Soylent Corp',
        'Umbrella Corp',
      ];
      for (const org of orgNames) {
        const owners = DEMO_CREDENTIALS.filter((e) => e.org === org && e.role === 'Org Owner');
        expect(owners.length).toBeGreaterThan(0);
      }
    });

    it('Global has Super Admin entry', () => {
      const superAdmins = DEMO_CREDENTIALS.filter(
        (e) => e.org === 'Global' && e.role === 'Super Admin',
      );
      expect(superAdmins).toHaveLength(1);
    });

    it('all password-enabled users have hasPassword true', () => {
      for (const entry of DEMO_CREDENTIALS) {
        expect(entry.hasPassword).toBe(true);
      }
    });
  });

  describe('groupCredentialsByOrg', () => {
    it('returns a Map with correct org count', () => {
      const grouped = groupCredentialsByOrg();
      expect(grouped).toBeInstanceOf(Map);
      expect(grouped.size).toBe(6);
    });

    it('groups credentials correctly', () => {
      const grouped = groupCredentialsByOrg();
      const acmeEntries = grouped.get('Acme Corp') ?? [];
      expect(acmeEntries).toBeDefined();
      expect(acmeEntries.length).toBeGreaterThan(0);
      for (const entry of acmeEntries) {
        expect(entry.org).toBe('Acme Corp');
      }
    });
  });
});
