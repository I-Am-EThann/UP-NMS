# UP NMS

ระบบติดตามและเฝ้าระวังอุปกรณ์เครือข่าย มหาวิทยาลัยพะเยา (Frontend)

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 (โทนม่วง–ขาว, ดู token ใน `src/app/globals.css`)
- shadcn/ui-style components (เขียนเอง อยู่ใน `src/components/ui`)
- Leaflet.js (แผนที่), Recharts (กราฟ), Socket.io client (real-time)
- ฟอนต์ self-hosted: Space Grotesk (heading) / Inter (body) / JetBrains Mono (ข้อมูล/ IP)

## เริ่มพัฒนา

```bash
cp .env.example .env.local   # ปรับ URL ถ้า backend รันคนละ host/port
npm install
npm run dev                   # หรือ `npm run dev:frontend` จาก repo root
```

เปิด http://localhost:3000 — จะเด้งไปหน้า `/login` โดยอัตโนมัติ (ยังไม่ได้ login)

**ต้องรัน backend จริงคู่กันเสมอ** (`npm run dev:backend` จาก repo root, ดู `apps/backend/README.md`) — frontend ไม่มี mock
layer เหลืออยู่แล้ว ถ้า backend ไม่รัน หน้าเว็บจะค้างที่ loading spinner หรือ redirect ไป `/login` เพราะ auth call ล้มเหลว

**Login**: username `admin` / password `phayao2569` (สร้างจาก `apps/backend/prisma/seed.ts` — ต้องรัน `npm run db:seed`
ที่ backend ก่อน)

## การเชื่อมต่อ Backend

Frontend เรียก backend **ตรงๆ** ไม่ผ่าน Next.js API route (ไม่มี BFF/proxy layer) — ดู `src/lib/api-config.ts`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api   # REST
NEXT_PUBLIC_WS_URL=http://localhost:3001         # Socket.io (namespace /realtime ต่อท้ายในโค้ด)
```

**เรื่อง cookie ข้าม port**: backend set cookie httpOnly (`up_nms_token`) แบบไม่ระบุ `Domain` explicit ทำให้ scope เป็น
host-only (`localhost`) — เบราว์เซอร์จะส่ง cookie นี้ไปทุก request ที่ host `localhost` โดยไม่สนใจ port ดังนั้น cookie ที่
backend set ตอน login (port 3001) จะถูกส่งไปพร้อม request ไปหา frontend เอง (port 3000) ด้วยอัตโนมัติ — Next.js
middleware (`src/proxy.ts`) เลยอ่าน cookie นี้เพื่อเช็ก auth ได้โดยไม่ต้องมี proxy หรือ session แยกฝั่ง frontend เลย

**⚠️ Production**: ถ้า deploy frontend/backend คนละ subdomain (เช่น `app.example.com` กับ `api.example.com`) จะเป็นคนละ
host กัน cookie จะไม่ถูกแชร์อัตโนมัติแบบนี้อีก ต้องตั้ง reverse proxy ให้อยู่ domain เดียวกัน หรือกำหนด cookie `Domain`
เป็น parent domain (`.example.com`) ที่ backend ตอน set cookie

## โครงสร้างโปรเจกต์ที่สำคัญ

```
src/
├── app/
│   ├── (protected)/          → ทุกหน้าที่ต้อง login (มี Sidebar/Topbar)
│   └── login/                → หน้า login (ไม่มี /api/auth/* ในนี้แล้ว — เรียก backend ตรง)
├── components/
│   ├── layout/                → Sidebar, Topbar, page-loading.tsx (spinner ระหว่างรอ fetch แรก)
│   └── ui/                    → primitive components (Button, Card, Badge, ...)
├── lib/
│   ├── auth/auth-context.tsx    → login/logout/me เรียก backend ตรง (ไม่มี mock-users.ts แล้ว)
│   ├── api-client.ts             → fetch wrapper กลาง (credentials: "include" เสมอ, normalize error)
│   ├── api-mappers.ts            → แปลง enum ตัวพิมพ์ใหญ่ของ backend (SWITCH/ONLINE/...) เป็น type
│   │                                ตัวพิมพ์เล็กที่ frontend ใช้อยู่เดิม — ทำให้ component เกือบ 50 ไฟล์
│   │                                ไม่ต้องแก้เลยตอนต่อ backend จริง
│   ├── network-data-context.tsx → fetch/CRUD zones-devices-alerts จริงผ่าน backend REST API
│   ├── live-metrics.ts           → Socket.io client จริง (namespace /realtime) แทน mock เดิม
│   ├── types.ts                   → Zone / Device / Alert / AuthUser types (เหมือนเดิมทุกประการ)
│   ├── stats.ts                   → ฟังก์ชันคำนวณสรุป (buildZones() ถูกลบแล้ว — backend คำนวณให้แล้ว)
│   └── page-title-context.tsx  → ให้แต่ละหน้าเซ็ตหัวข้อบน Topbar ได้
└── proxy.ts                    → route protection, เช็ก cookie `up_nms_token` (ชื่อเดียวกับ backend)
```

## สถานะ Sprint

- [x] **Sprint 1** — Setup โปรเจกต์ + Auth (mock) + Layout shell (Sidebar/Topbar) + ธีมสีม่วง/ขาว
- [x] **Sprint 2** — Overview Dashboard จริง (stat cards, Alert summary chart ด้วย Recharts, Online/Offline donut, ตารางแยกตามโซน)
- [x] **Sprint 3** — Zone Management (เพิ่ม/แก้ไข/ลบโซน) + Zone Dashboard เต็มรูปแบบ (stat cards, severity chart, รายการอุปกรณ์ในโซน)
- [x] **Sprint 4** — Device CRUD (Switch / Access Point แยกส่วนกันในแต่ละโซน) + ฟอร์มเพิ่ม/แก้ไข/ลบ + อัปโหลดรูปภาพ
- [x] **Sprint 5** — Device Monitor Detail (CPU/Memory/Port status/Bandwidth/Traffic)
- [x] **Sprint 6** — Map Integration (Leaflet + OpenStreetMap)
- [x] **Sprint 7** — Alert System UI
- [x] **Sprint 8 (frontend polish)** — Responsive + i18n (English/ไทย)
- [x] **Backend Sprint 8 (this one)** — **ต่อเข้ากับ backend จริงทั้งหมด**: auth, zones/devices CRUD, image upload
  (MinIO จริง), real-time (Socket.io จริง) — ลบ mock layer ทั้งหมดออกแล้ว (`mock-data.ts`, `mock-users.ts`,
  `/api/auth/*` routes, `buildZones()`, mock `live-metrics.ts`)

## หมายเหตุสำคัญ: Zone เป็นค่าที่คำนวณ ไม่ใช่ hardcode

`Zone` (จำนวน Switch/AP, Online/Offline, สรุประดับ alert) คำนวณจาก `Device[]` จริงอยู่ฝั่ง **backend**
(`buildZoneSummaries()` ใน `apps/backend/src/zones/zone-summary.util.ts`) แล้วส่งมาให้ frontend พร้อมใช้เลย —
frontend ไม่ต้องคำนวณเองอีกต่อไป (ลบ `buildZones()` ออกจาก `stats.ts` แล้ว)

## การทดสอบการเชื่อมต่อในสภาพแวดล้อมนี้

Prisma client ของ backend generate ไม่ได้ใน sandbox นี้ (ปัญหาเดิม ดู root README) ทำให้รัน backend จริงเต็มรูปแบบใน
sandbox นี้ไม่ได้ — ผมเลยเขียน fake backend server ชั่วคราว (plain Express + Socket.io, implement REST/WS contract
เดียวกับของจริงทุกจุด) มาทดสอบ integration code ของ frontend จริงๆ แทน ยืนยันแล้วว่า login, zones/devices CRUD,
image upload, และ WebSocket auth+subscribe+broadcast ทำงานถูกต้องผ่าน HTTP request จริงและ `socket.io-client` จริง —
ไฟล์ทดสอบนี้ไม่ได้รวมอยู่ใน repo (เป็นแค่เครื่องมือช่วยยืนยันตอนพัฒนา ไม่ใช่โค้ด production)

ระหว่างทดสอบเจอบั๊กจริง 1 จุดและแก้แล้ว: หน้า Zone/Device Dashboard เรียก `notFound()` ก่อนข้อมูลจาก backend โหลดเสร็จ
(เพราะข้อมูลตอนนี้ fetch แบบ async ไม่ได้ seed มาพร้อม state แบบ mock เดิม) ทำให้ค้างที่หน้า 404 ถาวรแม้ข้อมูลจะโหลด
เสร็จภายหลัง — แก้โดยเช็ก `isLoading` จาก `useNetworkData()` ก่อนเสมอ (ใช้ `<PageLoading />` spinner ระหว่างรอ)

## ระบบเปลี่ยนภาษา (i18n)

- `src/lib/i18n/translations.ts` — dictionary ภาษาอังกฤษ/ไทย ที่ typed ตรงกัน
- `src/lib/i18n/locale-context.tsx` — `LocaleProvider` + hook `useLocale()`
- ค่าเริ่มต้นคือ **English** เก็บเป็น cookie ชื่อ `pyao_locale`
- คำเฉพาะของระบบ NOC ตามสเปกเดิม (Switch, Access Point, Online/Offline, Normal/Warning/Major/Critical) **ไม่แปล**
- ข้อความ error จาก backend (auth, zone/device validation) แปลงเป็น **error code** ฝั่ง frontend จาก HTTP status
  (401/409/400) ไม่ใช่ parse ข้อความ error string ตรงๆ — ดู `auth-context.tsx` และ `network-data-context.tsx`
