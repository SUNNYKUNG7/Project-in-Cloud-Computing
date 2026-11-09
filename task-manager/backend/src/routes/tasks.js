// 4.2–4.6 จัดการรายการงาน / วันครบกำหนด / สถานะ / ค้นหา-กรอง / Dashboard
// ผู้ใช้เห็นและแก้ไขได้เฉพาะงานของตัวเองเท่านั้น (WHERE UserID = req.user.id ทุก query)
const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const STATUSES = ['To Do', 'Doing', 'Done'];
const UPCOMING_DAYS = 3; // "ใกล้ครบกำหนด" = ภายใน 3 วันข้างหน้า

// คอลัมน์ที่ส่งกลับ (แปลงชื่อเป็น camelCase ให้ frontend ใช้ง่าย)
const TASK_COLS = `
  TaskID AS id, Title AS title, Description AS description,
  DueDate AS dueDate, Status AS status,
  CreatedAt AS createdAt, UpdatedAt AS updatedAt,
  (DueDate IS NOT NULL AND DueDate < CURDATE() AND Status <> 'Done') AS isOverdue,
  (DueDate IS NOT NULL AND DueDate BETWEEN CURDATE() AND CURDATE() + INTERVAL ${UPCOMING_DAYS} DAY
     AND Status <> 'Done') AS isUpcoming`;

// ตรวจข้อมูลงานที่ส่งมา (ใช้ทั้งเพิ่มและแก้ไข)
function validateTask({ title, dueDate, status }) {
  if (!title || !title.trim()) return 'กรุณากรอกชื่องาน';
  if (title.length > 200) return 'ชื่องานยาวเกิน 200 ตัวอักษร';
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)';
  if (status && !STATUSES.includes(status)) return 'สถานะไม่ถูกต้อง';
  return null;
}

// ---------- 4.6 Dashboard ----------
// GET /api/tasks/summary
router.get('/summary', async (req, res) => {
  const uid = req.user.id;

  const [[counts]] = await pool.query(
    `SELECT
       COUNT(*)                                   AS total,
       COALESCE(SUM(Status = 'To Do'), 0)         AS todo,
       COALESCE(SUM(Status = 'Doing'), 0)         AS doing,
       COALESCE(SUM(Status = 'Done'), 0)          AS done,
       COALESCE(SUM(DueDate < CURDATE() AND Status <> 'Done'), 0) AS overdue
     FROM Tasks WHERE UserID = ?`,
    [uid]
  );

  // 4.3 งานที่ใกล้ถึงกำหนด (วันนี้ ถึง +3 วัน และยังไม่เสร็จ)
  const [upcoming] = await pool.query(
    `SELECT ${TASK_COLS} FROM Tasks
     WHERE UserID = ? AND Status <> 'Done'
       AND DueDate BETWEEN CURDATE() AND CURDATE() + INTERVAL ? DAY
     ORDER BY DueDate ASC`,
    [uid, UPCOMING_DAYS]
  );

  // 4.3 งานที่เลยกำหนดส่ง
  const [overdue] = await pool.query(
    `SELECT ${TASK_COLS} FROM Tasks
     WHERE UserID = ? AND Status <> 'Done' AND DueDate < CURDATE()
     ORDER BY DueDate ASC`,
    [uid]
  );

  res.json({
    counts: {
      total: Number(counts.total),
      todo: Number(counts.todo),
      doing: Number(counts.doing),
      done: Number(counts.done),
      overdue: Number(counts.overdue),
    },
    upcoming,
    overdue,
  });
});

// ---------- 4.5 ค้นหา / กรอง / เรียงลำดับ ----------
// GET /api/tasks?search=&status=&due=upcoming|overdue&sort=due_asc|due_desc|newest
router.get('/', async (req, res) => {
  const { search, status, due, sort } = req.query;
  const where = ['UserID = ?'];
  const params = [req.user.id];

  if (search) {
    where.push('Title LIKE ?');
    params.push(`%${search}%`);
  }
  if (status && STATUSES.includes(status)) {
    where.push('Status = ?');
    params.push(status);
  }
  if (due === 'upcoming') {
    where.push(`Status <> 'Done' AND DueDate BETWEEN CURDATE() AND CURDATE() + INTERVAL ${UPCOMING_DAYS} DAY`);
  } else if (due === 'overdue') {
    where.push(`Status <> 'Done' AND DueDate < CURDATE()`);
  }

  // งานที่ไม่มีวันครบกำหนดให้อยู่ท้ายสุดเสมอ
  const ORDER = {
    due_asc: 'DueDate IS NULL, DueDate ASC, TaskID DESC',
    due_desc: 'DueDate IS NULL, DueDate DESC, TaskID DESC',
    newest: 'CreatedAt DESC, TaskID DESC',
  };
  const orderBy = ORDER[sort] || ORDER.due_asc;

  const [rows] = await pool.query(
    `SELECT ${TASK_COLS} FROM Tasks WHERE ${where.join(' AND ')} ORDER BY ${orderBy}`,
    params
  );
  res.json(rows);
});

// ---------- 4.2 ดูรายละเอียดงาน ----------
// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT ${TASK_COLS} FROM Tasks WHERE TaskID = ? AND UserID = ?`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'ไม่พบรายการงาน' });
  res.json(rows[0]);
});

// ---------- 4.2 เพิ่มรายการงาน ----------
// POST /api/tasks  { title, description, dueDate, status }
router.post('/', async (req, res) => {
  const body = req.body || {};
  const error = validateTask(body);
  if (error) return res.status(400).json({ message: error });

  const [result] = await pool.query(
    'INSERT INTO Tasks (UserID, Title, Description, DueDate, Status) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, body.title.trim(), body.description || null, body.dueDate || null, body.status || 'To Do']
  );
  res.status(201).json({ message: 'เพิ่มงานแล้ว', id: result.insertId });
});

// ---------- 4.2 / 4.3 แก้ไขรายละเอียดงาน + วันครบกำหนด ----------
// PUT /api/tasks/:id  { title, description, dueDate, status }
router.put('/:id', async (req, res) => {
  const body = req.body || {};
  const error = validateTask(body);
  if (error) return res.status(400).json({ message: error });

  const [result] = await pool.query(
    `UPDATE Tasks SET Title = ?, Description = ?, DueDate = ?, Status = ?
     WHERE TaskID = ? AND UserID = ?`,
    [body.title.trim(), body.description || null, body.dueDate || null, body.status || 'To Do',
     req.params.id, req.user.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ message: 'ไม่พบรายการงาน' });
  res.json({ message: 'บันทึกการแก้ไขแล้ว' });
});

// ---------- 4.4 เปลี่ยนสถานะอย่างเดียว ----------
// PATCH /api/tasks/:id/status  { status }
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });

  const [result] = await pool.query(
    'UPDATE Tasks SET Status = ? WHERE TaskID = ? AND UserID = ?',
    [status, req.params.id, req.user.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ message: 'ไม่พบรายการงาน' });
  res.json({ message: `เปลี่ยนสถานะเป็น ${status} แล้ว` });
});

// ---------- 4.2 ลบรายการงาน ----------
// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM Tasks WHERE TaskID = ? AND UserID = ?', [
    req.params.id,
    req.user.id,
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'ไม่พบรายการงาน' });
  res.json({ message: 'ลบงานแล้ว' });
});

module.exports = router;
