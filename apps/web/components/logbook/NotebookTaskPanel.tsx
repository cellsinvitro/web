"use client";

/**
 * NotebookTaskPanel
 *
 * Admin view: assign tasks to users; see all tasks with status.
 * User view: see own assigned tasks; mark IN_PROGRESS or COMPLETED.
 */

import { useEffect, useState } from "react";
import {
  fetchNotebookTasks,
  createNotebookTask,
  updateNotebookTask,
  deleteNotebookTask,
  type NotebookTask,
  type NotebookTaskStatus,
} from "@/lib/api";

const STATUS_LABELS: Record<NotebookTaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<NotebookTaskStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CANCELLED: "bg-slate-100 text-slate-500 ring-slate-400/20",
};

type Props = {
  labId?: string;
  isAdmin: boolean;
  currentUserId: string;
  // Users available to assign tasks to (for admin assign form)
  labUsers?: { id: string; name: string | null; email: string }[];
};

export default function NotebookTaskPanel({
  labId,
  isAdmin,
  currentUserId,
  labUsers = [],
}: Props) {
  const [tasks, setTasks] = useState<NotebookTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New task form
  const [showForm, setShowForm] = useState(false);
  const [formAssignee, setFormAssignee] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDue, setFormDue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Complete task modal
  const [completingTask, setCompletingTask] = useState<NotebookTask | null>(null);
  const [completeNote, setCompleteNote] = useState("");
  const [completing, setCompleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fetchNotebookTasks(labId);
      setTasks(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [labId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAssignee) return;
    setSubmitting(true);
    try {
      await createNotebookTask(
        {
          assignedToId: formAssignee,
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          dueDate: formDue || undefined,
        },
        labId,
      );
      setFormTitle(""); setFormDesc(""); setFormDue(""); setFormAssignee(""); setShowForm(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (task: NotebookTask, status: NotebookTaskStatus) => {
    if (status === "COMPLETED") {
      setCompletingTask(task);
      setCompleteNote("");
      return;
    }
    try {
      await updateNotebookTask(task.id, { status });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update task");
    }
  };

  const handleComplete = async () => {
    if (!completingTask) return;
    setCompleting(true);
    try {
      await updateNotebookTask(completingTask.id, {
        status: "COMPLETED",
        completedNote: completeNote.trim() || undefined,
      });
      setCompletingTask(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to complete task");
    } finally {
      setCompleting(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteNotebookTask(taskId);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete task");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Notebook Tasks</h3>
          <p className="text-[11px] text-slate-500">
            {isAdmin ? "Assign and track tasks for lab members" : "Tasks assigned to you"}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" />
            </svg>
            Assign Task
          </button>
        )}
      </div>

      {/* New task form (admin only) */}
      {isAdmin && showForm && (
        <form onSubmit={handleCreate} className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Assign To *</label>
              <select
                required
                value={formAssignee}
                onChange={(e) => setFormAssignee(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="">Select user…</option>
                {labUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ? `${u.name} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Due Date</label>
              <input
                type="date"
                value={formDue}
                onChange={(e) => setFormDue(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600">Task Title *</label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Complete cell viability assay report"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600">Description</label>
            <textarea
              rows={2}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Additional details…"
              className="mt-1 w-full resize-none rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-950 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Assigning…" : "Assign Task"}
            </button>
          </div>
        </form>
      )}

      {/* Task list */}
      <div className="divide-y divide-slate-100">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          </div>
        ) : error ? (
          <div className="px-5 py-4 text-xs text-rose-600">{error}</div>
        ) : tasks.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-slate-400">
            {isAdmin ? "No tasks assigned yet." : "No tasks assigned to you."}
          </div>
        ) : (
          tasks.map((task) => {
            const isAssignee = task.assignedTo.id === currentUserId;
            const canComplete = isAssignee && task.status !== "COMPLETED" && task.status !== "CANCELLED";
            const canChangeInProgress = isAssignee && task.status === "PENDING";

            return (
              <div key={task.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60">
                {/* Status dot */}
                <div className="mt-0.5 shrink-0">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${STATUS_COLORS[task.status]}`}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900">{task.title}</p>
                  {task.description && (
                    <p className="mt-0.5 text-[11px] text-slate-500">{task.description}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                    <span>To: <strong className="text-slate-700">{task.assignedTo.name}</strong></span>
                    {isAdmin && (
                      <span>By: <strong className="text-slate-700">{task.assignedBy.name}</strong></span>
                    )}
                    {task.dueDate && (
                      <span>Due: <strong className="text-slate-700">{new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</strong></span>
                    )}
                    {task.completedAt && (
                      <span className="text-emerald-600">
                        Completed {new Date(task.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                  {task.completedNote && (
                    <p className="mt-1 text-[11px] italic text-slate-500">"{task.completedNote}"</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {canChangeInProgress && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(task, "IN_PROGRESS")}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Start
                    </button>
                  )}
                  {canComplete && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(task, "COMPLETED")}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Complete
                    </button>
                  )}
                  {isAdmin && task.status !== "CANCELLED" && task.status !== "COMPLETED" && (
                    <button
                      type="button"
                      onClick={() => handleDelete(task.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete task"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Complete task modal */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900">Mark as Completed</h3>
            <p className="mt-1 text-xs text-slate-600">"{completingTask.title}"</p>
            <div className="mt-4">
              <label className="block text-[11px] font-semibold text-slate-600">
                Completion Note (optional)
              </label>
              <textarea
                rows={3}
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                placeholder="Add a note about completion…"
                className="mt-1 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setCompletingTask(null)}
                className="flex-1 rounded-xl border border-slate-300 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={completing}
                className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {completing ? "Saving…" : "Mark Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
