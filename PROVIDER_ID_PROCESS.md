# Provider ID Process Flow

เอกสารนี้สรุปแนวคิด (concept) และไฟล์ที่ใช้ในการทำ Health ID authentication แล้วเชื่อมต่อไปยัง Provider ID เพื่อนำข้อมูล profile มาใช้ในระบบ

ไฟล์ตัวอย่างที่เกี่ยวข้อง:
- `src/authConfig.ts`
- `src/app/actions/sign-in.ts`
- `src/app/test-auth/page.tsx`
- `src/app/api/auth/healthid/route.ts`
- `src/app/profile/page.tsx`

---

## 0. การตั้งค่าใน `.env`

ก่อนเริ่มใช้งาน flow นี้ ต้องกำหนดตัวแปรสภาพแวดล้อม (Environment Variables) ให้ครบ ตามตัวอย่าง:

**ตัวอย่าง code (`.env` ):**

```env
# Health ID OAuth
HEALTH_CLIENT_ID=your-health-client-id
HEALTH_REDIRECT_URI=https://your-domain.com/api/auth/healthid
HEALTH_CLIENT_SECRET=your-health-client-secret

# Provider ID
PROVIDER_CLIENT_ID=your-provider-client-id
PROVIDER_CLIENT_SECRET=your-provider-client-secret

# NextAuth (ตัวอย่าง)
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com
AUTH_TRUST_HOST=true
```

---

## 1. การตั้งค่า NextAuth (`src/authConfig.ts`)

- ใช้ `NextAuth` + `CredentialsProvider` เพื่อรับข้อมูลจาก Provider ID แล้วเก็บลงใน session
- ส่วนสำคัญ:
  - `authorize(credentials)`
    - ถ้า `cred-way = 'user-pass'` ตอนนี้ยังไม่รองรับ (คืน `null`)
    - ถ้าเป็นเคส Provider ID:
      - คืนค่า object
        - `name: 'provider-id'`
        - `profile: credentials.profile` (เป็น JSON string ของ provider profile)
  - `callbacks.jwt`
    - ถ้ามี `user` จากการ sign-in
      - เซ็ต `token.profile = user.profile`
  - `callbacks.session`
    - ถ้ามี `token` และ `session.user`
      - เซ็ต `(session.user as any).profile = (token as any).profile`
- Export
  - `auth` เอาไปใช้ดึง session ในฝั่ง server component (เช่น หน้า `/profile`)
  - `signIn` เอาไปใช้ใน `route.ts` เพื่อ login ด้วย credentials provider

**ตัวอย่าง code (`src/authConfig.ts` ):**

```ts
import NextAuth, { type Session, type NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions: NextAuthConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 25, // 25 hours
  },
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        console.log("credentials = ", credentials);
        if (credentials['cred-way'] == 'user-pass') {
          // ยังไม่เชื่อมต่อฐานข้อมูลจริง: ให้ login แบบ user-pass ไม่สำเร็จไปก่อน
          /*
           NOTE: โค้ด prisma ด้านล่างถูก comment ไว้ เพื่อให้ build ผ่าน
           แต่ยังเก็บเป็นตัวอย่างเผื่อเชื่อมฐานข้อมูลภายหลัง

           const user = await prisma.user.findUnique({
             where: {
               username: credentials?.username as string,
             },
           });
           if (!user) {
             return null; // ทำให้ auth fail และ redirect กลับหน้า sign-in
           }
           return {
             name: user.username,
             profile: JSON.stringify(user),
             ssj_department: (user as any).ssj_department,
           };
          */

          return null; // จะทำให้ authentication fail และ redirect กลับหน้า sign-in
        }
        return {
          name: 'provider-id',
          profile: credentials.profile!
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.profile = (user as any).profile;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        (session.user as any).profile = (token as any).profile; // Add user profile to the session
      }
      return session;
    },
  },
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth(authOptions);
```

▶︎ สรุป: ไฟล์นี้กำหนดให้ข้อมูล profile จาก Provider ID ถูกเก็บใน JWT และส่งลงมาที่ `session.user.profile` เสมอหลัง login สำเร็จ

---

## 2. Server Action สำหรับเริ่ม OAuth กับ Health ID (`src/app/actions/sign-in.ts`)

**ตัวอย่าง code (`src/app/actions/sign-in.ts` ):**

```ts
'use server'

import { redirect } from 'next/navigation';

export const providerIdProcess = async (formData: FormData) => {
    const url = new URL("https://moph.id.th/oauth/redirect");

    const clientId = process.env.HEALTH_CLIENT_ID;
     const redirectUri = process.env.HEALTH_REDIRECT_URI;

    const landing = formData.get('landing') as string;
    const is_auth = formData.get('is_auth') as string;    
   
    url.searchParams.set("client_id", clientId!); 
    url.searchParams.set("redirect_uri", redirectUri!);   
    url.searchParams.set("response_type", "code");
    
    url.searchParams.set("landing", landing!);
    url.searchParams.set("is_auth", is_auth!);
     

    redirect(url.toString());
}

```

แนวคิด:
- เป็น server action (`'use server'`)
- รับ `FormData` จากหน้า UI
  - ดึงค่า `landing` (เช่น `/profile`) เพื่อส่งต่อไปใน query string
- สร้าง URL ไปยัง Health ID OAuth endpoint (`https://moph.id.th/oauth/redirect`)
  - แนบ `client_id`, `redirect_uri`, `response_type=code`, `is_auth`, และ `landing`
- ใช้ `redirect(url)` เพื่อเปลี่ยนหน้าไปที่ Health ID ให้ผู้ใช้กดยืนยันสิทธิ์

▶︎ สรุป: ไฟล์นี้คือจุดเริ่ม flow – กดปุ่มจากหน้าเว็บ → ถูก redirect ไปที่ Health ID เพื่อขอ authorization code

---

## 3. หน้า Test เพื่อกดปุ่มทดสอบ (`src/app/test-auth/page.tsx`)

**ตัวอย่าง code (`src/app/test-auth/page.tsx` ):**

```tsx
import { providerIdProcess } from "../actions/sign-in";

export default function TestAuthPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="p-6 rounded-lg shadow bg-white space-y-4 text-center">
        <h1 className="text-lg font-semibold">Test Auth</h1>
        <p className="text-sm text-gray-600">ทดสอบ Sign in ด้วย Health ID</p>
        <form action={providerIdProcess}>
          <input type="hidden" name="landing" value="/profile" />
          <input type="hidden" name="is_auth" value="yes" />
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign in with Health ID
          </button>
        </form>
      </div>
    </main>
  );
}
```

แนวคิด:
- เป็นหน้า UI ง่ายๆ สำหรับทดสอบ flow
- ใช้ `<form action={providerIdProcess}>`
  - เมื่อกดปุ่มจะ POST ไปที่ server action ด้านบน
- ส่ง hidden field `landing="/profile"`
  - ทำให้เมื่อ flow sign-in เสร็จ จะ redirect กลับมา `/profile`
- ส่ง hidden filed is_auth
  - กำหนดให้เป็น `yes` เพื่อให้ sign-in ผ่าน Health ID
  - กำหนดให้เป็น `no` เพื่อดึง provider profile มาเก็บที่ session เฉยๆ

▶︎ สรุป: หน้า `/test-auth` คือ test entry point ให้ dev กดปุ่มแล้วเดินตาม Health ID → Provider ID → กลับมาดู profile ที่ `/profile`

---

## 4. Health ID Callback → Provider ID → NextAuth (`src/app/api/auth/healthid/route.ts`)

**ตัวอย่าง code (`src/app/api/auth/healthid/route.ts` ):**

```ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signIn } from '@/authConfig'

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const landing = searchParams.get('landing')
    const is_auth = searchParams.get('is_auth') === 'yes';
    const redirectTo = landing || '/';

    if (!code) {
        return NextResponse.json({ error: 'Authorization code is missing' }, { status: 400 });
    }
    console.log("Authorization Health id Code :", code);

    const response = await fetch('https://moph.id.th/api/v1/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.HEALTH_REDIRECT_URI,
            client_id: process.env.HEALTH_CLIENT_ID,
            client_secret: process.env.HEALTH_CLIENT_SECRET
        })
    });
    const data = await response.json();
    if (!response.ok) {
        return NextResponse.json({ error: data.error || 'Failed to fetch Health ID token' }, { status: response.status });
    }
    // Removed sensitive data logging for security


    const userResponse = await fetch('https://provider.id.th/api/v1/services/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: process.env.PROVIDER_CLIENT_ID,
            secret_key: process.env.PROVIDER_CLIENT_SECRET, // Changed from PROVIDER_SECRET_KEY
            token_by: 'Health ID',
            token: data.data.access_token
        })
    });
    const userData = await userResponse.json();
    // Removed sensitive data logging for security
    if (!userResponse.ok) {
        return NextResponse.json({ error: userData.error || 'Failed to fetch provider data' }, { status: userResponse.status });
    }

    const profileResponse = await fetch('https://provider.id.th/api/v1/services/profile?position_type=1', {
        method: 'GET',
        headers: {
            'client-id': process.env.PROVIDER_CLIENT_ID!,
            'secret-key': process.env.PROVIDER_CLIENT_SECRET!,
            'Authorization': `Bearer ${userData.data.access_token}`
        }

    });
    const profileData = await profileResponse.json();
    // Removed sensitive data logging for security
    if (!profileResponse.ok) {
        return NextResponse.json({ error: profileData.error || 'Failed to fetch profile data' }, { status: profileResponse.status });
    }

    if (!is_auth) {
        //เก็บ profileData.data ลง session
        //redirectpage ไปที่ตัวแปร landing
        const res = NextResponse.redirect(new URL(redirectTo, request.url));
        res.cookies.set('profile', JSON.stringify(profileData.data), {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 10, // 10 minutes
        });
        return res;
    }
    
    const res = await signIn('credentials', {
        'cred-way': 'provider-id',
        'profile': JSON.stringify(profileData.data),
        redirectTo: redirectTo
    });
    console.log("res sign in = ", res);
    
    // Return the signIn result to ensure proper route handler response
    return res;
}

```

แนวคิด (flow หลัก):
1. Health ID redirect กลับมาที่ endpoint `/api/auth/healthid` พร้อม `code` และ `landing`
2. ใช้ `code` แลก token จาก Health ID (`/api/v1/token`)
3. ใช้ Health ID token ไปขอ Provider ID token (`/api/v1/services/token`)
4. ใช้ Provider ID token ไปดึงข้อมูล profile จริง (`/api/v1/services/profile`)
5. เรียก `signIn('credentials', {...})` จาก NextAuth
   - ส่ง `cred-way = 'provider-id'`
   - แนบ `profile` เป็น JSON string
   - แนบ `redirectTo = landing || '/home'`
   - ถ้าแนบ `is_auth = yes` จะทำ credentials sign-in ถ้า no จะเก็บ profileData.data ลง session
6. NextAuth จะสร้าง session และ redirect ผู้ใช้ไปยังหน้าที่ต้องการ (เช่น `/profile`)

▶︎ สรุป: route นี้คือ "backend callback" ที่รับ code จาก Health ID แล้วจัดการทุกอย่างจนเสร็จสิ้นการ login ด้วย Provider ID

---

## 5. หน้าแสดง Provider Profile เป็น JSON (`src/app/profile/page.tsx`)

**ตัวอย่าง code (`src/app/profile/page.tsx` ):**

```tsx
import { auth } from "@/authConfig";

export default async function ProfilePage() {
  const session = await auth();
  const rawProfile = (session?.user as any)?.profile as string | undefined;

  let parsedProfile: unknown = null;

  if (rawProfile) {
    try {
      parsedProfile = JSON.parse(rawProfile);
    } catch {
      parsedProfile = rawProfile;
    }
  }

  const displayData =
    parsedProfile ?? { message: "No provider profile found in session" };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-4">Provider ID Profile (JSON)</h1>
        {!session && (
          <p className="text-sm text-red-500 mb-4">
            ไม่พบ session กรุณาเข้าสู่ระบบผ่าน Health ID ก่อน
          </p>
        )}
        <pre className="text-xs bg-slate-900 text-slate-100 rounded-md p-4 overflow-auto">
{JSON.stringify(displayData, null, 2)}
        </pre>
      </div>
    </main>
  );
}
```

**ตัวอย่าง profile ที่ได้จาก Provider ID:**

```JSON
{
  "account_id": "13347845zzzzzz",
  "hash_cid": "4e060f4f64085f66eea56aa85497849zzzzzzz4af8c73f5a7523c3a0c3",
  "provider_id": "0Bzz1DAFzzzzz",
  "title_th": "นาย",
  "special_title_th": "อื่นๆ",
  "name_th": "อุเทน zzzz",
  "name_eng": "Utehn zzzz",
  "created_at": "2024-02-29T05:44:52.000Z",
  "title_en": "Mr.",
  "special_title_en": "Other",
  "firstname_th": "อุเทน",
  "lastname_th": "จาดzzzz",
  "firstname_en": "Utehn",
  "lastname_en": "Jadyazzz",
  "email": "tehnplk@zzzzz.com",
  "date_of_birth": "1980-04-30",
  "organization": [
    {
      "business_id": "435750133244444",
      "position": "นักวิชาการสาธารณสุข",
      "position_id": "0011",
      "affiliation": "นักวิชาการสาธารณสุข",
      "license_id": null,
      "hcode": "00015",
      "code9": "000001500",
      "hcode9": "AA0000015",
      "level": "3",
      "hname_th": "สำนักงานสาธารณสุขจังหวัดพิษณุโลก",
      "hname_eng": "Provincial Public Health Office",
      "tax_id": "2885556200000792",
      "license_expired_date": null,
      "license_id_verify": false,
      "expertise": null,
      "expertise_id": null,
      "moph_station_ref_code": null,
      "is_private_provider": false,
      "address": {
        "address": null,
        "moo": null,
        "building": null,
        "soi": null,
        "street": null,
        "province": "พิษณุโลก",
        "district": "เมืองพิษณุโลก",
        "sub_district": "ในเมือง",
        "zip_code": "65000"
      },
      "position_type": "นักวิชาการสาธารณสุข"
    }
  ]
}

```

แนวคิด:
- ใช้ `auth()` เพื่อดึง session ในฝั่ง server component
- ดึง `session.user.profile`
  - ถ้าเป็น JSON string → `JSON.parse`
  - ถ้าพาร์สไม่ได้ → แสดงเป็นค่าเดิม
- แสดงค่าที่ได้ใน `<pre>` เพื่อ debug/ตรวจสอบข้อมูล profile ได้ง่าย

▶︎ สรุป: หน้า `/profile` ทำหน้าที่เป็นหน้าดูข้อมูลดิบจาก Provider ID ที่อยู่ใน session

---

## 6. ภาพรวม Flow แบบย่อ

1. ผู้ใช้เปิด `/test-auth` แล้วกดปุ่ม **"Sign in"**
2. ฟอร์มส่งไปที่ server action `providerIdProcess`
3. server action redirect ไปที่ Health ID OAuth URL พร้อม `redirect_uri` ชี้กลับมา `/api/auth/healthid` และส่ง `landing=/profile`
4. หลังผู้ใช้ยืนยันบน Health ID:
   - Health ID redirect กลับ `/api/auth/healthid?code=...&landing=/profile`
5. ใน `route.ts`:
   - แลก `code` → Health ID token
   - แลก Health ID token → Provider ID token
   - ใช้ Provider ID token ดึง `profile`
   - เรียก `NextAuth.signIn('credentials', { cred-way: 'provider-id', profile, redirectTo })`
6. NextAuth สร้าง session และ redirect ไป `/profile`
7. หน้า `/profile` ดึง session แล้วแสดง provider profile เป็น JSON

ด้วยโครงนี้ คุณสามารถ:
- เปลี่ยน `landing` เป็นหน้าอื่นได้ (เช่น `/home`, `/dashboard`)
- นำค่า `session.user.profile` ไป map เป็น user model ภายในระบบต่อได้ในภายหลัง

### 7. การขึ้นระบบครั้งแรก
```
ควร copy code จากไฟล์นี้เลย และไม่ควรแก้ไข code ให้ต่างจากต้นฉบับ

```