"use server";

import { db } from "@/db";
import { hospitalTable } from "@/db/schema";
import { asc, count, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const DEFAULT_PAGE_SIZE = 15;
const PAGE_SIZE_OPTIONS = [10, 15, 20, 50] as const;

const UpsertHospitalSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
});

export async function upsertHospital(input: unknown) {
  const data = UpsertHospitalSchema.parse(input);

  if (data.id) {
    await db
      .update(hospitalTable)
      .set({
        name: data.name,
      })
      .where(eq(hospitalTable.id, data.id));
  } else {
    await db.insert(hospitalTable).values({
      name: data.name,
      createdAt: new Date(),
    });
  }

  revalidatePath("/hospital");
}

const DeleteHospitalSchema = z.object({
  id: z.number(),
});

export async function deleteHospital(input: unknown) {
  const data = DeleteHospitalSchema.parse(input);
  await db.delete(hospitalTable).where(eq(hospitalTable.id, data.id));
  revalidatePath("/hospital");
}

const GetHospitalPageSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(5).max(100).optional(),
  sortBy: z.enum(["createdAt", "name", "id"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export async function getHospitalPage(input: unknown) {
  const { page, pageSize, sortBy, sortDir } = GetHospitalPageSchema.parse(input);
  const size = pageSize ?? DEFAULT_PAGE_SIZE;

  const [{ value: totalCount }] = await db.select({ value: count() }).from(hospitalTable);
  const total = Number(totalCount || 0);
  const totalPages = Math.max(1, Math.ceil(total / size));

  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * size;

  const effectiveSortBy = sortBy ?? "createdAt";
  const effectiveSortDir = sortDir ?? "desc";
  const order = (col: Parameters<typeof asc>[0]) =>
    effectiveSortDir === "asc" ? asc(col) : desc(col);

  const sortColumn =
    effectiveSortBy === "name"
      ? hospitalTable.name
      : effectiveSortBy === "id"
        ? hospitalTable.id
        : hospitalTable.createdAt;

  const rows = await db
    .select()
    .from(hospitalTable)
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
