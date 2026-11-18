# 📋 Personal Task Management System

ระบบจัดการรายการงานส่วนบุคคล — Three-Tier Architecture (DGT01 3130)

| Tier | โฟลเดอร์ | เทคโนโลยี | Port (เครื่องเรา) |
|---|---|---|---|
| Presentation + Load Balancer | `frontend/` | HTML, CSS, JavaScript + Nginx (upstream web1/web2) | http://localhost:8080 |
| Application | `backend/` | Node.js + Express (REST API) × 2 เครื่อง (web1, web2) | http://localhost:3001, http://localhost:3002 |
| Data | `database/` | MySQL 8 | localhost:3307 |

---

## 🚀 วิธีรัน (ทุกคนในกลุ่มใช้วิธีเดียวกัน)

ต้องมีแค่ **Docker Desktop** (ไม่ต้องลง Node หรือ MySQL เอง)

```bash
git clone <repo-url>
cd task-manager
cp .env.example .env          # Windows (PowerShell): copy .env.example .env
docker compose up -d --build
```

เปิด http://localhost:8080

**บัญชี Admin เริ่มต้น:** `admin@example.com` / `admin1234` (แก้ได้ใน `.env`)

### คำสั่งที่ใช้บ่อย

```bash
docker compose ps                 # ดูสถานะ container
docker compose logs -f backend    # ดู log ของ backend
docker compose up -d --build      # แก้โค้ดแล้ว build ใหม่
docker compose down               # ปิดระบบ (ข้อมูลยังอยู่)
docker compose down -v            # ปิด + ล้างฐานข้อมูลทิ้ง (เริ่มใหม่หมด)
```

> แก้ `database/init.sql` แล้วต้อง `docker compose down -v` ก่อน เพราะสคริปต์จะรันแค่ตอนสร้าง DB ครั้งแรก

---

## 📁 โครงสร้างโปรเจกต์

```
task-manager/
├── docker-compose.yml       # รวม 3 tier ไว้รันพร้อมกัน
├── .env.example             # ตัวอย่างค่าตั้งค่า (copy เป็น .env)
├── database/
│   └── init.sql             # สร้างตาราง Users, Tasks
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js        # จุดเริ่ม + /api/health + สร้าง admin อัตโนมัติ
│       ├── db.js            # connection pool
│       ├── middleware/auth.js
│       └── routes/          # auth, users, tasks, admin
└── frontend/
    ├── Dockerfile
    ├── nginx.conf           # เสิร์ฟหน้าเว็บ + proxy /api → backend
    ├── index.html           # เข้าสู่ระบบ
    ├── register.html        # สมัครสมาชิก
    ├── dashboard.html       # สรุปผล (4.6)
    ├── tasks.html           # จัดการงาน ค้นหา กรอง (4.2–4.5)
    ├── profile.html         # ข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน (4.1)
    ├── admin.html           # จัดการผู้ใช้ (Admin)
    ├── css/style.css
    └── js/api.js            # ฟังก์ชันกลาง เรียก API / token / navbar
```

---

## 🔌 REST API

ทุกเส้นยกเว้น `/auth/*` และ `/health` ต้องส่ง header `Authorization: Bearer <token>`

| Method | Path | ใช้ทำอะไร | ขอบเขต |
|---|---|---|---|
| GET | `/api/health` | เช็กว่า API + DB ทำงาน | – |
| POST | `/api/auth/register` | สมัครสมาชิก | 4.1 |
| POST | `/api/auth/login` | เข้าสู่ระบบ (ได้ token) | 4.1 |
| GET | `/api/users/me` | ดูข้อมูลตัวเอง | 4.1 |
| PUT | `/api/users/me` | แก้ไขข้อมูลส่วนตัว | 4.1 |
| PUT | `/api/users/me/password` | เปลี่ยนรหัสผ่าน | 4.1 |
| GET | `/api/tasks?search=&status=&due=&sort=` | รายการงาน + ค้นหา/กรอง/เรียง | 4.5 |
| GET | `/api/tasks/summary` | ตัวเลข Dashboard + ใกล้/เลยกำหนด | 4.3, 4.6 |
| GET | `/api/tasks/:id` | ดูรายละเอียดงาน | 4.2 |
| POST | `/api/tasks` | เพิ่มงาน | 4.2 |
| PUT | `/api/tasks/:id` | แก้ไขงาน + วันครบกำหนด | 4.2, 4.3 |
| PATCH | `/api/tasks/:id/status` | เปลี่ยนสถานะ | 4.4 |
| DELETE | `/api/tasks/:id` | ลบงาน | 4.2 |
| GET | `/api/admin/stats` | ภาพรวมระบบ | Admin |
| GET | `/api/admin/users?search=` | รายชื่อผู้ใช้ + จำนวนงาน | Admin |
| PATCH | `/api/admin/users/:id/role` | เปลี่ยน Role | Admin |
| DELETE | `/api/admin/users/:id` | ลบผู้ใช้ (งานถูกลบตาม) | Admin |

ค่าพารามิเตอร์: `status` = `To Do` / `Doing` / `Done`, `due` = `upcoming` (ภายใน 3 วัน) / `overdue`, `sort` = `due_asc` / `due_desc` / `newest`

---

## 🛠 แก้ปัญหาเบื้องต้น

- **Port ชน** (เช่น 8080 หรือ 3000 ถูกใช้อยู่) → แก้เลขซ้ายใน `ports:` ของ `docker-compose.yml` เช่น `"8081:80"`
- **backend ขึ้น error เชื่อม DB ไม่ได้** → รอสัก 10–20 วิ (MySQL ขึ้นช้าครั้งแรก) แล้ว `docker compose logs backend`
- **อยากดูข้อมูลใน DB** → ใช้ DBeaver/MySQL Workbench ต่อ `localhost:3307` user/pass ตาม `.env`

---

## ⚖️ Load Balancer และ Load test (ตาม Week 2)

```
เบราว์เซอร์ → frontend (Nginx :8080) ──round robin──▶ web1 :3000
                                      └─────────────▶ web2 :3000 ──▶ db (MySQL)
```

- `frontend/nginx.conf` — `upstream backend_pool` + `proxy_pass` · passive health check `max_fails=1 fail_timeout=10s`
- ทุกคำตอบจาก backend มี header `X-Backend: web1|web2` และแถบเมนูซ้ายแสดง "API ตอบโดย …"
- backend เป็น stateless (ใช้ JWT ไม่มี session ในเครื่อง) จึงเพิ่มเครื่องได้

### 1. ดูการกระจายโหลด (round robin)
```powershell
1..6 | ForEach-Object { curl.exe -sI http://localhost:8080/api/health | Select-String X-Backend }
```
ควรเห็น web1, web2 สลับกัน 3/3

### 2. Health check / failover
```powershell
docker compose stop web2
1..6 | ForEach-Object { curl.exe -s -o NUL -w "%{http_code} " http://localhost:8080/api/health; curl.exe -sI http://localhost:8080/api/health | Select-String X-Backend }
docker compose start web2
```
ระหว่าง web2 หยุด ต้องได้ 200 + web1 ทุกครั้ง · หลัง start กลับมาสลับเองภายใน ~10 วินาที (ไม่ต้อง reload)

### 3. เปลี่ยนอัลกอริทึม (round robin → least_conn / ip_hash / weight)
แก้ `frontend/nginx.conf` (เอา `#` หน้า `least_conn;` ออก) แล้ว:
```powershell
docker compose cp frontend/nginx.conf frontend:/etc/nginx/conf.d/default.conf
docker compose exec frontend nginx -t
docker compose exec frontend nginx -s reload
```
`nginx -t` ต้องขึ้น `test is successful` ก่อน reload เสมอ

### 4. Load test ด้วย k6 (เทียบ backend 1 เครื่อง vs 2 เครื่อง)
ต้องมีบัญชี `user1@test.com` (รัน seed.sql) — ถ้าไม่มี สคริปต์จะสมัครให้เอง
```powershell
# backend 1 เครื่อง
docker compose stop web2
docker run --rm --network task-manager_default -v "${PWD}/loadtest:/scripts" -e RATE=300 -e LABEL=1web-300 grafana/k6 run /scripts/loadtest.js
docker run --rm --network task-manager_default -v "${PWD}/loadtest:/scripts" -e RATE=900 -e LABEL=1web-900 grafana/k6 run /scripts/loadtest.js

# backend 2 เครื่อง
docker compose start web2
docker run --rm --network task-manager_default -v "${PWD}/loadtest:/scripts" -e RATE=300 -e LABEL=2web-300 grafana/k6 run /scripts/loadtest.js
docker run --rm --network task-manager_default -v "${PWD}/loadtest:/scripts" -e RATE=900 -e LABEL=2web-900 grafana/k6 run /scripts/loadtest.js
```
ผลแต่ละรอบถูกบันทึกเป็น JSON ใน `loadtest/results/` · ปรับ `RATE` (req/s), `DURATION` (เช่น `60s`) ได้

| รอบ | backend | RATE (req/s) | Throughput สำเร็จ | p95 (ms) | Error % | web1 / web2 |
|---|---|---|---|---|---|---|
| 1web-300 | 1 | 300 | | | | |
| 1web-900 | 1 | 900 | | | | |
| 2web-300 | 2 | 300 | | | | |
| 2web-900 | 2 | 900 | | | | |

วิธีอ่าน: ถ้า throughput ค้างต่ำกว่า RATE และ p95 พุ่ง = เครื่องนั้นถึงเพดาน (คอขวด) · เพิ่ม web2 แล้ว p95 ลด/throughput ขึ้น = Scale Out ช่วย · ถ้าเพิ่มแล้วไม่ดีขึ้น คอขวดอาจย้ายไปที่ db
