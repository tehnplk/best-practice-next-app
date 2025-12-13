export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header Skeleton */}
        <header className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-3 h-4 w-96 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </header>

        {/* Table Skeleton */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {/* Toolbar Skeleton */}
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="h-5 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex items-center gap-2">
                <div className="h-9 w-16 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-9 w-9 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-9 w-9 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-9 w-9 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-9 w-16 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="h-10 w-28 animate-pulse rounded-md bg-zinc-900 dark:bg-zinc-100" />
            </div>
          </div>

          {/* Table Header Skeleton */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Generate 10 skeleton rows */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-900"
                  >
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-8 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-8 w-8 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
