import { db } from "@/db";
import { populationTable } from "@/db/schema";
import { z } from "zod";

const GenderSchema = z.enum(["M", "F", "O"]);

const UpsertSchema = z.object({
  cid: z.string().regex(/^\d{13}$/),
  fullName: z.string().min(1),
  gender: GenderSchema,
  birthDate: z.string().min(1),
});

function parseBirthDate(input: string): Date {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid birthDate");
  }
  return d;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const data = UpsertSchema.parse(json);
    const birthDate = parseBirthDate(data.birthDate);

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

    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bad request";
    return Response.json({ ok: false, message }, { status: 400 });
  }
}
