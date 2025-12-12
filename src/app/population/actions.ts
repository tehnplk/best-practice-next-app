"use server";

import { db } from "@/db";
import { populationTable } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const DEFAULT_PAGE_SIZE = 15;
const PAGE_SIZE_OPTIONS = [10, 15, 20, 50] as const;

const GenderSchema = z.enum(["M", "F", "O"]);

const UpsertPopulationSchema = z.object({
  citizenId: z
    .string()
    .regex(/^\d{13}$/, "Citizen ID must be 13 digits"),
  fullName: z.string().min(1),
  gender: GenderSchema,
  birthDate: z.string().min(1),
});

function parseBirthDate(input: string): Date {
  // Expecting yyyy-mm-dd
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid birthDate");
  }
  return d;
}

export async function upsertPopulation(input: unknown) {
  const data = UpsertPopulationSchema.parse(input);
  const birthDate = parseBirthDate(data.birthDate);

  await db
    .insert(populationTable)
    .values({
      citizenId: data.citizenId,
      fullName: data.fullName,
      gender: data.gender,
      birthDate,
    })
    .onConflictDoUpdate({
      target: populationTable.citizenId,
      set: {
        fullName: data.fullName,
        gender: data.gender,
        birthDate,
      },
    });

  revalidatePath("/population");
}

const DeletePopulationSchema = z.object({
  citizenId: z.string().regex(/^\d{13}$/),
});

export async function deletePopulation(input: unknown) {
  const data = DeletePopulationSchema.parse(input);
  await db.delete(populationTable).where(eq(populationTable.citizenId, data.citizenId));
  revalidatePath("/population");
}

const GetPopulationPageSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(5).max(100).optional(),
});

export async function getPopulationPage(input: unknown) {
  const { page, pageSize } = GetPopulationPageSchema.parse(input);
  const size = pageSize ?? DEFAULT_PAGE_SIZE;

  const [{ value: totalCount }] = await db.select({ value: count() }).from(populationTable);
  const total = Number(totalCount || 0);
  const totalPages = Math.max(1, Math.ceil(total / size));

  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * size;

  const rows = await db
    .select()
    .from(populationTable)
    .orderBy(desc(populationTable.birthDate))
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
  };
}
