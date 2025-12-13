"use server";

import { db } from "@/db";
import { hospitalAdmissionHistoryTable, populationTable } from "@/db/schema";
import { asc, count, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const DEFAULT_PAGE_SIZE = 15;
const PAGE_SIZE_OPTIONS = [10, 15, 20, 50] as const;

const GenderSchema = z.enum(["M", "F", "O"]);

const UpsertPopulationSchema = z.object({
  cid: z
    .string()
    .regex(/^\d{13}$/, "Citizen ID must be 13 digits"),
  fullName: z.string().min(1),
  gender: GenderSchema,
  birthDate: z.string().min(1),
});

function parseDateString(input: string): Date {
  // Store dates as YYYY-MM-DD
  // When parsing, treat the string as a "local" date part, but store as a Date object.
  // Warning: new Date('yyyy-mm-dd') treats it as UTC.
  // new Date('yyyy-mm-ddT00:00:00') treats it as Local.
  // We'll stick to 'T00:00:00' to be safe for "start of day local time" or standard convention.
  const d = new Date(`${input}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date format");
  }
  return d;
}

export async function upsertPopulation(input: unknown) {
  const data = UpsertPopulationSchema.parse(input);
  const birthDate = parseDateString(data.birthDate);

  await db
    .insert(populationTable)
    .values({
      cid: data.cid,
      fullName: data.fullName,
      gender: data.gender,
      birthDate,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: populationTable.cid,
      set: {
        fullName: data.fullName,
        gender: data.gender,
        birthDate,
      },
    });

  revalidatePath("/population");
}

const DeletePopulationSchema = z.object({
  cid: z.string().regex(/^\d{13}$/),
});

export async function deletePopulation(input: unknown) {
  const data = DeletePopulationSchema.parse(input);
  await db.delete(populationTable).where(eq(populationTable.cid, data.cid));
  revalidatePath("/population");
}

const GetPopulationPageSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(5).max(100).optional(),
  sortBy: z
    .enum(["createdAt", "cid", "fullName", "gender", "birthDate"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export async function getPopulationPage(input: unknown) {
  const { page, pageSize, sortBy, sortDir } = GetPopulationPageSchema.parse(input);
  const size = pageSize ?? DEFAULT_PAGE_SIZE;

  const [{ value: totalCount }] = await db.select({ value: count() }).from(populationTable);
  const total = Number(totalCount || 0);
  const totalPages = Math.max(1, Math.ceil(total / size));

  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * size;

  const effectiveSortBy = sortBy ?? "createdAt";
  const effectiveSortDir = sortDir ?? "desc";
  const order = (col: Parameters<typeof asc>[0]) => (effectiveSortDir === "asc" ? asc(col) : desc(col));

  const sortColumn =
    effectiveSortBy === "cid"
      ? populationTable.cid
      : effectiveSortBy === "fullName"
        ? populationTable.fullName
        : effectiveSortBy === "gender"
          ? populationTable.gender
          : effectiveSortBy === "birthDate"
            ? populationTable.birthDate
            : populationTable.createdAt;

  const rows = await db
    .select()
    .from(populationTable)
    .orderBy(order(sortColumn))
    .limit(size + 1)
    .offset(offset);

  return {
    rows: rows.slice(0, size),
    hasMore: rows.length > size,
    page: safePage,
    pageSize: size,
    total,
    totalPages,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    sortBy: effectiveSortBy,
    sortDir: effectiveSortDir,
  };
}

const GetHospitalAdmissionsByCidSchema = z.object({
  cid: z.string().regex(/^\d{13}$/),
});

export async function getHospitalAdmissionsByCid(input: unknown) {
  const { cid } = GetHospitalAdmissionsByCidSchema.parse(input);
  const rows = await db
    .select()
    .from(hospitalAdmissionHistoryTable)
    .where(eq(hospitalAdmissionHistoryTable.cid, cid))
    .orderBy(desc(hospitalAdmissionHistoryTable.admissionDate));

  return {
    rows: rows.map((r) => ({
      ...r,
      admissionDate: r.admissionDate.getTime(),
    })),
  };
}

const CreateHospitalAdmissionSchema = z.object({
  cid: z.string().regex(/^\d{13}$/),
  admissionDate: z.string().min(1),
  hospitalName: z.string().min(1),
});

function parseAdmissionDate(input: string): Date {
  // This function is no longer needed as we use parseDateString everywhere for consistency
  return parseDateString(input);
}

export async function createHospitalAdmission(input: unknown) {
  const data = CreateHospitalAdmissionSchema.parse(input);
  const admissionDate = parseAdmissionDate(data.admissionDate);

  const inserted = await db
    .insert(hospitalAdmissionHistoryTable)
    .values({
      cid: data.cid,
      admissionDate,
      hospitalName: data.hospitalName,
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    throw new Error("Insert failed");
  }

  return {
    row: {
      ...row,
      admissionDate: row.admissionDate.getTime(),
    },
  };
}
