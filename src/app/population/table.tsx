"use client";

import type { PopulationRow } from "@/db/schema";
import { AlertTriangle, Check, Pencil, Trash2, X } from "lucide-react";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { deletePopulation, upsertPopulation } from "./actions";

type EditableRow = {
  citizenId: string;
  fullName: string;
  gender: "M" | "F" | "O";
  birthDate: string; // yyyy-mm-dd
};

function toEditable(row: PopulationRow): EditableRow {
  const d = new Date(row.birthDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return {
    citizenId: row.citizenId,
    fullName: row.fullName,
    gender: row.gender as EditableRow["gender"],
    birthDate: `${yyyy}-${mm}-${dd}`,
  };
}

function emptyRow(): EditableRow {
  return {
    citizenId: "",
    fullName: "",
    gender: "M",
    birthDate: "",
  };
}

export function PopulationTable({ initialRows }: { initialRows: PopulationRow[] }) {
  const initial = useMemo(() => initialRows.map(toEditable), [initialRows]);
  const [isPending, startTransition] = useTransition();

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    citizenId: string;
  }>({ open: false, citizenId: "" });

  const [optimisticRows, setOptimisticRows] = useOptimistic(
    initial,
    (state: EditableRow[], next: { type: "upsert" | "delete"; row?: EditableRow; citizenId?: string }) => {
      if (next.type === "delete" && next.citizenId) {
        return state.filter((r) => r.citizenId !== next.citizenId);
      }
      if (next.type === "upsert" && next.row) {
        const idx = state.findIndex((r) => r.citizenId === next.row!.citizenId);
        if (idx === -1) return [next.row!, ...state];
        return state.map((r) => (r.citizenId === next.row!.citizenId ? next.row! : r));
      }
      return state;
    }
  );

  const [draft, setDraft] = useState<EditableRow>(() => emptyRow());

  function onSave(row: EditableRow) {
    startTransition(async () => {
      setOptimisticRows({ type: "upsert", row });
      try {
        await upsertPopulation(row);
        toast.success("Saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function requestDelete(citizenId: string) {
    setConfirmDelete({ open: true, citizenId });
  }

  function closeDeleteDialog() {
    setConfirmDelete({ open: false, citizenId: "" });
  }

  function confirmDeleteNow() {
    const citizenId = confirmDelete.citizenId;
    closeDeleteDialog();
    if (citizenId) requestAnimationFrame(() => onDelete(citizenId));
  }

  function onDelete(citizenId: string) {
    startTransition(async () => {
      setOptimisticRows({ type: "delete", citizenId });
      try {
        await deletePopulation({ citizenId });
        toast.success("Deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="Citizen ID (13 digits)"
            name="citizenId"
            value={draft.citizenId}
            onChange={(e) => setDraft((s) => ({ ...s, citizenId: e.target.value }))}
          />
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 md:col-span-2"
            placeholder="Full name"
            name="fullName"
            value={draft.fullName}
            onChange={(e) => setDraft((s) => ({ ...s, fullName: e.target.value }))}
          />
          <select
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            name="gender"
            value={draft.gender}
            onChange={(e) => setDraft((s) => ({ ...s, gender: e.target.value as EditableRow["gender"] }))}
          >
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="O">O</option>
          </select>
          <input
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            type="date"
            name="birthDate"
            value={draft.birthDate}
            onChange={(e) => setDraft((s) => ({ ...s, birthDate: e.target.value }))}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
            disabled={isPending}
            onClick={() => {
              onSave(draft);
              setDraft(emptyRow());
            }}
          >
            Add / Save
          </button>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {isPending ? "Saving..." : ""}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Citizen ID</th>
              <th className="px-4 py-3">Full name</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Birth date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {optimisticRows.map((row) => (
              <Row
                key={row.citizenId}
                row={row}
                disabled={isPending}
                onSave={onSave}
                onRequestDelete={requestDelete}
              />
            ))}
            {optimisticRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400" colSpan={5}>
                  No records.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteDialog
        open={confirmDelete.open}
        citizenId={confirmDelete.citizenId}
        disabled={isPending}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteNow}
      />
    </div>
  );
}

function Row({
  row,
  disabled,
  onSave,
  onRequestDelete,
}: {
  row: EditableRow;
  disabled: boolean;
  onSave: (row: EditableRow) => void;
  onRequestDelete: (citizenId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [local, setLocal] = useState<EditableRow>(row);

  function onStartEdit() {
    setLocal(row);
    setIsEditing(true);
  }

  function onCancel() {
    setLocal(row);
    setIsEditing(false);
  }

  function onCommit() {
    onSave(local);
    setIsEditing(false);
  }

  return (
    <tr className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-900">
      <td className="px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">
        {row.citizenId}
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            name={`fullName-${row.citizenId}`}
            value={local.fullName}
            onChange={(e) => setLocal((s) => ({ ...s, fullName: e.target.value }))}
          />
        ) : (
          <div className="h-9 w-full rounded-md px-1.5 text-sm leading-9 text-zinc-900 dark:text-zinc-50">
            {row.fullName}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <select
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            name={`gender-${row.citizenId}`}
            value={local.gender}
            onChange={(e) => setLocal((s) => ({ ...s, gender: e.target.value as EditableRow["gender"] }))}
          >
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="O">O</option>
          </select>
        ) : (
          <div className="h-9 w-full rounded-md px-1.5 text-sm leading-9 text-zinc-900 dark:text-zinc-50">
            {row.gender}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            type="date"
            name={`birthDate-${row.citizenId}`}
            value={local.birthDate}
            onChange={(e) => setLocal((s) => ({ ...s, birthDate: e.target.value }))}
          />
        ) : (
          <div className="h-9 w-full rounded-md px-1.5 text-sm leading-9 text-zinc-900 dark:text-zinc-50">
            {row.birthDate}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {isEditing ? (
            <>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-50"
                type="button"
                aria-label="Save"
                disabled={disabled}
                onClick={onCommit}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-50"
                type="button"
                aria-label="Cancel"
                disabled={disabled}
                onClick={onCancel}
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-50"
                type="button"
                aria-label="Edit"
                disabled={disabled}
                onClick={onStartEdit}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-600 text-white disabled:opacity-50"
                type="button"
                aria-label="Delete"
                disabled={disabled}
                onClick={() => onRequestDelete(row.citizenId)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function ConfirmDeleteDialog({
  open,
  citizenId,
  disabled,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  citizenId: string;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm delete"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Confirm delete
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Delete citizenId <span className="font-mono">{citizenId}</span>? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-50"
            type="button"
            aria-label="Cancel delete"
            disabled={disabled}
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-50"
            type="button"
            aria-label="Confirm delete"
            disabled={disabled}
            onClick={onConfirm}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
