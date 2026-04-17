// app.js — Global utilities for On The Spot
// Plain vanilla JS — no modules, no bundlers needed.
// Works in any browser when opened from http://localhost:5000

// ─── API Base URL ─────────────────────────────────────────────────────────────
const API = 'http://localhost:5000/api';

// ─── Simple API helper ────────────────────────────────────────────────────────
const http = {
  _token: () => localStorage.getItem('ots_token'),

  _headers: (isJson = true) => {
    const h = {};
    const t = http._token();
    if (t) h['Authorization'] = 'Bearer ' + t;
    if (isJson) h['Content-Type'] = 'application/json';
    return h;
  },

  get: async (url) => {
    const r = await fetch(API + url, { headers: http._headers() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Request failed');
    return d;
  },

  post: async (url, body) => {
    const isForm = body instanceof FormData;
    const r = await fetch(API + url, {
      method: 'POST',
      headers: http._headers(!isForm),
      body: isForm ? body : JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Request failed');
    return d;
  },

  put: async (url, body) => {
    const r = await fetch(API + url, {
      method: 'PUT',
      headers: http._headers(),
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Request failed');
    return d;
  },

  del: async (url) => {
    const r = await fetch(API + url, { method: 'DELETE', headers: http._headers() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Request failed');
    return d;
  },
};

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('ots_token'),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('ots_user') || 'null'); }
    catch { return null; }
  },
  isLoggedIn: () => !!localStorage.getItem('ots_token'),
  setSession: (token, user) => {
    localStorage.setItem('ots_token', token);
    localStorage.setItem('ots_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('ots_token');
    localStorage.removeItem('ots_user');
  },
};

// ─── Toast notifications ──────────────────────────────────────────────────────
const Toast = {
  _container: null,
  _get: function () {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
    }
    return this._container;
  },
  show: function (msg, type = 'info') {
    const c = this._get();
    if (!c) return;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.setAttribute('role', 'alert');
    t.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => {
      t.classList.add('removing');
      setTimeout(() => t.remove(), 400);
    }, 4000);
    t.addEventListener('click', () => t.remove());
  },
  success: function (m) { this.show(m, 'success'); },
  error:   function (m) { this.show(m, 'error'); },
  info:    function (m) { this.show(m, 'info'); },
  warning: function (m) { this.show(m, 'warning'); },
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
(function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target)) navLinks.classList.remove('open');
    });
  }

  // Set active link
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const active = href === page || (page === '' && href === 'index.html') || href === '/' + page;
    link.classList.toggle('active', active);
  });

  // Update login/dashboard button
  const loginBtn = document.getElementById('btnLogin');
  if (loginBtn) {
    const user = Auth.getUser();
    if (user) {
      loginBtn.textContent = 'Dashboard';
      loginBtn.href = '/dashboard.html';
    }
  }
})();

// ─── Footer year ──────────────────────────────────────────────────────────────
(function () {
  const y = document.getElementById('footerYear');
  if (y) y.textContent = new Date().getFullYear();
})();

// ─── Simple form helpers ──────────────────────────────────────────────────────
function showError(input, msg) {
  input.classList.add('error');
  const g = input.closest('.form-group');
  if (!g) return;
  let el = g.querySelector('.form-error');
  if (!el) { el = document.createElement('p'); el.className = 'form-error'; g.appendChild(el); }
  el.textContent = msg;
  el.classList.add('visible');
}

function clearError(input) {
  input.classList.remove('error');
  const g = input.closest('.form-group');
  if (g) { const e = g.querySelector('.form-error'); if (e) e.classList.remove('visible'); }
}

function setLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn._orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Please wait...';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn._orig || btn.innerHTML;
  }
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});
