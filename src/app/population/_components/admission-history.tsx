"use client";

import { Check, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/modal";
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
  hospitalOptions,
  deletingAdmissionId,
  onToggleAdd,
  onCloseAdd,
  onChangeDate,
  onChangeHospitalName,
  onSearchHospitals,
  onSelectHospitalName,
  onRequestDeleteAdmission,
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
  hospitalOptions: { id: number; name: string; city: string | null }[];
  deletingAdmissionId: number | null;
  onToggleAdd: () => void;
  onCloseAdd: () => void;
  onChangeDate: (value: string) => void;
  onChangeHospitalName: (value: string) => void;
  onSearchHospitals: (query: string) => void;
  onSelectHospitalName: (hospitalName: string) => void;
  onRequestDeleteAdmission: (admissionId: number, label: string) => void;
  onSave: (draft: AdmissionDraft) => void;
  formatAdmissionDate: (value: AdmissionRow["admissionDate"]) => string;
}) {
  const busy = isPending || loading || saving;

  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const hospitalInputRef = useRef<HTMLInputElement | null>(null);
  const hospitalSearchInputRef = useRef<HTMLInputElement | null>(null);
  const hospitalOptionRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [hospitalPickerOpen, setHospitalPickerOpen] = useState(false);
  const [hospitalQuery, setHospitalQuery] = useState("");
  const [activeHospitalIndex, setActiveHospitalIndex] = useState(0);

  const effectiveActiveHospitalIndex =
    hospitalOptions.length === 0
      ? 0
      : Math.min(Math.max(activeHospitalIndex, 0), hospitalOptions.length - 1);

  useEffect(() => {
    if (!hospitalPickerOpen) return;
    const t = window.setTimeout(() => {
      hospitalSearchInputRef.current?.focus();
      hospitalSearchInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [hospitalPickerOpen]);

  useEffect(() => {
    if (!hospitalPickerOpen) return;
    if (hospitalOptions.length === 0) return;

    const el = hospitalOptionRefs.current[effectiveActiveHospitalIndex];
    if (!el) return;

    const t = window.setTimeout(() => {
      el.scrollIntoView({ block: "nearest" });
    }, 0);

    return () => window.clearTimeout(t);
  }, [effectiveActiveHospitalIndex, hospitalOptions.length, hospitalPickerOpen]);

  function closeHospitalPicker() {
    setHospitalPickerOpen(false);
    setHospitalQuery("");
    setActiveHospitalIndex(0);
    onSearchHospitals("");
  }

  function selectHospitalByIndex(idx: number) {
    const h = hospitalOptions[idx];
    if (!h) return;
    onSelectHospitalName(h.name);
    closeHospitalPicker();
  }

  return (
    <tr className="border-b border-border last:border-b-0 bg-surface-highlight/30">
      <td className="px-4 py-3" colSpan={colSpan}>
        <div className="rounded-lg border border-border bg-surface p-3 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">Admission history</div>
            <div />
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
                      <td className="px-3 py-2 text-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">{a.hospitalName}</span>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
                            aria-label="Delete admission"
                            disabled={busy || deletingAdmissionId === a.id}
                            onClick={() => {
                              onRequestDeleteAdmission(
                                a.id,
                                `${formatAdmissionDate(a.admissionDate)} — ${a.hospitalName}`
                              );
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!addOpen ? (
                    <tr className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
                            disabled={busy}
                            aria-label="Add admission"
                            onClick={onToggleAdd}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}

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
                            placeholder="Hospital name"
                            value={draft?.hospitalName ?? ""}
                            onChange={(e) => onChangeHospitalName(e.target.value)}
                          />
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
                            disabled={busy}
                            aria-label="Pick hospital"
                            onClick={() => {
                              setHospitalPickerOpen(true);
                              setHospitalQuery("");
                              setActiveHospitalIndex(0);
                              onSearchHospitals("");
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
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

                        <Modal
                          open={hospitalPickerOpen}
                          onClose={closeHospitalPicker}
                          className="max-w-2xl"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-base font-semibold text-foreground">Select hospital</h3>
                              <p className="mt-1 text-sm text-muted">Type 3+ characters to search.</p>
                            </div>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
                              aria-label="Close"
                              disabled={busy}
                              onClick={closeHospitalPicker}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-4 space-y-3">
                            <input
                              ref={hospitalSearchInputRef}
                              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                              placeholder={hospitalOptionsLoading ? "Searching..." : "Search hospital"}
                              value={hospitalQuery}
                              onChange={(e) => {
                                const next = e.target.value;
                                setHospitalQuery(next);
                                setActiveHospitalIndex(0);
                                onSearchHospitals(next);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  closeHospitalPicker();
                                  return;
                                }

                                if (hospitalOptions.length === 0) return;

                                if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  setActiveHospitalIndex((cur) =>
                                    Math.min(cur + 1, hospitalOptions.length - 1)
                                  );
                                  return;
                                }

                                if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  setActiveHospitalIndex((cur) => Math.max(cur - 1, 0));
                                  return;
                                }

                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  selectHospitalByIndex(effectiveActiveHospitalIndex);
                                }
                              }}
                            />

                            {hospitalQuery.trim().length < 3 ? (
                              <div className="text-sm text-muted">Start typing to see results.</div>
                            ) : hospitalOptionsLoading ? (
                              <div className="text-sm text-muted">Loading...</div>
                            ) : hospitalOptions.length === 0 ? (
                              <div className="text-sm text-muted">No hospitals found.</div>
                            ) : (
                              <div
                                className="max-h-72 overflow-auto rounded-md border border-border"
                                role="listbox"
                              >
                                {hospitalOptions.map((h, idx) => (
                                  <div
                                    key={h.id}
                                    ref={(el) => {
                                      hospitalOptionRefs.current[idx] = el;
                                    }}
                                    role="option"
                                    aria-selected={idx === effectiveActiveHospitalIndex}
                                    className={`transition-colors ${
                                      idx === effectiveActiveHospitalIndex
                                        ? "bg-yellow-200/90 ring-1 ring-yellow-400 dark:bg-yellow-500/25 dark:ring-yellow-500/40"
                                        : "hover:bg-yellow-100/70 dark:hover:bg-yellow-500/10"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm text-foreground"
                                      onClick={() => {
                                        setActiveHospitalIndex(idx);
                                        selectHospitalByIndex(idx);
                                      }}
                                    >
                                      <span className="min-w-0 truncate">{h.name}</span>
                                      {h.city ? (
                                        <span className="shrink-0 text-xs text-muted">{h.city}</span>
                                      ) : null}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Modal>
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
