 "use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function providerIdProcess() {
  const clientId = process.env.HEALTH_CLIENT_ID;

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/test-provider-id/callback`;

  if (!clientId) {
    redirect(`/test-provider-id/profile?error=missing_env`);
  }

  const url = new URL("https://moph.id.th/oauth/redirect");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", randomUUID());

  redirect(url.toString());
}
