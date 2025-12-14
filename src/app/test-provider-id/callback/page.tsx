import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TestProviderIdCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = params.code;
  const state = params.state;

  if (typeof code !== "string" || code.length === 0) {
    return (
      <main>
        <pre>{JSON.stringify({ ok: false, error: "Missing ?code", state }, null, 2)}</pre>
      </main>
    );
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const url = new URL("/api/test-provider-id/profile", origin);
  url.searchParams.set("code", code);
  if (typeof state === "string" && state.length > 0) {
    url.searchParams.set("state", state);
  }

  const res = await fetch(url, {
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({ ok: false, error: "Invalid JSON response" }));

  return (
    <main>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
