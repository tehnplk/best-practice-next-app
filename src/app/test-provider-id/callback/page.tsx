export default async function TestProviderIdCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const redact = (value: unknown): unknown => {
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
  };

  const params = await searchParams;
  const code = params.code;
  const state = params.state;

  const healthBaseUrl = "https://moph.id.th";
  const providerBaseUrl = "https://provider.id.th";
  const redirectUri = process.env.HEALTH_REDIRECT_URI;
  const clientId = process.env.HEALTH_CLIENT_ID;
  const clientSecret = process.env.HEALTH_CLIENT_SECRET;
  const providerClientId = process.env.PROVIDER_CLIENT_ID;
  const providerClientSecret = process.env.PROVIDER_CLIENT_SECRET;

  let tokenResult: unknown = null;
  let tokenStatus: number | null = null;

  let providerTokenResult: unknown = null;
  let providerTokenStatus: number | null = null;

  let providerProfileResult: unknown = null;
  let providerProfileStatus: number | null = null;

  let healthAccessToken: string | null = null;

  if (typeof code === "string" && code.length > 0) {
    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("redirect_uri", redirectUri ?? "");
    body.set("client_id", clientId ?? "");
    body.set("client_secret", clientSecret ?? "");

    const response = await fetch(`${healthBaseUrl}/api/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    tokenStatus = response.status;
    const text = await response.text();
    try {
      tokenResult = JSON.parse(text);
    } catch {
      tokenResult = text;
    }

    const maybeAccessToken = (tokenResult as any)?.data?.access_token;
    if (typeof maybeAccessToken === "string" && maybeAccessToken.length > 0) {
      healthAccessToken = maybeAccessToken;
    }
  }

  if (healthAccessToken) {
    const providerResponse = await fetch(`${providerBaseUrl}/api/v1/services/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: providerClientId ?? "",
        secret_key: providerClientSecret ?? "",
        token_by: "Health ID",
        token: healthAccessToken,
      }),
      cache: "no-store",
    });

    providerTokenStatus = providerResponse.status;
    const text = await providerResponse.text();
    try {
      providerTokenResult = JSON.parse(text);
    } catch {
      providerTokenResult = text;
    }

    const providerAccessToken = (providerTokenResult as any)?.data?.access_token;
    if (
      typeof providerAccessToken === "string" &&
      providerAccessToken.length > 0
    ) {
      const profileResponse = await fetch(
        `${providerBaseUrl}/api/v1/services/profile?position_type=1`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${providerAccessToken}`,
            "client-id": providerClientId ?? "",
            "secret-key": providerClientSecret ?? "",
          },
          cache: "no-store",
        },
      );

      providerProfileStatus = profileResponse.status;
      const text = await profileResponse.text();
      try {
        providerProfileResult = JSON.parse(text);
      } catch {
        providerProfileResult = text;
      }
    }
  }

  return (
    <main>
      <pre>
{JSON.stringify(
  {
    code,
    state,
    all: params,
    token: {
      status: tokenStatus,
      result: redact(tokenResult),
    },
    providerToken: {
      status: providerTokenStatus,
      result: redact(providerTokenResult),
    },
    profile: {
      status: providerProfileStatus,
      result: redact(providerProfileResult),
    },
  },
  null,
  2,
)}
      </pre>
    </main>
  );
}
