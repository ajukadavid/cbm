"use client";
// @ts-nocheck

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import { isAdminTier } from "@/lib/roles";
import { theme } from "@/lib/theme";
import { CheckSquare, Calendar, Megaphone, ChevronLeft, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const user = useQuery(api.users.current);
  const isAdmin = user ? isAdminTier(user.role) : false;
  const myTasks = useQuery(api.tasks.listMyTasks);
  const allTasks = useQuery(api.tasks.listAllTasks, isAdmin ? {} : "skip");
  const calendarFeed = useQuery(api.calendar.listMyCalendarFeed, {});
  const announcements = useQuery(api.announcements.list);

  const activeTasks = myTasks?.filter((t) => t.status !== "done") ?? [];
  const recentAnnouncements = announcements?.slice(0, 3) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Welcome back{user ? `, ${user.firstName ?? user.email}` : ""}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={CheckSquare}
          label="My active tasks"
          value={activeTasks.length}
          href="/tasks"
          variant="green"
        />
        <StatCard
          icon={Calendar}
          label="Calendar items"
          value={calendarFeed?.length ?? 0}
          href="/calendar"
          variant="red"
        />
        <StatCard
          icon={Megaphone}
          label="Announcements"
          value={announcements?.length ?? 0}
          href="/announcements"
          variant="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-xl border border-green-100 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-green-950">My tasks</h2>
            <Link href="/tasks" className={`text-sm ${theme.link}`}>
              View all
            </Link>
          </div>
          {activeTasks.length === 0 ? (
            <p className="text-sm text-slate-500">No active tasks assigned to you.</p>
          ) : (
            <ul className="space-y-2">
              {activeTasks.slice(0, 5).map((t) => (
                <li
                  key={t._id}
                  className="flex justify-between items-center text-sm border-b pb-2 last:border-0"
                >
                  <span className="font-medium truncate pr-2">{t.title}</span>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <DashboardCalendar feed={calendarFeed ?? []} />
      </div>

      <section className="bg-white rounded-xl border border-green-100 p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-green-950">Latest announcements</h2>
          <Link href="/announcements" className={`text-sm ${theme.link}`}>
            See all
          </Link>
        </div>
        {recentAnnouncements.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements yet.</p>
        ) : (
          <ul className="space-y-3">
            {recentAnnouncements.map((a) => (
              <li key={a._id} className="border-b pb-3 last:border-0">
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-slate-600 line-clamp-2 mt-1">{a.body}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {a.createdByName} · {format(new Date(a.createdAt), "MMM d, yyyy")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {allTasks && (
        <p className="text-xs text-slate-400 text-center">
          {allTasks.length} total tasks across the workspace
        </p>
      )}
    </div>
  );
}

function DashboardCalendar({ feed }: { feed: any[] }) {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const today = new Date();

  const itemsByDay = useMemo(() => {
    const map = new Map<string, { events: number; tasks: number }>();
    for (const item of feed) {
      const start = new Date(item.date + "T12:00:00");
      const end = new Date((item.endDate ?? item.date) + "T12:00:00");
      for (let d = start; d <= end; d = addDays(d, 1)) {
        const key = format(d, "yyyy-MM-dd");
        const entry = map.get(key) ?? { events: 0, tasks: 0 };
        if (item.kind === "task") entry.tasks += 1;
        else entry.events += 1;
        map.set(key, entry);
      }
    }
    return map;
  }, [feed]);

  const dayItems = useMemo(
    () =>
      feed.filter((item) => {
        const end = item.endDate ?? item.date;
        return selectedDateStr >= item.date && selectedDateStr <= end;
      }),
    [feed, selectedDateStr]
  );

  return (
    <section className="bg-white rounded-xl border border-green-100 p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-green-950">My calendar</h2>
        <Link href="/calendar" className={`text-sm ${theme.link}`}>
          Open full calendar
        </Link>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor(addDays(monthStart, -1))}
          className="p-1 hover:bg-slate-100 rounded"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-medium text-sm">{format(cursor, "MMMM yyyy")}</h3>
        <button
          onClick={() => setCursor(addDays(monthEnd, 1))}
          className="p-1 hover:bg-slate-100 rounded"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const counts = itemsByDay.get(key);
          const hasDeadline = (counts?.tasks ?? 0) > 0;
          const hasEvent = (counts?.events ?? 0) > 0;
          const selected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);

          let cellClass =
            "aspect-square rounded-lg text-sm flex flex-col items-center justify-center transition-colors ";
          if (selected) {
            cellClass += hasDeadline
              ? "bg-red-600 text-white font-semibold"
              : "bg-green-700 text-white font-semibold";
          } else if (hasDeadline) {
            cellClass += "bg-red-100 text-red-800 font-semibold ring-1 ring-red-300 hover:bg-red-200";
          } else if (isToday) {
            cellClass += "ring-2 ring-green-500 hover:bg-green-50";
          } else {
            cellClass += "hover:bg-green-50 text-green-900";
          }

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(day)}
              className={cellClass}
            >
              {format(day, "d")}
              {hasEvent && !hasDeadline && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    selected ? "bg-green-200" : "bg-green-600"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 ring-1 ring-red-300" />
          Deadline
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
          Event
        </span>
      </div>

      <div className="mt-4 pt-4 border-t">
        <p className="text-sm font-medium mb-2">
          {format(selectedDate, "EEEE, MMM d")}
        </p>
        {dayItems.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing on this day.</p>
        ) : (
          <ul className="space-y-2">
            {dayItems.map((item) => (
              <li key={item.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  {item.kind === "task" ? (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                      Due
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-medium">
                      Event
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-0.5">
                  {item.kind === "event" && item.startTime && item.endTime
                    ? `${item.startTime}–${item.endTime}`
                    : "Task deadline"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const STAT_VARIANTS = {
  green: theme.statGreen,
  red: theme.statRed,
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  variant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href: string;
  variant: keyof typeof STAT_VARIANTS;
}) {
  const styles = STAT_VARIANTS[variant];
  return (
    <Link
      href={href}
      className={`rounded-xl border p-5 hover:shadow-md transition-shadow ${styles.card}`}
    >
      <Icon className={`w-5 h-5 mb-2 ${styles.icon}`} />
      <p className={`text-2xl font-bold ${styles.value}`}>{value}</p>
      <p className={`text-sm ${styles.label}`}>{label}</p>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    assigned: "bg-green-100 text-green-800",
    to_do: "bg-green-50 text-green-700 border border-green-200",
    in_progress: "bg-red-100 text-red-800",
    done: "bg-green-700 text-white",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${colors[status] ?? "bg-gray-100"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
