import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("byClerkUserId", ["clerkUserId"])
    .index("byEmail", ["email"]),

  /** Uploaded files waiting to be linked to a task */
  file_inbox: defineTable({
    title: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    uploadedBy: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("assigned"),
      v.literal("archived")
    ),
    linkedTaskId: v.optional(v.id("tasks")),
    createdAt: v.number(),
  })
    .index("byUploadedBy", ["uploadedBy"])
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
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("byCreatedAt", ["createdAt"]),
});
