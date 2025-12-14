import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

function JsonCard({ title, data }: { title: string; data: unknown }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-primary to-secondary shadow-sm shadow-primary/20" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h2>
        </div>
      </div>
      <pre className="max-h-[60vh] overflow-auto bg-zinc-900/60 p-4 font-mono text-xs leading-relaxed text-zinc-100/90 shadow-inner ring-1 ring-white/10">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}

export default async function UserProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const sessionData = session as any;
  const sessionInfo = sessionData?.session ?? null;
  const userInfo = sessionData?.user ?? null;

  const providerProfileRaw = userInfo?.providerProfileJson;
  let providerProfile: unknown = null;
  if (typeof providerProfileRaw === "string" && providerProfileRaw.length > 0) {
    try {
      providerProfile = JSON.parse(providerProfileRaw);
    } catch {
      providerProfile = { raw: providerProfileRaw };
    }
  }

  const userInfoWithoutProviderProfile =
    userInfo && typeof userInfo === "object"
      ? { ...(userInfo as Record<string, unknown>), providerProfileJson: undefined }
      : userInfo;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            User Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Session + user + provider profile snapshot for debugging.
          </p>
        </div>
      </div>

      {!session ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border bg-surface/80 px-4 py-3">
            <p className="text-sm font-medium text-foreground">Not signed in</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please sign in with Health ID to view your session and provider profile.
            </p>
          </div>
          <div className="px-4 py-4">
            <Link
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90"
              href="/sign-in?next=/user/profile"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <JsonCard title="Session" data={sessionInfo} />
            <JsonCard title="User" data={userInfoWithoutProviderProfile} />
          </div>
          <JsonCard title="Provider Profile" data={providerProfile} />
        </div>
      )}
    </main>
  );
}
