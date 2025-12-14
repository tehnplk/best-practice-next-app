import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type EnvConfig = {
  healthClientId: string;
  healthClientSecret: string;
  providerClientId: string;
  providerClientSecret: string;
};

type RedirectContext = {
  origin: string;
  redirectUri: string;
};

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

function renderJson(data: unknown) {
  return (
    <main>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}

async function readJsonOrText(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function getRedirectContext(): Promise<RedirectContext> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;
  return {
    origin,
    redirectUri: `${origin}/test-provider-id/callback`,
  };
}

function getEnvConfig(): EnvConfig | null {
  const healthClientId = process.env.HEALTH_CLIENT_ID;
  const healthClientSecret = process.env.HEALTH_CLIENT_SECRET;
  const providerClientId = process.env.PROVIDER_CLIENT_ID;
  const providerClientSecret = process.env.PROVIDER_CLIENT_SECRET;

  if (!healthClientId || !healthClientSecret || !providerClientId || !providerClientSecret) {
    return null;
  }

  return {
    healthClientId,
    healthClientSecret,
    providerClientId,
    providerClientSecret,
  };
}

async function exchangeCodeForHealthToken(args: {
  code: string;
  redirectUri: string;
  healthClientId: string;
  healthClientSecret: string;
}) {
  const healthBaseUrl = "https://moph.id.th";

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", args.code);
  body.set("redirect_uri", args.redirectUri);
  body.set("client_id", args.healthClientId);
  body.set("client_secret", args.healthClientSecret);

  const res = await fetch(`${healthBaseUrl}/api/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const status = res.status;
  const result = await readJsonOrText(res);
  const accessToken = (result as any)?.data?.access_token;

  return {
    status,
    result,
    accessToken: typeof accessToken === "string" && accessToken.length > 0 ? accessToken : null,
  };
}

async function exchangeHealthTokenForProviderToken(args: {
  healthAccessToken: string;
  providerClientId: string;
  providerClientSecret: string;
}) {
  const providerBaseUrl = "https://provider.id.th";

  const res = await fetch(`${providerBaseUrl}/api/v1/services/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: args.providerClientId,
      secret_key: args.providerClientSecret,
      token_by: "Health ID",
      token: args.healthAccessToken,
    }),
    cache: "no-store",
  });

  const status = res.status;
  const result = await readJsonOrText(res);
  const accessToken = (result as any)?.data?.access_token;

  return {
    status,
    result,
    accessToken: typeof accessToken === "string" && accessToken.length > 0 ? accessToken : null,
  };
}

async function fetchProviderProfile(args: {
  providerAccessToken: string;
  providerClientId: string;
  providerClientSecret: string;
}) {
  const providerBaseUrl = "https://provider.id.th";

  const res = await fetch(`${providerBaseUrl}/api/v1/services/profile?position_type=1`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.providerAccessToken}`,
      "client-id": args.providerClientId,
      "secret-key": args.providerClientSecret,
    },
    cache: "no-store",
  });

  return {
    status: res.status,
    result: await readJsonOrText(res),
  };
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

  if (typeof error === "string" && error.length > 0) {
    return renderJson({ ok: false, error, state });
  }

  if (typeof code !== "string" || code.length === 0) {
    return renderJson({ ok: false, error: "Missing ?code", state });
  }

  const env = getEnvConfig();
  if (!env) {
    return renderJson({ ok: false, error: "Missing required environment variables" });
  }

  const { redirectUri } = await getRedirectContext();

  try {
    const healthToken = await exchangeCodeForHealthToken({
      code,
      redirectUri,
      healthClientId: env.healthClientId,
      healthClientSecret: env.healthClientSecret,
    });

    if (!healthToken.accessToken) {
      return renderJson({
        ok: false,
        state,
        tokenStatus: healthToken.status,
        tokenResult: redact(healthToken.result),
        error: "No access token returned from Health ID",
      });
    }

    const providerToken = await exchangeHealthTokenForProviderToken({
      healthAccessToken: healthToken.accessToken,
      providerClientId: env.providerClientId,
      providerClientSecret: env.providerClientSecret,
    });

    if (!providerToken.accessToken) {
      return renderJson({
        ok: false,
        state,
        tokenStatus: healthToken.status,
        providerTokenStatus: providerToken.status,
        providerTokenResult: redact(providerToken.result),
        error: "No access token returned from Provider ID",
      });
    }

    const providerProfile = await fetchProviderProfile({
      providerAccessToken: providerToken.accessToken,
      providerClientId: env.providerClientId,
      providerClientSecret: env.providerClientSecret,
    });

    return renderJson({
      ok: true,
      state,
      tokenStatus: healthToken.status,
      providerTokenStatus: providerToken.status,
      providerProfileStatus: providerProfile.status,
      providerProfileResult: redact(providerProfile.result),
    });
  } catch (e) {
    return renderJson({
      ok: false,
      error: e instanceof Error ? e.message : "Unknown error",
    });
  }
}
