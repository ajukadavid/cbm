"use client";
// @ts-nocheck

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { stateLabel } from "@/lib/states";
import {
  SUBMISSION_TYPE_LABELS,
  type SubmissionType,
} from "@/lib/stateSubmissions";
import { isAdminTier } from "@/lib/roles";
import { ArrowLeft, Download, FileText } from "lucide-react";

type Filter = "all" | SubmissionType;

export default function StateDetailPage() {
  const params = useParams();
  const stateId = params.stateId as string;
  const [filter, setFilter] = useState<Filter>("all");

  const me = useQuery(api.users.current);
  const publicityAccess = useQuery(api.stateSubmissions.publicityAccess);
  const submissions = useQuery(api.stateSubmissions.listByState, {
    state: stateId,
  });
  const getFileUrl = useMutation(api.stateSubmissions.getFileUrl);

  const isAdmin = me ? isAdminTier(me.role) : false;
  const canViewPublicity = publicityAccess?.canViewPublicity ?? false;

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    ...(isAdmin
      ? [
          { key: "structure" as const, label: SUBMISSION_TYPE_LABELS.structure },
          { key: "strategy" as const, label: SUBMISSION_TYPE_LABELS.strategy },
        ]
      : []),
    ...(canViewPublicity
      ? [{ key: "publicity" as const, label: SUBMISSION_TYPE_LABELS.publicity }]
      : []),
  ];

  const visible =
    submissions?.filter((s) => filter === "all" || s.type === filter) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/states"
          className="text-sm text-green-700 hover:text-green-900 hover:underline flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          All states
        </Link>
        <h1 className="text-2xl font-bold">{stateLabel(stateId)}</h1>
        <p className="text-slate-600 text-sm mt-1">
          Submitted documents for this state.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filter === f.key
                ? "bg-green-700 text-white"
                : "text-green-900 hover:bg-green-100 border border-green-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="bg-white rounded-xl border p-5">
        {visible.length === 0 ? (
          <p className="text-sm text-slate-500">No submissions in this view.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((s) => (
              <li
                key={s._id}
                className="flex flex-wrap gap-3 justify-between items-center border-b pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-sm">{s.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {SUBMISSION_TYPE_LABELS[s.type]} · {s.uploadedByName} ·{" "}
                      {new Date(s.createdAt).toLocaleString()}
                    </p>
                    {s.notes && (
                      <p className="text-xs text-slate-600 mt-1">{s.notes}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const url = await getFileUrl({
                      submissionId: s._id,
                    });
                    if (url) window.open(url, "_blank");
                  }}
                  className="flex items-center gap-1 text-sm px-3 py-1.5 border rounded-lg hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" />
                  Open PDF
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
