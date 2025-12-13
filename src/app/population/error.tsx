"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Population page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background py-10 text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-red-900 dark:text-red-100">
                Something went wrong!
              </h2>
              <p className="max-w-md text-sm text-red-700 dark:text-red-300">
                An error occurred while loading the population data. Please try
                again or contact support if the problem persists.
              </p>
              {error.digest && (
                <p className="font-mono text-xs text-red-500 dark:text-red-400">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={reset}
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-500 dark:hover:bg-red-600"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
