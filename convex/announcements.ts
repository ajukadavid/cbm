// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  getCurrentUserOrThrow,
  requireAdminTier,
  displayName,
} from "./users";
import { isAdminTier } from "../lib/roles";

async function readAnnouncementIds(
  ctx: { db: any },
  userId: string
): Promise<Set<string>> {
  const reads = await ctx.db
    .query("announcement_reads")
    .withIndex("byUserId", (q: any) => q.eq("userId", userId))
    .collect();
  return new Set(reads.map((r: { announcementId: string }) => r.announcementId));
}

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const announcements = await ctx.db.query("announcements").collect();
    const readIds = await readAnnouncementIds(ctx, user._id);
    return announcements.filter((a) => !readIds.has(a._id)).length;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const items = await ctx.db.query("announcements").collect();
    const readIds = await readAnnouncementIds(ctx, user._id);

    return items
      .map((a) => ({
        ...a,
        isRead: readIds.has(a._id),
      }))
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
      });
  },
});

export const markRead = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, { announcementId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const announcement = await ctx.db.get(announcementId);
    if (!announcement) throw new Error("Not found");

    const existing = await ctx.db
      .query("announcement_reads")
      .withIndex("byAnnouncementAndUser", (q) =>
        q.eq("announcementId", announcementId).eq("userId", user._id)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("announcement_reads", {
        announcementId,
        userId: user._id,
        readAt: Date.now(),
      });
    }
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    isPinned: v.optional(v.boolean()),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentFileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminTier(ctx);
    return await ctx.db.insert("announcements", {
      title: args.title,
      body: args.body,
      isPinned: args.isPinned ?? false,
      attachmentStorageId: args.attachmentStorageId,
      attachmentFileName: args.attachmentFileName,
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
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentFileName: v.optional(v.string()),
    removeAttachment: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const item = await ctx.db.get(args.announcementId);
    if (!item) throw new Error("Not found");

    if (item.createdBy !== user._id && !isAdminTier(user.role)) {
      throw new Error("Not authorized");
    }

    const patch: Record<string, unknown> = {
      title: args.title,
      body: args.body,
      isPinned: args.isPinned ?? item.isPinned,
      updatedAt: Date.now(),
    };

    if (args.removeAttachment) {
      patch.attachmentStorageId = undefined;
      patch.attachmentFileName = undefined;
    } else if (args.attachmentStorageId) {
      patch.attachmentStorageId = args.attachmentStorageId;
      patch.attachmentFileName = args.attachmentFileName;
    }

    await ctx.db.patch(args.announcementId, patch);
  },
});

export const getAttachmentUrl = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, { announcementId }) => {
    await getCurrentUserOrThrow(ctx);
    const item = await ctx.db.get(announcementId);
    if (!item?.attachmentStorageId) return null;
    return await ctx.storage.getUrl(item.attachmentStorageId);
  },
});

export const remove = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, { announcementId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const item = await ctx.db.get(announcementId);
    if (!item) throw new Error("Not found");

    if (item.createdBy !== user._id && !isAdminTier(user.role)) {
      throw new Error("Not authorized");
    }

    const reads = await ctx.db
      .query("announcement_reads")
      .withIndex("byAnnouncementId", (q) =>
        q.eq("announcementId", announcementId)
      )
      .collect();
    for (const row of reads) {
      await ctx.db.delete(row._id);
    }

    await ctx.db.delete(announcementId);
  },
});
