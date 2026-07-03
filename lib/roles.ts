export const ROLES = ["owner", "super_admin", "admin", "member"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = {
  owner: 3,
  super_admin: 2,
  admin: 1,
  member: 0,
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  super_admin: "Super Admin",
  admin: "Admin",
  member: "Member",
};

/** Admin tier: can disseminate announcements, create/assign tasks, receive files. */
export function isAdminTier(role: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.admin;
}

/** Super admin tier: can manage admins in addition to admin-tier capabilities. */
export function isSuperAdminTier(role: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.super_admin;
}

export function isOwner(role: Role): boolean {
  return role === "owner";
}

/**
 * Roles an actor is allowed to assign to other users.
 * - Owner may set super_admin / admin / member.
 * - Super admin may set admin / member.
 * - Owner role itself is never assignable in-app (bootstrapped via OWNER_EMAIL).
 */
export function assignableRoles(actorRole: Role): Role[] {
  if (actorRole === "owner") return ["super_admin", "admin", "member"];
  if (actorRole === "super_admin") return ["admin", "member"];
  return [];
}

/** Whether an actor may modify a target user's role at all. */
export function canManageUser(actorRole: Role, targetRole: Role): boolean {
  if (targetRole === "owner") return false;
  if (ROLE_RANK[actorRole] <= ROLE_RANK[targetRole]) return false;
  if (actorRole === "owner") return true;
  if (actorRole === "super_admin") return ROLE_RANK[targetRole] <= ROLE_RANK.admin;
  return false;
}

/** Whether an actor may change a target user's role to `newRole`. */
export function canSetRole(
  actorRole: Role,
  targetRole: Role,
  newRole: Role
): boolean {
  if (newRole === "owner") return false;
  if (!canManageUser(actorRole, targetRole)) return false;
  return assignableRoles(actorRole).includes(newRole);
}
