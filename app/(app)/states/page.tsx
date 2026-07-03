"use client";
// @ts-nocheck

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";
import { isAdminTier } from "@/lib/roles";

export default function StatesPage() {
  const me = useQuery(api.users.current);
  const publicityAccess = useQuery(api.stateSubmissions.publicityAccess);
  const overview = useQuery(api.stateSubmissions.listStateOverview);

  const isAdmin = me ? isAdminTier(me.role) : false;
  const canViewPublicity = publicityAccess?.canViewPublicity ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          States
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          {isAdmin
            ? "Review state structure and strategy submissions from each state."
            : "Review publicity submissions from each state."}
          {canViewPublicity && isAdmin
            ? " You can also view publicity secretary uploads."
            : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(overview ?? []).map((s) => (
          <Link
            key={s.id}
            href={`/states/${s.id}`}
            className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow flex justify-between items-center group"
          >
            <div>
              <p className="font-semibold">{s.label}</p>
              <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                {s.structure !== undefined && (
                  <p>Structure: {s.structure}</p>
                )}
                {s.strategy !== undefined && <p>Strategy: {s.strategy}</p>}
                {s.publicity !== undefined && (
                  <p>Publicity: {s.publicity}</p>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600" />
          </Link>
        ))}
      </div>
    </div>
  );
}
