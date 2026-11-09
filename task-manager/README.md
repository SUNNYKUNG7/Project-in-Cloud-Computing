# 📋 Personal Task Management System

ระบบจัดการรายการงานส่วนบุคคล — Three-Tier Architecture (DGT01 3130)

| Tier | โฟลเดอร์ | เทคโนโลยี | Port (เครื่องเรา) |
|---|---|---|---|
| Presentation | `frontend/` | HTML, CSS, JavaScript + Nginx | http://localhost:8080 |
| Application | `backend/` | Node.js + Express (REST API) | http://localhost:3000 |
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
