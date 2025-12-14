import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  sealProviderProfile,
  TEST_PROVIDER_ID_COOKIE_NAME,
} from "@/lib/test-provider-id-session";

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
    redirectUri: `${origin}/api/test-provider-id/callback`,
  };
}

function getEnvConfig(): EnvConfig | null {
  const healthClientId = process.env.HEALTH_CLIENT_ID;
  const healthClientSecret = process.env.HEALTH_CLIENT_SECRET;
  const providerClientId = process.env.PROVIDER_CLIENT_ID;
  const providerClientSecret = process.env.PROVIDER_CLIENT_SECRET;

  if (
    !healthClientId ||
    !healthClientSecret ||
    !providerClientId ||
    !providerClientSecret
  ) {
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
    accessToken:
      typeof accessToken === "string" && accessToken.length > 0
        ? accessToken
        : null,
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
    accessToken:
      typeof accessToken === "string" && accessToken.length > 0
        ? accessToken
        : null,
  };
}

async function fetchProviderProfile(args: {
  providerAccessToken: string;
  providerClientId: string;
  providerClientSecret: string;
}) {
  const providerBaseUrl = "https://provider.id.th";

  const res = await fetch(
    `${providerBaseUrl}/api/v1/services/profile?position_type=1`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.providerAccessToken}`,
        "client-id": args.providerClientId,
        "secret-key": args.providerClientSecret,
      },
      cache: "no-store",
    },
  );

  return {
    status: res.status,
    result: await readJsonOrText(res),
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error");

  const profileUrl = new URL("/test-provider-id/profile", url.origin);

  if (error) {
    profileUrl.searchParams.set("error", error);
    if (state) profileUrl.searchParams.set("state", state);
    return NextResponse.redirect(profileUrl);
  }

  if (!code) {
    profileUrl.searchParams.set("error", "missing_code");
    if (state) profileUrl.searchParams.set("state", state);
    return NextResponse.redirect(profileUrl);
  }

  const env = getEnvConfig();
  if (!env) {
    profileUrl.searchParams.set("error", "missing_env");
    if (state) profileUrl.searchParams.set("state", state);
    return NextResponse.redirect(profileUrl);
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
      profileUrl.searchParams.set("error", "health_token_missing");
      if (state) profileUrl.searchParams.set("state", state);
      return NextResponse.redirect(profileUrl);
    }

    const providerToken = await exchangeHealthTokenForProviderToken({
      healthAccessToken: healthToken.accessToken,
      providerClientId: env.providerClientId,
      providerClientSecret: env.providerClientSecret,
    });

    if (!providerToken.accessToken) {
      profileUrl.searchParams.set("error", "provider_token_missing");
      if (state) profileUrl.searchParams.set("state", state);
      return NextResponse.redirect(profileUrl);
    }

    const providerProfile = await fetchProviderProfile({
      providerAccessToken: providerToken.accessToken,
      providerClientId: env.providerClientId,
      providerClientSecret: env.providerClientSecret,
    });

    if (providerProfile.status < 200 || providerProfile.status >= 300) {
      profileUrl.searchParams.set("error", "provider_profile_fetch_failed");
      if (state) profileUrl.searchParams.set("state", state);
      return NextResponse.redirect(profileUrl);
    }

    const res = NextResponse.redirect(profileUrl);

    const sealed = sealProviderProfile(providerProfile.result);

    res.cookies.set(TEST_PROVIDER_ID_COOKIE_NAME, sealed, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });

    if (state) res.cookies.set("test_provider_id_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60,
    });

    return res;
  } catch (e) {
    profileUrl.searchParams.set(
      "error",
      e instanceof Error ? e.message : "unknown_error",
    );
    if (state) profileUrl.searchParams.set("state", state);
    return NextResponse.redirect(profileUrl);
  }
}
