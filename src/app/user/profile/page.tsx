import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UserProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">User Profile</h1>

      {!session ? (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">Not signed in.</p>
          <Link
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            href="/sign-in?next=/user/profile"
          >
            Go to sign in
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-md border p-4">
          <pre className="text-xs">{JSON.stringify(session, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}
