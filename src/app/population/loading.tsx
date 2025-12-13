export default function Loading() {
  return (
    <div className="min-h-screen bg-background py-10 text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <header className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded-md bg-surface-highlight" />
          <div className="mt-3 h-4 w-96 animate-pulse rounded-md bg-surface-highlight" />
        </header>

        {/* Table Skeleton */}
        <div className="rounded-xl border border-border bg-surface">
          {/* Toolbar Skeleton */}
          <div className="flex flex-col gap-3 border-b border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="h-5 w-24 animate-pulse rounded bg-surface-highlight" />
              <div className="flex items-center gap-2">
                <div className="h-9 w-16 animate-pulse rounded-md bg-surface-highlight" />
                <div className="h-9 w-9 animate-pulse rounded-md bg-surface-highlight" />
                <div className="h-9 w-9 animate-pulse rounded-md bg-surface-highlight" />
                <div className="h-9 w-9 animate-pulse rounded-md bg-surface-highlight" />
                <div className="h-9 w-16 animate-pulse rounded-md bg-surface-highlight" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="h-10 w-28 animate-pulse rounded-md bg-surface-highlight" />
            </div>
          </div>

          {/* Table Header Skeleton */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-surface-highlight" />
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-surface-highlight" />
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-surface-highlight" />
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-surface-highlight" />
                  </th>
                  <th className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-surface-highlight" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Generate 10 skeleton rows */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 animate-pulse rounded bg-surface-highlight" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-40 animate-pulse rounded bg-surface-highlight" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-8 animate-pulse rounded bg-surface-highlight" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-surface-highlight" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 animate-pulse rounded bg-surface-highlight" />
                        <div className="h-8 w-8 animate-pulse rounded bg-surface-highlight" />
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
