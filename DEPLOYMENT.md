# คู่มือ Deploy ขึ้นใช้งานจริง (Production)

คู่มือนี้ครอบคลุมการนำ UP NMS ขึ้นรันบนเซิร์ฟเวอร์จริง (แนะนำ Ubuntu Server ภายในเครือข่ายมหาวิทยาลัย ตรงตามข้อ 10
ของสเปกเดิมที่ระบุให้เข้าถึงผ่านเว็บเบราว์เซอร์ได้ภายในเครือข่ายที่กำหนด) ตั้งแต่ศูนย์จนใช้งานได้จริง

---

## 1. เตรียมเซิร์ฟเวอร์

**สเปกขั้นต่ำแนะนำ** (ปรับเพิ่มตามจำนวนอุปกรณ์ที่ monitor):
- Ubuntu Server 22.04 หรือ 24.04 LTS
- 2 vCPU, 4GB RAM, 40GB disk ขึ้นไป
- อยู่ในเครือข่ายที่เข้าถึงอุปกรณ์ Switch/AP ผ่าน SNMP ได้ (สำคัญมากถ้าจะใช้ `SNMP_PROVIDER=real`)
- มี IP หรือ hostname ภายในที่แน่นอน (เช่น `nms.up.ac.th` หรือ IP ภายใน)

**เปิด port ที่จำเป็นบน firewall**:
- `80`, `443` — ถ้าใช้ reverse proxy (แนะนำ)
- หรือ `3000` ตรงๆ ถ้ายังไม่ทำ reverse proxy (ใช้ทดสอบชั่วคราวเท่านั้น ไม่แนะนำสำหรับ production จริง)
- **ไม่ต้อง** เปิด `3001` (backend), `5432` (Postgres), `8086` (InfluxDB), `9000/9001` (MinIO) ออกสู่ภายนอก —
  ให้ frontend/reverse proxy คุยกับ backend ผ่านเครือข่ายภายใน Docker เท่านั้น

---

## 2. ติดตั้ง Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

docker --version
docker compose version
```

---

## 3. โอนไฟล์โปรเจกต์ขึ้นเซิร์ฟเวอร์

```bash
# ถ้ามี Git repo
git clone <your-repo-url> up-nms
cd up-nms

# หรือถ้าใช้ zip
scp up-nms.zip user@server:~/
ssh user@server
unzip up-nms.zip -d up-nms && cd up-nms
```

---

## 4. ตั้งค่า Environment Variables สำหรับ Production

**ห้ามใช้ค่า default ที่มากับ `.env.example` ตอน deploy จริงเด็ดขาด** โดยเฉพาะ `JWT_SECRET`, รหัสผ่านฐานข้อมูล,
และ MinIO credentials

สร้างค่าลับแบบสุ่มปลอดภัย:
```bash
openssl rand -base64 32
```

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์:

```bash
cat > .env <<'EOF'
POSTGRES_USER=upnms
POSTGRES_PASSWORD=<ใส่ค่าสุ่มจาก openssl rand>
POSTGRES_DB=upnms

JWT_SECRET=<ใส่ค่าสุ่มจาก openssl rand — ยาวอย่างน้อย 32 ตัวอักษร>
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://nms.up.ac.th

# บัญชี admin ตัวแรก (สร้างตอนรัน `npm run db:seed` — ดูขั้นตอนที่ 7)
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=<ตั้งรหัสผ่านเองตรงนี้ อย่าใช้ค่า default>

INFLUX_TOKEN=<ใส่ค่าสุ่มจาก openssl rand>

MINIO_ROOT_USER=upnms-prod
MINIO_ROOT_PASSWORD=<ใส่ค่าสุ่มจาก openssl rand>

SNMP_PROVIDER=mock
SNMP_COMMUNITY=public

NEXT_PUBLIC_API_URL=https://nms.up.ac.th/api
NEXT_PUBLIC_WS_URL=https://nms.up.ac.th
EOF

chmod 600 .env
```

จากนั้นแก้ `docker-compose.yml` ให้ service `postgres`, `influxdb`, `minio`, `backend` อ่านค่าเหล่านี้จาก `.env`
แทนค่า hardcode เดิม (เช่นเปลี่ยน `POSTGRES_PASSWORD: upnms` เป็น `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}`)

> **สำคัญ**: `NEXT_PUBLIC_API_URL` ต้อง**ตรงกับ domain จริง** ไม่ใช่ `localhost` — ค่านี้ถูก build เข้าไปในโค้ด
> frontend ตอน `docker build` เปลี่ยนทีหลังไม่ได้ต้อง build ใหม่เท่านั้น

---

## 5. ตั้งค่า Reverse Proxy (Nginx) + HTTPS

**เหตุผล**: cookie ยืนยันตัวตนของ backend จะแชร์กับ frontend อัตโนมัติได้ก็ต่อเมื่ออยู่ host เดียวกันเท่านั้น
การใช้ Nginx ให้ frontend/backend อยู่หลัง domain เดียวกันจึงจำเป็นสำหรับ production

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

สร้างไฟล์ `/etc/nginx/sites-available/up-nms`:

```nginx
server {
    listen 80;
    server_name nms.up.ac.th;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cookie_path /api / ;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/up-nms /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d nms.up.ac.th
```

ถ้าเป็นเครือข่ายภายในล้วนๆ ไม่มี public domain ให้ certbot ยืนยันได้ ให้ใช้ internal CA ของมหาวิทยาลัย หรือ
self-signed certificate แทน

เมื่อใช้ HTTPS แล้ว **ต้องอัปเดต** `.env` ให้เป็น `https://` แล้ว build image frontend ใหม่

---

## 6. ปรับ docker-compose.yml สำหรับ Production

1. ไม่ expose port backend/postgres/influxdb/minio ออก host โดยตรง (ยกเว้นจำเป็นต้องเข้า MinIO console)
2. เปลี่ยนค่า credentials ทุกจุดเป็น `${...}` อ้างอิงจาก `.env`
3. `restart: unless-stopped` มีอยู่แล้ว เพียงพอสำหรับส่วนใหญ่
4. พิจารณาเพิ่ม resource limits ถ้าเซิร์ฟเวอร์มีงานอื่นรันร่วมด้วย

---

## 7. Deploy

```bash
docker compose up -d --build
```

รอจน service ทั้งหมด healthy แล้วรัน migration + สร้างบัญชี admin **ครั้งแรกเท่านั้น**:

```bash
docker compose exec backend sh -c "npx prisma migrate deploy"

# สร้างบัญชี admin (จำเป็น — ไม่มีขั้นตอนนี้จะ login เข้าระบบไม่ได้เลย)
# ไม่สร้างข้อมูลโซน/อุปกรณ์ตัวอย่างใดๆ ทั้งสิ้น เพิ่มของจริงเองผ่านหน้าเว็บหลัง login
docker compose exec backend npm run db:seed
```

**แนะนำ**: ตั้งรหัสผ่าน admin ของตัวเองตั้งแต่ตอน seed เลย แทนที่จะใช้ค่า default แล้วมาเปลี่ยนทีหลัง — เพิ่ม
`SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` ในไฟล์ `.env` ก่อนรันคำสั่งข้างบน (ดูขั้นตอนที่ 4)

> **สำคัญด้านความปลอดภัย**: ถ้าไม่ได้ตั้งค่า `SEED_ADMIN_PASSWORD` ไว้ จะได้รหัสผ่าน default `phayao2569` มา —
> **ต้องเปลี่ยนทันที**หลัง deploy จริง

เข้าใช้งานได้ที่ `https://nms.up.ac.th`

---

## 8. เริ่มอัตโนมัติเมื่อเซิร์ฟเวอร์ reboot

Docker enable ตัวเองอัตโนมัติหลังติดตั้งด้วย `get.docker.com` และ container ทุกตัวตั้ง `restart: unless-stopped`
ไว้แล้ว พอเครื่อง reboot container จะรันขึ้นเองอัตโนมัติ ตรวจสอบด้วย:
```bash
sudo systemctl is-enabled docker
```

---

## 9. Backup

**Postgres**:
```bash
docker compose exec postgres pg_dump -U upnms upnms | gzip > backup_$(date +%Y%m%d).sql.gz
# restore:
gunzip -c backup_20260101.sql.gz | docker compose exec -T postgres psql -U upnms upnms
```

**MinIO**:
```bash
docker run --rm -it --network up-nms_default minio/mc \
  mirror http://minio:9000/device-images /backup/device-images --insecure
```

**InfluxDB** (ความสำคัญต่ำกว่า — ข้อมูลเกิดใหม่ได้เรื่อยๆ จาก polling):
```bash
docker compose exec influxdb influx backup /tmp/influx-backup
docker compose cp influxdb:/tmp/influx-backup ./influx-backup-$(date +%Y%m%d)
```

แนะนำตั้ง cron job รัน backup Postgres ทุกวัน เก็บไว้นอกเซิร์ฟเวอร์

---

## 10. Monitoring & Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose ps
curl https://nms.up.ac.th/api/health
```

---

## 11. อัปเดตระบบภายหลัง

```bash
git pull
docker compose build backend frontend
docker compose up -d
docker compose exec backend npx prisma migrate deploy
```

---

## 12. Checklist ก่อนเปิดใช้งานจริง

- [ ] เปลี่ยนรหัสผ่าน/secret ทุกตัวเป็นค่าสุ่มใหม่ (Postgres, JWT_SECRET, InfluxDB token, MinIO)
- [ ] เปลี่ยนรหัสผ่าน admin ที่มากับ `db:seed` ทันที
- [ ] ตั้ง HTTPS ผ่าน Nginx + certbot (หรือ internal CA)
- [ ] ปิด port ที่ไม่จำเป็นออกสู่ภายนอก (เหลือแค่ 80/443)
- [ ] ตั้ง cron backup Postgres รายวัน
- [ ] ทดสอบ login จริง + เพิ่มโซน/อุปกรณ์จริง 1 รายการก่อนใช้งานทั่วองค์กร
- [ ] ถ้าจะต่อ SNMP จริง ทดสอบกับอุปกรณ์ 1-2 ตัวก่อน แล้วค่อยเพิ่มทั้งหมด
