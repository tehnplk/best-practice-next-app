"use server";

import { db } from "@/db";
import { hospitalAdmissionHistoryTable, populationTable } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";

export interface DashboardStats {
  totalPopulation: number;
  genderDistribution: {
    M: number;
    F: number;
    O: number;
  };
  totalAdmissions: number;
  recentAdmissions: {
    id: number;
    cid: string;
    admissionDate: Date;
    hospitalName: string;
  }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [{ value: totalPopulation }] = await db
    .select({ value: count() })
    .from(populationTable);

  const [{ value: maleCount }] = await db
    .select({ value: count() })
    .from(populationTable)
    .where(eq(populationTable.gender, "M"));

  const [{ value: femaleCount }] = await db
    .select({ value: count() })
    .from(populationTable)
    .where(eq(populationTable.gender, "F"));

    const [{ value: otherCount }] = await db
    .select({ value: count() })
    .from(populationTable)
    .where(eq(populationTable.gender, "O"));

  const [{ value: totalAdmissions }] = await db
    .select({ value: count() })
    .from(hospitalAdmissionHistoryTable);

  const recentAdmissions = await db
    .select()
    .from(hospitalAdmissionHistoryTable)
    .orderBy(desc(hospitalAdmissionHistoryTable.admissionDate))
    .limit(5);

  return {
    totalPopulation: totalPopulation ?? 0,
    genderDistribution: {
      M: maleCount ?? 0,
      F: femaleCount ?? 0,
      O: otherCount ?? 0,
    },
    totalAdmissions: totalAdmissions ?? 0,
    recentAdmissions,
  };
}
