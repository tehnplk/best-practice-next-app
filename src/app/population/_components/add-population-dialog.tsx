"use client";

import { X } from "lucide-react";
import { Modal } from "@/components/modal";
import type { EditableRow } from "./shared";

export function AddPopulationDialog({
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
    <Modal open={open} onClose={onCancel} className="max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">Add / Save</h3>
          <p className="mt-1 text-sm text-muted">Create a new population record.</p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
          aria-label="Close"
          disabled={disabled}
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="add-cid">
            CID (13 digits)
          </label>
          <input
            id="add-cid"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            placeholder="1234567890123"
            value={draft.cid}
            onChange={(e) => onChangeDraft((s) => ({ ...s, cid: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="add-gender">
            Gender
          </label>
          <select
            id="add-gender"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            value={draft.gender}
            onChange={(e) => onChangeDraft((s) => ({ ...s, gender: e.target.value as EditableRow["gender"] }))}
          >
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="O">O</option>
          </select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="add-fullname">
            Full name
          </label>
          <input
            id="add-fullname"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            placeholder="Full name"
            value={draft.fullName}
            onChange={(e) => onChangeDraft((s) => ({ ...s, fullName: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="add-birthdate">
            Birth date
          </label>
          <input
            id="add-birthdate"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            type="date"
            value={draft.birthDate}
            onChange={(e) => onChangeDraft((s) => ({ ...s, birthDate: e.target.value }))}
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
          type="button"
          aria-label="Cancel"
          disabled={disabled}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20 transition-all"
          type="button"
          aria-label="Save"
          disabled={disabled}
          onClick={onSave}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
