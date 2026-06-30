/**
 * TurfHub Core Utilities — Premium Light Theme
 * API client, auth management, toast notifications, navbar
 */

// ─── Config ───────────────────────────────────────────────
const CONFIG = {
  API_BASE: 'https://turf-hub-zbia.onrender.com/',
  TOKEN_KEY: 'turfhub_token',
  USER_KEY: 'turfhub_user'
};

// ─── API Client ───────────────────────────────────────────
const API = {
  async request(endpoint, options = {}) {
    const token = Auth.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body instanceof FormData) delete headers['Content-Type'];

    try {
      const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          Auth.logout();
          if (!window.location.href.includes('login')) {
            window.location.href = 'login.html?expired=1';
          }
        }
        throw new Error(data.message || 'Request failed');
      }
      return data;
    } catch (err) {
      if (err.name === 'TypeError') throw new Error('Cannot connect to server. Please check your connection.');
      throw err;
    }
  },

  get: (endpoint, params) => API.request(params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint),
  post: (endpoint, data) => API.request(endpoint, { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) }),
  put: (endpoint, data) => API.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint, data) => API.request(endpoint, { method: 'DELETE', body: data ? JSON.stringify(data) : undefined }),
  upload: (endpoint, formData, method = 'POST') => API.request(endpoint, { method, body: formData })
};

// ─── Auth Manager ─────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem(CONFIG.TOKEN_KEY),
  getUser: () => { try { return JSON.parse(localStorage.getItem(CONFIG.USER_KEY)); } catch { return null; } },
  isLoggedIn: () => !!localStorage.getItem(CONFIG.TOKEN_KEY),
  isOwner: () => Auth.getUser()?.role === 'owner',
  isCustomer: () => Auth.getUser()?.role === 'customer',
  isAdmin: () => Auth.getUser()?.role === 'admin',

  setSession(token, user) {
    localStorage.setItem(CONFIG.TOKEN_KEY, token);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
  },
  requireAuth(redirectTo = 'login.html') {
    if (!this.isLoggedIn()) {
      window.location.href = `${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`;
      return false;
    }
    return true;
  },
  requireRole(role, redirectTo = 'index.html') {
    if (!this.isLoggedIn()) { window.location.href = 'login.html'; return false; }
    if (this.getUser()?.role !== role) { window.location.href = redirectTo; return false; }
    return true;
  }
};

// ─── Toast Notifications ──────────────────────────────────
const Toast = {
  tray: null,
  init() {
    if (!this.tray) {
      this.tray = document.createElement('div');
      this.tray.className = 'toast-tray';
      document.body.appendChild(this.tray);
    }
  },
  show(message, type = 'success', duration = 4000) {
    this.init();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-msg">${message}</span>
      <span class="toast-close" onclick="Toast.remove(this.parentElement)">✕</span>
    `;
    this.tray.appendChild(toast);
    setTimeout(() => this.remove(toast), duration);
    return toast;
  },
  remove(toast) {
    if (!toast || !toast.parentElement) return;
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 200);
  },
  success: (m, d) => Toast.show(m, 'success', d),
  error: (m, d) => Toast.show(m, 'error', d || 5000),
  warning: (m, d) => Toast.show(m, 'warning', d),
  info: (m, d) => Toast.show(m, 'info', d)
};

// ─── Utility Functions ────────────────────────────────────
const Utils = {
  formatCurrency: (amount) => `₹${Number(amount).toLocaleString('en-IN')}`,
  formatDate: (date, options = {}) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...options }),
  formatTime: (time) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  },
  getInitials: (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),

  getStatusBadge: (status) => {
    const badges = {
      pending: '<span class="badge badge-pending">Pending</span>',
      accepted: '<span class="badge badge-accepted">Confirmed</span>',
      declined: '<span class="badge badge-declined">Declined</span>',
      cancelled: '<span class="badge badge-cancelled">Cancelled</span>',
      completed: '<span class="badge badge-completed">Completed</span>'
    };
    return badges[status] || `<span class="badge">${status}</span>`;
  },

  debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  },

  getTurfImageUrl: (turf) => {
    if (turf.images && turf.images.length > 0) {
      const primary = turf.images.find(i => i.isPrimary) || turf.images[0];
      return `${CONFIG.API_BASE.replace('/api', '')}${primary.url}`;
    }
    return null;
  },

  getSportIcon: (sport) => {
    const icons = {
      Football: '⚽', Cricket: '🏏', Badminton: '🏸', Volleyball: '🏐',
      Basketball: '🏀', Tennis: '🎾', Hockey: '🏑', Kabaddi: '🤼', 'Table Tennis': '🏓'
    };
    return icons[sport] || '🏆';
  },

  setButtonLoading(btn, loading, text = '') {
    if (loading) {
      btn._originalText = btn.innerHTML;
      btn.innerHTML = `<span class="spin spin-sm"></span> ${text || 'Loading…'}`;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn._originalText || text;
      btn.disabled = false;
    }
  },

  getQueryParam: (name) => new URLSearchParams(window.location.search).get(name),
  isFuture: (date) => new Date(date) > new Date(),

  placeholderSVG: (w, h, emoji = '🏟️') =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect fill="#F0F4FF" width="${w}" height="${h}"/><text x="${w/2}" y="${h/2+16}" text-anchor="middle" font-size="${Math.min(w,h)*0.32}">${emoji}</text></svg>`)}`
};

// ─── Modal Manager ────────────────────────────────────────
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  },
  closeAll() {
    document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }
};

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) Modal.closeAll();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown-panel.open').forEach(d => d.classList.remove('open'));
  }
});

// ─── Navbar Component ─────────────────────────────────────
const Navbar = {
  init() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    this.render(nav);
  },

  render(nav) {
    const user = Auth.getUser();
    const isLoggedIn = Auth.isLoggedIn();
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const inPages = window.location.pathname.includes('/pages/');
    const homeHref = inPages ? '../../index.html' : 'index.html';
    const pPrefix = inPages ? '' : 'frontend/pages/';

    const navLinks = isLoggedIn
      ? (Auth.isOwner()
        ? [
          { href: 'owner-dashboard.html', label: 'Dashboard' },
          { href: 'my-turfs.html', label: 'My Turfs' },
          { href: 'booking-requests.html', label: 'Requests' },
        ]
        : [
          { href: '__home__', label: 'Home' },
          { href: 'turfs.html', label: 'Browse Turfs' },
          { href: 'customer-dashboard.html', label: 'Dashboard' },
        ])
      : [
        { href: '__home__', label: 'Home' },
        { href: 'turfs.html', label: 'Browse Turfs' },
      ];

    const linksHTML = navLinks.map(l => {
      const href = l.href === '__home__' ? homeHref : `${pPrefix}${l.href}`;
      const isActive = l.href === '__home__' ? (path === 'index.html') : (path === l.href);
      return `<li><a href="${href}" class="${isActive ? 'active' : ''}">${l.label}</a></li>`;
    }).join('');

    const authHTML = isLoggedIn
      ? `<div class="dropdown">
          <button class="user-chip" onclick="document.getElementById('userDropdown').classList.toggle('open')">
            <div class="av">${Utils.getInitials(user?.name)}</div>
            <span>${user?.name?.split(' ')[0] || 'User'}</span>
          </button>
          <div class="dropdown-panel" id="userDropdown">
            <div class="dd-meta">
              <div style="font-size:0.8125rem;font-weight:600;color:var(--ink);">${user?.name || ''}</div>
              <div class="dd-email">${user?.email || ''}</div>
              <span class="badge ${user?.role === 'owner' ? 'badge-owner' : 'badge-customer'}" style="margin-top:6px;">${user?.role === 'owner' ? 'Turf Owner' : 'Player'}</span>
            </div>
            <a href="${pPrefix}${Auth.isOwner() ? 'owner-dashboard.html' : 'customer-dashboard.html'}" class="dd-item">Dashboard</a>
            <a href="${pPrefix}profile.html" class="dd-item">Profile</a>
            <a href="${pPrefix}${Auth.isOwner() ? 'booking-requests.html' : 'bookings.html'}" class="dd-item">${Auth.isOwner() ? 'Booking Requests' : 'My Bookings'}</a>
            <div class="dd-divider"></div>
            <button class="dd-item danger" onclick="Navbar.logout()">Sign Out</button>
          </div>
        </div>`
      : `<a href="${pPrefix}login.html" class="btn btn-ghost btn-sm">Sign In</a>
         <a href="${pPrefix}register.html" class="btn btn-primary btn-sm">Join Now</a>`;

    nav.innerHTML = `
      <div class="wrap nav-inner">
        <a href="${homeHref}" class="nav-brand">
          <div class="nav-brand-mark">⚡</div>
          TurfHub
        </a>
        <ul class="nav-links">${linksHTML}</ul>
        <div class="nav-end">
          ${authHTML}
          <button class="nav-toggle" onclick="Navbar.toggleMobile()" aria-label="Menu">☰</button>
        </div>
      </div>
      <div id="mobileNavOverlay" class="mobile-nav-overlay hidden"></div>
      <div id="mobileNav" class="mobile-nav">
        <ul style="list-style:none;display:flex;flex-direction:column;gap:2px;">${linksHTML}</ul>
      </div>`;
  },

  toggleMobile() {
    const mobileNav = document.getElementById('mobileNav');
    const overlay = document.getElementById('mobileNavOverlay');
    if (!mobileNav || !overlay) return;
    const isOpen = mobileNav.classList.toggle('open');
    overlay.classList.toggle('open', isOpen);
    overlay.classList.toggle('hidden', !isOpen);
  },

  logout() {
    Auth.logout();
    Toast.success('Signed out successfully');
    const inPages = window.location.pathname.includes('/pages/');
    setTimeout(() => window.location.href = inPages ? '../../index.html' : 'index.html', 600);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Navbar.init();

  const closeMobileNav = () => {
    const mobileNav = document.getElementById('mobileNav');
    const overlay = document.getElementById('mobileNavOverlay');
    if (mobileNav && overlay) {
      mobileNav.classList.remove('open');
      overlay.classList.remove('open');
      overlay.classList.add('hidden');
    }
  };

  document.getElementById('mobileNavOverlay')?.addEventListener('click', closeMobileNav);
  document.getElementById('mobileNav')?.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMobileNav();
  });
});

// ─── Socket.IO Manager ────────────────────────────────────
const SocketManager = {
  socket: null,
  connect() {
    if (!window.io || !Auth.isLoggedIn()) return;
    const token = Auth.getToken();
    this.socket = window.io('http://localhost:5000', { auth: { token } });
    this.socket.on('new_booking', (data) => Toast.info(data.message));
    this.socket.on('booking_accepted', (data) => Toast.success(data.message));
    this.socket.on('booking_declined', (data) => Toast.warning(data.message));
    if (Auth.isOwner()) {
      const user = Auth.getUser();
      this.socket.emit('join_owner_room', user._id);
    }
  }
};
