"use client";

import { Check, Plus, X } from "lucide-react";
import { useRef } from "react";
import type { AdmissionDraft, AdmissionRow } from "./shared";

export function AdmissionHistoryPanelRow({
  colSpan,
  isPending,
  loading,
  saving,
  hospitalOptionsLoading,
  addOpen,
  admissions,
  draft,
  hospitalListId,
  hospitalOptions,
  onToggleAdd,
  onCloseAdd,
  onChangeDate,
  onChangeHospitalName,
  onSave,
  formatAdmissionDate,
}: {
  colSpan: number;
  isPending: boolean;
  loading: boolean;
  saving: boolean;
  hospitalOptionsLoading: boolean;
  addOpen: boolean;
  admissions: AdmissionRow[];
  draft?: AdmissionDraft;
  hospitalListId: string;
  hospitalOptions: { id: number; name: string; city: string | null }[];
  onToggleAdd: () => void;
  onCloseAdd: () => void;
  onChangeDate: (value: string) => void;
  onChangeHospitalName: (value: string) => void;
  onSave: (draft: AdmissionDraft) => void;
  formatAdmissionDate: (value: AdmissionRow["admissionDate"]) => string;
}) {
  const busy = isPending || loading || saving;

  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const hospitalInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <tr className="border-b border-border last:border-b-0 bg-surface-highlight/30">
      <td className="px-4 py-3" colSpan={colSpan}>
        <div className="rounded-lg border border-border bg-surface p-3 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">Admission history</div>
            {!addOpen ? (
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
                disabled={busy}
                aria-label="Add admission"
                onClick={onToggleAdd}
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : (
              <div />
            )}
          </div>

          {loading ? (
            <div className="text-muted">Loading admission history...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Admission date</th>
                    <th className="px-3 py-2">Hospital</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.length === 0 && !addOpen ? (
                    <tr>
                      <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400" colSpan={2}>
                        No admission history.
                      </td>
                    </tr>
                  ) : null}

                  {admissions.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {formatAdmissionDate(a.admissionDate)}
                      </td>
                      <td className="px-3 py-2 text-foreground">{a.hospitalName}</td>
                    </tr>
                  ))}

                  {addOpen ? (
                    <tr className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2">
                        <input
                          ref={dateInputRef}
                          className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                          type="date"
                          value={draft?.admissionDate ?? ""}
                          onChange={(e) => onChangeDate(e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            ref={hospitalInputRef}
                            className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            placeholder={hospitalOptionsLoading ? "Loading hospitals..." : "Hospital name"}
                            list={hospitalListId}
                            value={draft?.hospitalName ?? ""}
                            onChange={(e) => onChangeHospitalName(e.target.value)}
                          />
                          <datalist id={hospitalListId}>
                            {hospitalOptions.map((h) => (
                              <option key={h.id} value={h.name} />
                            ))}
                          </datalist>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
                            disabled={busy}
                            aria-label="Save admission"
                            onClick={() =>
                              onSave({
                                admissionDate: dateInputRef.current?.value ?? draft?.admissionDate ?? "",
                                hospitalName: hospitalInputRef.current?.value ?? draft?.hospitalName ?? "",
                              })
                            }
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
                            disabled={busy}
                            aria-label="Cancel add admission"
                            onClick={onCloseAdd}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
