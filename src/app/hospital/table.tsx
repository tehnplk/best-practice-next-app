"use client";

import type { HospitalRow } from "@/db/schema";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteHospital, upsertHospital } from "./actions";

type EditableRow = {
  id?: number;
  name: string;
};

// Conver DB row to editable format
function toEditable(row: HospitalRow): EditableRow {
  return {
    id: row.id,
    name: row.name,
  };
}

// Dialog for Adding or Editing
function HospitalDialog({
  open,
  disabled,
  draft,
  onChangeDraft,
  onCancel,
  onSave,
  mode
}: {
  open: boolean;
  disabled: boolean;
  draft: EditableRow;
  onChangeDraft: (next: EditableRow | ((prev: EditableRow) => EditableRow)) => void;
  onCancel: () => void;
  onSave: () => void;
  mode: "add" | "edit";
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">
              {mode === "add" ? "Add Hospital" : "Edit Hospital"}
            </h3>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
            disabled={disabled}
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="hospital-name">
              Hospital Name
            </label>
            <input
              id="hospital-name"
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="e.g. Bangkok Hospital"
              value={draft.name}
              onChange={(e) => onChangeDraft((s) => ({ ...s, name: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
            type="button"
            disabled={disabled}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20 transition-all"
            type="button"
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

// Confirmation Dialog
function ConfirmDeleteDialog({
  open,
  name,
  disabled,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  name: string;
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
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <h3 className="text-base font-semibold text-foreground">Confirm Delete</h3>
        <p className="mt-2 text-sm text-muted break-words">
          Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
            disabled={disabled}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-500/20 transition-all"
            disabled={disabled}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function HospitalTable({
  initialRows,
  initialPage,
  initialTotalPages,
  initialTotal,
  pageSize,
  pageSizeOptions,
  sortBy,
  sortDir,
}: {
  initialRows: HospitalRow[];
  initialPage: number;
  initialTotalPages: number;
  initialTotal: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  sortBy: "createdAt" | "name" | "id";
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [loadedRows, setLoadedRows] = useState<EditableRow[]>(initialRows.map(toEditable));
  const [optimisticRows, setOptimisticRows] = useOptimistic(
    loadedRows,
    (
      state: EditableRow[],
      next:
        | { type: "upsert"; row: EditableRow }
        | { type: "delete"; id: number }
        | { type: "reset"; rows: EditableRow[] }
    ) => {
      // Optimistic Updates Logic
      if (next.type === "reset") return next.rows;
      if (next.type === "delete" && next.id) {
        return state.filter((r) => r.id !== next.id);
      }
      if (next.type === "upsert") {
        if (next.row.id) {
          // Update
          return state.map((r) => (r.id === next.row.id ? next.row : r));
        } else {
          // Insert (Optimistic ID needed if we want to show it, but for list usually we append/prepend)
          // For simplicity, we just fallback to revalidation result, but to show instant feedback we can prepend.
          return [next.row, ...state];
        }
      }
      return state;
    }
  );

  // Sorting
  const [currentSortBy, setCurrentSortBy] = useState<typeof sortBy>(sortBy);
  const [currentSortDir, setCurrentSortDir] = useState<typeof sortDir>(sortDir);

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [draft, setDraft] = useState<EditableRow>({ name: "" });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number; name: string }>({
    open: false,
    name: "",
  });

  // Actions
  function openAdd() {
    setDraft({ name: "" });
    setDialogMode("add");
    setDialogOpen(true);
  }

  function openEdit(row: EditableRow) {
    setDraft({ ...row });
    setDialogMode("edit");
    setDialogOpen(true);
  }

  function requestDelete(row: EditableRow) {
    if (!row.id) return;
    setDeleteConfirm({ open: true, id: row.id, name: row.name });
  }

  async function saveFromDialog() {
    if (!draft.name.trim()) {
      toast.error("Hospital name is required");
      return;
    }

    startTransition(async () => {
      setOptimisticRows({ type: "upsert", row: draft });
      try {
        await upsertHospital(draft);
        setDialogOpen(false);
        toast.success("Saved successfully");
      } catch (e) {
        toast.error("Failed to save");
      }
    });
  }

  async function confirmDelete() {
    const id = deleteConfirm.id;
    if (!id) return;

    startTransition(async () => {
      setOptimisticRows({ type: "delete", id });
      try {
        await deleteHospital({ id });
        toast.success("Deleted successfully");
      } catch (e) {
        toast.error("Failed to delete");
      } finally {
        setDeleteConfirm({ open: false, name: "" });
      }
    });
  }

  // Navigation Logic
  function loadPage(page: number, size?: number) {
    startTransition(() => {
      const p = Math.max(1, page);
      const s = size ?? pageSize;
      router.replace(`?page=${p}&pageSize=${s}&sortBy=${currentSortBy}&sortDir=${currentSortDir}`);
    });
  }

  function toggleSort(col: typeof sortBy) {
    const nextDir = col === currentSortBy && currentSortDir === "asc" ? "desc" : "asc";
    setCurrentSortBy(col);
    setCurrentSortDir(nextDir);
    startTransition(() => {
      router.replace(`?page=1&pageSize=${pageSize}&sortBy=${col}&sortDir=${nextDir}`);
    });
  }

  // Icons
  function SortIcon({ col }: { col: typeof sortBy }) {
    if (col !== currentSortBy) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />;
    return currentSortDir === "asc" ? (
      <ArrowUp className="ml-2 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-2 h-3 w-3" />
    );
  }

  // Pagination UI
  function renderPagination() {
     // reuse simple logic
     const items = [];
     for(let i=1; i<=initialTotalPages; i++) items.push(i);
     // Simplified for brevity, normally reuse complex logic
     // Using a simplified max 5 buttons logic
     let pagesToRender: (number | string)[] = items;
     if(items.length > 7) {
        // ... simple implementation ...
        pagesToRender = [1, "...", initialPage - 1, initialPage, initialPage + 1, "...", initialTotalPages].filter((x, i, a) => {
             if (typeof x === 'number') return x > 0 && x <= initialTotalPages;
             return true;
        });
        // cleanup duplicates/invalid
        pagesToRender = [...new Set(pagesToRender)];
     }

     return (
        <div className="flex items-center gap-2">
            <button 
                disabled={initialPage <= 1 || isPending}
                onClick={() => loadPage(initialPage - 1)}
                className="inline-flex h-8 items-center justify-center rounded border border-border bg-surface px-3 text-sm disabled:opacity-50"
            >
                Prev
            </button>
            <span className="text-sm text-muted">Page {initialPage} of {initialTotalPages}</span>
            <button 
                disabled={initialPage >= initialTotalPages || isPending}
                onClick={() => loadPage(initialPage + 1)}
                className="inline-flex h-8 items-center justify-center rounded border border-border bg-surface px-3 text-sm disabled:opacity-50"
            >
                Next
            </button>
        </div>
     )
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Hospitals</h2>
            <button
                onClick={openAdd}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
            >
                <Plus className="h-4 w-4" /> Add Hospital
            </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <div>Total {initialTotal} records</div>
            <div className="flex items-center gap-4">
                <select 
                    value={pageSize}
                    onChange={(e) => loadPage(1, Number(e.target.value))}
                    className="h-8 rounded border border-border bg-surface px-2 outline-none"
                >
                    {pageSizeOptions.map(opt => <option key={opt} value={opt}>{opt} / page</option>)}
                </select>
                {renderPagination()}
            </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-highlight/50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">
                <button
                  className="flex items-center font-semibold hover:text-foreground"
                  onClick={() => toggleSort("id")}
                >
                  ID <SortIcon col="id" />
                </button>
              </th>
              <th className="px-4 py-3 w-full">
                <button
                  className="flex items-center font-semibold hover:text-foreground"
                  onClick={() => toggleSort("name")}
                >
                  Name <SortIcon col="name" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {optimisticRows.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted">No hospitals found.</td></tr>
            ) : (
                optimisticRows.map((row) => (
                    <tr key={row.id || Math.random()} className="hover:bg-surface-highlight/50">
                        <td className="px-4 py-3 text-muted-foreground">{row.id}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                        <td className="px-4 py-3 flex justify-end gap-2">
                             <button
                                onClick={() => openEdit(row)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-highlight hover:text-primary transition-colors"
                                title="Edit"
                             >
                                <Pencil className="h-4 w-4" />
                             </button>
                             <button
                                onClick={() => requestDelete(row)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-highlight hover:text-red-600 transition-colors"
                                title="Delete"
                             >
                                <Trash2 className="h-4 w-4" />
                             </button>
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <HospitalDialog 
        open={dialogOpen}
        mode={dialogMode}
        draft={draft}
        disabled={isPending}
        onChangeDraft={setDraft}
        onCancel={() => setDialogOpen(false)}
        onSave={saveFromDialog}
      />
      
      <ConfirmDeleteDialog
        open={deleteConfirm.open}
        name={deleteConfirm.name}
        disabled={isPending}
        onCancel={() => setDeleteConfirm({ open: false, name: "" })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
