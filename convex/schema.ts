import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.union(
      v.literal("owner"),
      v.literal("super_admin"),
      v.literal("admin"),
      v.literal("member")
    ),
    /** Whiteboard org title: Patron, NWC, Zonal, etc. */
    orgTitle: v.optional(
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
    ),
    /** Nigerian state slug — required for state directors, state members, publicity secretaries */
    assignedState: v.optional(v.string()),
    /** Account status — new signups are "pending" until an admin verifies them. */
    status: v.optional(v.union(v.literal("pending"), v.literal("active"))),
    createdAt: v.number(),
  })
    .index("byClerkUserId", ["clerkUserId"])
    .index("byEmail", ["email"])
    .index("byAssignedState", ["assignedState"]),

  /** Files sent by members to a specific admin, waiting to be linked to a task */
  file_inbox: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    uploadedBy: v.id("users"),
    /** The admin this file was addressed to (optional for legacy rows). */
    recipientId: v.optional(v.id("users")),
    status: v.union(
      v.literal("pending"),
      v.literal("assigned"),
      v.literal("archived")
    ),
    linkedTaskId: v.optional(v.id("tasks")),
    createdAt: v.number(),
  })
    .index("byUploadedBy", ["uploadedBy"])
    .index("byRecipient", ["recipientId"])
    .index("byStatus", ["status"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("assigned"),
      v.literal("to_do"),
      v.literal("in_progress"),
      v.literal("done")
    ),
    createdBy: v.id("users"),
    createdByName: v.string(),
    dueDate: v.optional(v.number()),
    assignmentDocumentId: v.optional(v.id("_storage")),
    assignmentDocumentName: v.optional(v.string()),
    sourceInboxId: v.optional(v.id("file_inbox")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byStatus", ["status"])
    .index("byCreatedBy", ["createdBy"]),

  task_assignments: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    assignedBy: v.id("users"),
    assignedAt: v.number(),
  })
    .index("byTaskId", ["taskId"])
    .index("byUserId", ["userId"]),

  /** Conversation thread on a task — text and optional file per message. */
  task_messages: defineTable({
    taskId: v.id("tasks"),
    body: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    authorId: v.id("users"),
    authorName: v.string(),
    createdAt: v.number(),
  }).index("byTaskId", ["taskId"]),

  /** Personal calendar events — owned by one user, optional participants */
  calendar_events: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    date: v.string(),
    endDate: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    description: v.optional(v.string()),
    participantIds: v.array(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("byOwnerId", ["ownerId"])
    .index("byDate", ["date"]),

  /** Broadcast announcements visible to all authenticated users */
  announcements: defineTable({
    title: v.string(),
    body: v.string(),
    createdBy: v.id("users"),
    createdByName: v.string(),
    isPinned: v.optional(v.boolean()),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentFileName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("byCreatedAt", ["createdAt"]),

  /** Per-user read state for announcements */
  announcement_reads: defineTable({
    announcementId: v.id("announcements"),
    userId: v.id("users"),
    readAt: v.number(),
  })
    .index("byUserId", ["userId"])
    .index("byAnnouncementId", ["announcementId"])
    .index("byAnnouncementAndUser", ["announcementId", "userId"]),

  /** Private per-state PDF submissions (structure, strategy, publicity). */
  state_submissions: defineTable({
    state: v.string(),
    type: v.union(
      v.literal("structure"),
      v.literal("strategy"),
      v.literal("publicity")
    ),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    uploadedBy: v.id("users"),
    uploadedByName: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("byState", ["state"])
    .index("byStateAndType", ["state", "type"])
    .index("byUploadedBy", ["uploadedBy"]),
});
