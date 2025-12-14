"use client";

import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const nextPath = nextParam && nextParam.startsWith("/") ? nextParam : "/user/profile";

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in with Health ID to create a Better Auth session.
      </p>

      <button
        type="button"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        onClick={async () => {
          const errorUrl = new URL("/sign-in", window.location.origin);
          errorUrl.searchParams.set("error", "oauth");
          errorUrl.searchParams.set("next", nextPath);

          const res = await authClient.signIn.oauth2({
            providerId: "health-id",
            callbackURL: nextPath,
            errorCallbackURL: `${errorUrl.pathname}${errorUrl.search}`,
            newUserCallbackURL: nextPath,
          });

          const url = (res as any)?.data?.url;
          if (typeof url === "string" && url.length > 0) {
            window.location.href = url;
          }
        }}
      >
        Continue with Health ID
      </button>

      <div className="mt-6 rounded-md border p-4">
        <div className="text-sm font-medium">Debug</div>
        <div className="mt-2 text-xs text-muted-foreground">
          After signing in, call <code>/api/auth/me/provider-profile</code>.
        </div>
      </div>
    </main>
  );
}
