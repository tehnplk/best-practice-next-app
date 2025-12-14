"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function renderJson(data: unknown) {
  return (
    <main>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}

export default function TestProviderIdProfilePage({
}: {}) {
  const sp = useSearchParams();
  const error = sp.get("error");
  const state = sp.get("state");

  const initialError = useMemo(() => {
    return typeof error === "string" && error.length > 0 ? error : null;
  }, [error]);

  const [loadState, setLoadState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "loaded"; profile: unknown }
    | { status: "error"; error: string }
  >({ status: "idle" });

  useEffect(() => {
    if (initialError) {
      setLoadState({ status: "error", error: initialError });
      return;
    }

    const fromStorage = (() => {
      try {
        const raw = localStorage.getItem("test_provider_id_profile");
        if (!raw) return null;
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    })();

    if (fromStorage) {
      setLoadState({ status: "loaded", profile: fromStorage });
      return;
    }

    let cancelled = false;
    setLoadState({ status: "loading" });

    fetch("/api/test-provider-id/profile", {
      method: "GET",
      cache: "no-store",
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as any;
        if (!res.ok || !json?.ok) {
          const msg =
            typeof json?.error === "string" && json.error.length > 0
              ? json.error
              : `http_${res.status}`;
          throw new Error(msg);
        }
        return json.profile as unknown;
      })
      .then((profile) => {
        if (cancelled) return;
        try {
          localStorage.setItem(
            "test_provider_id_profile",
            JSON.stringify(profile ?? null),
          );
        } catch {
          // ignore localStorage errors
        }
        setLoadState({ status: "loaded", profile });
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadState({
          status: "error",
          error: e instanceof Error ? e.message : "load_failed",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [initialError]);

  if (loadState.status === "loading" || loadState.status === "idle") {
    return renderJson({ ok: false, loading: true, state });
  }

  if (loadState.status === "error") {
    return renderJson({ ok: false, error: loadState.error, state });
  }

  return renderJson({ ok: true, profile: loadState.profile, state });
}
