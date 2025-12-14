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

async function readJsonOrText(res: Response): Promise<{ raw: unknown; text: string }> {
  const text = await res.text();
  try {
    return { raw: JSON.parse(text), text };
  } catch {
    return { raw: text, text };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const healthBaseUrl = "https://moph.id.th";
  const providerBaseUrl = "https://provider.id.th";

  const redirectUri = process.env.HEALTH_REDIRECT_URI;
  const clientId = process.env.HEALTH_CLIENT_ID;
  const clientSecret = process.env.HEALTH_CLIENT_SECRET;
  const providerClientId = process.env.PROVIDER_CLIENT_ID;
  const providerClientSecret = process.env.PROVIDER_CLIENT_SECRET;

  if (!code) {
    return Response.json(
      {
        ok: false,
        error: "Missing ?code",
        state,
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (!redirectUri || !clientId || !clientSecret || !providerClientId || !providerClientSecret) {
    return Response.json(
      {
        ok: false,
        error: "Missing required environment variables",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  let tokenStatus: number | null = null;
  let providerTokenStatus: number | null = null;
  let providerProfileStatus: number | null = null;

  let providerProfileResult: unknown = null;

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", redirectUri);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const tokenRes = await fetch(`${healthBaseUrl}/api/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  tokenStatus = tokenRes.status;
  const tokenParsed = await readJsonOrText(tokenRes);
  const healthAccessToken = (tokenParsed.raw as any)?.data?.access_token;

  if (typeof healthAccessToken !== "string" || healthAccessToken.length === 0) {
    return Response.json(
      {
        ok: false,
        state,
        tokenStatus,
        tokenResult: redact(tokenParsed.raw),
        error: "No access token returned from Health ID",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      }
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
  const providerTokenParsed = await readJsonOrText(providerTokenRes);
  const providerAccessToken = (providerTokenParsed.raw as any)?.data?.access_token;

  if (typeof providerAccessToken !== "string" || providerAccessToken.length === 0) {
    return Response.json(
      {
        ok: false,
        state,
        tokenStatus,
        providerTokenStatus,
        providerTokenResult: redact(providerTokenParsed.raw),
        error: "No access token returned from Provider ID",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      }
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
  const providerProfileParsed = await readJsonOrText(providerProfileRes);
  providerProfileResult = providerProfileParsed.raw;

  return Response.json(
    {
      ok: true,
      state,
      tokenStatus,
      providerTokenStatus,
      providerProfileStatus,
      providerProfileResult: redact(providerProfileResult),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
