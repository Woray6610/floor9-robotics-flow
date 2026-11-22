# Floor 9 System Flow Sandbox (2D)

Interactive 2D System Flow Sandbox บนแผนผังอาคารชั้น 9 สำหรับวางตำแหน่ง AMR, แขน UR (ติดบนรถ / ตั้งโต๊ะ), สถานี A–Z, Object (ตะกร้า), อุปกรณ์ IIoT และวาดเส้นทาง + กำหนดลำดับ Step งานร่วมกับเพื่อนร่วมทีม

## วิธีใช้งานในเครื่อง (Local + LAN Live Sync)

```bash
npm install
npm run share
```

- เปิดบนเครื่องนี้: `http://localhost:5174/`
- ส่งให้เพื่อนในวง Wi-Fi / LAN เดียวกัน: ดูลิงก์ `Network: http://192.168.x.x:5174/`
- ข้อมูลผังกลางบันทึกอัตโนมัติที่ `data/shared-layout.json`

## วิธีเปิดใช้งาน 24/7 ฟรี ไม่ต้องซื้อ VPS (ปิดคอมแล้วเพื่อนยังเข้าแก้ได้)

### ขั้นที่ 1: สร้างฐานข้อมูลฟรีที่ Supabase (ไม่ต้องใช้บัตรเครดิต)
1. ไปที่ [supabase.com](https://supabase.com/) ล็อกอินด้วย GitHub แล้วสร้างโปรเจกต์ใหม่ (Free tier)
2. เปิดเมนู **SQL Editor** แล้วรันคำสั่งนี้ครั้งเดียว:

```sql
create table if not exists public.floor9_rooms (
  id text primary key,
  project_json jsonb not null,
  updated_by text default 'Team',
  client_id text default '',
  updated_at timestamptz default now()
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.floor9_rooms to anon, authenticated;

alter table public.floor9_rooms enable row level security;

drop policy if exists "Allow public read/write for Floor 9 Sandbox" on public.floor9_rooms;
create policy "Allow public read/write for Floor 9 Sandbox"
  on public.floor9_rooms
  for all
  to anon, authenticated
  using (true)
  with check (true);
```

3. ไปที่ **Project Settings → API** แล้วคัดลอก **Project URL** และ **anon public key**

### ขั้นที่ 2: เอาเว็บขึ้นออนไลน์ฟรี (เลือก 1 วิธี)
- **วิธี A — Vercel (ง่ายสุด 1 นาที)**:
  1. ดันโฟลเดอร์นี้ขึ้น GitHub ส่วนตัวของ Woray
  2. เข้า [vercel.com](https://vercel.com/) → **Add New Project** → เลือก Repo จาก GitHub
  3. ในช่อง **Environment Variables** ใส่ 3 ค่านี้:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_ROOM_ID` = `floor9-main`
  4. กด **Deploy** → ได้ลิงก์ `https://xxx.vercel.app` ส่งให้เพื่อนเปิดแก้ร่วมกันได้ 24 ชม. ทันที!

- **วิธี B — GitHub Pages (ไม่ต้องตั้งค่า Env ตอน Build)**:
  - Deploy ขึ้น GitHub Pages แล้วเปิดหน้าเว็บ → กดปุ่ม **แชร์/Cloud** มุมบนขวา → แท็บ **ตั้งค่า Cloud 24/7** → วาง URL + Anon Key → กดคัดลอกลิงก์แชร์ส่งให้เพื่อนได้เลย
