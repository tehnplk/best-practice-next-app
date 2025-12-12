"use server";

import { db } from "@/db";
import { populationTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
