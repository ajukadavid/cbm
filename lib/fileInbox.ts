import type { Role } from "./roles";
import { isAdminTier, isOwner } from "./roles";
import type { OrgTitle } from "./orgTitles";

/**
 * Which admin-tier users a member is allowed to send a file to.
 * Publicity Secretaries may only send to the Owner; everyone else may
 * send to any admin-tier recipient.
 */
export function canSendFileTo(
  sender: { orgTitle?: string | null },
  recipientRole: Role
): boolean {
  if (sender.orgTitle === ("publicity" satisfies OrgTitle)) {
    return isOwner(recipientRole);
  }
  return isAdminTier(recipientRole);
}

/** True when the sender is restricted to the Owner as the only recipient. */
export function isOwnerOnlySender(sender: {
  orgTitle?: string | null;
}): boolean {
  return sender.orgTitle === ("publicity" satisfies OrgTitle);
}
