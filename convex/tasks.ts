// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  getCurrentUserOrThrow,
  requireAdminTier,
  displayName,
} from "./users";
import { resolveInboxDocument } from "./files";
import { isAdminTier } from "../lib/roles";
import { Id } from "./_generated/dataModel";

const statusValidator = v.union(
  v.literal("assigned"),
  v.literal("to_do"),
  v.literal("in_progress"),
  v.literal("done")
);

async function getTaskAssigneeIds(
  ctx: { db: any },
  taskId: Id<"tasks">
): Promise<Id<"users">[]> {
  const rows = await ctx.db
    .query("task_assignments")
    .withIndex("byTaskId", (q: any) => q.eq("taskId", taskId))
    .collect();
  return rows.map((r: { userId: Id<"users"> }) => r.userId);
}

async function isTaskParticipant(
  ctx: { db: any },
  taskId: Id<"tasks">,
  userId: Id<"users">
) {
  const assignees = await getTaskAssigneeIds(ctx, taskId);
  return assignees.includes(userId);
}

async function canAccessTask(
  ctx: { db: any },
  task: { _id: Id<"tasks">; createdBy: Id<"users"> },
  user: { _id: Id<"users">; role: string }
) {
  if (task.createdBy === user._id) return true;
  if (await isTaskParticipant(ctx, task._id, user._id)) return true;
  if (isAdminTier(user.role as any)) return true;
  return false;
}

async function requireTaskAccess(
  ctx: { db: any },
  taskId: Id<"tasks">,
  user: { _id: Id<"users">; role: string }
) {
  const task = await ctx.db.get(taskId);
  if (!task) throw new Error("Task not found");
  if (!(await canAccessTask(ctx, task, user))) {
    throw new Error("Not authorized");
  }
  return task;
}

async function insertTaskMessage(
  ctx: { db: any },
  {
    taskId,
    authorId,
    authorName,
    body,
    storageId,
    fileName,
    fileSize,
  }: {
    taskId: Id<"tasks">;
    authorId: Id<"users">;
    authorName: string;
    body?: string;
    storageId?: Id<"_storage">;
    fileName?: string;
    fileSize?: number;
  }
) {
  const text = body?.trim();
  if (!text && !storageId) {
    throw new Error("Add a message or attach a file");
  }

  await ctx.db.insert("task_messages", {
    taskId,
    body: text || undefined,
    storageId,
    fileName,
    fileSize,
    authorId,
    authorName,
    createdAt: Date.now(),
  });
}

async function enrichTask(ctx: { db: any }, task: any) {
  const assigneeIds = await getTaskAssigneeIds(ctx, task._id);
  const assignees = await Promise.all(assigneeIds.map((id) => ctx.db.get(id)));
  return {
    ...task,
    assigneeIds,
    assignees: assignees.filter(Boolean).map((u: any) => ({
      _id: u._id,
      name: displayName(u),
      email: u.email,
    })),
  };
}

export const listMyTasks = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const assignments = await ctx.db
      .query("task_assignments")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .collect();

    const tasks = await Promise.all(
      assignments.map((a) => ctx.db.get(a.taskId))
    );

    const enriched = await Promise.all(
      tasks.filter(Boolean).map((t) => enrichTask(ctx, t))
    );

    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const listAllTasks = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminTier(ctx);
    const tasks = await ctx.db.query("tasks").order("desc").collect();
    return Promise.all(tasks.map((t) => enrichTask(ctx, t)));
  },
});

export const listTasksICreated = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("byCreatedBy", (q) => q.eq("createdBy", user._id))
      .collect();
    return Promise.all(tasks.map((t) => enrichTask(ctx, t)));
  },
});

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    assigneeIds: v.array(v.id("users")),
    dueDate: v.optional(v.number()),
    inboxId: v.optional(v.id("file_inbox")),
    assignmentDocumentId: v.optional(v.id("_storage")),
    assignmentDocumentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminTier(ctx);

    if (args.assigneeIds.length === 0) {
      throw new Error("Select at least one assignee");
    }

    let docs: {
      assignmentDocumentId?: Id<"_storage">;
      assignmentDocumentName?: string;
      sourceInboxId?: Id<"file_inbox">;
    } = {};

    if (args.inboxId) {
      docs = await resolveInboxDocument(ctx, args.inboxId);
    } else if (args.assignmentDocumentId) {
      docs = {
        assignmentDocumentId: args.assignmentDocumentId,
        assignmentDocumentName: args.assignmentDocumentName,
      };
    }

    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: "assigned",
      createdBy: user._id,
      createdByName: displayName(user),
      dueDate: args.dueDate,
      assignmentDocumentId: docs.assignmentDocumentId,
      assignmentDocumentName: docs.assignmentDocumentName,
      sourceInboxId: docs.sourceInboxId,
      createdAt: now,
      updatedAt: now,
    });

    for (const assigneeId of args.assigneeIds) {
      await ctx.db.insert("task_assignments", {
        taskId,
        userId: assigneeId,
        assignedBy: user._id,
        assignedAt: now,
      });
    }

    if (docs.sourceInboxId) {
      await ctx.db.patch(docs.sourceInboxId, {
        status: "assigned",
        linkedTaskId: taskId,
      });
    }

    if (args.description?.trim() || docs.assignmentDocumentId) {
      await insertTaskMessage(ctx, {
        taskId,
        authorId: user._id,
        authorName: displayName(user),
        body: args.description?.trim(),
        storageId: docs.assignmentDocumentId,
        fileName: docs.assignmentDocumentName,
      });
    }

    return taskId;
  },
});

export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: statusValidator,
  },
  handler: async (ctx, { taskId, status }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    const isAssignee = await isTaskParticipant(ctx, taskId, user._id);
    const isCreator = task.createdBy === user._id;

    if (!isAssignee && !isCreator && !isAdminTier(user.role)) {
      throw new Error("Not authorized");
    }

    if (status === "done" && !isCreator) {
      throw new Error("Only the person who assigned this task can mark it complete");
    }

    await ctx.db.patch(taskId, { status, updatedAt: Date.now() });
  },
});

export const listTaskMessages = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    await requireTaskAccess(ctx, taskId, user);

    const messages = await ctx.db
      .query("task_messages")
      .withIndex("byTaskId", (q) => q.eq("taskId", taskId))
      .collect();

    return messages.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const addTaskMessage = mutation({
  args: {
    taskId: v.id("tasks"),
    body: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const task = await requireTaskAccess(ctx, args.taskId, user);

    if (task.status === "done") {
      throw new Error("This task is complete — reopen it to add messages");
    }

    await insertTaskMessage(ctx, {
      taskId: args.taskId,
      authorId: user._id,
      authorName: displayName(user),
      body: args.body,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
    });

    await ctx.db.patch(args.taskId, { updatedAt: Date.now() });
  },
});

export const getMessageFileUrl = mutation({
  args: { messageId: v.id("task_messages") },
  handler: async (ctx, { messageId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const message = await ctx.db.get(messageId);
    if (!message?.storageId) return null;

    await requireTaskAccess(ctx, message.taskId, user);
    return await ctx.storage.getUrl(message.storageId);
  },
});

export const updateTaskAssignees = mutation({
  args: {
    taskId: v.id("tasks"),
    assigneeIds: v.array(v.id("users")),
  },
  handler: async (ctx, { taskId, assigneeIds }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    if (task.createdBy !== user._id && !isAdminTier(user.role)) {
      throw new Error("Only the task creator or admin can change assignees");
    }

    if (assigneeIds.length === 0) {
      throw new Error("At least one assignee required");
    }

    const existing = await ctx.db
      .query("task_assignments")
      .withIndex("byTaskId", (q) => q.eq("taskId", taskId))
      .collect();

    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    const now = Date.now();
    for (const assigneeId of assigneeIds) {
      await ctx.db.insert("task_assignments", {
        taskId,
        userId: assigneeId,
        assignedBy: user._id,
        assignedAt: now,
      });
    }

    await ctx.db.patch(taskId, { updatedAt: now });
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    if (task.createdBy !== user._id && !isAdminTier(user.role)) {
      throw new Error("Not authorized");
    }

    const assignments = await ctx.db
      .query("task_assignments")
      .withIndex("byTaskId", (q) => q.eq("taskId", taskId))
      .collect();

    for (const row of assignments) {
      await ctx.db.delete(row._id);
    }

    const messages = await ctx.db
      .query("task_messages")
      .withIndex("byTaskId", (q) => q.eq("taskId", taskId))
      .collect();
    for (const row of messages) {
      await ctx.db.delete(row._id);
    }

    await ctx.db.delete(taskId);
  },
});

export const getDocumentUrl = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    await getCurrentUserOrThrow(ctx);
    const task = await ctx.db.get(taskId);
    if (!task?.assignmentDocumentId) return null;
    return await ctx.storage.getUrl(task.assignmentDocumentId);
  },
});
