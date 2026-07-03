// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow, requireAdminTier, displayName } from "./users";
import { Id } from "./_generated/dataModel";
import { isAdminTier } from "../lib/roles";
import { canSendFileTo } from "../lib/fileInbox";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserOrThrow(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Admins the current user is allowed to send a file to. */
export const listRecipients = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUserOrThrow(ctx);
    const users = await ctx.db.query("users").collect();
    return users
      .filter(
        (u) =>
          u._id !== me._id &&
          (u.status ?? "active") === "active" &&
          canSendFileTo(me, u.role)
      )
      .map((u) => ({
        _id: u._id,
        name: displayName(u),
        email: u.email,
        role: u.role,
        orgTitle: u.orgTitle,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const addToInbox = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    recipientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient || !isAdminTier(recipient.role)) {
      throw new Error("Please choose a valid recipient");
    }
    if (!canSendFileTo(user, recipient.role)) {
      throw new Error("You are not allowed to send files to this recipient");
    }

    const title = args.title.trim();
    if (!title) throw new Error("Title is required");

    return await ctx.db.insert("file_inbox", {
      title,
      description: args.description?.trim() || undefined,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      recipientId: args.recipientId,
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
    const me = await requireAdminTier(ctx);

    const items = status
      ? await ctx.db
          .query("file_inbox")
          .withIndex("byStatus", (q) => q.eq("status", status))
          .order("desc")
          .collect()
      : await ctx.db.query("file_inbox").order("desc").collect();

    // An admin sees files addressed to them; the owner also sees unaddressed
    // legacy files and anything sent to another admin.
    const visible =
      me.role === "owner"
        ? items
        : items.filter((i) => i.recipientId === me._id);

    const senderIds = [...new Set(visible.map((i) => i.uploadedBy))];
    const senders = await Promise.all(senderIds.map((id) => ctx.db.get(id)));
    const senderName = new Map(
      senders.filter(Boolean).map((u) => [u!._id, displayName(u!)])
    );

    return visible.map((i) => ({
      ...i,
      senderName: senderName.get(i.uploadedBy) ?? "Unknown",
    }));
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
    await requireAdminTier(ctx);
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
