import type { Metadata } from "next";
import { Suspense } from "react";
import { PopulationTable } from "./table";
import { getPopulationPage } from "./actions";

export const metadata: Metadata = {
  title: "Population Registry | Best Practice Next App",
  description:
    "Manage citizen ID, full name, gender, and birth date with inline editing and optimistic UI updates.",
  keywords: ["population", "registry", "citizen", "management"],
};

async function PopulationTableLoader({
  page,
  pageSize,
  sortBy,
  sortDir,
}: {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: string;
}) {
  const data = await getPopulationPage({ page, pageSize, sortBy, sortDir });

  return (
    <PopulationTable
      key={`${data.page}-${data.pageSize}-${data.sortBy}-${data.sortDir}`}
      initialRows={data.rows}
      initialPage={data.page}
      initialTotalPages={data.totalPages}
      initialTotal={data.total}
      pageSize={data.pageSize}
      pageSizeOptions={data.pageSizeOptions}
      sortBy={data.sortBy}
      sortDir={data.sortDir}
    />
  );
}

export default async function PopulationPage(props: {
  searchParams: Promise<{ page?: string; pageSize?: string; sortBy?: string; sortDir?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const pageSize = Math.max(5, Math.min(100, Number(searchParams?.pageSize ?? "0") || 15));
  const sortBy = searchParams?.sortBy;
  const sortDir = searchParams?.sortDir;
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Population Registry</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage cid, full name, gender, and birth date. Inline edit with optimistic UI.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              Loading...
            </div>
          }
        >
          <PopulationTableLoader page={page} pageSize={pageSize} sortBy={sortBy} sortDir={sortDir} />
        </Suspense>
      </div>
    </div>
  );
}
