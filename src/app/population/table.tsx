"use client";

import type { PopulationRow } from "@/db/schema";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { Fragment, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  createHospitalAdmission,
  deleteHospitalAdmission,
  deletePopulation,
  getHospitalAdmissionsByCid,
  searchHospitals,
  upsertPopulation,
} from "./actions";

// Import new components
import { AddPopulationDialog } from "./_components/add-population-dialog";
import { AdmissionHistoryPanelRow } from "./_components/admission-history";
import { ConfirmDeleteDialog } from "./_components/delete-dialog";
import { Row } from "./_components/population-table-row";
import {
  type AdmissionDraft,
  type AdmissionRow,
  type EditableRow,
  isNonEmpty,
  isValidCitizenId,
  toEditable,
} from "./_components/shared";

function emptyRow(): EditableRow {
  return {
    cid: "",
    fullName: "",
    gender: "M",
    birthDate: "",
  };
}

function mergeRowsByCitizenId(existing: EditableRow[], incoming: EditableRow[]) {
  const existingCid = new Set(existing.map((r) => r.cid));
  const incomingByCid = new Map<string, EditableRow>();
  const newRows: EditableRow[] = [];

  for (const r of incoming) {
    incomingByCid.set(r.cid, r);
    if (!existingCid.has(r.cid)) newRows.push(r);
  }

  const merged = existing.map((r) => incomingByCid.get(r.cid) ?? r);
  return [...newRows, ...merged];
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
  initialQ,
  initialGender,
  initialBirthFrom,
  initialBirthTo,
}: {
  initialRows: PopulationRow[];
  initialPage: number;
  initialTotalPages: number;
  initialTotal: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  sortBy: "createdAt" | "cid" | "fullName" | "gender" | "birthDate";
  sortDir: "asc" | "desc";
  initialQ: string;
  initialGender: string;
  initialBirthFrom: string;
  initialBirthTo: string;
}) {
  const router = useRouter();

  const initial = initialRows.map(toEditable);
  const [isPending, startTransition] = useTransition();

  const page = initialPage;
  const totalPages = initialTotalPages;
  const total = initialTotal;
  const size = pageSize;
  const [loadedRows, setLoadedRows] = useState<EditableRow[]>(initial);

  const [filterQDraft, setFilterQDraft] = useState<string>(initialQ);
  const [filterQApplied, setFilterQApplied] = useState<string>(initialQ);
  const [filterGender, setFilterGender] = useState<"" | "M" | "F" | "O">(
    initialGender === "M" || initialGender === "F" || initialGender === "O" ? initialGender : ""
  );
  const [filterBirthFrom, setFilterBirthFrom] = useState<string>(initialBirthFrom);
  const [filterBirthTo, setFilterBirthTo] = useState<string>(initialBirthTo);

  const [currentSortBy, setCurrentSortBy] = useState<
    "createdAt" | "cid" | "fullName" | "gender" | "birthDate"
  >(sortBy);
  const [currentSortDir, setCurrentSortDir] = useState<"asc" | "desc">(sortDir);

  const [expandedCid, setExpandedCid] = useState<string | null>(null);
  const [loadingCid, setLoadingCid] = useState<string | null>(null);
  const [admissionsByCid, setAdmissionsByCid] = useState<Record<string, AdmissionRow[]>>({});
  const [addAdmissionOpenByCid, setAddAdmissionOpenByCid] = useState<Record<string, boolean>>({});
  const [admissionDraftByCid, setAdmissionDraftByCid] = useState<Record<string, AdmissionDraft>>({});
  const [savingAdmissionCid, setSavingAdmissionCid] = useState<string | null>(null);
  const [deletingAdmissionIdByCid, setDeletingAdmissionIdByCid] = useState<
    Record<string, number | null>
  >({});

  const [hospitalOptionsByCid, setHospitalOptionsByCid] = useState<
    Record<string, { id: number; name: string; city: string | null }[]>
  >({});
  const [hospitalLoadingCid, setHospitalLoadingCid] = useState<string | null>(null);
  const hospitalSearchSeqRef = useRef<Record<string, number>>({});

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    cid: string;
  }>({ open: false, cid: "" });

  const [confirmAdmissionDelete, setConfirmAdmissionDelete] = useState<{
    open: boolean;
    cid: string;
    admissionId: number | null;
    label: string;
  }>({ open: false, cid: "", admissionId: null, label: "" });

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

  function todayIsoDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function toggleAddAdmission(cid: string) {
    const nextOpen = !addAdmissionOpenByCid[cid];
    setAddAdmissionOpenByCid((prev) => ({ ...prev, [cid]: nextOpen }));

    if (nextOpen) {
      setHospitalOptionsByCid((cur) => ({ ...cur, [cid]: [] }));
    }
    setAdmissionDraftByCid((prev) =>
      prev[cid]
        ? prev
        : {
            ...prev,
            [cid]: {
              admissionDate: todayIsoDate(),
              hospitalName: "",
            },
          },
    );
  }

  function closeAddAdmission(cid: string) {
    setAddAdmissionOpenByCid((prev) => ({ ...prev, [cid]: false }));
  }

  function setAdmissionDateDraft(cid: string, value: string) {
    setAdmissionDraftByCid((prev) => ({
      ...prev,
      [cid]: {
        admissionDate: value,
        hospitalName: prev[cid]?.hospitalName ?? "",
      },
    }));
  }

  function setHospitalNameDraft(cid: string, value: string) {
    setAdmissionDraftByCid((prev) => ({
      ...prev,
      [cid]: {
        admissionDate: prev[cid]?.admissionDate ?? todayIsoDate(),
        hospitalName: value,
      },
    }));
  }

  function searchHospitalOptions(cid: string, query: string) {
    const q = query.trim();
    if (q.length < 3) {
      setHospitalOptionsByCid((cur) => ({ ...cur, [cid]: [] }));
      setHospitalLoadingCid((cur) => (cur === cid ? null : cur));
      return;
    }

    const nextSeq = (hospitalSearchSeqRef.current[cid] ?? 0) + 1;
    hospitalSearchSeqRef.current[cid] = nextSeq;

    setHospitalLoadingCid(cid);
    (async () => {
      try {
        const res = await searchHospitals({ query: q, limit: 20 });
        if (hospitalSearchSeqRef.current[cid] !== nextSeq) return;
        setHospitalOptionsByCid((cur) => ({ ...cur, [cid]: res.rows }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Search hospitals failed");
      } finally {
        if (hospitalSearchSeqRef.current[cid] !== nextSeq) return;
        setHospitalLoadingCid((cur) => (cur === cid ? null : cur));
      }
    })();
  }

  async function saveAdmission(cid: string, draft?: AdmissionDraft) {
    const d = draft ?? admissionDraftByCid[cid];
    if (!d?.admissionDate) {
      toast.error("Admission date is required");
      return;
    }
    if (!d?.hospitalName?.trim()) {
      toast.error("Hospital name is required");
      return;
    }

    setSavingAdmissionCid(cid);
    try {
      const res = await createHospitalAdmission({
        cid,
        admissionDate: d.admissionDate,
        hospitalName: d.hospitalName,
      });

      setAdmissionsByCid((prev) => {
        const existing = prev[cid] ?? [];
        return { ...prev, [cid]: [res.row, ...existing] };
      });

      setAdmissionDraftByCid((prev) => ({
        ...prev,
        [cid]: {
          admissionDate: todayIsoDate(),
          hospitalName: "",
        },
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingAdmissionCid((cur) => (cur === cid ? null : cur));
    }
  }

  async function deleteAdmission(cid: string, admissionId: number) {
    const prev = admissionsByCid[cid] ?? [];

    setAdmissionsByCid((cur) => ({
      ...cur,
      [cid]: (cur[cid] ?? []).filter((a) => a.id !== admissionId),
    }));

    setDeletingAdmissionIdByCid((cur) => ({ ...cur, [cid]: admissionId }));

    try {
      await deleteHospitalAdmission({ id: admissionId });
      toast.success("Admission deleted");
    } catch (e) {
      setAdmissionsByCid((cur) => ({ ...cur, [cid]: prev }));
      toast.error(e instanceof Error ? e.message : "Delete admission failed");
    } finally {
      setDeletingAdmissionIdByCid((cur) =>
        cur[cid] === admissionId ? { ...cur, [cid]: null } : cur
      );
    }
  }

  function requestDeleteAdmission(cid: string, admissionId: number, label: string) {
    setConfirmAdmissionDelete({
      open: true,
      cid,
      admissionId,
      label,
    });
  }

  function buildSearchParams(params: {
    page: number;
    pageSize: number;
    sortBy: typeof currentSortBy;
    sortDir: typeof currentSortDir;
    q: string;
    gender: "" | "M" | "F" | "O";
    birthFrom: string;
    birthTo: string;
  }) {
    const search = new URLSearchParams();
    search.set("page", String(params.page));
    search.set("pageSize", String(params.pageSize));
    search.set("sortBy", params.sortBy);
    search.set("sortDir", params.sortDir);
    const q = params.q.trim();
    if (q) search.set("q", q);
    if (params.gender) search.set("gender", params.gender);
    if (params.birthFrom.trim()) search.set("birthFrom", params.birthFrom.trim());
    if (params.birthTo.trim()) search.set("birthTo", params.birthTo.trim());
    return search;
  }

  function applyFilters(next?: {
    q?: string;
    gender?: "" | "M" | "F" | "O";
    birthFrom?: string;
    birthTo?: string;
  }) {
    const q = next?.q ?? filterQApplied;
    const gender = next?.gender ?? filterGender;
    const birthFrom = next?.birthFrom ?? filterBirthFrom;
    const birthTo = next?.birthTo ?? filterBirthTo;

    startTransition(() => {
      const search = buildSearchParams({
        page: 1,
        pageSize: size,
        sortBy: currentSortBy,
        sortDir: currentSortDir,
        q,
        gender,
        birthFrom,
        birthTo,
      });
      router.replace(`/population?${search.toString()}`);
    });
  }

  function closeAdmissionDeleteDialog() {
    setConfirmAdmissionDelete({ open: false, cid: "", admissionId: null, label: "" });
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
      const prevLoaded = loadedRows;
      setOptimisticRows({ type: "upsert", row });
      try {
        await upsertPopulation(row);
        const nextLoaded = mergeRowsByCitizenId(prevLoaded, [row]);
        setLoadedRows(nextLoaded);
        setOptimisticRows({ type: "reset", rows: nextLoaded });
        toast.success("Saved");
      } catch (e) {
        setOptimisticRows({ type: "reset", rows: prevLoaded });
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
      // FIX: Standardized error message to English
      errors.push("Citizen ID must be 13 digits");
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
    const prevLoaded = loadedRows;
    setOptimisticRows({ type: "upsert", row });
    try {
      await upsertPopulation(row);
      const nextLoaded = mergeRowsByCitizenId(prevLoaded, [row]);
      setLoadedRows(nextLoaded);
      setOptimisticRows({ type: "reset", rows: nextLoaded });
      setDraft(emptyRow());
      toast.success("Saved");
      closeAddModal();
    } catch (e) {
      setOptimisticRows({ type: "reset", rows: prevLoaded });
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
      const prevLoaded = loadedRows;
      setOptimisticRows({ type: "delete", cid: citizenId });
      try {
        await deletePopulation({ cid: citizenId });
        const nextLoaded = prevLoaded.filter((r) => r.cid !== citizenId);
        setLoadedRows(nextLoaded);
        setOptimisticRows({ type: "reset", rows: nextLoaded });
        toast.success("Deleted");
      } catch (e) {
        setOptimisticRows({ type: "reset", rows: prevLoaded });
        toast.error(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  function loadPage(targetPage: number, targetSize?: number) {
    const nextSize = targetSize ?? size;
    const target = Math.max(1, targetPage);
    startTransition(() => {
      const search = buildSearchParams({
        page: target,
        pageSize: nextSize,
        sortBy: currentSortBy,
        sortDir: currentSortDir,
        q: filterQApplied,
        gender: filterGender,
        birthFrom: filterBirthFrom,
        birthTo: filterBirthTo,
      });
      router.replace(`/population?${search.toString()}`);
    });
  }

  function setSort(nextSortBy: "createdAt" | "cid" | "fullName" | "gender" | "birthDate") {
    const nextDir = nextSortBy === currentSortBy ? (currentSortDir === "asc" ? "desc" : "asc") : "asc";
    setCurrentSortBy(nextSortBy);
    setCurrentSortDir(nextDir);

    startTransition(() => {
      const search = buildSearchParams({
        page: 1,
        pageSize: size,
        sortBy: nextSortBy,
        sortDir: nextDir,
        q: filterQApplied,
        gender: filterGender,
        birthFrom: filterBirthFrom,
        birthTo: filterBirthTo,
      });
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center rounded border border-border bg-surface px-3 text-sm disabled:opacity-50"
          disabled={page <= 1 || isPending}
          onClick={() => loadPage(page - 1)}
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
                it === page
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
          type="button"
          className="inline-flex h-8 items-center justify-center rounded border border-border bg-surface px-3 text-sm disabled:opacity-50"
          disabled={page >= totalPages || isPending}
          onClick={() => loadPage(page + 1)}
        >
          Next
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Population</h2>
            <button
                onClick={openAddModal}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
                disabled={isPending}
            >
                <Plus className="h-4 w-4" /> Add Population
            </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <div>Total {total} records</div>
            <div className="flex items-center gap-4">
                <select
                    value={size}
                    disabled={isPending}
                    onChange={onChangePageSize}
                    className="h-8 rounded border border-border bg-surface px-2 outline-none"
                >
                    {pageSizeOptions.map(opt => <option key={opt} value={opt}>{opt} / page</option>)}
                </select>
                {renderPagination()}
            </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="population-filter-q">
              Search (CID / Full name)
            </label>
            <input
              id="population-filter-q"
              className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Search... (press Enter)"
              autoComplete="off"
              value={filterQDraft}
              onChange={(e) => {
                setFilterQDraft(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const next = (e.currentTarget as HTMLInputElement).value;
                setFilterQApplied(next);
                applyFilters({ q: next });
              }}
            />
          </div>

          <div className="w-40">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="population-filter-gender">
              Gender
            </label>
            <select
              id="population-filter-gender"
              className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={filterGender}
              onChange={(e) => {
                const next = e.target.value as "" | "M" | "F" | "O";
                setFilterGender(next);
                applyFilters({ gender: next });
              }}
            >
              <option value="">All</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="O">O</option>
            </select>
          </div>

          <div className="w-44">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="population-filter-birth-from">
              Birth from
            </label>
            <input
              id="population-filter-birth-from"
              type="date"
              className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={filterBirthFrom}
              onChange={(e) => {
                const next = e.target.value;
                setFilterBirthFrom(next);
                applyFilters({ birthFrom: next });
              }}
            />
          </div>

          <div className="w-44">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="population-filter-birth-to">
              Birth to
            </label>
            <input
              id="population-filter-birth-to"
              type="date"
              className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={filterBirthTo}
              onChange={(e) => {
                const next = e.target.value;
                setFilterBirthTo(next);
                applyFilters({ birthTo: next });
              }}
            />
          </div>

          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm text-foreground hover:bg-surface-highlight disabled:opacity-50 transition-colors"
            disabled={isPending}
            onClick={() => {
              setFilterQDraft("");
              setFilterQApplied("");
              setFilterGender("");
              setFilterBirthFrom("");
              setFilterBirthTo("");
              applyFilters({ q: "", gender: "", birthFrom: "", birthTo: "" });
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-highlight/50 text-xs uppercase tracking-wide text-muted">
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
                  <AdmissionHistoryPanelRow
                    colSpan={5}
                    isPending={isPending}
                    loading={loadingCid === row.cid}
                    saving={savingAdmissionCid === row.cid}
                    hospitalOptionsLoading={hospitalLoadingCid === row.cid}
                    addOpen={!!addAdmissionOpenByCid[row.cid]}
                    admissions={admissionsByCid[row.cid] ?? []}
                    draft={admissionDraftByCid[row.cid]}
                    onToggleAdd={() => toggleAddAdmission(row.cid)}
                    onCloseAdd={() => closeAddAdmission(row.cid)}
                    onChangeDate={(v) => setAdmissionDateDraft(row.cid, v)}
                    onChangeHospitalName={(v) => setHospitalNameDraft(row.cid, v)}
                    onSearchHospitals={(q) => searchHospitalOptions(row.cid, q)}
                    onSelectHospitalName={(name) => setHospitalNameDraft(row.cid, name)}
                    hospitalOptions={hospitalOptionsByCid[row.cid] ?? []}
                    deletingAdmissionId={deletingAdmissionIdByCid[row.cid] ?? null}
                    onRequestDeleteAdmission={(admissionId: number, label: string) =>
                      requestDeleteAdmission(row.cid, admissionId, label)
                    }
                    onSave={(d) =>
                      startTransition(async () => {
                        await saveAdmission(row.cid, d);
                      })
                    }
                    formatAdmissionDate={formatAdmissionDate}
                  />
                ) : null}
              </Fragment>
            ))}
            {optimisticRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted" colSpan={5}>
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

      <ConfirmDeleteDialog
        open={confirmAdmissionDelete.open}
        cid={confirmAdmissionDelete.label}
        disabled={
          isPending ||
          (confirmAdmissionDelete.cid
            ? deletingAdmissionIdByCid[confirmAdmissionDelete.cid] != null
            : false)
        }
        onCancel={closeAdmissionDeleteDialog}
        onConfirm={() => {
          const cid = confirmAdmissionDelete.cid;
          const admissionId = confirmAdmissionDelete.admissionId;
          if (!cid || !admissionId) return;
          closeAdmissionDeleteDialog();
          startTransition(async () => {
            await deleteAdmission(cid, admissionId);
          });
        }}
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
