"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthReady } from "@/lib/useAuthReady";
import AuthSetupError from "@/components/AuthSetupError";
import Onboarding from "@/components/Onboarding";
import { cn, formatUserName } from "@/lib/utils";
import { isAdminTier } from "@/lib/roles";
import { formatUserSubtitle } from "@/lib/orgTitles";
import { theme } from "@/lib/theme";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Megaphone,
  Users,
  MapPin,
  FolderOpen,
} from "lucide-react";

const nav: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show?: (
    user: { role: string; orgTitle?: string; assignedState?: string },
    extras?: { canViewPublicity?: boolean }
  ) => boolean;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "My Calendar", icon: Calendar },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  {
    href: "/my-state",
    label: "My State",
    icon: FolderOpen,
    show: (u) => u.role === "member" && !!u.assignedState,
  },
  {
    href: "/states",
    label: "States",
    icon: MapPin,
    show: (u, extras) =>
      isAdminTier(u.role as any) || !!extras?.canViewPublicity,
  },
  {
    href: "/team",
    label: "Team",
    icon: Users,
    show: (u) => isAdminTier(u.role as any),
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { isLoading, isAuthenticated, isBootstrapping, isReady, isPending, user } =
    useAuthReady();
  const publicityAccess = useQuery(
    api.stateSubmissions.publicityAccess,
    user ? {} : "skip"
  );
  const unreadAnnouncements = useQuery(
    api.announcements.unreadCount,
    user ? {} : "skip"
  );

  if (!isLoading && isSignedIn && !isAuthenticated) {
    return <AuthSetupError />;
  }

  if (isPending && user) {
    return <Onboarding assignedState={user.assignedState} />;
  }

  return (
    <div className={cn("min-h-screen flex", theme.page)}>
      <aside className="w-56 flex flex-col shrink-0 border-r-2 bg-white text-black">
        <div className="p-4 border-b border-slate-700/60">
          <Link href="/dashboard" className="block mb-3">
            <div className="bg-green-50 rounded-lg px-3 py-2 inline-block ring-1 ring-green-200">
              <Image
                src="/cityboy-logo.png"
                alt="City Boy Movement"
                width={120}
                height={64}
                className="h-10 w-auto object-contain"
              />
            </div>
          </Link>
          {user && (
            <p className="text-xs truncate text-black">
              {formatUserName(user)} · {formatUserSubtitle(user)}
            </p>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav
            .filter(
              ({ show }) =>
                !show ||
                (user &&
                  show(user, {
                    canViewPublicity: publicityAccess?.canViewPublicity,
                  }))
            )
            .map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border-l-2",
                    active
                      ? "bg-red-600 text-white border-red-300"
                      : "text-white-300 hover:bg-red-600/80 hover:text-white border-transparent"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {href === "/announcements" &&
                    unreadAnnouncements != null &&
                    unreadAnnouncements > 0 && (
                      <span
                        className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          active
                            ? "bg-white text-red-600"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {unreadAnnouncements > 99 ? "99+" : unreadAnnouncements}
                      </span>
                    )}
                </Link>
              );
            })}
        </nav>
        <div className="p-4 border-t border-slate-700/60 flex items-center justify-between">
          <span className="text-xs text-black">Account</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 md:p-8">
          {isReady ? (
            children
          ) : (
            <div className="flex items-center justify-center py-24 text-sm text-green-700/70">
              {isBootstrapping ? "Loading your workspace…" : "Setting up your account…"}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
