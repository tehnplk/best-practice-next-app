import type { Metadata } from "next";
import { Suspense } from "react";
import { HospitalTable } from "./table";
import { getHospitalPage } from "./actions";

export const metadata: Metadata = {
  title: "Hospital Management",
  description: "Manage hospital records.",
};

async function HospitalTableLoader({
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
  const data = await getHospitalPage({ page, pageSize, sortBy, sortDir });

  return (
    <HospitalTable
      key={`${data.page}-${data.pageSize}-${data.sortBy}-${data.sortDir}`}
      initialRows={data.rows}
      initialPage={data.page}
      initialTotalPages={data.totalPages}
      initialTotal={data.total}
      pageSize={data.pageSize}
      pageSizeOptions={data.pageSizeOptions}
      sortBy={data.sortBy as any}
      sortDir={data.sortDir as any}
    />
  );
}

export default async function HospitalPage(props: {
  searchParams: Promise<{ page?: string; pageSize?: string; sortBy?: string; sortDir?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const pageSize = Math.max(5, Math.min(100, Number(searchParams?.pageSize ?? "0") || 15));
  const sortBy = searchParams?.sortBy;
  const sortDir = searchParams?.sortDir;

  return (
    <div className="min-h-screen bg-background py-10 text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Hospital Management</h1>
          <p className="mt-2 text-sm text-muted">
            Manage hospital names and records.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
              Loading...
            </div>
          }
        >
          <HospitalTableLoader page={page} pageSize={pageSize} sortBy={sortBy} sortDir={sortDir} />
        </Suspense>
      </div>
    </div>
  );
}
