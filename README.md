# Best Practice Next App

แอปอ้างอิง Next.js (App Router) ที่สาธิต:
- Health ID → Provider ID OAuth ผ่าน [`better-auth`](https://github.com/gndelia/better-auth) บน SQLite/Drizzle
- การปกป้องเส้นทางโปรไฟล์ผู้ใช้ด้วย session cookie
- หน้าจอ Population และ Hospital พร้อม inline edit และสรุปบนแดชบอร์ด
- หน้าทดลอง `/test-provider-id` สำหรับดีบักการดึง Provider Profile ตรง ๆ

## วิธีเริ่มต้นอย่างรวดเร็ว
1. ติดตั้ง dependency
   ```bash
   npm install
   ```
2. สร้างไฟล์ `.env.local` และตั้งค่า:
   - `DATABASE_URL=./data/app.db` (ค่าเริ่มต้น SQLite; relative path จะถูก resolve จาก project root)
   - `HEALTH_CLIENT_ID=...`
   - `HEALTH_CLIENT_SECRET=...`
   - `HEALTH_REDIRECT_URI=http://localhost:3000/api/auth/oauth2/callback/health-id`
   - `BETTER_AUTH_URL=http://localhost:3000`
   - `PROVIDER_CLIENT_ID=...`
   - `PROVIDER_CLIENT_SECRET=...`
   - `TEST_PROVIDER_ID_SESSION_SECRET=...` (ใช้เข้ารหัสคุกกี้ชั่วคราวใน `/test-provider-id`)
3. ซิงก์สคีมาด้วย Drizzle (มีไฟล์ DB เริ่มต้นที่ `./data/app.db` แล้ว)
   ```bash
   npm run db:push
   ```
4. รัน dev server
   ```bash
   npm run dev
   ```
5. เปิด http://localhost:3000 (แดชบอร์ด) แล้วกด **Sign in** เพื่อเริ่ม Health ID OAuth จากนั้นดู session/โปรไฟล์ผู้ให้บริการที่ `/user/profile`

## สคริปต์ที่ใช้ได้
- `npm run dev` – รัน Next.js โหมดพัฒนา
- `npm run build` / `npm run start` – บิลด์และรันโหมดโปรดักชัน
- `npm run lint` – รัน ESLint
- `npm run db:push` – ซิงก์สคีมากับฐานข้อมูล SQLite
- `npm run db:studio` – เปิด Drizzle Studio

## เส้นทางและฟีเจอร์สำคัญ
- `/dashboard` – การ์ดสรุปประชากรและการรับเข้าโรงพยาบาล
- `/population` – ค้นหา/กรองทะเบียนประชากร พร้อม inline edit
- `/hospital` – จัดการข้อมูลโรงพยาบาล
- `/sign-in` → `/user/profile` – Flow Health ID → Provider ID, session และตัวดูโปรไฟล์ผู้ให้บริการ
- `/api/auth/*` – Better Auth handlers; `/api/auth/me/provider-profile` คืน JSON โปรไฟล์ผู้ให้บริการที่บันทึกไว้
- `/test-provider-id/*` – playground ทดสอบการดึง Provider Profile แบบด้วยตนเอง

## เอกสาร flow การยืนยันตัวตน
ไดอะแกรมและทิปการดีบักอยู่ที่:
- `docs/healthid-providerid-better-auth-flow.md` – flow ครบ Health ID + Provider ID + Better Auth
- `docs/PROVIDER_ID_PROFILE_FLOW.md` – walkthrough สำหรับ playground `/test-provider-id`

## หมายเหตุ
- เส้นทางฐานข้อมูล fallback เป็น `./data/app.db` (ดู `src/db/index.ts`) ควรใช้ path เดียวกันทุกครั้งเพื่อลดปัญหา state OAuth หายระหว่างพัฒนา
- ใช้ Tailwind CSS v4 สำหรับสไตล์ ดู tokens ใน `src/app/globals.css`
