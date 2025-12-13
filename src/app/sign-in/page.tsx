"use client";

import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const signIn = async () => {
    const { error: signInError } = await authClient.signIn.oauth2({
      providerId: "health-id",
      callbackURL: "/dashboard",
      errorCallbackURL: "/sign-in?error=oauth",
    });

    if (signInError) {
      toast.error(signInError.message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow space-y-4">
        <h1 className="text-lg font-semibold">Sign in</h1>
        {error && (
          <p className="text-sm text-red-600">Sign in failed: {error}</p>
        )}
        <button
          type="button"
          onClick={signIn}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sign in with Health ID
        </button>
      </div>
    </main>
  );
}
