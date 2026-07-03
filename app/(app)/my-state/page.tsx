"use client";
// @ts-nocheck

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  MEMBER_UPLOAD_TYPE_LABELS,
  type MemberUploadType,
} from "@/lib/stateSubmissions";
import { stateLabel } from "@/lib/states";
import { Upload, FileText, Download } from "lucide-react";

export default function MyStatePage() {
  const user = useQuery(api.users.current);
  const uploadTypes = useQuery(api.stateSubmissions.listUploadTypes);
  const submissions = useQuery(api.stateSubmissions.listMine);
  const generateUploadUrl = useMutation(api.stateSubmissions.generateUploadUrl);
  const submit = useMutation(api.stateSubmissions.submit);
  const getFileUrl = useMutation(api.stateSubmissions.getFileUrl);

  const [fileType, setFileType] = useState<MemberUploadType>("structure");
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");

  if (user === undefined) {
    return <p className="text-slate-500 text-sm">Loading…</p>;
  }

  if (!user?.assignedState) {
    return (
      <div className="text-center py-16 text-slate-500 bg-white rounded-xl border">
        Your account does not have an assigned state yet. Contact an admin if
        this looks wrong.
      </div>
    );
  }

  const stateTypes =
    uploadTypes?.filter((t) => t !== "other") ?? ["structure", "strategy"];

  const handleUpload = async (file: File) => {
    if (fileType === "other") return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted");
      return;
    }
    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });
      const { storageId } = await res.json();
      await submit({
        type: fileType,
        storageId,
        fileName: file.name,
        fileSize: file.size,
        notes: notes.trim() || undefined,
      });
      toast.success("Document submitted");
      setNotes("");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My State</h1>
        <p className="text-slate-600 text-sm mt-1">
          {stateLabel(user.assignedState)} — upload state documents for admin
          review.
        </p>
      </div>

      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold">Upload document</h2>
        <p className="text-sm text-slate-600">
          Choose the document type and upload a PDF. Admins can filter by type
          when viewing your state.
          {fileType === "publicity" && (
            <span className="block text-amber-600 mt-1">
              Publicity files are only visible to the Owner and designated
              reviewers.
            </span>
          )}
        </p>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Document type
          </label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value as MemberUploadType)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {stateTypes.map((t) => (
              <option key={t} value={t}>
                {MEMBER_UPLOAD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for reviewers…"
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px]"
        />

        <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer hover:bg-slate-50">
          <Upload className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-600">
            {uploading ? "Uploading…" : "Choose PDF to upload"}
          </span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-4">Your submissions</h2>
        {!submissions?.length ? (
          <p className="text-sm text-slate-500">No documents submitted yet.</p>
        ) : (
          <ul className="space-y-3">
            {submissions.map((s) => (
              <li
                key={s._id}
                className="flex flex-wrap gap-3 justify-between items-center border-b pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-sm">{s.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {MEMBER_UPLOAD_TYPE_LABELS[s.type]} ·{" "}
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                    {s.notes && (
                      <p className="text-xs text-slate-600 mt-0.5">{s.notes}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const url = await getFileUrl({ submissionId: s._id });
                    if (url) window.open(url, "_blank");
                  }}
                  className="flex items-center gap-1 text-sm px-3 py-1.5 border rounded-lg hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" />
                  View
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
