import { NextRequest, NextResponse } from "next/server";

import {
  TEST_PROVIDER_ID_COOKIE_NAME,
  unsealProviderProfile,
} from "@/lib/test-provider-id-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sealed = request.cookies.get(TEST_PROVIDER_ID_COOKIE_NAME)?.value;

  if (!sealed) {
    return NextResponse.json(
      { ok: false, error: "missing_session" },
      { status: 401 },
    );
  }

  try {
    const profile = unsealProviderProfile(sealed);
    const res = NextResponse.json({ ok: true, profile });

    res.cookies.set(TEST_PROVIDER_ID_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (e) {
    const res = NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "invalid_session",
      },
      { status: 400 },
    );

    res.cookies.set(TEST_PROVIDER_ID_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return res;
  }
}
