import { db } from "@/db";
import { populationTable } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Suspense } from "react";
import { PopulationTable } from "./table";

async function PopulationTableLoader() {
  const rows = await db
    .select()
    .from(populationTable)
    .orderBy(desc(populationTable.birthDate));

  return <PopulationTable initialRows={rows} />;
}

export default function PopulationPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Population Registry</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage citizenId, full name, gender, and birth date. Inline edit with optimistic UI.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              Loading...
            </div>
          }
        >
          <PopulationTableLoader />
        </Suspense>
      </div>
    </div>
  );
}
