// ==========================================================
// ฟังก์ชันกลางที่ทุกหน้าใช้ร่วมกัน: เรียก API, จัดการ token, navbar, format วันที่
// ==========================================================
const API_BASE = '/api'; // Nginx จะ proxy /api ไปที่ backend

// ---------- Token / ผู้ใช้ปัจจุบัน ----------
const auth = {
  get token() { return localStorage.getItem('token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  },
  save(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    location.href = 'index.html';
  },
};

// ---------- เรียก API (แนบ token ให้อัตโนมัติ) ----------
async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try { data = await res.json(); } catch { /* ไม่มี body */ }

  // token หมดอายุ → เด้งกลับหน้า login (ยกเว้นตอนกำลัง login อยู่)
  if (res.status === 401 && !path.startsWith('/auth/')) {
    auth.logout();
    throw new Error(data.message || 'กรุณาเข้าสู่ระบบใหม่');
  }
  if (!res.ok) throw new Error(data.message || `เกิดข้อผิดพลาด (${res.status})`);
  return data;
}

// ---------- ป้องกันหน้า: ต้อง login / ต้องเป็น admin ----------
function requireLogin({ admin = false } = {}) {
  if (!auth.token || !auth.user) {
    location.href = 'index.html';
    return false;
  }
  if (admin && auth.user.role !== 'Admin') {
    location.href = 'dashboard.html';
    return false;
  }
  return true;
}

// ---------- Navbar ----------
function renderNavbar(active) {
  const u = auth.user || {};
  const links = [
    ['dashboard', 'dashboard.html', 'Dashboard'],
    ['tasks', 'tasks.html', 'รายการงาน'],
    ['profile', 'profile.html', 'ข้อมูลส่วนตัว'],
  ];
  if (u.role === 'Admin') links.push(['admin', 'admin.html', 'จัดการผู้ใช้']);

  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.innerHTML = `
    <span class="brand">📋 Task Manager</span>
    <div class="links">
      ${links.map(([key, href, label]) =>
        `<a href="${href}" class="${key === active ? 'active' : ''}">${label}</a>`).join('')}
    </div>
    <span class="user hide-sm">${escapeHtml(u.fullName || '')} (${u.role || ''})</span>
    <button class="btn sm secondary" id="logoutBtn">ออกจากระบบ</button>
  `;
  document.body.prepend(nav);
  document.getElementById('logoutBtn').onclick = () => auth.logout();
}

// ---------- แสดงข้อความ ----------
function showMsg(el, text, type = 'error') {
  el.textContent = text;
  el.className = `msg ${type}`;
}
function hideMsg(el) { el.className = 'msg'; }

// ---------- Helpers ----------
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// '2026-11-09' → '9 พ.ย. 2569'
function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d.slice(0, 10) + 'T00:00:00');
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

// '2026-11-09 14:30:00' → '9 พ.ย. 2569 14:30'
function formatDateTime(d) {
  if (!d) return '-';
  const date = new Date(d.replace(' ', 'T'));
  return date.toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_CLASS = { 'To Do': 'todo', Doing: 'doing', Done: 'done' };
function statusBadge(status) {
  return `<span class="badge ${STATUS_CLASS[status]}">${status}</span>`;
}

// ป้ายเตือนกำหนดส่ง
function dueBadge(task) {
  if (Number(task.isOverdue)) return ' <span class="badge overdue">เลยกำหนด</span>';
  if (Number(task.isUpcoming)) return ' <span class="badge upcoming">ใกล้ครบกำหนด</span>';
  return '';
}
