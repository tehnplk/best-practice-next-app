"use client";

import type { PopulationRow } from "@/db/schema";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useMemo, useOptimistic, useState, useTransition } from "react";
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
      await upsertPopulation(row);
    });
  }

  function onDelete(citizenId: string) {
    startTransition(async () => {
      setOptimisticRows({ type: "delete", citizenId });
      await deletePopulation({ citizenId });
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
                onDelete={onDelete}
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
    </div>
  );
}

function Row({
  row,
  disabled,
  onSave,
  onDelete,
}: {
  row: EditableRow;
  disabled: boolean;
  onSave: (row: EditableRow) => void;
  onDelete: (citizenId: string) => void;
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
                onClick={() => onDelete(row.citizenId)}
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
