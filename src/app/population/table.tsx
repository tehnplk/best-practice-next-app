"use client";

import type { PopulationRow } from "@/db/schema";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Fragment, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deletePopulation, getHospitalAdmissionsByCid, upsertPopulation } from "./actions";

type AdmissionRow = {
  id: number;
  cid: string;
  admissionDate: number;
  hospitalName: string;
};

type EditableRow = {
  cid: string;
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
    cid: row.cid,
    fullName: row.fullName,
    gender: row.gender as EditableRow["gender"],
    birthDate: `${yyyy}-${mm}-${dd}`,
  };
}

function AddPopulationDialog({
  open,
  disabled,
  draft,
  onChangeDraft,
  onCancel,
  onSave,
}: {
  open: boolean;
  disabled: boolean;
  draft: EditableRow;
  onChangeDraft: (next: EditableRow | ((prev: EditableRow) => EditableRow)) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add population"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Add / Save</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Create a new population record.</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-50"
            aria-label="Close"
            disabled={disabled}
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300" htmlFor="add-cid">
              CID (13 digits)
            </label>
            <input
              id="add-cid"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="1234567890123"
              value={draft.cid}
              onChange={(e) => onChangeDraft((s) => ({ ...s, cid: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300" htmlFor="add-gender">
              Gender
            </label>
            <select
              id="add-gender"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              value={draft.gender}
              onChange={(e) => onChangeDraft((s) => ({ ...s, gender: e.target.value as EditableRow["gender"] }))}
            >
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="O">O</option>
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300" htmlFor="add-fullname">
              Full name
            </label>
            <input
              id="add-fullname"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="Full name"
              value={draft.fullName}
              onChange={(e) => onChangeDraft((s) => ({ ...s, fullName: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300" htmlFor="add-birthdate">
              Birth date
            </label>
            <input
              id="add-birthdate"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              type="date"
              value={draft.birthDate}
              onChange={(e) => onChangeDraft((s) => ({ ...s, birthDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-50"
            type="button"
            aria-label="Cancel"
            disabled={disabled}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
            type="button"
            aria-label="Save"
            disabled={disabled}
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function emptyRow(): EditableRow {
  return {
    cid: "",
    fullName: "",
    gender: "M",
    birthDate: "",
  };
}

function isValidCitizenId(value: string) {
  return /^\d{13}$/.test(value);
}

function isNonEmpty(value: string) {
  return value.trim().length > 0;
}

function mergeRowsByCitizenId(existing: EditableRow[], incoming: EditableRow[]) {
  const map = new Map<string, EditableRow>();
  for (const r of existing) map.set(r.cid, r);
  for (const r of incoming) map.set(r.cid, r);
  return Array.from(map.values());
}

export function PopulationTable({
  initialRows,
  initialPage,
  initialTotalPages,
  initialTotal,
  pageSize,
  pageSizeOptions,
  sortBy,
  sortDir,
}: {
  initialRows: PopulationRow[];
  initialPage: number;
  initialTotalPages: number;
  initialTotal: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  sortBy: "createdAt" | "cid" | "fullName" | "gender" | "birthDate";
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();

  const initial = initialRows.map(toEditable);
  const [isPending, startTransition] = useTransition();

  const [page, setPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);
  const [total, setTotal] = useState<number>(initialTotal);
  const [size, setSize] = useState<number>(pageSize);
  const [loadedRows, setLoadedRows] = useState<EditableRow[]>(initial);

  const [currentSortBy, setCurrentSortBy] = useState<
    "createdAt" | "cid" | "fullName" | "gender" | "birthDate"
  >(sortBy);
  const [currentSortDir, setCurrentSortDir] = useState<"asc" | "desc">(sortDir);

  const [expandedCid, setExpandedCid] = useState<string | null>(null);
  const [loadingCid, setLoadingCid] = useState<string | null>(null);
  const [admissionsByCid, setAdmissionsByCid] = useState<Record<string, AdmissionRow[]>>({});

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    cid: string;
  }>({ open: false, cid: "" });

  const [optimisticRows, setOptimisticRows] = useOptimistic(
    loadedRows,
    (
      state: EditableRow[],
      next:
        | { type: "upsert"; row: EditableRow }
        | { type: "delete"; cid: string }
        | { type: "reset"; rows: EditableRow[] }
    ) => {
      if (next.type === "reset") return next.rows;
      if (next.type === "delete" && next.cid) {
        return state.filter((r) => r.cid !== next.cid);
      }
      if (next.type === "upsert") {
        const idx = state.findIndex((r) => r.cid === next.row.cid);
        if (idx === -1) return [next.row, ...state];
        return state.map((r) => (r.cid === next.row.cid ? next.row : r));
      }
      return state;
    }
  );

  const [draft, setDraft] = useState<EditableRow>(() => emptyRow());
  const [addOpen, setAddOpen] = useState(false);

  function formatAdmissionDate(value: AdmissionRow["admissionDate"]) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  }

  function toggleExpand(cid: string) {
    startTransition(async () => {
      if (expandedCid === cid) {
        setExpandedCid(null);
        return;
      }

      setExpandedCid(cid);
      if (admissionsByCid[cid]) return;

      setLoadingCid(cid);
      try {
        const res = await getHospitalAdmissionsByCid({ cid });
        setAdmissionsByCid((prev) => ({ ...prev, [cid]: res.rows }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Load admission history failed");
      } finally {
        setLoadingCid((cur) => (cur === cid ? null : cur));
      }
    });
  }

  function saveRow(row: EditableRow) {
    startTransition(async () => {
      setOptimisticRows({ type: "upsert", row });
      try {
        await upsertPopulation(row);
        setLoadedRows((prev) => mergeRowsByCitizenId(prev, [row]));
        toast.success("Saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function openAddModal() {
    setDraft(emptyRow());
    setAddOpen(true);
  }

  function closeAddModal() {
    setAddOpen(false);
  }

  async function saveDraftFromModal() {
    const errors: string[] = [];

    if (!isNonEmpty(draft.cid)) {
      errors.push("Citizen ID is required");
    } else if (!isValidCitizenId(draft.cid)) {
      errors.push("Citizen ID ต้องมี 13 หลัก");
    }

    if (!isNonEmpty(draft.fullName)) {
      errors.push("Full name is required");
    }

    if (!isNonEmpty(draft.birthDate)) {
      errors.push("Birth date is required");
    }

    if (errors.length > 0) {
      toast.error(
        <div className="space-y-1">
          <div className="font-medium">Please fix the following:</div>
          <ul className="list-inside list-disc">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      );
      return;
    }

    const row = { ...draft };
    setOptimisticRows({ type: "upsert", row });
    try {
      await upsertPopulation(row);
      setLoadedRows((prev) => mergeRowsByCitizenId(prev, [row]));
      setDraft(emptyRow());
      toast.success("Saved");
      closeAddModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  function requestDelete(citizenId: string) {
    setConfirmDelete({ open: true, cid: citizenId });
  }

  function closeDeleteDialog() {
    setConfirmDelete({ open: false, cid: "" });
  }

  function confirmDeleteNow() {
    const citizenId = confirmDelete.cid;
    closeDeleteDialog();
    if (citizenId) requestAnimationFrame(() => onDelete(citizenId));
  }

  function onDelete(citizenId: string) {
    startTransition(async () => {
      setOptimisticRows({ type: "delete", cid: citizenId });
      try {
        await deletePopulation({ cid: citizenId });
        setLoadedRows((prev) => prev.filter((r) => r.cid !== citizenId));
        toast.success("Deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  function loadPage(targetPage: number, targetSize?: number) {
    const nextSize = targetSize ?? size;
    const target = Math.max(1, targetPage);
    startTransition(() => {
      const search = new URLSearchParams();
      search.set("page", String(target));
      search.set("pageSize", String(nextSize));
      search.set("sortBy", currentSortBy);
      search.set("sortDir", currentSortDir);
      router.replace(`/population?${search.toString()}`);
    });
  }

  function setSort(nextSortBy: "createdAt" | "cid" | "fullName" | "gender" | "birthDate") {
    const nextDir = nextSortBy === currentSortBy ? (currentSortDir === "asc" ? "desc" : "asc") : "asc";
    setCurrentSortBy(nextSortBy);
    setCurrentSortDir(nextDir);

    startTransition(() => {
      const search = new URLSearchParams();
      search.set("page", "1");
      search.set("pageSize", String(size));
      search.set("sortBy", nextSortBy);
      search.set("sortDir", nextDir);
      router.replace(`/population?${search.toString()}`);
    });
  }

  function SortIcon({ column }: { column: typeof currentSortBy }) {
    if (currentSortBy !== column) return <ArrowUpDown className="h-3.5 w-3.5" />;
    return currentSortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  }

  function onChangePageSize(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextSize = Number(event.target.value) || pageSize;
    loadPage(1, nextSize);
  }

  function renderPagination() {
    const items: (number | "ellipsis")[] = [];
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      const first = 1;
      const last = totalPages;
      const start = Math.max(first + 1, page - 1);
      const end = Math.min(last - 1, page + 1);
      items.push(first);
      if (start > first + 1) items.push("ellipsis");
      for (let i = start; i <= end; i++) items.push(i);
      if (end < last - 1) items.push("ellipsis");
      items.push(last);
    }

    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          Page {page} of {totalPages} · {total} rows · {size} per page
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-2 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            disabled={page <= 1 || isPending}
            onClick={() => loadPage(page - 1)}
          >
            Prev
          </button>
          {items.map((it, idx) =>
            it === "ellipsis" ? (
              <span key={`e-${idx}`} className="px-1 text-zinc-500">
                …
              </span>
            ) : (
              <button
                key={it}
                type="button"
                className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium ${
                  it === page
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                }`}
                disabled={isPending}
                onClick={() => loadPage(it)}
              >
                {it}
              </button>
            )
          )}
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-2 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            disabled={page >= totalPages || isPending}
            onClick={() => loadPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Population</div>
          <div className="ml-auto flex items-center justify-end gap-4 text-sm">
            {renderPagination()}
            <div className="flex items-center gap-2">
              <label htmlFor="page-size" className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                Rows per page
              </label>
              <select
                id="page-size"
                className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
                value={size}
                disabled={isPending}
                onChange={onChangePageSize}
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
            disabled={isPending}
            onClick={openAddModal}
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
              <th className="px-4 py-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2"
                  disabled={isPending}
                  onClick={() => setSort("cid")}
                >
                  Citizen ID
                  <SortIcon column="cid" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2"
                  disabled={isPending}
                  onClick={() => setSort("fullName")}
                >
                  Full name
                  <SortIcon column="fullName" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2"
                  disabled={isPending}
                  onClick={() => setSort("gender")}
                >
                  Gender
                  <SortIcon column="gender" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2"
                  disabled={isPending}
                  onClick={() => setSort("birthDate")}
                >
                  Birth date
                  <SortIcon column="birthDate" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {optimisticRows.map((row) => (
              <Fragment key={row.cid}>
                <Row
                  row={row}
                  disabled={isPending}
                  expanded={expandedCid === row.cid}
                  onToggleExpand={toggleExpand}
                  onSave={saveRow}
                  onRequestDelete={requestDelete}
                />
                {expandedCid === row.cid ? (
                  <tr className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-900">
                    <td className="px-4 py-3" colSpan={5}>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/20">
                        {loadingCid === row.cid ? (
                          <div className="text-zinc-600 dark:text-zinc-400">Loading admission history...</div>
                        ) : (admissionsByCid[row.cid] ?? []).length === 0 ? (
                          <div className="text-zinc-600 dark:text-zinc-400">No admission history.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                                <tr>
                                  <th className="px-3 py-2">Admission date</th>
                                  <th className="px-3 py-2">Hospital</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(admissionsByCid[row.cid] ?? []).map((a) => (
                                  <tr key={a.id} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-900">
                                    <td className="px-3 py-2 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                                      {formatAdmissionDate(a.admissionDate)}
                                    </td>
                                    <td className="px-3 py-2 text-zinc-900 dark:text-zinc-50">{a.hospitalName}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
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
        cid={confirmDelete.cid}
        disabled={isPending}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteNow}
      />

      <AddPopulationDialog
        open={addOpen}
        disabled={isPending}
        draft={draft}
        onChangeDraft={setDraft}
        onCancel={closeAddModal}
        onSave={() => {
          startTransition(async () => {
            await saveDraftFromModal();
          });
        }}
      />
    </div>
  );
}

function Row({
  row,
  disabled,
  expanded,
  onToggleExpand,
  onSave,
  onRequestDelete,
}: {
  row: EditableRow;
  disabled: boolean;
  expanded: boolean;
  onToggleExpand: (cid: string) => void;
  onSave: (row: EditableRow) => void;
  onRequestDelete: (cid: string) => void;
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
        <button
          type="button"
          className="inline-flex items-center gap-2 hover:underline"
          onClick={() => onToggleExpand(row.cid)}
          disabled={disabled}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {row.cid}
        </button>
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            name={`fullName-${row.cid}`}
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
            name={`gender-${row.cid}`}
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
            name={`birthDate-${row.cid}`}
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
                onClick={() => onRequestDelete(row.cid)}
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
  cid,
  disabled,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  cid: string;
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
              Delete cid <span className="font-mono">{cid}</span>? This action cannot be undone.
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
