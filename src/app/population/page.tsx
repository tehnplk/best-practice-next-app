import { Suspense } from "react";
import { PopulationTable } from "./table";
import { getPopulationPage } from "./actions";

async function PopulationTableLoader({ page }: { page: number }) {
  const data = await getPopulationPage({ page });

  return (
    <PopulationTable
      initialRows={data.rows}
      initialPage={data.page}
      initialTotalPages={data.totalPages}
      initialTotal={data.total}
      pageSize={data.pageSize}
    />
  );
}

export default async function PopulationPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
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
          <PopulationTableLoader page={page} />
        </Suspense>
      </div>
    </div>
  );
}
