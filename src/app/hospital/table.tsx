"use client";

import { Modal } from "@/components/modal";

import type { HospitalRow } from "@/db/schema";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
  MoreHorizontal,
} from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteHospital, upsertHospital } from "./actions";

type EditableRow = {
  id?: number;
  name: string;
  city?: string | null;
};

// Conver DB row to editable format
function toEditable(row: HospitalRow): EditableRow {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
  };
}

// Dialog for Adding Only
function AddHospitalDialog({
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
  return (
    <Modal
      open={open}
      onClose={onCancel}
      className="max-w-md"
    >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">
              Add Hospital
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
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="hospital-city">
              City
            </label>
            <input
              id="hospital-city"
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="e.g. Bangkok"
              value={draft.city || ""}
              onChange={(e) => onChangeDraft((s) => ({ ...s, city: e.target.value }))}
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
    </Modal>
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
  return (
    <Modal
      open={open}
      onClose={onCancel}
      className="max-w-sm"
    >
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
    </Modal>
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
          // Insert
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
  const [draft, setDraft] = useState<EditableRow>({ name: "" });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number; name: string }>({
    open: false,
    name: "",
  });

  // Actions
  function openAdd() {
    setDraft({ name: "" });
    setDialogOpen(true);
  }

  function saveRow(row: EditableRow) {
    if (!row.name.trim()) {
      toast.error("Hospital name is required");
      return;
    }
    startTransition(async () => {
        setOptimisticRows({ type: "upsert", row });
        try {
            await upsertHospital(row);
            // Update loaded rows to keep them in sync
            setLoadedRows(prev => {
                if (row.id) {
                    return prev.map(r => r.id === row.id ? row : r);
                }
                return prev;
            });
            toast.success("Saved");
        } catch (e) {
            toast.error("Save failed");
        }
    });
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
        // We might want to reload the list here or append to loadedRows if we knew the ID,
        // but since it's a new row, the revalidatePath in action will handle page refresh eventually.
        // For optimistically showing it, `setOptimisticRows` does the job for UI.
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
        setLoadedRows(prev => prev.filter(r => r.id !== id));
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
    const items: (number | "ellipsis")[] = [];
    const maxButtons = 5;
    if (initialTotalPages <= maxButtons) {
      for (let i = 1; i <= initialTotalPages; i++) items.push(i);
    } else {
      const first = 1;
      const last = initialTotalPages;
      const start = Math.max(first + 1, initialPage - 1);
      const end = Math.min(last - 1, initialPage + 1);
      items.push(first);
      if (start > first + 1) items.push("ellipsis");
      for (let i = start; i <= end; i++) items.push(i);
      if (end < last - 1) items.push("ellipsis");
      items.push(last);
    }

     return (
        <div className="flex items-center gap-2">
            <button 
                disabled={initialPage <= 1 || isPending}
                onClick={() => loadPage(initialPage - 1)}
                className="inline-flex h-8 items-center justify-center rounded border border-border bg-surface px-3 text-sm disabled:opacity-50 hover:bg-surface-highlight transition-colors"
                title="Previous Page"
            >
                Prev
            </button>
            {items.map((it, idx) =>
                it === "ellipsis" ? (
                  <span key={`e-${idx}`} className="px-1 text-muted flex items-center">
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                ) : (
                  <button
                    key={it}
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded border text-sm font-medium transition-colors ${
                      it === initialPage
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-surface text-foreground hover:bg-surface-highlight"
                    }`}
                    disabled={isPending}
                    onClick={() => loadPage(it)}
                  >
                    {it}
                  </button>
                )
            )}
            <button 
                disabled={initialPage >= initialTotalPages || isPending}
                onClick={() => loadPage(initialPage + 1)}
                className="inline-flex h-8 items-center justify-center rounded border border-border bg-surface px-3 text-sm disabled:opacity-50 hover:bg-surface-highlight transition-colors"
                 title="Next Page"
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
                    <Row 
                        key={row.id || Math.random()}
                        row={row}
                        disabled={isPending}
                        onSave={saveRow}
                        onRequestDelete={requestDelete}
                    />
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <AddHospitalDialog 
        open={dialogOpen}
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

function Row({
  row,
  disabled,
  onSave,
  onRequestDelete,
}: {
  row: EditableRow; // Changed to EditableRow to match usage in main component
  disabled: boolean;
  onSave: (row: EditableRow) => void;
  onRequestDelete: (row: EditableRow) => void;
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
    <tr className="hover:bg-surface-highlight/50 transition-colors">
      <td className="px-4 py-3 text-muted-foreground">{row.id}</td>
      <td className="px-4 py-3 font-medium text-foreground">
        {isEditing ? (
          <input
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            value={local.name}
            onChange={(e) => setLocal((s) => ({ ...s, name: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommit();
              if (e.key === "Escape") onCancel();
            }}
            autoFocus
          />
        ) : (
          row.name
        )}
      </td>
      <td className="px-4 py-3 font-medium text-foreground">
        {isEditing ? (
          <input
            type="text"
            value={local.city || ""}
            onChange={(e) => setLocal((s) => ({ ...s, city: e.target.value }))}
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            placeholder="City"
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommit();
              if (e.key === "Escape") onCancel();
            }}
          />
        ) : (
          row.city || <span className="text-muted-foreground italic">No city</span>
        )}
      </td>
      <td className="px-4 py-3 flex justify-end gap-2">
        {isEditing ? (
          <>
            <button
              onClick={onCommit}
              disabled={disabled}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-green-500/10 hover:text-green-600 hover:border-green-600 transition-colors"
              title="Save"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={onCancel}
              disabled={disabled}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-highlight transition-colors"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStartEdit}
              disabled={disabled}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-highlight hover:text-primary transition-colors"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onRequestDelete(row)}
              disabled={disabled}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-highlight hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
