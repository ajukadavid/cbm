/* eslint-disable */
/**
 * Generated API stub — replaced when you run `npx convex dev`.
 */
import type { ApiFromModules } from "convex/server";
import type * as announcements from "../announcements.js";
import type * as calendar from "../calendar.js";
import type * as files from "../files.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";

declare const fullApi: ApiFromModules<{
  announcements: typeof announcements;
  calendar: typeof calendar;
  files: typeof files;
  tasks: typeof tasks;
  users: typeof users;
}>;

export declare const api: typeof fullApi;
export declare const internal: typeof fullApi;
