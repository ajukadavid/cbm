"use client";
// @ts-nocheck

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { format } from "date-fns";
import { CheckSquare, Calendar, Megaphone } from "lucide-react";

export default function DashboardPage() {
  const user = useQuery(api.users.current);
  const myTasks = useQuery(api.tasks.listMyTasks);
  const allTasks = useQuery(api.tasks.listAllTasks);
  const events = useQuery(api.calendar.listMyEvents, {});
  const announcements = useQuery(api.announcements.list);

  const activeTasks = myTasks?.filter((t) => t.status !== "done") ?? [];
  const upcomingEvents = events?.slice(0, 5) ?? [];
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
        />
        <StatCard
          icon={Calendar}
          label="Calendar events"
          value={events?.length ?? 0}
          href="/calendar"
        />
        <StatCard
          icon={Megaphone}
          label="Announcements"
          value={announcements?.length ?? 0}
          href="/announcements"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-xl border p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">My tasks</h2>
            <Link href="/tasks" className="text-sm text-blue-600 hover:underline">
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

        <section className="bg-white rounded-xl border p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Upcoming on your calendar</h2>
            <Link href="/calendar" className="text-sm text-blue-600 hover:underline">
              Open calendar
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No events scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingEvents.map((e) => (
                <li key={e._id} className="text-sm border-b pb-2 last:border-0">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-slate-500">
                    {format(new Date(e.date), "MMM d, yyyy")} · {e.startTime}–{e.endTime}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="bg-white rounded-xl border p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Latest announcements</h2>
          <Link href="/announcements" className="text-sm text-blue-600 hover:underline">
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

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
    >
      <Icon className="w-5 h-5 text-slate-500 mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    assigned: "bg-blue-100 text-blue-800",
    to_do: "bg-gray-100 text-gray-700",
    in_progress: "bg-amber-100 text-amber-800",
    done: "bg-green-100 text-green-800",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${colors[status] ?? "bg-gray-100"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
