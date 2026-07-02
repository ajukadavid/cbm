"use client";
// @ts-nocheck

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatUserName } from "@/lib/utils";
import {
  Plus,
  Upload,
  Download,
  Trash2,
  Users,
  Inbox,
} from "lucide-react";

type Tab = "mine" | "all" | "created" | "inbox";

export default function TasksPage() {
  const [tab, setTab] = useState<Tab>("mine");
  const [showCreate, setShowCreate] = useState(false);

  const myTasks = useQuery(api.tasks.listMyTasks);
  const allTasks = useQuery(api.tasks.listAllTasks);
  const createdTasks = useQuery(api.tasks.listTasksICreated);
  const inbox = useQuery(api.files.listInbox, { status: "pending" });
  const users = useQuery(api.users.listUsers);

  const tasks =
    tab === "mine"
      ? myTasks
      : tab === "all"
        ? allTasks
        : tab === "created"
          ? createdTasks
          : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-slate-600 text-sm mt-1">
            Any team member can assign tasks with optional file attachments.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          New task
        </button>
      </div>

      <div className="flex gap-2 flex-wrap border-b pb-2">
        {(
          [
            ["mine", "Assigned to me"],
            ["created", "Created by me"],
            ["all", "All tasks"],
            ["inbox", `File inbox (${inbox?.length ?? 0})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              tab === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "inbox" ? (
        <InboxPanel inbox={inbox ?? []} onAssign={(id) => {
          setShowCreate(true);
          // inbox pre-select handled via sessionStorage
          sessionStorage.setItem("prefillInboxId", id);
        }} />
      ) : (
        <TaskList tasks={tasks ?? []} users={users ?? []} />
      )}

      {showCreate && (
        <CreateTaskDialog
          users={users ?? []}
          inbox={inbox ?? []}
          onClose={() => {
            setShowCreate(false);
            sessionStorage.removeItem("prefillInboxId");
          }}
        />
      )}
    </div>
  );
}

function TaskList({
  tasks,
  users,
}: {
  tasks: any[];
  users: any[];
}) {
  const updateStatus = useMutation(api.tasks.updateTaskStatus);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const getDocUrl = useMutation(api.tasks.getDocumentUrl);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 bg-white rounded-xl border">
        No tasks in this view.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task._id} className="bg-white rounded-xl border p-4">
          <div className="flex flex-wrap gap-3 justify-between items-start">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-slate-600 mt-1">{task.description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {task.assignees?.map((a: any) => a.name).join(", ") || "—"}
                </span>
                <span>Created by {task.createdByName}</span>
                {task.dueDate && (
                  <span>Due {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={task.status}
                onChange={async (e) => {
                  try {
                    await updateStatus({
                      taskId: task._id,
                      status: e.target.value as any,
                    });
                    toast.success("Status updated");
                  } catch (err: any) {
                    toast.error(err.message);
                  }
                }}
                className="text-sm border rounded-lg px-2 py-1"
              >
                <option value="assigned">assigned</option>
                <option value="to_do">to do</option>
                <option value="in_progress">in progress</option>
                <option value="done">done</option>
              </select>
              {task.assignmentDocumentId && (
                <button
                  onClick={async () => {
                    const url = await getDocUrl({ taskId: task._id });
                    if (url) window.open(url, "_blank");
                  }}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  title="Download attachment"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={async () => {
                  if (!confirm("Delete this task?")) return;
                  try {
                    await deleteTask({ taskId: task._id });
                    toast.success("Task deleted");
                  } catch (err: any) {
                    toast.error(err.message);
                  }
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InboxPanel({
  inbox,
  onAssign,
}: {
  inbox: any[];
  onAssign: (id: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const addToInbox = useMutation(api.files.addToInbox);
  const getFileUrl = useMutation(api.files.getFileUrl);
  const archive = useMutation(api.files.archiveInboxItem);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      await addToInbox({
        title: file.name.replace(/\.[^.]+$/, ""),
        storageId,
        fileName: file.name,
        fileSize: file.size,
      });
      toast.success("File uploaded to inbox");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer hover:bg-slate-50 bg-white">
        <Upload className="w-5 h-5 text-slate-400" />
        <span className="text-sm text-slate-600">
          {uploading ? "Uploading…" : "Upload a file to assign later"}
        </span>
        <input
          type="file"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
      </label>

      {inbox.length === 0 ? (
        <p className="text-center text-slate-500 text-sm">Inbox is empty.</p>
      ) : (
        inbox.map((item) => (
          <div
            key={item._id}
            className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <Inbox className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-slate-500">
                  {item.fileName} · {(item.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const url = await getFileUrl({ storageId: item.storageId });
                  if (url) window.open(url, "_blank");
                }}
                className="text-sm px-3 py-1.5 border rounded-lg hover:bg-slate-50"
              >
                Preview
              </button>
              <button
                onClick={() => onAssign(item._id)}
                className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-lg"
              >
                Assign as task
              </button>
              <button
                onClick={() => archive({ inboxId: item._id })}
                className="text-sm px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Archive
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CreateTaskDialog({
  users,
  inbox,
  onClose,
}: {
  users: any[];
  inbox: any[];
  onClose: () => void;
}) {
  const prefillId =
    typeof window !== "undefined"
      ? sessionStorage.getItem("prefillInboxId")
      : null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [inboxId, setInboxId] = useState<string | null>(prefillId);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const createTask = useMutation(api.tasks.createTask);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const prefillItem = useMemo(
    () => inbox.find((i) => i._id === inboxId),
    [inbox, inboxId]
  );

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (selectedUsers.size === 0) {
      toast.error("Select at least one assignee");
      return;
    }

    setSaving(true);
    try {
      let assignmentDocumentId: Id<"_storage"> | undefined;
      let assignmentDocumentName: string | undefined;

      if (localFile && !inboxId) {
        const url = await generateUploadUrl();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": localFile.type },
          body: localFile,
        });
        const { storageId } = await res.json();
        assignmentDocumentId = storageId;
        assignmentDocumentName = localFile.name;
      }

      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeIds: Array.from(selectedUsers) as Id<"users">[],
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        inboxId: inboxId ? (inboxId as Id<"file_inbox">) : undefined,
        assignmentDocumentId,
        assignmentDocumentName,
      });

      toast.success("Task created");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <h2 className="text-lg font-bold mb-4">Create task</h2>

        <div className="space-y-4">
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Task title"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
              placeholder="Optional details"
            />
          </Field>

          <Field label="Due date">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Assign to">
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
              {users.map((u) => (
                <label key={u._id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(u._id)}
                    onChange={() => toggleUser(u._id)}
                  />
                  {formatUserName(u)}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Attachment">
            {inbox.length > 0 && (
              <select
                value={inboxId ?? ""}
                onChange={(e) => {
                  setInboxId(e.target.value || null);
                  setLocalFile(null);
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
              >
                <option value="">From inbox (optional)</option>
                {inbox.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.fileName}
                  </option>
                ))}
              </select>
            )}
            {!inboxId && (
              <input
                type="file"
                onChange={(e) => setLocalFile(e.target.files?.[0] ?? null)}
                className="text-sm w-full"
              />
            )}
            {prefillItem && (
              <p className="text-xs text-green-600 mt-1">
                Using inbox file: {prefillItem.fileName}
              </p>
            )}
          </Field>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
      {children}
    </div>
  );
}
