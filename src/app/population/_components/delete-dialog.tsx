"use client";

import { Modal } from "@/components/modal";

export function ConfirmDeleteDialog({
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
  return (
    <Modal open={open} onClose={onCancel} className="max-w-sm">
      <h3 className="text-base font-semibold text-foreground">Confirm Delete</h3>
      <p className="mt-2 text-sm text-muted break-words">
        Are you sure you want to delete <strong>{cid}</strong>? This action cannot be undone.
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
