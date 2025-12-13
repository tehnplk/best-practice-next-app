import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const profileRes = await auth.api.getProviderProfile({
    headers: await headers(),
  });

  const profile = (profileRes as any)?.profile ?? null;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-4">Provider Profile</h1>
        {!session && (
          <p className="text-sm text-red-600 mb-4">Not authenticated</p>
        )}
        <pre className="text-xs bg-slate-900 text-slate-100 rounded-md p-4 overflow-auto">
{JSON.stringify({ session, profile }, null, 2)}
        </pre>
      </div>
    </main>
  );
}
