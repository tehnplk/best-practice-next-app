import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TestProviderIdCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const url = new URL("http://localhost");
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") {
      url.searchParams.set(k, v);
    } else if (Array.isArray(v)) {
      for (const item of v) {
        url.searchParams.append(k, item);
      }
    }
  }

  const q = url.searchParams.toString();
  redirect(`/api/test-provider-id/callback${q ? `?${q}` : ""}`);
}
