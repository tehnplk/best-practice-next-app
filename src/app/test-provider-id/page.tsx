import { providerIdProcess } from "./actions";

export default function TestProviderIdPage() {
  return (
    <main className="min-h-[70vh] px-4">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">ทดสอบ Login (Health ID)</h1>
        <p className="text-sm text-muted-foreground">
          ปุ่มนี้จะ redirect ไป Health ID แล้วกลับมาที่ <code>/test-provider-id/callback</code> เพื่อทำ Step 3-5 ตามเอกสาร
        </p>

        <form action={providerIdProcess}>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            เริ่มทดสอบ Login ด้วย Health ID
          </button>
        </form>
      </div>
    </main>
  );
}
