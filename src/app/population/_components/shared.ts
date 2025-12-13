"use client";

import type { PopulationRow } from "@/db/schema";

export type AdmissionRow = {
  id: number;
  cid: string;
  admissionDate: number;
  hospitalName: string;
};

export type EditableRow = {
  cid: string;
  fullName: string;
  gender: "M" | "F" | "O";
  birthDate: string; // yyyy-mm-dd
};

export type AdmissionDraft = { admissionDate: string; hospitalName: string };

export function toEditable(row: PopulationRow): EditableRow {
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

export function isValidCitizenId(value: string) {
  return /^\d{13}$/.test(value);
}

export function isNonEmpty(value: string) {
  return value.trim().length > 0;
}
