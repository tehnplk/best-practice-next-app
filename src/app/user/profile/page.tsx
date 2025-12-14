import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

function getInitials(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${first}${last}`.toUpperCase();
}

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

  const providerId = (providerProfile as any)?.data?.provider_id as
    | string
    | undefined;

  const userInfoWithoutProviderProfile =
    userInfo && typeof userInfo === "object"
      ? { ...(userInfo as Record<string, unknown>), providerProfileJson: undefined }
      : userInfo;

  const displayName =
    (userInfo as any)?.name ?? (userInfo as any)?.email ?? "Unknown";
  const displayEmail = (userInfo as any)?.email as string | undefined;
  const displayImage = (userInfo as any)?.image as string | null | undefined;
  const initials = getInitials(String(displayName));

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            โปรไฟล์ผู้ใช้
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ภาพรวมบัญชีและข้อมูล Provider (สำหรับตรวจสอบ)
          </p>
        </div>
      </div>

      {!session ? (
        <div className="mt-6 mx-auto max-w-xl rounded-2xl border border-border bg-surface p-4 shadow-lg shadow-black/5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-highlight text-sm font-semibold text-foreground">
              ?
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-foreground">
                ยังไม่ได้เข้าสู่ระบบ
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                กรุณา Sign in ด้วย Health ID ก่อน
              </div>
            </div>
          </div>

          <div className="my-4 h-px bg-border" />

          <Link
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-highlight px-4 py-3 text-sm font-semibold text-foreground hover:bg-surface-highlight/80"
            href="/sign-in?next=/user/profile"
          >
            ดูโปรไฟล์ทั้งหมด
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-4 shadow-lg shadow-black/5">
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border bg-surface-highlight">
                {displayImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayImage}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 text-sm font-semibold text-foreground">
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-foreground">
                  {String(displayName)}
                </div>
                {displayEmail ? (
                  <div className="mt-1 truncate text-sm text-muted-foreground">
                    {displayEmail}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="my-4 h-px bg-border" />

            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium text-foreground">Provider ID</div>
              <div className="truncate text-sm text-muted-foreground">
                {providerId ?? "-"}
              </div>
            </div>

            <div className="my-4 h-px bg-border" />

            <Link
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-highlight px-4 py-3 text-sm font-semibold text-foreground hover:bg-surface-highlight/80"
              href="#full-profile"
            >
              ดูโปรไฟล์ทั้งหมด
            </Link>
          </div>

          <div id="full-profile" className="space-y-4">
            <details className="rounded-xl border border-border bg-surface p-4">
              <summary className="cursor-pointer select-none text-sm font-semibold text-foreground">
                รายละเอียด (JSON)
              </summary>
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <JsonCard title="Session" data={sessionInfo} />
                  <JsonCard title="User" data={userInfoWithoutProviderProfile} />
                </div>
                <JsonCard title="Provider Profile" data={providerProfile} />
              </div>
            </details>
          </div>
        </div>
      )}
    </main>
  );
}
