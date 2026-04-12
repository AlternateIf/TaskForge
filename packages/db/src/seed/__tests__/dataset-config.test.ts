/**
 * Unit tests for dataset configuration.
 *
 * Validates target counts, org catalog, role catalog, and project templates.
 */

import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_ROLES,
  FUNCTIONAL_ROLES,
  INTERNAL_ROLES,
  ORG_CATALOG,
  PROJECT_TEMPLATES,
  TARGET_COUNTS,
  TASK_TYPE_DISTRIBUTION,
  TASK_TYPE_NAMES,
} from '../dataset-config.js';

describe('dataset-config', () => {
  describe('TARGET_COUNTS', () => {
    it('has correct core entity targets', () => {
      expect(TARGET_COUNTS.organizations).toBe(5);
      expect(TARGET_COUNTS.projects).toBe(22);
      expect(TARGET_COUNTS.users).toBe(67);
      expect(TARGET_COUNTS.tasks).toBe(430);
      expect(TARGET_COUNTS.comments).toBe(170);
      expect(TARGET_COUNTS.notifications).toBe(120);
    });

    it('has correct relationship targets', () => {
      expect(TARGET_COUNTS.taskWatchers).toBe(215);
      expect(TARGET_COUNTS.taskDependencies).toBe(90);
      expect(TARGET_COUNTS.commentMentions).toBe(160);
    });
  });

  describe('TASK_TYPE_DISTRIBUTION', () => {
    it('sums to total task count', () => {
      const total = Object.values(TASK_TYPE_DISTRIBUTION).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(TARGET_COUNTS.tasks);
    });

    it('includes all 5 task types', () => {
      expect(TASK_TYPE_NAMES).toHaveLength(5);
      for (const type of TASK_TYPE_NAMES) {
        expect(TASK_TYPE_DISTRIBUTION[type]).toBeGreaterThan(0);
      }
    });

    it('matches plan distribution', () => {
      expect(TASK_TYPE_DISTRIBUTION.bug).toBe(110);
      expect(TASK_TYPE_DISTRIBUTION.feature).toBe(140);
      expect(TASK_TYPE_DISTRIBUTION.chore).toBe(80);
      expect(TASK_TYPE_DISTRIBUTION.incident).toBe(45);
      expect(TASK_TYPE_DISTRIBUTION.technical_debt).toBe(55);
    });
  });

  describe('ORG_CATALOG', () => {
    it('has exactly 5 organizations', () => {
      expect(ORG_CATALOG).toHaveLength(5);
    });

    it('includes all required org names', () => {
      const names = ORG_CATALOG.map((o) => o.name);
      expect(names).toContain('TaskForge Agency');
      expect(names).toContain('Acme Corp');
      expect(names).toContain('Globex Inc');
      expect(names).toContain('Soylent Corp');
      expect(names).toContain('Umbrella Corp');
    });

    it('project counts sum to 22', () => {
      const total = ORG_CATALOG.reduce((sum, o) => sum + o.projectCount, 0);
      expect(total).toBe(22);
    });

    it('each org has required project count', () => {
      const counts: Record<string, number> = {};
      for (const org of ORG_CATALOG) {
        counts[org.slug] = org.projectCount;
      }
      expect(counts['taskforge-agency']).toBe(4);
      expect(counts['acme-corp']).toBe(6);
      expect(counts['globex-inc']).toBe(5);
      expect(counts['soylent-corp']).toBe(4);
      expect(counts['umbrella-corp']).toBe(3);
    });
  });

  describe('PROJECT_TEMPLATES', () => {
    it('has templates for all orgs', () => {
      for (const org of ORG_CATALOG) {
        const templates = PROJECT_TEMPLATES[org.slug];
        expect(templates).toBeDefined();
        expect(templates).toHaveLength(org.projectCount);
      }
    });

    it('all templates have required fields', () => {
      for (const org of ORG_CATALOG) {
        for (const tmpl of PROJECT_TEMPLATES[org.slug]) {
          expect(tmpl.name).toBeTruthy();
          expect(tmpl.slug).toBeTruthy();
          expect(tmpl.description).toBeTruthy();
          expect(tmpl.color).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(tmpl.icon).toBeTruthy();
        }
      }
    });
  });

  describe('FUNCTIONAL_ROLES', () => {
    it('has 14 roles (13 functional + 1 Super Admin)', () => {
      expect(FUNCTIONAL_ROLES).toHaveLength(14);
    });

    it('includes all required roles', () => {
      expect(FUNCTIONAL_ROLES).toContain('Super Admin');
      expect(FUNCTIONAL_ROLES).toContain('Org Owner');
      expect(FUNCTIONAL_ROLES).toContain('Project Admin');
      expect(FUNCTIONAL_ROLES).toContain('Backend Developer');
      expect(FUNCTIONAL_ROLES).toContain('Frontend Developer');
      expect(FUNCTIONAL_ROLES).toContain('Designer');
      expect(FUNCTIONAL_ROLES).toContain('SEO Specialist');
      expect(FUNCTIONAL_ROLES).toContain('Auth Flow Manager');
      expect(FUNCTIONAL_ROLES).toContain('QA Engineer');
      expect(FUNCTIONAL_ROLES).toContain('DevOps/SRE');
      expect(FUNCTIONAL_ROLES).toContain('Support Engineer');
      expect(FUNCTIONAL_ROLES).toContain('Product Manager');
      expect(FUNCTIONAL_ROLES).toContain('Customer Reporter');
      expect(FUNCTIONAL_ROLES).toContain('Customer Stakeholder');
    });

    it('separates internal and customer roles', () => {
      expect(INTERNAL_ROLES).toHaveLength(9);
      expect(CUSTOMER_ROLES).toHaveLength(2);
      expect(CUSTOMER_ROLES).toContain('Customer Reporter');
      expect(CUSTOMER_ROLES).toContain('Customer Stakeholder');
    });
  });
});
