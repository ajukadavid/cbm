// @ts-nocheck
import {
  query,
  mutation,
  action,
  internalMutation,
  internalQuery,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createClerkClient } from "@clerk/backend";
import {
  canSetRole,
  canManageUser,
  isAdminTier,
  isSuperAdminTier,
} from "../lib/roles";
import {
  isValidOrgTitleForRole,
  type OrgTitle,
} from "../lib/orgTitles";
import { isValidStateId } from "../lib/states";

const roleValidator = v.union(
  v.literal("owner"),
  v.literal("super_admin"),
  v.literal("admin"),
  v.literal("member")
);

const orgTitleValidator = v.optional(
  v.union(
    v.literal("patron"),
    v.literal("co_patron"),
    v.literal("dg"),
    v.literal("nwc"),
    v.literal("publicity"),
    v.literal("zonal"),
    v.literal("state"),
    v.literal("state_director")
  )
);

function ownerEmail(): string | null {
  const email = process.env.OWNER_EMAIL;
  return email ? email.trim().toLowerCase() : null;
}

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

export async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  if (!user) throw new Error("User profile not found");
  return user;
}

export async function requireAdminTier(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrThrow(ctx);
  if (!isAdminTier(user.role)) {
    throw new Error("Not authorized");
  }
  return user;
}

export async function requireSuperAdminTier(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrThrow(ctx);
  if (!isSuperAdminTier(user.role)) {
    throw new Error("Not authorized");
  }
  return user;
}

function displayName(user: {
  firstName?: string;
  lastName?: string;
  email: string;
}) {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email;
}

export const current = query({
  args: {},
  handler: async (ctx) => getCurrentUser(ctx),
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserOrThrow(ctx);
    const users = await ctx.db.query("users").collect();
    return users.sort((a, b) =>
      displayName(a).localeCompare(displayName(b))
    );
  },
});

/** Full team roster with roles — visible to admin tier and above. */
export const listTeam = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminTier(ctx);
    const users = await ctx.db.query("users").collect();
    return users
      .map((u) => ({
        _id: u._id,
        name: displayName(u),
        email: u.email,
        role: u.role,
        orgTitle: u.orgTitle,
        assignedState: u.assignedState,
        status: u.status ?? "active",
        createdAt: u.createdAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Promote / demote a user. Enforced by the role hierarchy. */
export const setUserRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  handler: async (ctx, { userId, role }) => {
    const actor = await requireSuperAdminTier(ctx);
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");

    if (target._id === actor._id) {
      throw new Error("You cannot change your own role");
    }
    if (!canSetRole(actor.role, target.role, role)) {
      throw new Error("Not authorized to set this role");
    }

    const patch: { role: typeof role; orgTitle?: undefined } = { role };
    if (target.orgTitle && !isValidOrgTitleForRole(role, target.orgTitle as OrgTitle)) {
      patch.orgTitle = undefined;
    }

    await ctx.db.patch(userId, patch);
  },
});

/** Set a user's org chart title (Patron, NWC, Zonal, etc.). */
export const setUserOrgTitle = mutation({
  args: { userId: v.id("users"), orgTitle: orgTitleValidator },
  handler: async (ctx, { userId, orgTitle }) => {
    const actor = await requireSuperAdminTier(ctx);
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");

    if (target._id === actor._id && actor.role !== "owner") {
      throw new Error("You cannot change your own org title");
    }
    if (!canManageUser(actor.role, target.role) && target._id !== actor._id) {
      throw new Error("Not authorized");
    }
    if (orgTitle && !isValidOrgTitleForRole(target.role, orgTitle as OrgTitle)) {
      throw new Error("This org title does not match the user's role");
    }

    await ctx.db.patch(userId, { orgTitle });
  },
});

/** Assign a member to a Nigerian state. Admin tier and above. */
export const setUserAssignedState = mutation({
  args: {
    userId: v.id("users"),
    assignedState: v.optional(v.string()),
  },
  handler: async (ctx, { userId, assignedState }) => {
    const actor = await requireAdminTier(ctx);
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");

    if (!canManageUser(actor.role, target.role)) {
      throw new Error("Not authorized");
    }
    if (assignedState && !isValidStateId(assignedState)) {
      throw new Error("Invalid state");
    }

    await ctx.db.patch(userId, { assignedState });
  },
});

/** Verify / activate or deactivate a member's account. Admin tier and above. */
export const setUserStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("active")),
  },
  handler: async (ctx, { userId, status }) => {
    const actor = await requireAdminTier(ctx);
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User not found");

    if (target._id === actor._id) {
      throw new Error("You cannot change your own status");
    }
    if (!canManageUser(actor.role, target.role)) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(userId, { status });
  },
});

/** Delete a user account from Clerk and Convex. Admin tier and above. */
export const deleteUser = action({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const auth = await ctx.runQuery(internal.users.authorizeUserDeletion, {
      userId,
    });
    if (!auth.ok) {
      throw new Error(auth.reason ?? "Not authorized");
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    await clerk.users.deleteUser(auth.clerkUserId);

    await ctx.runMutation(internal.users.deleteUserRecords, { userId });
  },
});

/** Permission check for deleteUser action. */
export const authorizeUserDeletion = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const actor = await getCurrentUserOrThrow(ctx);
    const target = await ctx.db.get(userId);
    if (!target) return { ok: false as const, reason: "User not found" };
    if (target._id === actor._id) {
      return { ok: false as const, reason: "You cannot delete your own account" };
    }
    if (!canManageUser(actor.role, target.role)) {
      return { ok: false as const, reason: "Not authorized" };
    }
    return { ok: true as const, clerkUserId: target.clerkUserId };
  },
});

/** Remove a user and their related records from Convex. */
export const deleteUserRecords = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await deleteUserRecordsForId(ctx, userId);
  },
});

async function deleteUserRecordsForId(
  ctx: MutationCtx,
  userId: Parameters<MutationCtx["db"]["get"]>[0]
) {
  const user = await ctx.db.get(userId);
  if (!user) return;

  const assignments = await ctx.db
    .query("task_assignments")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .collect();
  for (const row of assignments) {
    await ctx.db.delete(row._id);
  }

  const submissions = await ctx.db
    .query("state_submissions")
    .withIndex("byUploadedBy", (q) => q.eq("uploadedBy", userId))
    .collect();
  for (const row of submissions) {
    await ctx.db.delete(row._id);
  }

  const announcementReads = await ctx.db
    .query("announcement_reads")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .collect();
  for (const row of announcementReads) {
    await ctx.db.delete(row._id);
  }

  await ctx.db.delete(userId);
}

/** Called by a pending user during onboarding to set their own state. */
export const completeOnboarding = mutation({
  args: { assignedState: v.string() },
  handler: async (ctx, { assignedState }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (!isValidStateId(assignedState)) {
      throw new Error("Please choose a valid state");
    }
    await ctx.db.patch(user._id, { assignedState });
  },
});

async function upsertUserRecord(
  ctx: MutationCtx,
  {
    clerkUserId,
    email,
    firstName,
    lastName,
  }: {
    clerkUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }
) {
  const existing = await ctx.db
    .query("users")
    .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();

  const matchesOwnerEmail =
    !!email && !!ownerEmail() && email.trim().toLowerCase() === ownerEmail();

  if (existing) {
    const patch: Record<string, unknown> = { email, firstName, lastName };
    // Self-heal: whoever owns OWNER_EMAIL is always the Owner and active.
    if (matchesOwnerEmail && existing.role !== "owner") {
      patch.role = "owner";
      patch.status = "active";
    }
    await ctx.db.patch(existing._id, patch);
    return existing._id;
  }

  const userId = await ctx.db.insert("users", {
    clerkUserId,
    email,
    firstName,
    lastName,
    role: matchesOwnerEmail ? "owner" : "member",
    // Owner is auto-active; everyone else waits for admin verification.
    status: matchesOwnerEmail ? "active" : "pending",
    createdAt: Date.now(),
  });
  return userId;
}

function clerkUserFromWebhook(data: {
  id: string;
  email_addresses?: { id: string; email_address: string }[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}) {
  const primaryEmail = data.email_addresses?.find(
    (entry) => entry.id === data.primary_email_address_id
  );
  return {
    clerkUserId: data.id,
    email: primaryEmail?.email_address ?? data.email_addresses?.[0]?.email_address ?? "",
    firstName: data.first_name ?? undefined,
    lastName: data.last_name ?? undefined,
  };
}

/** Upsert user on first sign-in (called from client after Clerk auth) */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await upsertUserRecord(ctx, {
      clerkUserId: identity.subject,
      email: identity.email ?? "",
      firstName: identity.givenName ?? undefined,
      lastName: identity.familyName ?? undefined,
    });
  },
});

/** Called by Clerk webhook on user.created / user.updated */
export const upsertFromClerk = internalMutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    return await upsertUserRecord(ctx, clerkUserFromWebhook(data));
  },
});

/** Called by Clerk webhook on user.deleted */
export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (user) {
      await deleteUserRecordsForId(ctx, user._id);
    }
  },
});

export { displayName };
