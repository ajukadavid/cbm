// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow, displayName } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserOrThrow(ctx);
    const items = await ctx.db.query("announcements").collect();
    return items.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.insert("announcements", {
      title: args.title,
      body: args.body,
      isPinned: args.isPinned ?? false,
      createdBy: user._id,
      createdByName: displayName(user),
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    announcementId: v.id("announcements"),
    title: v.string(),
    body: v.string(),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const item = await ctx.db.get(args.announcementId);
    if (!item) throw new Error("Not found");

    if (item.createdBy !== user._id && user.role !== "admin") {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.announcementId, {
      title: args.title,
      body: args.body,
      isPinned: args.isPinned ?? item.isPinned,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, { announcementId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const item = await ctx.db.get(announcementId);
    if (!item) throw new Error("Not found");

    if (item.createdBy !== user._id && user.role !== "admin") {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(announcementId);
  },
});
