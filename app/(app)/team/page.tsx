"use client";
// @ts-nocheck

import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  ROLE_LABELS,
  assignableRoles,
  canManageUser,
  isAdminTier,
} from "@/lib/roles";
import {
  ORG_TITLE_LABELS,
  ORG_TITLES_BY_ROLE,
  formatUserSubtitle,
} from "@/lib/orgTitles";
import { NIGERIAN_STATES, stateLabel } from "@/lib/states";
import { ShieldCheck, CheckCircle2, Clock, Trash2 } from "lucide-react";

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-green-800 text-white",
  super_admin: "bg-green-100 text-green-900",
  admin: "bg-green-50 text-green-800 border border-green-200",
  member: "bg-red-50 text-red-800 border border-red-200",
};

export default function TeamPage() {
  const me = useQuery(api.users.current);
  const team = useQuery(api.users.listTeam);
  const setUserRole = useMutation(api.users.setUserRole);
  const setUserOrgTitle = useMutation(api.users.setUserOrgTitle);
  const setUserAssignedState = useMutation(api.users.setUserAssignedState);
  const setUserStatus = useMutation(api.users.setUserStatus);
  const deleteUser = useAction(api.users.deleteUser);

  if (me && !isAdminTier(me.role)) {
    return (
      <div className="text-center py-16 text-slate-500 bg-white rounded-xl border">
        You don&apos;t have access to team management.
      </div>
    );
  }

  const roleOptions = me ? assignableRoles(me.role) : [];

  const handleRoleChange = async (userId: Id<"users">, role: string) => {
    try {
      await setUserRole({ userId, role: role as any });
      toast.success("Role updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update role");
    }
  };

  const handleOrgTitleChange = async (
    userId: Id<"users">,
    orgTitle: string
  ) => {
    try {
      await setUserOrgTitle({
        userId,
        orgTitle: orgTitle === "" ? undefined : (orgTitle as any),
      });
      toast.success("Org title updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update org title");
    }
  };

  const handleAssignedStateChange = async (
    userId: Id<"users">,
    assignedState: string
  ) => {
    try {
      await setUserAssignedState({
        userId,
        assignedState: assignedState === "" ? undefined : assignedState,
      });
      toast.success("State assignment updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update state");
    }
  };

  const handleStatusToggle = async (
    userId: Id<"users">,
    next: "pending" | "active"
  ) => {
    try {
      await setUserStatus({ userId, status: next });
      toast.success(next === "active" ? "Account verified" : "Account deactivated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update status");
    }
  };

  const handleDelete = async (userId: Id<"users">, name: string) => {
    if (!confirm(`Delete ${name}'s account? This cannot be undone.`)) return;
    try {
      await deleteUser({ userId });
      toast.success("Account deleted");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete account");
    }
  };

  const pendingCount = (team ?? []).filter((u) => u.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Team
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Verify new accounts, assign states, and manage roles.
          {pendingCount > 0 && (
            <span className="ml-1 text-amber-600 font-medium">
              {pendingCount} awaiting verification.
            </span>
          )}
        </p>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Org title</th>
              <th className="px-4 py-3 font-medium">State</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(team ?? []).map((u) => {
              const isSelf = me && u._id === me._id;
              const manageable = me && !isSelf && canManageUser(me.role, u.role);
              const titleOptions = ORG_TITLES_BY_ROLE[u.role] ?? [];
              const isPending = u.status === "pending";

              return (
                <tr key={u._id} className={isPending ? "bg-red-50/50" : ""}>
                  <td className="px-4 py-3 font-medium">
                    {u.name}
                    {isSelf && (
                      <span className="text-xs text-slate-400 ml-2">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {manageable && titleOptions.length > 0 ? (
                      <select
                        value={u.orgTitle ?? ""}
                        onChange={(e) =>
                          handleOrgTitleChange(u._id, e.target.value)
                        }
                        className="text-sm border rounded-lg px-2 py-1"
                      >
                        <option value="">—</option>
                        {titleOptions.map((t) => (
                          <option key={t} value={t}>
                            {ORG_TITLE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-600">
                        {u.orgTitle
                          ? ORG_TITLE_LABELS[u.orgTitle] ?? u.orgTitle
                          : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {manageable && u.role === "member" ? (
                      <select
                        value={u.assignedState ?? ""}
                        onChange={(e) =>
                          handleAssignedStateChange(u._id, e.target.value)
                        }
                        className="text-sm border rounded-lg px-2 py-1 max-w-[140px]"
                      >
                        <option value="">—</option>
                        {NIGERIAN_STATES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-600">
                        {u.assignedState ? stateLabel(u.assignedState) : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        ROLE_BADGE[u.role] ?? "bg-slate-100"
                      }`}
                      title={formatUserSubtitle(u)}
                    >
                      {formatUserSubtitle(u)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {manageable && roleOptions.length > 0 && (
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(u._id, e.target.value)
                          }
                          className="text-sm border rounded-lg px-2 py-1"
                        >
                          {![...roleOptions].includes(u.role) && (
                            <option value={u.role} disabled>
                              {ROLE_LABELS[u.role] ?? u.role}
                            </option>
                          )}
                          {roleOptions.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}
                      {manageable && isPending && (
                        <button
                          onClick={() => handleStatusToggle(u._id, "active")}
                          className="text-xs px-2 py-1 rounded-lg bg-green-700 text-white hover:bg-green-800 whitespace-nowrap"
                        >
                          Verify
                        </button>
                      )}
                      {manageable && !isPending && (
                        <button
                          onClick={() => handleStatusToggle(u._id, "pending")}
                          className="text-xs px-2 py-1 rounded-lg border text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                        >
                          Deactivate
                        </button>
                      )}
                      {manageable && (
                        <button
                          onClick={() => handleDelete(u._id, u.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Delete account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {!manageable && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {team && team.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">
            No team members yet.
          </p>
        )}
      </div>
    </div>
  );
}
