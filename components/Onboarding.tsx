"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { theme } from "@/lib/theme";
import { NIGERIAN_STATES, stateLabel } from "@/lib/states";
import { toast } from "sonner";
import { Clock, MapPin } from "lucide-react";

export default function Onboarding({
  assignedState,
}: {
  assignedState?: string | null;
}) {
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const [state, setState] = useState(assignedState ?? "");
  const [saving, setSaving] = useState(false);

  // Already picked a state — just waiting for an admin to verify.
  if (assignedState) {
    return (
      <Shell>
        <Clock className="w-10 h-10 text-red-500 mx-auto" />
        <h1 className="text-xl font-bold mt-4">Awaiting verification</h1>
        <p className="text-slate-600 text-sm mt-2">
          Your account for <strong>{stateLabel(assignedState)}</strong> has been
          submitted. An administrator will review and activate it shortly.
        </p>
        <p className="text-slate-500 text-xs mt-4">
          You&apos;ll get access as soon as you&apos;re verified. You can close
          this page and check back later.
        </p>
      </Shell>
    );
  }

  const handleSubmit = async () => {
    if (!state) {
      toast.error("Please select your state");
      return;
    }
    setSaving(true);
    try {
      await completeOnboarding({ assignedState: state });
      toast.success("Submitted — awaiting verification");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <MapPin className="w-10 h-10 text-green-700 mx-auto" />
      <h1 className="text-xl font-bold mt-4">Welcome — set up your account</h1>
      <p className="text-slate-600 text-sm mt-2">
        Select the state you represent in the City Boy Movement. An administrator
        will verify your account before you gain access.
      </p>

      <div className="mt-6 text-left">
        <label className="text-sm font-medium text-slate-700 block mb-1">
          Your state
        </label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Select a state…</option>
          {NIGERIAN_STATES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className={`mt-6 w-full px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 ${theme.btnPrimary}`}
      >
        {saving ? "Submitting…" : "Submit for verification"}
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-green-50/90">
      <div className="max-w-md w-full bg-white border border-green-100 rounded-xl p-8 shadow-sm text-center">
        <div className="flex justify-end mb-2">
          <UserButton afterSignOutUrl="/" />
        </div>
        {children}
      </div>
    </div>
  );
}
