// ==========================================================
// Application Tier — REST API (Node.js + Express 5)
// Express 5 จับ error จาก async function ให้อัตโนมัติ → ส่งต่อไป error handler ด้านล่าง
// ==========================================================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { pool, waitForDb } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Health check — ไว้ให้ Docker/Kubernetes (liveness/readiness probe) เช็กว่า API ยังทำงาน
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// เส้นทาง API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/admin', require('./routes/admin'));

// ไม่พบเส้นทาง
app.use('/api', (req, res) => res.status(404).json({ message: 'ไม่พบ API ที่เรียก' }));

// จัดการ error ทั้งหมดที่หลุดมา
app.use((err, req, res, next) => {
  console.error('❌', err);
  res.status(500).json({ message: 'เกิดข้อผิดพลาดของระบบ' });
});

// สร้างบัญชี Admin เริ่มต้น ถ้ายังไม่มี (อ่านจาก env ADMIN_EMAIL / ADMIN_PASSWORD)
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const [rows] = await pool.query('SELECT UserID FROM Users WHERE Email = ?', [email]);
  if (rows.length) return;

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "INSERT INTO Users (FullName, Email, Password, Role) VALUES ('System Admin', ?, ?, 'Admin')",
    [email, hash]
  );
  console.log(`👤 สร้างบัญชี Admin เริ่มต้นแล้ว: ${email}`);
}

const PORT = Number(process.env.PORT || 3000);

(async () => {
  await waitForDb();
  await ensureAdmin();
  app.listen(PORT, () => console.log(`🚀 Backend พร้อมที่ http://localhost:${PORT}`));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
