// ==========================================================
// Shared helpers used by every page (dashboard.js, students.js, ...)
// ==========================================================

// Use the same origin when Express serves the client.  When the HTML is opened
// through VS Code Live Server (usually port 5500), send requests to the Express
// API instead of asking Live Server for `/api/...`, which returns 404.
const API_BASE = window.location.port === '5000'
  ? '/api'
  : 'http://localhost:5000/api';

// Simple fetch wrapper: throws a readable Error on non-2xx responses
// so every page can just do:  try { await api(...) } catch (e) { showToast(e.message) }
async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* no body */ }

  if (!res.ok) {
    throw new Error((data && data.message) || `Request failed (${res.status})`);
  }
  return data;
}

function formatCurrency(value) {
  const n = Number(value || 0);
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Bootstrap-styled toast in the top-right corner
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '2000';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `alert alert-${type === 'error' ? 'danger' : type} shadow-sm`;
  el.style.minWidth = '260px';
  el.style.marginBottom = '10px';
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function statusBadgeClass(status) {
  const map = {
    Available: 'badge-available',
    Full: 'badge-full',
    Maintenance: 'badge-maintenance',
    Paid: 'badge-paid',
    Partial: 'badge-partial',
    Pending: 'badge-pending',
    Active: 'badge-active',
    Cancelled: 'badge-cancelled'
  };
  return map[status] || 'badge-available';
}

// Highlight the current page's link in the sidebar + wire up mobile toggle + logout
document.addEventListener('DOMContentLoaded', () => {
  const current = location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });

  const toggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('hms_logged_in');
      window.location.href = 'login.html';
    });
  }

  // Basic route guard: bounce to login if not "logged in" (simple demo auth)
  if (!current.includes('login') && localStorage.getItem('hms_logged_in') !== 'true') {
    window.location.href = 'login.html';
  }
});
