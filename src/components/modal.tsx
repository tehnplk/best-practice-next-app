"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, children, className = "max-w-2xl" }: ModalProps) {
  const isClient = useSyncExternalStore(
    () => () => {
      // No-op subscribe
    },
    () => true,
    () => false
  );

  if (!isClient) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-colors duration-200 ${
        open ? "bg-black/50" : "bg-black/0 pointer-events-none"
      }`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full rounded-2xl border border-border bg-surface p-5 shadow-xl ${className} ${
          open ? "animate-in" : "animate-out"
        }`}
      >
        {open ? children : null}
      </div>
    </div>,
    document.body
  );
}
