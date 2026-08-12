/* =====================================================
   SMART ATTENDANCE — Shared App Utilities
   ===================================================== */

// ─── Toast Notifications ───────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '🔔'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Sidebar Toggle ────────────────────────────────────
function initSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;
  function openSidebar() {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }
  toggle.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
  if (overlay) overlay.addEventListener('click', closeSidebar);
}

// ─── Mark active nav item ──────────────────────────────
function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    if (item.dataset.page === currentPage) item.classList.add('active');
  });
}

// ─── Date / Time Formatting ────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(timeStr) {
  if (!timeStr || timeStr === '--') return '--';
  return timeStr;
}
function formatDateTime(dtStr) {
  if (!dtStr) return '--';
  const d = new Date(dtStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function currentTimeStr() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function friendlyDate(d = new Date()) {
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ─── Status Badge HTML ─────────────────────────────────
function statusBadge(status) {
  const map = {
    present: '<span class="badge badge-success badge-dot">Present</span>',
    absent:  '<span class="badge badge-danger badge-dot">Absent</span>',
    late:    '<span class="badge badge-warning badge-dot">Late</span>',
    active:  '<span class="badge badge-success">Active</span>',
    inactive:'<span class="badge badge-danger">Inactive</span>',
  };
  return map[status?.toLowerCase()] || `<span class="badge badge-primary">${status}</span>`;
}

// ─── Avatar Initials ───────────────────────────────────
function avatarHtml(name, size = 36) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = ['4f46e5','0ea5e9','10b981','f59e0b','ef4444','8b5cf6','06b6d4'];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:#${color}20;color:#${color};font-size:${size*0.38}px">${initials}</div>`;
}

// ─── Auth Guard ────────────────────────────────────────
function requireAuth(redirectTo = 'login.html') {
  const user = currentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}
function saveAuthUser(user) {
  sessionStorage.setItem('sa_user', JSON.stringify(user));
}
function logout() {
  if (typeof supabaseClient !== 'undefined' && supabaseClient !== null) {
    try { supabaseClient.auth.signOut(); } catch(e) {}
  }
  sessionStorage.removeItem('sa_user');
  sessionStorage.removeItem('sa_college');
  sessionStorage.clear();
  window.location.href = 'login.html';
}
window.logout = logout;

// ─── CSV Export ────────────────────────────────────────
function exportCSV(data, filename = 'attendance.csv') {
  if (!data || !data.length) { showToast('No data to export', 'warning'); return; }
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${data.length} records as CSV ✓`, 'success');
}

// ─── Number Counter Animation ──────────────────────────
function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  const startVal = 0;
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(startVal + (target - startVal) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function animateAllCounters() {
  document.querySelectorAll('[data-counter]').forEach(el => {
    animateCounter(el, parseInt(el.dataset.counter, 10));
  });
}

// ─── Modal Helpers ─────────────────────────────────────
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
}
function initModals() {
  document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const overlay = btn.closest('.modal-overlay');
      if (overlay) closeModal(overlay.id);
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
  });
}

// ─── Tab Switcher ──────────────────────────────────────
function initTabs(container = document) {
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const group = tab.closest('.tabs').dataset.group || 'default';
      const target = tab.dataset.tab;
      document.querySelectorAll(`.tab[data-tab]`).forEach(t => {
        if ((t.closest('.tabs').dataset.group || 'default') === group) t.classList.remove('active');
      });
      document.querySelectorAll(`.tab-panel[data-tab]`).forEach(p => {
        if ((p.dataset.group || 'default') === group) p.classList.remove('active');
      });
      tab.classList.add('active');
      const panel = document.querySelector(`.tab-panel[data-tab="${target}"]`);
      if (panel) panel.classList.add('active');
    });
  });
}

// ─── Populate user info ────────────────────────────────
function populateUserUI(user = null) {
  const curUser = user || currentUser();
  if (!curUser) return;
  const nameEls = document.querySelectorAll('[data-user-name]');
  const roleEls = document.querySelectorAll('[data-user-role]');
  const avatarEls = document.querySelectorAll('[data-user-avatar]');
  nameEls.forEach(el => el.textContent = curUser.name || 'User');
  roleEls.forEach(el => el.textContent = curUser.role ? (curUser.role.charAt(0).toUpperCase() + curUser.role.slice(1)) : 'User');
  avatarEls.forEach(el => el.textContent = curUser.avatar || (curUser.name ? curUser.name.slice(0, 2).toUpperCase() : 'US'));
}

// ─── Real-time clock ───────────────────────────────────
function startClock(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  function update() {
    el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  update(); setInterval(update, 1000);
}

// ─── Update Pending Approvals Badge ─────────────────────
function updatePendingBadge() {
  if (typeof DEMO_PENDING === 'undefined' || !Array.isArray(DEMO_PENDING)) return;
  
  const user = currentUser();
  const isAdminUser = isAdmin();
  const isTeacherUser = isTeacher();

  const pendingCount = DEMO_PENDING.filter(p => {
    if (p.status !== 'pending') return false;
    // 1. Admins see all pending requests
    if (isAdminUser) return true;
    // 2. Teachers see only non-admin requests from their own department
    if (isTeacherUser) {
      if (p.role === 'admin') return false; // Teachers cannot approve admins
      if (p.deptId !== user?.deptId) return false; // Teachers only see their own department
      return true;
    }
    return false;
  }).length;

  document.querySelectorAll('.nav-badge, #pending-badge, #dash-pending-badge').forEach(badge => {
    badge.textContent = pendingCount;
    if (pendingCount === 0) {
      badge.style.display = 'none';
    } else {
      badge.style.display = 'inline-flex';
    }
  });
}

// ─── DOM Ready Init ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  setActiveNav();
  initModals();
  initTabs();
  populateUserUI();
  animateAllCounters();
  updatePendingBadge();

  // Logout button handler
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });

  // Greeting
  const greetEl = document.getElementById('greeting');
  if (greetEl) greetEl.textContent = greeting();

  // Current date display
  const dateEl = document.getElementById('current-date');
  if (dateEl) dateEl.textContent = friendlyDate();
});
