// 4.1 ข้อมูลส่วนตัว: ดู / แก้ไข / เปลี่ยนรหัสผ่าน (ของตัวเอง)
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/users/me
router.get('/me', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT UserID AS id, FullName AS fullName, Email AS email, Role AS role, CreatedAt AS createdAt FROM Users WHERE UserID = ?',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
  res.json(rows[0]);
});

// PUT /api/users/me  { fullName, email }
router.put('/me', async (req, res) => {
  const { fullName, email } = req.body || {};
  if (!fullName?.trim() || !email?.trim()) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อและอีเมล' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' });
  }

  try {
    await pool.query('UPDATE Users SET FullName = ?, Email = ? WHERE UserID = ?', [
      fullName.trim(),
      email.trim().toLowerCase(),
      req.user.id,
    ]);
    res.json({ message: 'บันทึกข้อมูลส่วนตัวแล้ว' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของระบบ' });
  }
});

// PUT /api/users/me/password  { currentPassword, newPassword }
router.put('/me/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านให้ครบ' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  const [rows] = await pool.query('SELECT Password FROM Users WHERE UserID = ?', [req.user.id]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].Password))) {
    return res.status(400).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE Users SET Password = ? WHERE UserID = ?', [hash, req.user.id]);
  res.json({ message: 'เปลี่ยนรหัสผ่านแล้ว' });
});

module.exports = router;
