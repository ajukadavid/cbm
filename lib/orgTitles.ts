import type { Role } from "./roles";
import { ROLE_LABELS } from "./roles";

/** Org chart titles from the whiteboard — separate from permission role. */
export const ORG_TITLES = [
  "patron",
  "co_patron",
  "dg",
  "nwc",
  "publicity",
  "zonal",
  "state",
  "state_director",
] as const;

export type OrgTitle = (typeof ORG_TITLES)[number];

export const ORG_TITLE_LABELS: Record<OrgTitle, string> = {
  patron: "Patron",
  co_patron: "Co Patron",
  dg: "DG",
  nwc: "NWC",
  publicity: "Publicity Secretary",
  zonal: "Zonal",
  state: "State",
  state_director: "State Director",
};

/** Which org titles are valid for each permission role. */
export const ORG_TITLES_BY_ROLE: Record<Role, OrgTitle[]> = {
  owner: [],
  super_admin: ["patron", "co_patron", "dg"],
  admin: ["nwc"],
  member: ["publicity", "zonal", "state", "state_director"],
};

export function isValidOrgTitleForRole(
  role: Role,
  orgTitle: OrgTitle | undefined | null
): boolean {
  if (!orgTitle) return true;
  return ORG_TITLES_BY_ROLE[role].includes(orgTitle);
}

export function formatUserSubtitle(user: {
  role: Role;
  orgTitle?: string | null;
}): string {
  const roleLabel = ROLE_LABELS[user.role];
  const title = user.orgTitle as OrgTitle | undefined;
  if (title && ORG_TITLE_LABELS[title]) {
    return `${ORG_TITLE_LABELS[title]} · ${roleLabel}`;
  }
  return roleLabel;
}
