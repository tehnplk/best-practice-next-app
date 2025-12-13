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
  q,
  gender,
  birthFrom,
  birthTo,
}: {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: string;
  q?: string;
  gender?: string;
  birthFrom?: string;
  birthTo?: string;
}) {
  const safeQ = q?.trim() ? q.trim() : undefined;
  const safeGender = gender === "M" || gender === "F" || gender === "O" ? gender : undefined;
  const safeBirthFrom = birthFrom?.trim() ? birthFrom.trim() : undefined;
  const safeBirthTo = birthTo?.trim() ? birthTo.trim() : undefined;

  const data = await getPopulationPage({
    page,
    pageSize,
    sortBy,
    sortDir,
    q: safeQ,
    gender: safeGender,
    birthFrom: safeBirthFrom,
    birthTo: safeBirthTo,
  });

  return (
    <PopulationTable
      key={`${data.page}-${data.pageSize}-${data.sortBy}-${data.sortDir}-${safeQ ?? ""}-${safeGender ?? ""}-${safeBirthFrom ?? ""}-${safeBirthTo ?? ""}`}
      initialRows={data.rows}
      initialPage={data.page}
      initialTotalPages={data.totalPages}
      initialTotal={data.total}
      pageSize={data.pageSize}
      pageSizeOptions={data.pageSizeOptions}
      sortBy={data.sortBy}
      sortDir={data.sortDir}
      initialQ={safeQ ?? ""}
      initialGender={safeGender ?? ""}
      initialBirthFrom={safeBirthFrom ?? ""}
      initialBirthTo={safeBirthTo ?? ""}
    />
  );
}

export default async function PopulationPage(props: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortDir?: string;
    q?: string;
    gender?: string;
    birthFrom?: string;
    birthTo?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const pageSize = Math.max(5, Math.min(100, Number(searchParams?.pageSize ?? "0") || 15));
  const sortBy = searchParams?.sortBy;
  const sortDir = searchParams?.sortDir;
  const q = searchParams?.q;
  const gender = searchParams?.gender;
  const birthFrom = searchParams?.birthFrom;
  const birthTo = searchParams?.birthTo;
  return (
    <div className="min-h-screen bg-background py-10 text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Population Registry</h1>
          <p className="mt-2 text-sm text-muted">
            Manage cid, full name, gender, and birth date. Inline edit with optimistic UI.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
              Loading...
            </div>
          }
        >
          <PopulationTableLoader
            page={page}
            pageSize={pageSize}
            sortBy={sortBy}
            sortDir={sortDir}
            q={q}
            gender={gender}
            birthFrom={birthFrom}
            birthTo={birthTo}
          />
        </Suspense>
      </div>
    </div>
  );
}
