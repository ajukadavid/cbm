"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn, formatUserName } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Megaphone,
  Inbox,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "My Calendar", icon: Calendar },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useQuery(api.users.current);

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <p className="font-semibold text-lg">Ops Workspace</p>
          {user && (
            <p className="text-xs text-slate-400 mt-1 truncate">
              {formatUserName(user)} · {user.role}
            </p>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-400">Account</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
