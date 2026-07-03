"use client";
// @ts-nocheck

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { toast } from "sonner";
import { theme } from "@/lib/theme";
import { formatUserName } from "@/lib/utils";
import { isAdminTier } from "@/lib/roles";
import {
  MEMBER_UPLOAD_TYPE_LABELS,
  type MemberUploadType,
} from "@/lib/stateSubmissions";
import {
  Plus,
  Upload,
  Download,
  Trash2,
  Users,
  Inbox,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Send,
  CheckCircle2,
} from "lucide-react";

type Tab = "mine" | "all" | "created" | "inbox" | "upload";

export default function TasksPage() {
  const [tab, setTab] = useState<Tab>("mine");
  const [showCreate, setShowCreate] = useState(false);

  const me = useQuery(api.users.current);
  const isAdmin = me ? isAdminTier(me.role) : false;

  const myTasks = useQuery(api.tasks.listMyTasks);
  const createdTasks = useQuery(
    api.tasks.listTasksICreated,
    isAdmin ? {} : "skip"
  );
  const allTasks = useQuery(api.tasks.listAllTasks, isAdmin ? {} : "skip");
  const inbox = useQuery(
    api.files.listInbox,
    isAdmin ? { status: "pending" } : "skip"
  );
  const users = useQuery(api.users.listUsers);

  const tabs: [Tab, string][] = isAdmin
    ? [
        ["mine", "Assigned to me"],
        ["created", "Created by me"],
        ["all", "All tasks"],
        ["inbox", `File inbox (${inbox?.length ?? 0})`],
      ]
    : [
        ["mine", "Assigned to me"],
        ["upload", "Send a file"],
      ];

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
            {isAdmin
              ? "Assign tasks with optional file attachments and manage incoming files."
              : "View tasks assigned to you and send files to an admin."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${theme.btnPrimary}`}
          >
            <Plus className="w-4 h-4" />
            New task
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap border-b pb-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              tab === key ? theme.tabActive : `${theme.tabInactive} rounded-lg`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <SendFilePanel />
      ) : tab === "inbox" ? (
        <InboxPanel
          inbox={inbox ?? []}
          onAssign={(id) => {
            setShowCreate(true);
            sessionStorage.setItem("prefillInboxId", id);
          }}
        />
      ) : (
        <TaskList tasks={tasks ?? []} me={me} canManage={isAdmin} />
      )}

      {showCreate && isAdmin && (
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
  me,
  canManage,
}: {
  tasks: any[];
  me: any;
  canManage: boolean;
}) {
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
        <TaskCard key={task._id} task={task} me={me} canManage={canManage} />
      ))}
    </div>
  );
}

function TaskCard({
  task,
  me,
  canManage,
}: {
  task: any;
  me: any;
  canManage: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const updateStatus = useMutation(api.tasks.updateTaskStatus);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const getDocUrl = useMutation(api.tasks.getDocumentUrl);

  const isCreator = me && task.createdBy === me._id;
  const canDelete = isCreator || canManage;
  const statusOptions = isCreator
    ? ["assigned", "to_do", "in_progress", "done"]
    : ["assigned", "to_do", "in_progress"];
  const statusLocked = !isCreator && task.status === "done";

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4">
        <div className="flex flex-wrap gap-3 justify-between items-start">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{task.title}</h3>
              {task.status === "done" && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Complete
                </span>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-slate-600 mt-1">{task.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {task.assignees?.map((a: any) => a.name).join(", ") || "—"}
              </span>
              <span>Assigned by {task.createdByName}</span>
              {task.dueDate && (
                <span>Due {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={task.status}
              disabled={statusLocked}
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
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
              {!isCreator && task.status === "done" && (
                <option value="done" disabled>
                  done
                </option>
              )}
            </select>
            {task.assignmentDocumentId && (
              <button
                onClick={async () => {
                  const url = await getDocUrl({ taskId: task._id });
                  if (url) window.open(url, "_blank");
                }}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                title="Download initial attachment"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
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
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              title={expanded ? "Hide thread" : "View thread"}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {expanded && <TaskThread taskId={task._id} taskStatus={task.status} />}
    </div>
  );
}

function TaskThread({
  taskId,
  taskStatus,
}: {
  taskId: Id<"tasks">;
  taskStatus: string;
}) {
  const messages = useQuery(api.tasks.listTaskMessages, { taskId });
  const addMessage = useMutation(api.tasks.addTaskMessage);
  const getMessageFileUrl = useMutation(api.tasks.getMessageFileUrl);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!body.trim() && !file) {
      toast.error("Add a message or attach a file");
      return;
    }

    setSending(true);
    try {
      let storageId: Id<"_storage"> | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;

      if (file) {
        const url = await generateUploadUrl();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const uploaded = await res.json();
        storageId = uploaded.storageId;
        fileName = file.name;
        fileSize = file.size;
      }

      await addMessage({
        taskId,
        body: body.trim() || undefined,
        storageId,
        fileName,
        fileSize,
      });

      setBody("");
      setFile(null);
      toast.success("Message sent");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t bg-slate-50/50">
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {messages === undefined ? (
          <p className="text-sm text-slate-500 text-center py-4">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className="bg-white border rounded-lg p-3 text-sm"
            >
              <div className="flex justify-between items-baseline gap-2 mb-1">
                <span className="font-medium text-slate-800">
                  {msg.authorName}
                </span>
                <span className="text-xs text-slate-400 shrink-0">
                  {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                </span>
              </div>
              {msg.body && (
                <p className="text-slate-700 whitespace-pre-wrap">{msg.body}</p>
              )}
              {msg.storageId && (
                <button
                  onClick={async () => {
                    const url = await getMessageFileUrl({ messageId: msg._id });
                    if (url) window.open(url, "_blank");
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                >
                  <Paperclip className="w-3 h-3" />
                  {msg.fileName ?? "Attachment"}
                  {msg.fileSize != null &&
                    ` · ${(msg.fileSize / 1024).toFixed(1)} KB`}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {taskStatus !== "done" ? (
        <div className="p-4 border-t bg-white space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a reply…"
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[72px] resize-y"
          />
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
              <Paperclip className="w-4 h-4" />
              {file ? file.name : "Attach file"}
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              onClick={handleSend}
              disabled={sending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white hover:bg-green-800 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      ) : (
        <p className="p-4 border-t text-sm text-slate-500 text-center bg-white">
          This task is complete. The assigner can reopen it to continue the
          thread.
        </p>
      )}
    </div>
  );
}

function SendFilePanel() {
  const me = useQuery(api.users.current);
  const uploadTypes = useQuery(api.stateSubmissions.listUploadTypes);
  const recipients = useQuery(api.files.listRecipients);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const generateStateUploadUrl = useMutation(
    api.stateSubmissions.generateUploadUrl
  );
  const addToInbox = useMutation(api.files.addToInbox);
  const submitStateDoc = useMutation(api.stateSubmissions.submit);

  const [fileType, setFileType] = useState<MemberUploadType>("structure");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const isStateDoc = fileType !== "other";
  const needsState = isStateDoc && !me?.assignedState;

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Attach a file");
      return;
    }

    if (isStateDoc) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("State documents must be PDF files");
        return;
      }
      if (needsState) {
        toast.error("You need an assigned state for this document type");
        return;
      }

      setSending(true);
      try {
        const url = await generateStateUploadUrl();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/pdf" },
          body: file,
        });
        const { storageId } = await res.json();
        await submitStateDoc({
          type: fileType,
          storageId,
          fileName: file.name,
          fileSize: file.size,
          notes: description.trim() || undefined,
        });
        toast.success("Document submitted to your state");
        setDescription("");
        setFile(null);
      } catch (err: any) {
        toast.error(err.message ?? "Failed to submit document");
      } finally {
        setSending(false);
      }
      return;
    }

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!recipientId) {
      toast.error("Select who to send this to");
      return;
    }

    setSending(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      await addToInbox({
        title: title.trim(),
        description: description.trim() || undefined,
        storageId,
        fileName: file.name,
        fileSize: file.size,
        recipientId: recipientId as Id<"users">,
      });
      toast.success("File sent");
      setTitle("");
      setDescription("");
      setRecipientId("");
      setFile(null);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send file");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-6 max-w-lg space-y-4">
      <div>
        <h2 className="font-semibold">Send a file</h2>
        <p className="text-sm text-slate-600 mt-1">
          Choose a document type. State structure and strategy PDFs are filed
          under your state for admin review. Other files go to a specific admin.
        </p>
      </div>

      <Field label="File type">
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value as MemberUploadType)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          {(uploadTypes ?? ["structure", "strategy", "other"]).map((t) => (
            <option key={t} value={t}>
              {MEMBER_UPLOAD_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {fileType === "publicity" && (
          <p className="text-xs text-amber-600 mt-1">
            Publicity files are only visible to the Owner and emails listed in{" "}
            <code className="bg-slate-100 px-1 rounded">
              PUBLICITY_VIEWER_EMAILS
            </code>
            .
          </p>
        )}
        {needsState && (
          <p className="text-xs text-red-600 mt-1">
            Your account needs an assigned state for this document type.
          </p>
        )}
      </Field>

      {!isStateDoc && (
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="What is this file about?"
          />
        </Field>
      )}

      <Field label={isStateDoc ? "Notes (optional)" : "Description"}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
          placeholder={
            isStateDoc
              ? "Optional notes for reviewers…"
              : "Optional context for the recipient"
          }
        />
      </Field>

      {!isStateDoc && (
        <Field label="Send to">
          <select
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            disabled={!recipients || recipients.length === 0}
          >
            <option value="">
              {recipients && recipients.length === 0
                ? "No available recipients"
                : "Select a recipient…"}
            </option>
            {(recipients ?? []).map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
                {r.orgTitle ? ` (${r.orgTitle})` : ""}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Attachment">
        <input
          type="file"
          accept={isStateDoc ? ".pdf,application/pdf" : undefined}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm w-full"
        />
        {isStateDoc && (
          <p className="text-xs text-slate-500 mt-1">PDF only for state documents.</p>
        )}
      </Field>

      <button
        onClick={handleSubmit}
        disabled={sending || needsState}
        className="w-full px-4 py-2.5 bg-green-700 text-white hover:bg-green-800 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Upload className="w-4 h-4" />
        {sending
          ? "Sending…"
          : isStateDoc
            ? "Submit document"
            : "Send file"}
      </button>
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
  const getFileUrl = useMutation(api.files.getFileUrl);
  const archive = useMutation(api.files.archiveInboxItem);

  if (inbox.length === 0) {
    return (
      <p className="text-center text-slate-500 text-sm py-16 bg-white rounded-xl border">
        Inbox is empty.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {inbox.map((item) => (
        <div key={item._id} className="bg-white border rounded-xl p-4">
          <div className="flex flex-wrap gap-3 justify-between items-start">
            <div className="flex items-start gap-3 min-w-0">
              <Inbox className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-slate-600 mt-0.5">
                    {item.description}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  From {item.senderName} · {item.fileName} ·{" "}
                  {(item.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
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
                className="text-sm px-3 py-1.5 bg-green-700 text-white hover:bg-green-800 rounded-lg"
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
        </div>
      ))}
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
            className="px-4 py-2 text-sm bg-green-700 text-white hover:bg-green-800 rounded-lg disabled:opacity-50"
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
