// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  getCurrentUserOrThrow,
  displayName,
} from "./users";
import {
  canUploadMemberType,
  canViewPublicity,
  canViewSubmissionType,
  uploadTypesForMember,
} from "../lib/stateSubmissions";
import { isValidStateId, NIGERIAN_STATES, stateLabel } from "../lib/states";
import { isAdminTier } from "../lib/roles";

const submissionTypeValidator = v.union(
  v.literal("structure"),
  v.literal("strategy"),
  v.literal("publicity")
);

function ownerEmail(): string | null {
  const email = process.env.OWNER_EMAIL;
  return email ? email.trim().toLowerCase() : null;
}

function publicityViewerEmailsEnv(): string | null {
  return process.env.PUBLICITY_VIEWER_EMAILS ?? null;
}

function viewerContext(user: { role: string; email: string }) {
  return {
    role: user.role,
    email: user.email,
    ownerEmail: ownerEmail(),
    publicityViewerEmailsEnv: publicityViewerEmailsEnv(),
  };
}

export const listUploadTypes = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return uploadTypesForMember(user);
  },
});

export const publicityAccess = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return { canViewPublicity: canViewPublicity(viewerContext(user)) };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserOrThrow(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const submit = mutation({
  args: {
    type: submissionTypeValidator,
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (!canUploadMemberType(user, args.type)) {
      throw new Error("You are not allowed to upload this document type");
    }
    if (!user.assignedState) {
      throw new Error("Your account needs an assigned state for this upload");
    }
    if (!args.fileName.toLowerCase().endsWith(".pdf")) {
      throw new Error("Only PDF files are accepted");
    }

    return await ctx.db.insert("state_submissions", {
      state: user.assignedState,
      type: args.type,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      uploadedBy: user._id,
      uploadedByName: displayName(user),
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

/** Member: their own submissions for their state. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (!user.assignedState) return [];

    const rows = await ctx.db
      .query("state_submissions")
      .withIndex("byState", (q) => q.eq("state", user.assignedState!))
      .collect();

    return rows
      .filter((r) => r.uploadedBy === user._id)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** State overview — admins see structure/strategy; publicity viewers see publicity counts only. */
export const listStateOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const ctxViewer = viewerContext(user);
    const isAdmin = isAdminTier(user.role);
    const canSeePublicity = canViewPublicity(ctxViewer);

    if (!isAdmin && !canSeePublicity) {
      throw new Error("Not authorized");
    }

    const all = await ctx.db.query("state_submissions").collect();

    return NIGERIAN_STATES.map((s) => {
      const forState = all.filter((r) => r.state === s.id);
      const visible = forState.filter((r) =>
        canViewSubmissionType(ctxViewer, r.type)
      );
      return {
        id: s.id,
        label: s.label,
        structure: isAdmin
          ? visible.filter((r) => r.type === "structure").length
          : undefined,
        strategy: isAdmin
          ? visible.filter((r) => r.type === "strategy").length
          : undefined,
        publicity: canSeePublicity
          ? visible.filter((r) => r.type === "publicity").length
          : undefined,
        total: visible.length,
      };
    });
  },
});

/** Submissions for one state — filtered by viewer permissions and optional type. */
export const listByState = query({
  args: {
    state: v.string(),
    type: v.optional(submissionTypeValidator),
  },
  handler: async (ctx, { state, type }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const ctxViewer = viewerContext(user);
    const isAdmin = isAdminTier(user.role);
    const canSeePublicity = canViewPublicity(ctxViewer);

    if (!isAdmin && !canSeePublicity) {
      throw new Error("Not authorized");
    }
    if (!isValidStateId(state)) throw new Error("Invalid state");

    const rows = await ctx.db
      .query("state_submissions")
      .withIndex("byState", (q) => q.eq("state", state))
      .collect();

    return rows
      .filter((r) => canViewSubmissionType(ctxViewer, r.type))
      .filter((r) => !type || r.type === type)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({
        ...r,
        stateLabel: stateLabel(r.state),
      }));
  },
});

export const getFileUrl = mutation({
  args: { submissionId: v.id("state_submissions") },
  handler: async (ctx, { submissionId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const row = await ctx.db.get(submissionId);
    if (!row) throw new Error("Not found");

    const isUploader = row.uploadedBy === user._id;
    const canView = canViewSubmissionType(viewerContext(user), row.type);

    if (!isUploader && !canView) {
      throw new Error("Not authorized");
    }

    return await ctx.storage.getUrl(row.storageId);
  },
});
