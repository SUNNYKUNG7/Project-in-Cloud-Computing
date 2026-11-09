// ตรวจสอบ JWT และสิทธิ์ผู้ใช้
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// สร้าง token หลัง login (อายุ 1 วัน)
function signToken(user) {
  return jwt.sign(
    { id: user.UserID, role: user.Role, name: user.FullName },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

// ต้อง login ก่อน — อ่าน token จาก header: Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });

  try {
    req.user = jwt.verify(token, JWT_SECRET); // { id, role, name }
    next();
  } catch {
    return res.status(401).json({ message: 'Token หมดอายุหรือไม่ถูกต้อง' });
  }
}

// ต้องเป็น Admin เท่านั้น (ใช้ต่อจาก requireAuth)
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง (Admin เท่านั้น)' });
  }
  next();
}

module.exports = { signToken, requireAuth, requireAdmin };
