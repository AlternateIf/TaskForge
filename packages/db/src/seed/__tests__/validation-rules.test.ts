/**
 * Unit tests for super user invariant validation rules.
 *
 * Tests rule logic with mocked data (no DB required).
 */

import { PERMISSION_KEYS, PERMISSION_SET } from '@taskforge/shared';
import { describe, expect, it } from 'vitest';
import { FUNCTIONAL_ROLES, ORG_CATALOG } from '../dataset-config.js';
import {
  ALL_ORG_IDS,
  ALL_PROJECT_IDS,
  ORG_IDS,
  PROJECT_IDS,
  SUPER_USER_ID,
} from '../id-registry.js';

describe('validation-rules', () => {
  describe('SUPER_USER_ID is stable', () => {
    it('super user ID is a valid UUID format', () => {
      expect(SUPER_USER_ID).toMatch(/^00000000-0000-0000-0000-\d{12}$/);
    });

    it('super user ID is deterministic (id = 1)', () => {
      expect(SUPER_USER_ID).toBe('00000000-0000-0000-0000-000000000001');
    });
  });

  describe('org coverage', () => {
    it('ALL_ORG_IDS has exactly 5 entries', () => {
      expect(ALL_ORG_IDS).toHaveLength(5);
    });

    it('ALL_ORG_IDS contains all required org IDs', () => {
      expect(ALL_ORG_IDS).toContain(ORG_IDS.taskforgeAgency);
      expect(ALL_ORG_IDS).toContain(ORG_IDS.acmeCorp);
      expect(ALL_ORG_IDS).toContain(ORG_IDS.globexInc);
      expect(ALL_ORG_IDS).toContain(ORG_IDS.soylentCorp);
      expect(ALL_ORG_IDS).toContain(ORG_IDS.umbrellaCorp);
    });

    it('org IDs match org catalog', () => {
      expect(ORG_CATALOG).toHaveLength(5);
    });
  });

  describe('project coverage', () => {
    it('ALL_PROJECT_IDS has exactly 22 entries', () => {
      expect(ALL_PROJECT_IDS).toHaveLength(22);
    });

    it('project distribution matches plan', () => {
      // TF Agency uses 501-504 (4 projects)
      const allProjectIdStrs = Object.values(PROJECT_IDS);
      const tfProjectIds = allProjectIdStrs.filter((id) => {
        const num = Number.parseInt(id.slice(-4), 10);
        return num >= 501 && num <= 504;
      });
      expect(tfProjectIds).toHaveLength(4);
    });
  });

  describe('permission key coverage', () => {
    it('PERMISSION_KEYS contains exactly 29 entries', () => {
      expect(PERMISSION_KEYS).toHaveLength(29);
    });

    it('PERMISSION_SET contains all keys from PERMISSION_KEYS', () => {
      for (const key of PERMISSION_KEYS) {
        expect(PERMISSION_SET.has(key)).toBe(true);
      }
    });

    it('all permission keys follow org/project scope format', () => {
      for (const key of PERMISSION_KEYS) {
        expect(key).toMatch(/\.(org|project)$/);
      }
    });

    it('no deprecated global-scope permission keys present', () => {
      // After the permission refactor, there should be no .global scope keys
      // The permission.ts defines only .org and .project scopes
      // Verify no unexpected scopes
      const validScopes = ['.org', '.project'];
      for (const key of PERMISSION_KEYS) {
        const hasValidScope = validScopes.some((s) => key.endsWith(s));
        expect(hasValidScope).toBe(true);
      }
    });
  });

  describe('role catalog completeness', () => {
    it('FUNCTIONAL_ROLES covers all 14 roles', () => {
      expect(FUNCTIONAL_ROLES).toHaveLength(14);
    });

    it('includes Super Admin role', () => {
      expect(FUNCTIONAL_ROLES).toContain('Super Admin');
    });
  });
});
