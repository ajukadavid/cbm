// @ts-nocheck
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { Id } from "./_generated/dataModel";

function eventVisibleToUser(
  event: { ownerId: Id<"users">; participantIds: Id<"users">[] },
  userId: Id<"users">
) {
  return event.ownerId === userId || event.participantIds.includes(userId);
}

export const listMyEvents = query({
  args: {
    date: v.optional(v.string()),
  },
  handler: async (ctx, { date }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const all = await ctx.db.query("calendar_events").collect();

    const mine = all.filter((e) => eventVisibleToUser(e, user._id));

    const filtered = date
      ? mine.filter((e) => {
          const end = e.endDate ?? e.date;
          return date >= e.date && date <= end;
        })
      : mine;

    return filtered.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
    });
  },
});

export const createEvent = mutation({
  args: {
    title: v.string(),
    date: v.string(),
    endDate: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    description: v.optional(v.string()),
    participantIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const [sh, sm] = args.startTime.split(":").map(Number);
    const [eh, em] = args.endTime.split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      throw new Error("End time must be after start time");
    }

    return await ctx.db.insert("calendar_events", {
      ownerId: user._id,
      title: args.title,
      date: args.date,
      endDate: args.endDate ?? args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      description: args.description,
      participantIds: args.participantIds ?? [],
      createdAt: Date.now(),
    });
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id("calendar_events"),
    title: v.string(),
    date: v.string(),
    endDate: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    description: v.optional(v.string()),
    participantIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.ownerId !== user._id) {
      throw new Error("You can only edit your own events");
    }

    await ctx.db.patch(args.eventId, {
      title: args.title,
      date: args.date,
      endDate: args.endDate ?? args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      description: args.description,
      participantIds: args.participantIds ?? [],
      updatedAt: Date.now(),
    });
  },
});

export const deleteEvent = mutation({
  args: { eventId: v.id("calendar_events") },
  handler: async (ctx, { eventId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");
    if (event.ownerId !== user._id) {
      throw new Error("You can only delete your own events");
    }
    await ctx.db.delete(eventId);
  },
});
