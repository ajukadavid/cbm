"use client";
// @ts-nocheck

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { toast } from "sonner";
import { isAdminTier } from "@/lib/roles";
import { theme } from "@/lib/theme";
import { Megaphone, Pin, Plus, Trash2, Pencil, Paperclip, Download } from "lucide-react";

export default function AnnouncementsPage() {
  const announcements = useQuery(api.announcements.list);
  const currentUser = useQuery(api.users.current);
  const canPost = currentUser ? isAdminTier(currentUser.role) : false;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-slate-600 text-sm mt-1">
            {canPost
              ? "Broadcast information visible to everyone in the workspace."
              : "Updates from your admins."}
          </p>
        </div>
        {canPost && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${theme.btnPrimary}`}
          >
            <Plus className="w-4 h-4" />
            Post announcement
          </button>
        )}
      </div>

      {!announcements?.length ? (
        <div className="text-center py-16 bg-white rounded-xl border text-slate-500">
          <Megaphone className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No announcements yet.
          {canPost ? " Be the first to post." : ""}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <AnnouncementCard
              key={a._id}
              item={a}
              canEdit={
                !!currentUser &&
                (a.createdBy === currentUser._id ||
                  isAdminTier(currentUser.role))
              }
              onEdit={() => {
                setEditing(a);
                setShowForm(true);
              }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <AnnouncementForm
          editing={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function AnnouncementCard({
  item,
  canEdit,
  onEdit,
}: {
  item: any;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const remove = useMutation(api.announcements.remove);
  const markRead = useMutation(api.announcements.markRead);
  const getAttachmentUrl = useMutation(api.announcements.getAttachmentUrl);

  const handleOpen = async () => {
    if (!item.isRead) {
      try {
        await markRead({ announcementId: item._id });
      } catch {
        // Non-blocking if mark-read fails.
      }
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handleOpen();
    const url = await getAttachmentUrl({ announcementId: item._id });
    if (url) window.open(url, "_blank");
  };

  return (
    <article
      onClick={handleOpen}
      className={`bg-white rounded-xl border p-5 cursor-pointer transition-shadow hover:shadow-md ${
        item.isPinned ? "ring-2 ring-amber-200" : ""
      } ${!item.isRead ? "border-l-4 border-l-red-500 bg-red-50/30" : ""}`}
    >
      <div className="flex justify-between gap-3 items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {item.isPinned && <Pin className="w-4 h-4 text-amber-500" />}
            {!item.isRead && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                New
              </span>
            )}
            <h2 className="font-semibold text-lg">{item.title}</h2>
          </div>
          <p className="text-slate-600 mt-2 whitespace-pre-wrap">{item.body}</p>
          {item.attachmentFileName && (
            <button
              onClick={handleDownload}
              className="mt-3 inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border border-green-200 rounded-lg hover:bg-green-50 text-green-800"
            >
              <Paperclip className="w-4 h-4" />
              {item.attachmentFileName}
              <Download className="w-3.5 h-3.5 opacity-60" />
            </button>
          )}
          <p className="text-xs text-slate-400 mt-3">
            {item.createdByName} ·{" "}
            {format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onEdit}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                if (!confirm("Delete announcement?")) return;
                try {
                  await remove({ announcementId: item._id });
                  toast.success("Deleted");
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function AnnouncementForm({
  editing,
  onClose,
}: {
  editing: any;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [isPinned, setIsPinned] = useState(editing?.isPinned ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [saving, setSaving] = useState(false);

  const create = useMutation(api.announcements.create);
  const update = useMutation(api.announcements.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      let attachmentStorageId: Id<"_storage"> | undefined;
      let attachmentFileName: string | undefined;

      if (file) {
        const url = await generateUploadUrl();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        const { storageId } = await res.json();
        attachmentStorageId = storageId;
        attachmentFileName = file.name;
      }

      if (editing) {
        await update({
          announcementId: editing._id as Id<"announcements">,
          title: title.trim(),
          body: body.trim(),
          isPinned,
          attachmentStorageId,
          attachmentFileName,
          removeAttachment: removeAttachment && !file,
        });
        toast.success("Updated");
      } else {
        await create({
          title: title.trim(),
          body: body.trim(),
          isPinned,
          attachmentStorageId,
          attachmentFileName,
        });
        toast.success("Posted");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const showExistingAttachment =
    editing?.attachmentFileName && !removeAttachment && !file;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">
          {editing ? "Edit announcement" : "New announcement"}
        </h2>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message for everyone…"
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px]"
          />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Attachment (optional)
            </label>
            {showExistingAttachment && (
              <div className="flex items-center justify-between text-sm border rounded-lg px-3 py-2 mb-2 bg-slate-50">
                <span className="truncate">{editing.attachmentFileName}</span>
                <button
                  type="button"
                  onClick={() => setRemoveAttachment(true)}
                  className="text-xs text-red-600 hover:underline shrink-0 ml-2"
                >
                  Remove
                </button>
              </div>
            )}
            <input
              type="file"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setRemoveAttachment(false);
              }}
              className="text-sm w-full"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
            />
            Pin to top
          </label>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 ${theme.btnPrimary}`}
          >
            {saving ? "Saving…" : editing ? "Save" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
