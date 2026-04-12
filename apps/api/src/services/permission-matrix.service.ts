import { db, permissions, roles } from '@taskforge/db';
import { PERMISSION_KEYS } from '@taskforge/shared';
import { eq, isNull, or } from 'drizzle-orm';

export interface PermissionMatrixCategoryEntry {
  key: string;
  description?: string;
}

export interface PermissionMatrixRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface PermissionMatrixResult {
  categories: Record<string, PermissionMatrixCategoryEntry[]>;
  roles: PermissionMatrixRole[];
}

/**
 * Derives a human-readable category name from the resource portion
 * of a permission key.
 *
 * Key format: `{resource}.{action}.{scope}` where:
 *   - scope is the last segment (e.g., "org", "global")
 *   - action is the second-to-last segment (e.g., "create", "read")
 *   - resource is everything else (e.g., "organization", "organization.settings", "role")
 *
 * Example category mapping:
 *   "organization"           → "Organization"
 *   "organization.settings"  → "Organization Settings"
 *   "organization.features"  → "Organization Features"
 *   "invitation"             → "Invitations"
 *   "membership"             → "Membership"
 *   "role"                   → "Roles"
 *   "permission"             → "Permissions"
 */
function deriveCategoryName(resourcePrefix: string): string {
  return resourcePrefix
    .split('.')
    .map((segment) =>
      segment
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    )
    .join(' → ');
}

/**
 * Build the categories map from PERMISSION_KEYS.
 * Groups each key by its resource prefix.
 */
function buildCategories(): Record<string, PermissionMatrixCategoryEntry[]> {
  const categories: Record<string, PermissionMatrixCategoryEntry[]> = {};

  for (const key of PERMISSION_KEYS) {
    const parts = key.split('.');
    // Last part = scope, second-to-last = action, rest = resource
    const resourceParts = parts.slice(0, -2);
    const resourcePrefix = resourceParts.join('.');

    const categoryName = deriveCategoryName(resourcePrefix);

    if (!categories[categoryName]) {
      categories[categoryName] = [];
    }

    categories[categoryName].push({
      key,
    });
  }

  // Sort permission entries within each category by key for consistent ordering
  for (const entries of Object.values(categories)) {
    entries.sort((a, b) => a.key.localeCompare(b.key));
  }

  return categories;
}

/**
 * Build permission keys for a role from its (resource, action, scope) permission tuples.
 * This handles 'manage' expansion: if a role has resource=organization, action=manage,
 * it implies create, read, update, delete on that resource.
 */
function expandPermissionKeys(
  rolePermissions: { resource: string; action: string; scope: string }[],
): string[] {
  const keys = new Set<string>();

  const permissionKeySet = new Set<string>(PERMISSION_KEYS);

  for (const perm of rolePermissions) {
    // Build the dot-notation key for this permission
    // Scope normalization: "organization" → "org", "global" stays "global"
    const scopeToken = perm.scope === 'organization' ? 'org' : perm.scope;

    const actions =
      perm.action === 'manage'
        ? (['create', 'read', 'update', 'delete'] as const)
        : ([perm.action] as const);

    for (const action of actions) {
      const key = `${perm.resource}.${action}.${scopeToken}`;
      // Only include keys that are in the canonical permission key set
      if (permissionKeySet.has(key)) {
        keys.add(key);
      }
    }
  }

  return Array.from(keys).sort();
}

/**
 * Get the full permission matrix for an organization.
 * Returns all available permission categories/keys and the permissions
 * each role in the organization has.
 */
export async function getPermissionMatrix(organizationId: string): Promise<PermissionMatrixResult> {
  // 1. Build categories from the static permission keys
  const categories = buildCategories();

  // 2. Fetch all roles for this organization + global roles (organizationId = null)
  const orgAndGlobalRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      organizationId: roles.organizationId,
    })
    .from(roles)
    .where(or(eq(roles.organizationId, organizationId), isNull(roles.organizationId)));

  // 3. Fetch permissions for all these roles
  const roleIds = orgAndGlobalRoles.map((r) => r.id);

  const rolePermissions =
    roleIds.length === 0
      ? []
      : await db
          .select({
            roleId: permissions.roleId,
            resource: permissions.resource,
            action: permissions.action,
            scope: permissions.scope,
          })
          .from(permissions)
          .where(
            roleIds.length === 1
              ? eq(permissions.roleId, roleIds[0])
              : or(...roleIds.map((id) => eq(permissions.roleId, id))),
          );

  // 4. Group permissions by roleId
  const permsByRole = new Map<string, { resource: string; action: string; scope: string }[]>();
  for (const rp of rolePermissions) {
    const existing = permsByRole.get(rp.roleId) ?? [];
    existing.push({ resource: rp.resource, action: rp.action, scope: rp.scope });
    permsByRole.set(rp.roleId, existing);
  }

  // 5. Build role entries
  const rolesResult: PermissionMatrixRole[] = orgAndGlobalRoles.map((role) => ({
    id: role.id,
    name: role.name,
    permissions: expandPermissionKeys(permsByRole.get(role.id) ?? []),
  }));

  return { categories, roles: rolesResult };
}
