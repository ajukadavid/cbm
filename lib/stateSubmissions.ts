import type { OrgTitle } from "./orgTitles";
import type { Role } from "./roles";
import { isAdminTier, isOwner } from "./roles";

export const SUBMISSION_TYPES = ["structure", "strategy", "publicity"] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

/** Types members pick when uploading — "other" uses the general file inbox. */
export const MEMBER_UPLOAD_TYPES = [
  "structure",
  "strategy",
  "other",
  "publicity",
] as const;
export type MemberUploadType = (typeof MEMBER_UPLOAD_TYPES)[number];

export const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  structure: "State structure",
  strategy: "State strategy",
  publicity: "Publicity information",
};

export const MEMBER_UPLOAD_TYPE_LABELS: Record<MemberUploadType, string> = {
  structure: "State structure",
  strategy: "State strategy",
  other: "Other",
  publicity: "Publicity information",
};

/** Org titles that require an assigned Nigerian state. */
export function needsAssignedState(
  orgTitle: OrgTitle | undefined | null
): boolean {
  return (
    orgTitle === "state" ||
    orgTitle === "state_director" ||
    orgTitle === "publicity"
  );
}

export function parsePublicityViewerEmails(
  ownerEmail?: string | null,
  publicityViewerEmailsEnv?: string | null
): Set<string> {
  const emails = new Set<string>();
  const owner = ownerEmail?.trim().toLowerCase();
  if (owner) emails.add(owner);

  for (const entry of (publicityViewerEmailsEnv ?? "").split(",")) {
    const email = entry.trim().toLowerCase();
    if (email) emails.add(email);
  }

  return emails;
}

/** Who may view publicity submissions (owner role or allowlisted email). */
export function canViewPublicity(viewer: {
  role: Role;
  email: string;
  ownerEmail?: string | null;
  publicityViewerEmailsEnv?: string | null;
}): boolean {
  if (isOwner(viewer.role)) return true;
  const allowed = parsePublicityViewerEmails(
    viewer.ownerEmail,
    viewer.publicityViewerEmailsEnv
  );
  return allowed.has(viewer.email.trim().toLowerCase());
}

/** Upload types available in the member file-type dropdown. */
export function uploadTypesForMember(user: {
  orgTitle?: string | null;
  assignedState?: string | null;
}): MemberUploadType[] {
  const types: MemberUploadType[] = ["structure", "strategy", "other"];
  if (user.orgTitle === ("publicity" satisfies OrgTitle)) {
    types.push("publicity");
  }
  return types;
}

export function canUploadMemberType(
  user: {
    role: Role;
    orgTitle?: string | null;
    assignedState?: string | null;
  },
  type: MemberUploadType
): boolean {
  if (user.role !== "member") return false;
  if (type === "other") return true;
  if (!user.assignedState) return false;
  if (type === "publicity") {
    return user.orgTitle === ("publicity" satisfies OrgTitle);
  }
  return type === "structure" || type === "strategy";
}

/** Who can view a submission type on the States pages. */
export function canViewSubmissionType(
  viewer: {
    role: Role;
    email: string;
    ownerEmail?: string | null;
    publicityViewerEmailsEnv?: string | null;
  },
  type: SubmissionType
): boolean {
  if (type === "publicity") return canViewPublicity(viewer);
  return isAdminTier(viewer.role);
}
