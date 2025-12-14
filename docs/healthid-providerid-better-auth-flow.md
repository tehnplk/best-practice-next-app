# Health ID -> Provider ID -> Better Auth Flow (Next.js)

เอกสารนี้อธิบายขั้นตอนการยืนยันตัวตน (authentication) ตั้งแต่ **Health ID OAuth** ไปจนถึง **Provider ID Profile Fetch** และจบด้วยการสร้าง **Better Auth Session** ในแอป Next.js เพื่อให้ dev คนอื่นสามารถ debug / พัฒนาต่อได้ง่าย

---

## 1) High-level Overview

**Goal:**
- ผู้ใช้กด Sign-in ที่แอป
- แอป redirect ไป Health ID เพื่อทำ OTP/consent
- Health ID redirect กลับมาที่แอปพร้อม `code` + `state`
- แอปแลก `code` เป็น **Health Access Token**
- ใช้ Health Access Token ไปแลกเป็น **Provider Access Token**
- ใช้ Provider Access Token ไปเรียก **Provider Profile**
- Map profile -> user fields แล้วให้ Better Auth สร้าง `user/session/account` ใน DB
- Redirect ผู้ใช้ไป `/user/profile`

**Where state is stored:** Better Auth เก็บ OAuth state/PKCE ไว้ในตาราง `verification` (SQLite) และ default expiry ~10 นาที

---

## 2) Prerequisites / Requirements

- **Next.js** (App Router)
- **better-auth**
- **drizzle-orm** + SQLite (`better-sqlite3`)
- Health ID ต้อง whitelist `redirect_uri` ให้ตรงแบบ **exact match**

---

## 3) Environment Variables

ตั้งค่าใน `.env` / `.env.local` (อย่า commit secret)

- `HEALTH_CLIENT_ID`
- `HEALTH_CLIENT_SECRET`
- `HEALTH_REDIRECT_URI`
  - ต้องเป็น: `http://localhost:3000/api/auth/oauth2/callback/health-id`
- `PROVIDER_CLIENT_ID`
- `PROVIDER_CLIENT_SECRET`
- `BETTER_AUTH_URL`
  - เช่น `http://localhost:3000`
- `BETTER_AUTH_SECRET`
- `DATABASE_URL`
  - แนะนำให้ใช้ **relative path** จาก project root เพื่อให้ portable เช่น
    - `./data/app.db`
  - หมายเหตุ: โปรเจกต์นี้ resolve relative path แบบ deterministic จาก project root (ดู `src/db/index.ts`)

---

## 4) Endpoints (What calls what)

### App (Better Auth routes)
- `POST /api/auth/sign-in/oauth2`
  - เริ่ม OAuth และสร้าง record ในตาราง `verification`
  - คืน url ให้ frontend redirect ไป provider

- `GET /api/auth/oauth2/callback/health-id`
  - รับ `code` + `state` จาก Health ID
  - Validate `state` (อ่านจาก `verification`)
  - แลก token + fetch profile
  - สร้าง session แล้ว redirect ต่อไปยัง callbackURL (เช่น `/user/profile`)

### App (Custom proxy for Health ID token)
- `POST /api/health-id/token`
  - Proxy ไป Health ID token endpoint
  - ทำให้ response shape เป็น OAuth2-friendly (Better Auth อ่านง่าย)

### App (Debug endpoint)
- `GET /api/auth/me/provider-profile`
  - ต้อง auth ก่อน (ใช้ `sessionMiddleware`)
  - อ่าน `providerProfileJson` จาก DB (table `user`) แล้ว return JSON (provider profile ตรง ๆ)

---

## 5) Step-by-step Flow (Sequence)

### Step A — User initiates sign-in
Frontend: `src/app/sign-in/page.tsx`
- เรียก `authClient.signIn.oauth2({ providerId: "health-id", callbackURL, errorCallbackURL, newUserCallbackURL })`
- ได้ URL จาก Better Auth แล้ว `window.location.href = url`

### Step B — Health ID authorization & OTP/consent
Browser redirect ไป Health ID:
- `GET https://moph.id.th/oauth/redirect?...&redirect_uri=<HEALTH_REDIRECT_URI>&state=<state>`

User ทำ OTP/consent บน Health ID UI

### Step C — Health ID redirects back to our callback
Health ID redirect กลับ:
- `GET /api/auth/oauth2/callback/health-id?code=...&state=...`

Better Auth จะ:
- หา `state` ในตาราง `verification`
- ตรวจ `expiresAt` (default ~10 นาที)

### Step D — Exchange Health code -> Health access token
Better Auth เรียก token endpoint (เรา proxy ไว้):
- `POST /api/health-id/token`

### Step E — Exchange Health access token -> Provider access token
ใน `getUserInfo` ของ provider `health-id` (ดู `src/lib/auth.ts`)
- call `https://provider.id.th/api/v1/services/token`

### Step F — Fetch Provider profile
ใน `getUserInfo`:
- call `https://provider.id.th/api/v1/services/profile?position_type=1`

แล้ว map เป็น user object:
- `name`
- `email` (สร้างเป็น provider-local หากไม่มี email ที่ใช้เป็น unique จริง)
- `providerProfileJson` (stringified JSON)

### Step G — Create/Update user and create session
Better Auth + drizzleAdapter จะเขียนข้อมูลลง DB:
- `user`
- `account`
- `session`

แล้ว set cookie:
- `better-auth.session_token=...; HttpOnly; SameSite=Lax`

### Step H — Redirect to callbackURL
ถ้าหน้า sign-in ส่ง `callbackURL=/user/profile`
- user จะถูก redirect ไป `/user/profile`

---

## 6) Route Protection (/user/*)

ไฟล์: `src/proxy.ts`

Behavior:
- ถ้าเข้าหน้า `/user/*` แล้วไม่มี session -> redirect ไป `/sign-in?next=<path>`
- ถ้า session มีอยู่แล้ว และเข้าหน้า `/sign-in` -> redirect ไป `next` หรือ `/user/profile`

Session check ใช้:
- `GET /api/auth/get-session` โดย forward header `cookie`

---

## 7) Database Schema Notes

ไฟล์: `src/db/schema.ts`

ตารางที่เกี่ยวข้อง:
- `user`
  - `providerProfileJson` (text)
- `session`
- `account`
- `verification` (Better Auth ใช้เก็บ OAuth state/PKCE)

---

## 8) Troubleshooting / Pitfalls

### A) Error: `please_restart_the_process`
สาเหตุหลัก:
- `state` หาไม่เจอ (verification not found)
- หรือ `state` หมดอายุ (default ~10 นาที)

แนวทางแก้:
- ทำ OTP/consent ให้เสร็จใน ~10 นาที
- ห้าม restart dev server ระหว่าง flow
- สำคัญมาก: ให้ `DATABASE_URL` ชี้ไป DB ไฟล์เดียวกันเสมอ
  - ในโปรเจกต์นี้สามารถใช้ relative path ได้ เพราะมีการ resolve จาก project root แบบ deterministic (ลดปัญหาแต่ละ worker resolve คนละที่)

### B) `GET /api/auth/me/provider-profile` ได้ `null`
ถ้า endpoint ไปพึ่ง cookie จะเสี่ยงเพราะ:
- cookie อาจใหญ่เกิน limit
- หรือไม่ได้ set cookie

แนวทางที่ใช้ในโปรเจกต์นี้:
- อ่านจาก DB ผ่าน session (ดู `src/lib/auth.ts` endpoint `/me/provider-profile`)

### C) Redirect URI mismatch
- Health ID ต้อง whitelist `HEALTH_REDIRECT_URI` แบบ exact match
- ต้องตรงกับที่ Better Auth ใช้จริง: `/api/auth/oauth2/callback/health-id`

---

## 9) Key Files (Source of truth)

- `src/lib/auth.ts`
  - Better Auth config + genericOAuth provider (`health-id`)
  - token exchange + profile fetch
  - custom endpoint: `/api/auth/me/provider-profile`

- `src/app/api/auth/[...all]/route.ts`
  - Next.js handler ที่ mount Better Auth ไว้ใต้ `/api/auth/*`

- `src/app/api/health-id/token/route.ts`
  - Proxy token exchange (Health ID)

- `src/app/sign-in/page.tsx`
  - UI/logic สำหรับเริ่ม OAuth

- `src/app/user/profile/page.tsx`
  - แสดง session JSON เพื่อ debug

- `src/proxy.ts`
  - protect route `/user/*`

---

## 10) Quick Verification Checklist

- `GET /user/profile` (unauthenticated) -> redirect ไป `/sign-in?next=/user/profile`
- กด sign-in -> ไป Health ID
- ทำ OTP/consent -> กลับ `/user/profile` ได้
- `GET /api/auth/me/provider-profile` คืน provider profile JSON (ไม่ใช่ `null`)
