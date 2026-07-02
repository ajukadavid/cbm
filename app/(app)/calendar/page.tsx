"use client";
// @ts-nocheck

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { toast } from "sonner";
import { formatUserName } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"calendar_events"> | null>(null);

  const events = useQuery(api.calendar.listMyEvents, {});
  const users = useQuery(api.users.listUsers);
  const deleteEvent = useMutation(api.calendar.deleteEvent);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = useMemo(
    () =>
      (events ?? []).filter((e) => {
        const end = e.endDate ?? e.date;
        return selectedDateStr >= e.date && selectedDateStr <= end;
      }),
    [events, selectedDateStr]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events ?? []) {
      const start = new Date(e.date);
      const end = new Date(e.endDate ?? e.date);
      for (let d = start; d <= end; d = addDays(d, 1)) {
        const key = format(d, "yyyy-MM-dd");
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return map;
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">My Calendar</h1>
          <p className="text-slate-600 text-sm mt-1">
            Your events plus meetings you&apos;re invited to.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" />
          Add event
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCursor(addDays(monthStart, -1))}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold">{format(cursor, "MMMM yyyy")}</h2>
            <button
              onClick={() => setCursor(addDays(monthEnd, 1))}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const count = eventsByDay.get(key) ?? 0;
              const selected = isSameDay(day, selectedDate);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-center ${
                    selected ? "bg-slate-900 text-white" : "hover:bg-slate-100"
                  }`}
                >
                  {format(day, "d")}
                  {count > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        selected ? "bg-white" : "bg-blue-500"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold mb-4">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h2>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No events this day.</p>
          ) : (
            <ul className="space-y-3">
              {dayEvents.map((e) => (
                <li key={e._id} className="border rounded-lg p-3">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-medium">{e.title}</p>
                      <p className="text-sm text-slate-500">
                        {e.startTime} – {e.endTime}
                      </p>
                      {e.description && (
                        <p className="text-sm text-slate-600 mt-1">{e.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(e._id);
                          setShowForm(true);
                        }}
                        className="text-xs px-2 py-1 border rounded hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("Delete event?")) return;
                          try {
                            await deleteEvent({ eventId: e._id });
                            toast.success("Deleted");
                          } catch (err: any) {
                            toast.error(err.message);
                          }
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showForm && (
        <EventFormDialog
          users={users ?? []}
          editingId={editingId}
          events={events ?? []}
          defaultDate={selectedDateStr}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

function EventFormDialog({
  users,
  editingId,
  events,
  defaultDate,
  onClose,
}: {
  users: any[];
  editingId: Id<"calendar_events"> | null;
  events: any[];
  defaultDate: string;
  onClose: () => void;
}) {
  const existing = editingId ? events.find((e) => e._id === editingId) : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [date, setDate] = useState(existing?.date ?? defaultDate);
  const [startTime, setStartTime] = useState(existing?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "10:00");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [participants, setParticipants] = useState<Set<string>>(
    new Set(existing?.participantIds ?? [])
  );
  const [saving, setSaving] = useState(false);

  const createEvent = useMutation(api.calendar.createEvent);
  const updateEvent = useMutation(api.calendar.updateEvent);

  const toggleParticipant = (id: string) => {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        date,
        startTime,
        endTime,
        description: description.trim() || undefined,
        participantIds: Array.from(participants) as Id<"users">[],
      };
      if (editingId) {
        await updateEvent({ eventId: editingId, ...payload });
        toast.success("Event updated");
      } else {
        await createEvent(payload);
        toast.success("Event created");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">
          {editingId ? "Edit event" : "New event"}
        </h2>
        <div className="space-y-3">
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px]"
          />
          <div>
            <p className="text-sm font-medium mb-2">Invite participants</p>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
              {users.map((u) => (
                <label key={u._id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={participants.has(u._id)}
                    onChange={() => toggleParticipant(u._id)}
                  />
                  {formatUserName(u)}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
