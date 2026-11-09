// Admin: จัดการบัญชีผู้ใช้ และดูข้อมูลภาพรวมของระบบ
// (Admin ไม่เห็นเนื้อหางานของผู้ใช้ เห็นแค่ "จำนวน" — เพราะเป็นงานส่วนบุคคล)
const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

// GET /api/admin/stats — ภาพรวมระบบ
router.get('/stats', async (req, res) => {
  const [[u]] = await pool.query(
    `SELECT COUNT(*) AS users, COALESCE(SUM(Role = 'Admin'), 0) AS admins FROM Users`
  );
  const [[t]] = await pool.query(
    `SELECT COUNT(*) AS tasks,
            COALESCE(SUM(Status = 'To Do'), 0) AS todo,
            COALESCE(SUM(Status = 'Doing'), 0) AS doing,
            COALESCE(SUM(Status = 'Done'), 0)  AS done
     FROM Tasks`
  );
  res.json({
    users: Number(u.users),
    admins: Number(u.admins),
    tasks: Number(t.tasks),
    todo: Number(t.todo),
    doing: Number(t.doing),
    done: Number(t.done),
  });
});

// GET /api/admin/users?search= — รายชื่อผู้ใช้ทั้งหมด + จำนวนงานของแต่ละคน
router.get('/users', async (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : '%';
  const [rows] = await pool.query(
    `SELECT u.UserID AS id, u.FullName AS fullName, u.Email AS email, u.Role AS role,
            u.CreatedAt AS createdAt, COUNT(t.TaskID) AS taskCount
     FROM Users u LEFT JOIN Tasks t ON t.UserID = u.UserID
     WHERE u.FullName LIKE ? OR u.Email LIKE ?
     GROUP BY u.UserID
     ORDER BY u.UserID ASC`,
    [search, search]
  );
  res.json(rows.map((r) => ({ ...r, taskCount: Number(r.taskCount) })));
});

// PATCH /api/admin/users/:id/role  { role: 'User' | 'Admin' }
router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body || {};
  if (!['User', 'Admin'].includes(role)) return res.status(400).json({ message: 'Role ไม่ถูกต้อง' });
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'ไม่สามารถเปลี่ยน Role ของตัวเองได้' });
  }

  const [result] = await pool.query('UPDATE Users SET Role = ? WHERE UserID = ?', [role, req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
  res.json({ message: `เปลี่ยน Role เป็น ${role} แล้ว` });
});

// DELETE /api/admin/users/:id — ลบผู้ใช้ (งานของผู้ใช้ถูกลบตามด้วย ON DELETE CASCADE)
router.delete('/users/:id', async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'ไม่สามารถลบบัญชีตัวเองได้' });
  }
  const [result] = await pool.query('DELETE FROM Users WHERE UserID = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
  res.json({ message: 'ลบผู้ใช้แล้ว' });
});

module.exports = router;
