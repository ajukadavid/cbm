// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { Id } from "./_generated/dataModel";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserOrThrow(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const addToInbox = mutation({
  args: {
    title: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.insert("file_inbox", {
      ...args,
      uploadedBy: user._id,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const listInbox = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("assigned"), v.literal("archived"))
    ),
  },
  handler: async (ctx, { status }) => {
    await getCurrentUserOrThrow(ctx);
    if (status) {
      return await ctx.db
        .query("file_inbox")
        .withIndex("byStatus", (q) => q.eq("status", status))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("file_inbox").order("desc").collect();
  },
});

export const getFileUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await getCurrentUserOrThrow(ctx);
    return await ctx.storage.getUrl(storageId);
  },
});

export const archiveInboxItem = mutation({
  args: { inboxId: v.id("file_inbox") },
  handler: async (ctx, { inboxId }) => {
    await getCurrentUserOrThrow(ctx);
    await ctx.db.patch(inboxId, { status: "archived" });
  },
});

export async function resolveInboxDocument(
  ctx: { db: any },
  inboxId: Id<"file_inbox"> | undefined
) {
  if (!inboxId) return {};
  const item = await ctx.db.get(inboxId);
  if (!item) throw new Error("Inbox file not found");
  return {
    assignmentDocumentId: item.storageId as Id<"_storage">,
    assignmentDocumentName: item.fileName,
    sourceInboxId: inboxId,
  };
}
