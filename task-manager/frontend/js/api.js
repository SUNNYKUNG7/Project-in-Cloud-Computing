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

  // จำว่า Load Balancer ส่งคำขอนี้ไปที่ backend เครื่องไหน (header X-Backend)
  const backend = res.headers.get('X-Backend');
  if (backend) {
    const badge = document.getElementById('backendBadge');
    if (badge) badge.textContent = backend;
  }

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

// ---------- ไอคอน (เส้นแบบ Lucide วาดด้วย SVG ไม่ต้องโหลดไลบรารี) ----------
const ICONS = {
  logo: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  dashboard: '<rect width="7" height="9" x="3" y="3" rx="1.5"/><rect width="7" height="5" x="14" y="3" rx="1.5"/><rect width="7" height="9" x="14" y="12" rx="1.5"/><rect width="7" height="5" x="3" y="16" rx="1.5"/>',
  board: '<rect width="18" height="18" x="3" y="3" rx="3"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  todo: '<circle cx="12" cy="12" r="9"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  checks: '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
};
function icon(name, size) {
  const s = size ? ` style="width:${size}px;height:${size}px"` : '';
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"${s}>${ICONS[name] || ''}</svg>`;
}

// ---------- แถบเมนูด้านข้าง (แทน navbar เดิม) ----------
// ย้าย .container ของแต่ละหน้าเข้าไปอยู่ในพื้นที่เนื้อหาทางขวา
function renderNavbar(active) {
  const u = auth.user || {};
  const links = [
    ['dashboard', 'dashboard.html', 'ภาพรวม', 'dashboard'],
    ['tasks', 'tasks.html', 'บอร์ดงาน', 'board'],
    ['profile', 'profile.html', 'บัญชีของฉัน', 'user'],
  ];
  if (u.role === 'Admin') links.push(['admin', 'admin.html', 'จัดการผู้ใช้', 'shield']);

  const frame = document.createElement('div');
  frame.className = 'app-frame';
  frame.innerHTML = `
    <aside class="sidebar">
      <a href="dashboard.html" class="brand"><span class="brand-mark">${icon('logo')}</span><span class="brand-text">Task Manager<span class="brand-dot">.</span></span></a>
      <div class="sidebar-caption">WORKSPACE</div>
      <nav class="side-nav" aria-label="เมนูหลัก">
        ${links.map(([key, href, label, ic]) =>
          `<a href="${href}" class="side-link ${key === active ? 'active' : ''}" title="${label}">${icon(ic)}<span>${label}</span></a>`).join('')}
      </nav>
      <div class="side-note"><span class="side-note-icon">${icon('calendar')}</span><div>ทีละงาน<strong>ก็ไปได้ไกล</strong></div></div>
      <div class="side-account">
        ${avatarHtml(u.fullName || '?', 34)}
        <div class="side-account-copy"><strong>${escapeHtml(u.fullName || '')}</strong><small>${u.role === 'Admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก'}</small></div>
        <button class="icon-btn" id="logoutBtn" title="ออกจากระบบ" aria-label="ออกจากระบบ">${icon('logout')}</button>
      </div>
      <div class="side-backend" title="backend ที่ตอบคำขอล่าสุด (ผ่าน Load Balancer)">API ตอบโดย <b id="backendBadge">-</b></div>
    </aside>
    <main class="app-main"></main>`;
  const main = frame.querySelector('.app-main');
  document.querySelectorAll('body > .container').forEach((c) => main.appendChild(c));
  document.body.prepend(frame);
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
// ป้ายสถานะแบบจุดสี
function statusBadge(status) {
  return `<span class="status-pill ${STATUS_CLASS[status]}"><i></i>${status}</span>`;
}

// ป้ายเตือนกำหนดส่ง (ใช้ต่อท้ายวันที่)
function dueBadge(task) {
  if (Number(task.isOverdue)) return ' <span class="due overdue"><small>เลยกำหนด</small></span>';
  if (Number(task.isUpcoming)) return ' <span class="due upcoming"><small>ใกล้ครบกำหนด</small></span>';
  return '';
}

// วันครบกำหนด + ป้ายในตัวเดียว
function dueLabel(task) {
  if (!task.dueDate) return '<span class="due-none">ไม่มีกำหนด</span>';
  const cls = Number(task.isOverdue) ? 'overdue' : Number(task.isUpcoming) ? 'upcoming' : '';
  const tag = cls === 'overdue' ? '<small>เลยกำหนด</small>' : cls === 'upcoming' ? '<small>ใกล้ครบกำหนด</small>' : '';
  return `<span class="due ${cls}">${formatDate(task.dueDate)}${tag}</span>`;
}

// ---------- ปุ่ม แสดง/ซ่อน รหัสผ่าน (หน้า login / register) ----------
function bindPasswordToggles() {
  document.querySelectorAll('.pw-toggle').forEach((btn) => {
    btn.onclick = () => {
      const input = document.getElementById(btn.dataset.target);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'ซ่อน' : 'แสดง';
      btn.setAttribute('aria-label', show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
    };
  });
}

// ---------- ปุ่มสถานะกำลังโหลด (กันกดซ้ำ) ----------
function setLoading(btn, loading, text) {
  if (loading) {
    btn.dataset.label = btn.innerHTML;          // เก็บทั้งไอคอนและข้อความไว้คืนค่า
    btn.textContent = text || 'กำลังดำเนินการ...';
  } else if (btn.dataset.label) {
    btn.innerHTML = btn.dataset.label;
  }
  btn.disabled = loading;
}

// ---------- รูปโปรไฟล์ตัวอักษรย่อ (avatar) ----------
// ตัวอักษรแรกของชื่อ — ถ้าขึ้นต้นด้วยสระหน้า (เ แ โ ใ ไ) ให้เอาพยัญชนะตัวถัดไปด้วย
function initials(name) {
  const s = String(name || '?').trim();
  return /^[เแโใไ]/.test(s) ? s.slice(0, 2) : s.slice(0, 1).toUpperCase();
}
// สีพื้นหลังคงที่ตามชื่อ (ชื่อเดิม = สีเดิมเสมอ)
const AVATAR_COLORS = ['#2f6fed', '#1f58cc', '#4c88f5', '#3b82c4', '#2563a8', '#5b7fd6'];
function avatarHtml(name, size = 36) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = AVATAR_COLORS[h % AVATAR_COLORS.length];
  return `<span class="avatar" style="width:${size}px;height:${size}px;background:${bg}">${escapeHtml(initials(name))}</span>`;
}

// ---------- แจ้งเตือนมุมล่างขวา (toast) ----------
function toast(text, type = 'success') {
  let box = document.getElementById('toastBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toastBox';
    box.className = 'toast-box';
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.classList.add('hide'), 2600);
  setTimeout(() => el.remove(), 3000);
}
