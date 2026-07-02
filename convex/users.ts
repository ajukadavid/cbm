// @ts-nocheck
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

export async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
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

/** Upsert user on first sign-in (called from client after Clerk auth) */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    const email = identity.email ?? "";
    const firstName = identity.givenName ?? undefined;
    const lastName = identity.familyName ?? undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        firstName,
        lastName,
      });
      return existing._id;
    }

    const allUsers = await ctx.db.query("users").collect();
    const role = allUsers.length === 0 ? "admin" : "member";

    return await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      email,
      firstName,
      lastName,
      role,
      createdAt: Date.now(),
    });
  },
});

export { displayName };
