"use client";

import { Check, ChevronDown, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { EditableRow } from "./shared";

export function Row({
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
    <tr className="border-b border-border last:border-b-0 hover:bg-surface-highlight/50 transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
        <button
          type="button"
          className="inline-flex items-center gap-2 hover:underline text-primary"
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
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            name={`fullName-${row.cid}`}
            value={local.fullName}
            onChange={(e) => setLocal((s) => ({ ...s, fullName: e.target.value }))}
          />
        ) : (
          <div className="h-9 w-full rounded-md px-1.5 text-sm leading-9 text-foreground">
            {row.fullName}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <select
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            name={`gender-${row.cid}`}
            value={local.gender}
            onChange={(e) => setLocal((s) => ({ ...s, gender: e.target.value as EditableRow["gender"] }))}
          >
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="O">O</option>
          </select>
        ) : (
          <div className="h-9 w-full rounded-md px-1.5 text-sm leading-9 text-foreground">
            {row.gender}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            type="date"
            name={`birthDate-${row.cid}`}
            value={local.birthDate}
            onChange={(e) => setLocal((s) => ({ ...s, birthDate: e.target.value }))}
          />
        ) : (
          <div className="h-9 w-full rounded-md px-1.5 text-sm leading-9 text-foreground">
            {row.birthDate}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <RowActionButtons
          cid={row.cid}
          disabled={disabled}
          isEditing={isEditing}
          onCancel={onCancel}
          onCommit={onCommit}
          onRequestDelete={onRequestDelete}
          onStartEdit={onStartEdit}
        />
      </td>
    </tr>
  );
}

function RowActionButtons({
  cid,
  disabled,
  isEditing,
  onCommit,
  onCancel,
  onStartEdit,
  onRequestDelete,
}: {
  cid: string;
  disabled: boolean;
  isEditing: boolean;
  onCommit: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onRequestDelete: (cid: string) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      {isEditing ? (
        <>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-green-500/10 hover:text-green-600 hover:border-green-600 transition-colors"
            type="button"
            aria-label="Save"
            disabled={disabled}
            onClick={onCommit}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-highlight transition-colors"
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-highlight hover:text-primary transition-colors"
            type="button"
            aria-label="Edit"
            disabled={disabled}
            onClick={onStartEdit}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-highlight hover:text-red-600 transition-colors"
            type="button"
            aria-label="Delete"
            disabled={disabled}
            onClick={() => onRequestDelete(cid)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
