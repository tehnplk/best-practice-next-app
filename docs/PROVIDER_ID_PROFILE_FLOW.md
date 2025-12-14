# Provider ID Profile Fetch Flow (Health ID OAuth) / ขั้นตอนการดึง Provider ID Profile ผ่าน Health ID OAuth

> ไฟล์นี้สรุป flow แบบ step-by-step สำหรับ junior dev ให้เข้าใจง่าย โดยอ้างอิงจากคู่มือ Health ID/Provider ID และโค้ด debug ในโฟลเดอร์ `src/app/test-provider-id`.

---

## TL;DR (ภาพรวม)

- ผู้ใช้กดปุ่ม Login -> redirect ไปหน้า Health ID
- Health ID redirect กลับมาที่ `redirect_uri` พร้อม `code`
- Backend เอา `code` ไปแลก **Health access token**
- เอา **Health access token** ไปแลก **Provider access token**
- เอา **Provider access token** ไปดึง **Provider profile** (ข้อมูลบุคคล + organization)

---

## 0) สิ่งที่ต้องมี (Environment Variables)

- `HEALTH_CLIENT_ID`
- `HEALTH_CLIENT_SECRET`
- `HEALTH_REDIRECT_URI` (ต้อง whitelist กับ Health ID แบบ exact match)
- `PROVIDER_CLIENT_ID`
- `PROVIDER_CLIENT_SECRET`

> Note: ห้าม commit ค่า secret ลง git

---

## 1) Step 1: Redirect ไป Health ID (Authorization Request)

### Endpoint
- `GET https://moph.id.th/oauth/redirect`

### Query params
- `client_id` (required)
- `redirect_uri` (required)
- `response_type=code` (required)
- `state` (optional แต่แนะนำ)

### โค้ดตัวอย่าง (แนวคิด)
- หน้า `/test-provider-id` เรียก server action แล้ว `redirect()` ไป URL ข้างต้น

### หมายเหตุสำคัญ
- `redirect_uri` ต้องเป็น URL ฝั่งเรา
  - **DEV (local)**: `http://localhost:3000/test-provider-id/callback`
  - **PROD**: `https://your-domain.com/test-provider-id/callback`
    - ต้องเป็น **HTTPS**
    - ต้อง whitelist ในระบบ Health ID แบบ **exact match** (รวม `https`/โดเมน/พาธ และระวัง `www` + trailing slash)
- ต้อง whitelist ในระบบ Health ID ไม่งั้นจะเจอ `Redirect uri is invalid`

---

## 2) Step 2: รับ `code` ที่ callback (redirect_uri)

### ตัวอย่าง URL
- `GET http://localhost:3000/test-provider-id/callback?code=...&state=...`

### หมายเหตุสำคัญ
- `code` เป็น **one-time** ใช้ซ้ำ/refresh แล้วมักจะเจอ `422 Code is invalid`
- Flow debug ปัจจุบันเป็น **stateless** (ไม่เก็บ cookie/session/localStorage)

---

## 3) Step 3: แลก `code` -> Health Access Token

### Endpoint
- `POST https://moph.id.th/api/v1/token`

### Headers
- `Content-Type: application/x-www-form-urlencoded`

### Body (form-urlencoded)
- `grant_type=authorization_code`
- `code=<code จาก callback>`
- `redirect_uri=<ต้องตรงกับ step 1>`
- `client_id=<HEALTH_CLIENT_ID>`
- `client_secret=<HEALTH_CLIENT_SECRET>`

### Expected response (ย่อ)
```json
{
  "status": "success",
  "data": {
    "access_token": "...",
    "token_type": "Bearer",
    "expires_in": 31535998,
    "account_id": "..."
  },
  "message": "You logged in successfully"
}
```

---

## 4) Step 4: แลก Health access token -> Provider access token

### Endpoint
- `POST https://provider.id.th/api/v1/services/token`

### Headers
- `Content-Type: application/json`

### Body (JSON)
```json
{
  "client_id": "<PROVIDER_CLIENT_ID>",
  "secret_key": "<PROVIDER_CLIENT_SECRET>",
  "token_by": "Health ID",
  "token": "<health_access_token>"
}
```

### Expected response (ย่อ)
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "access_token": "...",
    "expires_in": 86400,
    "account_id": "...",
    "username": "..."
  }
}
```

### กรณี error สำคัญ
- ถ้าไม่ใช่ provider จะเจอ `400` และ message ประมาณ `This user has not provider id`

---

## 5) Step 5: ดึง Provider Profile

### Endpoint
- `GET https://provider.id.th/api/v1/services/profile?position_type=1`

### Headers
- `Content-Type: application/json`
- `Authorization: Bearer <provider_access_token>`
- `client-id: <PROVIDER_CLIENT_ID>`
- `secret-key: <PROVIDER_CLIENT_SECRET>`

### Expected response (ย่อ)
- จะได้ข้อมูล:
  - `account_id`, `hash_cid`, `provider_id`
  - `name_th`, `name_eng`, `email`, `date_of_birth`
  - `organization[]` (สำคัญมาก: เป็น array)

---

## 6) Security / Debugging Notes

- ห้าม log ค่า `access_token` / `client_secret` / `secret_key` แบบเต็ม ๆ
- ตอน debug ให้ redact token (เช่นโชว์แค่ prefix/suffix)
- ถ้าเจอ error:
  - `422 Code is invalid` = ใช้ `code` ซ้ำ หรือ `redirect_uri` ไม่ match
  - `401 Authentication is required` = client/secret ไม่ถูกหรือไม่ได้ส่ง
  - `400 This user has not provider id` = user ไม่ใช่ provider

---

## 7) Where in this repo

- Start page (button): `src/app/test-provider-id/page.tsx`
- Redirect action: `src/app/test-provider-id/actions.ts`
- Callback + exchanges + profile fetch: `src/app/test-provider-id/callback/page.tsx`

---

## English Summary

1. Redirect user to Health ID authorize URL (`/oauth/redirect`) with `client_id`, `redirect_uri`, `response_type=code`.
2. Health ID redirects back to your `redirect_uri` with `code`.
3. Backend exchanges `code` for **Health access token** via `POST /api/v1/token` (form-urlencoded).
4. Backend exchanges **Health access token** for **Provider access token** via `POST /api/v1/services/token` (JSON).
5. Backend fetches **Provider profile** via `GET /api/v1/services/profile?position_type=1` with required headers.

