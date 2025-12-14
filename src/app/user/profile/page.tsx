import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

function JsonCard({ title, data }: { title: string; data: unknown }) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <pre className="max-h-[60vh] overflow-auto p-4 text-xs leading-relaxed">
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
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <JsonCard title="Session" data={sessionInfo} />
            <JsonCard title="User" data={userInfoWithoutProviderProfile} />
          </div>
          <JsonCard title="Provider Profile" data={providerProfile} />
        </div>
      )}
    </main>
  );
}
