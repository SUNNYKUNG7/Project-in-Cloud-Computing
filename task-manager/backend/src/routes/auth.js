// 4.1 สมัครสมาชิก / เข้าสู่ระบบ
// (ออกจากระบบ = ฝั่ง frontend ลบ token ทิ้ง เพราะ JWT เป็นแบบ stateless)
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { signToken } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body || {};

  if (!fullName?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO Users (FullName, Email, Password) VALUES (?, ?, ?)',
      [fullName.trim(), email.trim().toLowerCase(), hash]
    );
    res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ', userId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของระบบ' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM Users WHERE Email = ?', [
      email.trim().toLowerCase(),
    ]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.Password))) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    res.json({
      token: signToken(user),
      user: { id: user.UserID, fullName: user.FullName, email: user.Email, role: user.Role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดของระบบ' });
  }
});

module.exports = router;
