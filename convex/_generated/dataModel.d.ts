/* eslint-disable */
import type { GenericId } from "convex/values";

export type Id<TableName extends string> = GenericId<TableName>;

export type DataModel = {
  users: { document: { _id: Id<"users"> }; fieldPaths: "_id" };
  tasks: { document: { _id: Id<"tasks"> }; fieldPaths: "_id" };
  task_assignments: { document: { _id: Id<"task_assignments"> }; fieldPaths: "_id" };
  file_inbox: { document: { _id: Id<"file_inbox"> }; fieldPaths: "_id" };
  calendar_events: { document: { _id: Id<"calendar_events"> }; fieldPaths: "_id" };
  announcements: { document: { _id: Id<"announcements"> }; fieldPaths: "_id" };
};
