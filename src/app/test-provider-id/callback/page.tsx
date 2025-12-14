import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "access_token" && typeof v === "string") {
      const start = v.slice(0, 12);
      const end = v.slice(-6);
      out[k] = `${start}…${end} (len=${v.length})`;
      continue;
    }
    if (k === "client_secret" || k === "secret_key") {
      out[k] = "***";
      continue;
    }
    out[k] = redact(v);
  }
  return out;
}

async function readJsonOrText(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export default async function TestProviderIdCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = params.code;
  const state = params.state;
  const error = params.error;

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/test-provider-id/callback`;
  const healthClientId = process.env.HEALTH_CLIENT_ID;
  const healthClientSecret = process.env.HEALTH_CLIENT_SECRET;
  const providerClientId = process.env.PROVIDER_CLIENT_ID;
  const providerClientSecret = process.env.PROVIDER_CLIENT_SECRET;

  if (typeof error === "string" && error.length > 0) {
    return (
      <main>
        <pre>{JSON.stringify({ ok: false, error, state }, null, 2)}</pre>
      </main>
    );
  }

  if (typeof code !== "string" || code.length === 0) {
    return (
      <main>
        <pre>{JSON.stringify({ ok: false, error: "Missing ?code", state }, null, 2)}</pre>
      </main>
    );
  }

  if (!healthClientId || !healthClientSecret || !providerClientId || !providerClientSecret) {
    return (
      <main>
        <pre>
          {JSON.stringify(
            {
              ok: false,
              error: "Missing required environment variables",
            },
            null,
            2
          )}
        </pre>
      </main>
    );
  }

  const healthBaseUrl = "https://moph.id.th";
  const providerBaseUrl = "https://provider.id.th";

  let tokenStatus: number | null = null;
  let providerTokenStatus: number | null = null;
  let providerProfileStatus: number | null = null;

  let tokenResult: unknown = null;
  let providerTokenResult: unknown = null;
  let providerProfileResult: unknown = null;

  try {
    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("redirect_uri", redirectUri);
    body.set("client_id", healthClientId);
    body.set("client_secret", healthClientSecret);

    const tokenRes = await fetch(`${healthBaseUrl}/api/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    tokenStatus = tokenRes.status;
    tokenResult = await readJsonOrText(tokenRes);

    const healthAccessToken = (tokenResult as any)?.data?.access_token;
    if (typeof healthAccessToken !== "string" || healthAccessToken.length === 0) {
      return (
        <main>
          <pre>
            {JSON.stringify(
              {
                ok: false,
                state,
                tokenStatus,
                tokenResult: redact(tokenResult),
                error: "No access token returned from Health ID",
              },
              null,
              2
            )}
          </pre>
        </main>
      );
    }

    const providerTokenRes = await fetch(`${providerBaseUrl}/api/v1/services/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: providerClientId,
        secret_key: providerClientSecret,
        token_by: "Health ID",
        token: healthAccessToken,
      }),
      cache: "no-store",
    });

    providerTokenStatus = providerTokenRes.status;
    providerTokenResult = await readJsonOrText(providerTokenRes);

    const providerAccessToken = (providerTokenResult as any)?.data?.access_token;
    if (typeof providerAccessToken !== "string" || providerAccessToken.length === 0) {
      return (
        <main>
          <pre>
            {JSON.stringify(
              {
                ok: false,
                state,
                tokenStatus,
                providerTokenStatus,
                providerTokenResult: redact(providerTokenResult),
                error: "No access token returned from Provider ID",
              },
              null,
              2
            )}
          </pre>
        </main>
      );
    }

    const providerProfileRes = await fetch(`${providerBaseUrl}/api/v1/services/profile?position_type=1`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${providerAccessToken}`,
        "client-id": providerClientId,
        "secret-key": providerClientSecret,
      },
      cache: "no-store",
    });

    providerProfileStatus = providerProfileRes.status;
    providerProfileResult = await readJsonOrText(providerProfileRes);

    return (
      <main>
        <pre>
          {JSON.stringify(
            {
              ok: true,
              state,
              tokenStatus,
              providerTokenStatus,
              providerProfileStatus,
              providerProfileResult: redact(providerProfileResult),
            },
            null,
            2
          )}
        </pre>
      </main>
    );
  } catch (e) {
    return (
      <main>
        <pre>{JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, null, 2)}</pre>
      </main>
    );
  }
}
