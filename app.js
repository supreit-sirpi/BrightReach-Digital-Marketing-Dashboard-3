/* ==========================================================
   BRIGHT REACH — Admin Dashboard Application Logic
   Full CRUD | Budget Warnings | Auth | Activity Log
   ========================================================== */
'use strict';

/* ====================================================
   API SERVICE LAYER (Backend-Ready)
   ----------------------------------------------------
   Currently wraps localStorage for demo purposes. 
   To connect to a real backend (e.g. Node.js + MongoDB), 
   simply replace these methods with standard fetch() calls
   like: return fetch('/api/clients').then(r => r.json());
   ==================================================== */
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : (localStorage.getItem('br_api_url') || 'https://brightreach-backend-3.onrender.com/api');

// Override fetch globally to show loading indicator if server is waking up (Render free tier sleeps)
const originalFetch = window.fetch;
window.fetch = async function(url, options) {
  const isApi = typeof url === 'string' && url.includes('/api/');
  let loadingTimer;
  if (isApi) {
    loadingTimer = setTimeout(() => {
      toast('Connecting to backend... Server may take up to 50s to wake up on the free tier.', 'info');
    }, 1800);
  }
  try {
    const res = await originalFetch(url, options);
    if (loadingTimer) clearTimeout(loadingTimer);
    return res;
  } catch(e) {
    if (loadingTimer) clearTimeout(loadingTimer);
    throw e;
  }
};


const ApiService = {
  _data: null,
  async init() {
    const token = Auth.getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Data fetch failed');
      this._data = await res.json();
    } catch (e) {
      console.error(e);
      Auth.logout();
    }
  },
  get(key) {
    return this._data ? this._data[key] : null;
  },
  set(key, data) {
    if (this._data) this._data[key] = data;
    this._sync();
  },
  all() {
    return this._data || { users:[], clients:[], campaigns:[], leads:[], activity:[] };
  },
  async _sync() {
    const token = Auth.getToken();
    if (!token || !this._data) return;
    try {
      await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(this._data)
      });
    } catch(e) { console.error('Sync error', e); }
  }
};

const SessionManager = {
  timeout: null,
  warningTimeout: null,
  init() {
    this.reset();
    document.addEventListener('mousemove', () => this.reset());
    document.addEventListener('keydown', () => this.reset());
    document.addEventListener('click', () => this.reset());
    document.addEventListener('scroll', () => this.reset());
  },
  reset() {
    if (!Auth.currentUser) return;
    clearTimeout(this.timeout);
    clearTimeout(this.warningTimeout);
    
    // 14 minutes to warning, 15 minutes to total logout
    this.warningTimeout = setTimeout(() => {
      Modal.show('session-modal');
    }, 14 * 60 * 1000);
    
    this.timeout = setTimeout(() => {
      Modal.hide('session-modal');
      this.logout();
    }, 15 * 60 * 1000);
  },
  logout() {
    Auth.logout();
  },
  refreshSession() {
    Modal.hide('session-modal');
    this.reset();
    // In a real app we might also refresh the JWT here
  }
};

const Auth = {
  currentUser: null,
  token: null,

  getToken() { return this.token || sessionStorage.getItem('br_token'); },

  async login(email, password) {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, msg: data.error || 'Login failed' };
      
      this.currentUser = data.user;
      this.token = data.token;
      sessionStorage.setItem('br_token', data.token);
      await ApiService.init();
      SessionManager.init();
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, msg: 'Network error. Backend not running?' };
    }
  },

  logout() {
    this.currentUser = null;
    this.token = null;
    sessionStorage.removeItem('br_token');
    ApiService._data = null;
    Router.go('login');
  },

  isAdmin()  { return this.currentUser?.role === 'admin'; },
  isClient() { return this.currentUser?.role === 'client'; },

  async restore() {
    const token = sessionStorage.getItem('br_token');
    if (!token) return false;
    this.token = token;
    try {
      const res = await fetch(`${API_URL}/auth/check-session`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.user) {
        this.currentUser = data.user;
        await ApiService.init();
        SessionManager.init();
        return true;
      }
    } catch(e) {}
    this.logout();
    return false;
  }
};

/* --- UI Logic for Auth Forms --- */
function switchAuthView(view) {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('register-container').style.display = 'none';
  document.getElementById('forgot-container').style.display = 'none';
  document.getElementById('reset-container').style.display = 'none';
  
  if (view === 'login') document.getElementById('login-container').style.display = 'block';
  else if (view === 'register') document.getElementById('register-container').style.display = 'block';
  else if (view === 'forgot') document.getElementById('forgot-container').style.display = 'block';
  else if (view === 'reset') document.getElementById('reset-container').style.display = 'block';
}

function togglePassword(inputId, iconElement) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    iconElement.textContent = '🔒';
  } else {
    input.type = 'password';
    iconElement.textContent = '👁️';
  }
}

function validateStrongPassword(isReset = false) {
  const pwId = isReset ? 'reset-password' : 'reg-password';
  const val = document.getElementById(pwId).value;
  
  const rules = [
    { id: isReset ? 'r-req-len' : 'req-len', re: /.{8,}/ },
    { id: isReset ? 'r-req-up' : 'req-up', re: /[A-Z]/ },
    { id: isReset ? 'r-req-low' : 'req-low', re: /[a-z]/ },
    { id: isReset ? 'r-req-num' : 'req-num', re: /[0-9]/ },
    { id: isReset ? 'r-req-spc' : 'req-spc', re: /[^A-Za-z0-9]/ }
  ];
  
  let validCount = 0;
  rules.forEach(rule => {
    const el = document.getElementById(rule.id);
    if (rule.re.test(val)) {
      el.classList.add('valid');
      el.innerHTML = '✓ ' + el.innerHTML.substring(2);
      validCount++;
    } else {
      el.classList.remove('valid');
      el.innerHTML = '✕ ' + el.innerHTML.substring(2);
    }
  });

  const btnId = isReset ? 'reset-submit-btn' : 'reg-submit-btn';
  const btn = document.getElementById(btnId);
  
  if (!isReset) {
    const conf = document.getElementById('reg-confirm').value;
    const matchError = document.getElementById('pw-match-error');
    if (conf.length > 0 && conf !== val) {
      matchError.style.display = 'block';
      btn.disabled = true;
    } else {
      matchError.style.display = 'none';
      btn.disabled = validCount !== 5 || conf !== val;
    }
  } else {
    btn.disabled = validCount !== 5;
  }
}

/* ====================================================
   ROUTER
   ==================================================== */
const Router = {
  current: 'login',
  go(page) { this.current = page; App.render(); }
};

/* ====================================================
   UTILITIES
   ==================================================== */
const Fmt = {
  currency: n  => '₹' + Number(n).toLocaleString('en-IN'),
  date:     iso => iso ? new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—',
  timeAgo:  iso => {
    if (!iso) return '—';
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60)    return 'just now';
    if (s < 3600)  return Math.floor(s / 60)   + 'm ago';
    if (s < 86400) return Math.floor(s / 3600)  + 'h ago';
    if (s < 604800)return Math.floor(s / 86400) + 'd ago';
    return Fmt.date(iso);
  },
  initials: name => (name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
};

const uid = () => 'id_' + Math.random().toString(36).substr(2, 9) + Date.now();

function budgetInfo(campaign) {
  const pct = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;
  const rounded = Math.round(pct);
  if (pct >= 100) return { cls:'overbudget', pct:rounded, label:'🚨 Over Budget',   fill:'#ef4444' };
  if (pct >= 85)  return { cls:'warning',    pct:rounded, label:'⚠ Budget Alert',   fill:'#f59e0b' };
  return             { cls:'healthy',    pct:rounded, label:'✓ Healthy',         fill:'#10b981' };
}

function addActivity(action, entity, name, type) {
  const list = ApiService.get('activity') || [];
  list.unshift({ id: uid(), type, entity, name, user: Auth.currentUser?.name || 'Admin', action, timestamp: new Date().toISOString() });
  ApiService.set('activity', list.slice(0, 60));
}

/* ====================================================
   TOAST
   ==================================================== */
function toast(msg, type = 'success') {
  const icons = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || '•'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ====================================================
   MODAL SYSTEM
   ==================================================== */
const Modal = {
  show(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
  },
  hide(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
  },
  hideAll() {
    document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
    document.body.style.overflow = '';
  }
};
document.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) Modal.hideAll(); });

/* ====================================================
   MAIN APP
   ==================================================== */
const App = {
  render() {
    const { currentUser } = Auth;
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').style.display = 'none';

    if (!currentUser || Router.current === 'login') {
      document.getElementById('login-page').style.display = 'grid';
      return;
    }
    document.getElementById('app').style.display = 'block';
    this.buildSidebar();
    this.buildTopbar();
    this.buildPage();
  },

  buildSidebar() {
    const { campaigns } = ApiService.all();
    const alerts = campaigns.filter(c => budgetInfo(c).cls !== 'healthy').length;
    const isAdmin = Auth.isAdmin();

    const nav = isAdmin
      ? [
          { page:'dashboard',  icon:'🏠', label:'Dashboard',     badge: alerts || null },
          { page:'clients',    icon:'👥', label:'Clients' },
          { page:'campaigns',  icon:'📢', label:'Campaigns',     badge: alerts || null },
          { page:'leads',      icon:'🎯', label:'Leads' },
          { page:'users',      icon:'🔑', label:'User Accounts' },
          { page:'requests',   icon:'🔔', label:'Requests' },
        ]
      : [
          { page:'client-dashboard',  icon:'🏠', label:'My Dashboard' },
          { page:'client-campaigns',  icon:'📢', label:'My Campaigns' },
          { page:'client-leads',      icon:'🎯', label:'My Leads' },
        ];

    document.getElementById('sidebar').innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo-icon">🚀</div>
        <div>
          <div class="sidebar-logo-text">BrightReach</div>
          <span class="sidebar-logo-sub">Digital Marketing</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-label">${isAdmin ? 'Admin Panel' : 'Client Portal'}</div>
        ${nav.map(n => `
          <div class="nav-item${Router.current === n.page ? ' active' : ''}" onclick="Router.go('${n.page}')">
            <span class="nav-icon">${n.icon}</span>
            <span>${n.label}</span>
            ${n.badge ? `<span class="nav-badge">${n.badge}</span>` : ''}
          </div>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="user-profile" title="Logged in as ${Auth.currentUser.role}">
          <div class="user-avatar">${Fmt.initials(Auth.currentUser.name)}</div>
          <div>
            <div class="user-name">${Auth.currentUser.name}</div>
            <div class="user-role">${Auth.currentUser.role}</div>
          </div>
          <span class="logout-btn" onclick="Auth.logout()" title="Logout">⏻</span>
        </div>
      </div>
    `;
  },

  buildTopbar() {
    const titles = {
      'dashboard':         { t:'Dashboard',       s:'Overview of all activities' },
      'clients':           { t:'Clients',          s:'Manage all client accounts' },
      'campaigns':         { t:'Campaigns',        s:'Monitor & manage campaigns' },
      'leads':             { t:'Leads',            s:'Track and manage leads' },
      'users':             { t:'User Accounts',    s:'Manage login accounts' },
      'client-dashboard':  { t:'My Dashboard',     s:'Your performance overview' },
      'client-campaigns':  { t:'My Campaigns',     s:'Your active campaigns' },
      'client-leads':      { t:'My Leads',         s:'Leads from your campaigns' },
    };
    const { t, s } = titles[Router.current] || { t:'Dashboard', s:'' };
    const { campaigns } = ApiService.all();
    const alerts = campaigns.filter(c => budgetInfo(c).cls !== 'healthy').length;

    document.getElementById('topbar').innerHTML = `
      <div>
        <div class="topbar-title">${t}</div>
        <div class="topbar-subtitle">${s}</div>
      </div>
      <div class="topbar-right">
        <div class="topbar-search">
          <span style="color:var(--text-muted);font-size:0.9rem;">🔍</span>
          <input type="text" placeholder="Quick search…">
        </div>
        <div class="notification-btn" title="${alerts ? alerts + ' budget alert(s)' : 'No alerts'}">
          🔔
          ${alerts ? '<div class="notif-dot"></div>' : ''}
        </div>
        <div class="topbar-avatar">${Fmt.initials(Auth.currentUser.name)}</div>
      </div>
    `;
  },

  buildPage() {
    const el = document.getElementById('page-content');
    const map = {
      'dashboard':        () => Pages.dashboard(el),
      'clients':          () => Pages.clients(el),
      'campaigns':        () => Pages.campaigns(el),
      'leads':            () => Pages.leads(el),
      'users':            () => Pages.users(el),
      'requests':         () => Pages.requests(el),
      'client-dashboard': () => Pages.clientDashboard(el),
      'client-campaigns': () => Pages.clientCampaigns(el),
      'client-leads':     () => Pages.clientLeads(el),
    };
    (map[Router.current] || map['dashboard'])();
  }
};

/* ====================================================
   PAGES
   ==================================================== */
const Pages = {

  /* ---------- ADMIN DASHBOARD ---------- */
  dashboard(el) {
    const { clients, campaigns, leads, activity } = ApiService.all();
    const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
    const alertCamps = campaigns.filter(c => budgetInfo(c).cls !== 'healthy');

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Welcome back, <span class="gradient-text">${Auth.currentUser.name}</span> 👋</h1>
          <div class="subtitle">Here's what's happening across all campaigns today.</div>
        </div>
        <div class="date-chip">📅 ${Fmt.date(new Date().toISOString())}</div>
      </div>

      <!-- Budget Alerts -->
      ${alertCamps.length ? `
      <div class="budget-alerts-section">
        <div class="section-header">
          <div class="section-title">
            <span class="pulse-icon">⚠️</span>
            Campaign Budget Alerts
            <span class="badge active" style="margin-left:4px;">${alertCamps.length} Alert${alertCamps.length > 1 ? 's' : ''}</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="Router.go('campaigns')">View All →</button>
        </div>
        <div class="budget-alerts-grid">
          ${alertCamps.map(c => {
            const cl = clients.find(x => x.id === c.clientId);
            const bi = budgetInfo(c);
            return `
            <div class="budget-alert-card ${bi.cls}" title="Click to view campaign" style="cursor:pointer;" onclick="CRUD.viewCampaign('${c.id}')">
              <div class="alert-card-header">
                <div class="alert-card-info">
                  <div class="alert-badge ${bi.cls}">
                    ${bi.cls === 'warning' ? '<span class="badge-dot"></span> ⚠ Budget Alert' : '🚨 Over Budget'}
                  </div>
                  <div class="alert-campaign-name">${c.name}</div>
                  <div class="alert-client-name">${cl?.name || '—'}</div>
                </div>
                <div class="alert-percentage">${bi.pct}%</div>
              </div>
              <div class="alert-progress-bar">
                <div class="alert-progress-fill" style="width:${Math.min(bi.pct,100)}%;background:${bi.fill};"></div>
              </div>
              <div class="alert-card-footer">
                <div class="alert-amounts"><strong>${Fmt.currency(c.spent)}</strong> / ${Fmt.currency(c.budget)} spent</div>
                <div class="alert-status-chip ${bi.cls === 'warning' ? 'approaching' : 'exceeded'}">
                  ${bi.cls === 'warning' ? 'Approaching Budget Limit' : 'Budget Exceeded'}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-icon">👥</div>
          <div class="stat-value">${clients.length}</div>
          <div class="stat-label">Total Clients</div>
          <div class="stat-change up">↑ All Active</div>
        </div>
        <div class="stat-card pink">
          <div class="stat-icon">📢</div>
          <div class="stat-value">${campaigns.length}</div>
          <div class="stat-label">Active Campaigns</div>
          <div class="stat-change ${alertCamps.length ? 'warn' : 'up'}">${alertCamps.length ? '⚠ ' + alertCamps.length + ' Alert' + (alertCamps.length > 1 ? 's' : '') : '↑ On Track'}</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">${leads.length}</div>
          <div class="stat-label">Total Leads</div>
          <div class="stat-change up">↑ Growing</div>
        </div>
        <div class="stat-card cyan">
          <div class="stat-icon">💰</div>
          <div class="stat-value">${Fmt.currency(totalSpent)}</div>
          <div class="stat-label">Total Ad Spend</div>
          <div class="stat-change up">↑ This Month</div>
        </div>
      </div>

      <!-- Chart + Activity -->
      <div class="dashboard-grid">
        <div style="display:flex; flex-direction:column; gap:22px;">
          <div class="chart-card">
            <div class="chart-title">📊 Campaign Budget Overview</div>
            <canvas id="budgetChart" height="260"></canvas>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:22px;">
            <div class="chart-card">
              <div class="chart-title">🎯 Lead Sources</div>
              <canvas id="sourcesChart" height="220"></canvas>
            </div>
            <div class="chart-card">
              <div class="chart-title">📈 Lead Status Pipeline</div>
              <canvas id="statusChart" height="220"></canvas>
            </div>
          </div>
        </div>
        <div class="activity-log">
          <div class="section-title" style="margin-bottom:18px;">📋 Recent Activity</div>
          ${activity.slice(0, 12).map(a => {
            const icons = { create:'✚', edit:'✎', delete:'🗑', warning:'⚠' };
            return `
            <div class="activity-item">
              <div class="activity-dot ${a.type}">${icons[a.type] || '•'}</div>
              <div class="activity-content">
                <div class="activity-text"><strong>${a.user}</strong> ${a.action}: <strong>${a.name}</strong></div>
                <div class="activity-time">${Fmt.timeAgo(a.timestamp)}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;

    // Chart
    setTimeout(() => {
      const ctx = document.getElementById('budgetChart');
      if (!ctx) return;
      if (window._budgetChart) window._budgetChart.destroy();
      window._budgetChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: campaigns.map(c => c.name.length > 22 ? c.name.slice(0,21) + '…' : c.name),
          datasets: [
            {
              label: 'Budget',
              data: campaigns.map(c => c.budget),
              backgroundColor: 'rgba(99,102,241,0.25)',
              borderColor: 'rgba(99,102,241,0.8)',
              borderWidth: 2,
              borderRadius: 6,
            },
            {
              label: 'Spent',
              data: campaigns.map(c => c.spent),
              backgroundColor: campaigns.map(c => {
                const bi = budgetInfo(c);
                return bi.cls === 'overbudget' ? 'rgba(239,68,68,0.7)' : bi.cls === 'warning' ? 'rgba(245,158,11,0.7)' : 'rgba(16,185,129,0.7)';
              }),
              borderColor: campaigns.map(c => budgetInfo(c).fill),
              borderWidth: 2,
              borderRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color:'#94a3b8', font:{ family:'Inter', size:12 } } },
            tooltip: { callbacks: { label: ctx => ' ' + Fmt.currency(ctx.raw) } }
          },
          scales: {
            x: { ticks:{ color:'#64748b', font:{family:'Inter', size:11} }, grid:{ color:'rgba(255,255,255,0.04)' } },
            y: { ticks:{ color:'#64748b', font:{family:'Inter', size:11}, callback: v => '₹'+(v/1000)+'k' }, grid:{ color:'rgba(255,255,255,0.04)' } }
          }
        }
      });

      const sourcesCtx = document.getElementById('sourcesChart');
      if (sourcesCtx && leads.length) {
        if (window._sourcesChart) window._sourcesChart.destroy();
        const sources = leads.reduce((acc, l) => { acc[l.source||'Other'] = (acc[l.source||'Other']||0)+1; return acc; }, {});
        window._sourcesChart = new Chart(sourcesCtx, {
          type: 'doughnut',
          data: {
            labels: Object.keys(sources),
            datasets: [{
              data: Object.values(sources),
              backgroundColor: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'],
              borderWidth: 0
            }]
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color:'#94a3b8', font:{family:'Inter', size:11} } } } }
        });
      }

      const statusCtx = document.getElementById('statusChart');
      if (statusCtx && leads.length) {
        if (window._statusChart) window._statusChart.destroy();
        const statuses = leads.reduce((acc, l) => { acc[l.status||'new'] = (acc[l.status||'new']||0)+1; return acc; }, {});
        window._statusChart = new Chart(statusCtx, {
          type: 'bar',
          data: {
            labels: Object.keys(statuses).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
            datasets: [{
              label: 'Leads',
              data: Object.values(statuses),
              backgroundColor: ['#6366f1', '#10b981', '#ec4899', '#f59e0b'],
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks:{ color:'#64748b', font:{family:'Inter', size:11} }, grid:{ display: false } },
              y: { ticks:{ color:'#64748b', font:{family:'Inter', size:11}, stepSize: 1 }, grid:{ color:'rgba(255,255,255,0.04)' } }
            }
          }
        });
      }
    }, 80);
  },

  /* ---------- CLIENTS ---------- */
  clients(el) {
    const render = (filter = '') => {
      const all = ApiService.get('clients') || [];
      const list = filter ? all.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.email.toLowerCase().includes(filter.toLowerCase()) ||
        (c.industry||'').toLowerCase().includes(filter.toLowerCase())
      ) : all;

      const tbody = document.getElementById('clients-tbody');
      if (!tbody) return;
      tbody.innerHTML = list.length ? list.map(c => `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,rgba(99,102,241,0.3),rgba(99,102,241,0.1));border:1px solid rgba(99,102,241,0.2);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">👤</div>
              <div><div class="td-main">${c.name}</div><div class="td-sub">${c.industry || '—'}</div></div>
            </div>
          </td>
          <td><div class="td-main">${c.email}</div><div class="td-sub">${c.phone || '—'}</div></td>
          <td>${c.address || '—'}</td>
          <td><span class="badge ${c.status}">${c.status}</span></td>
          <td>${Fmt.date(c.createdAt)}</td>
          <td>
            <div class="action-buttons">
              <div class="tooltip-wrap"><button class="btn-icon btn-view" id="view-c-${c.id}" onclick="CRUD.viewClient('${c.id}')">👁</button><span class="tooltip">View Details</span></div>
              <div class="tooltip-wrap"><button class="btn-icon btn-edit" id="edit-c-${c.id}" onclick="CRUD.editClient('${c.id}')">✏️</button><span class="tooltip">Edit Client</span></div>
              <div class="tooltip-wrap"><button class="btn-icon btn-delete" id="del-c-${c.id}" onclick="CRUD.confirmDelete('client','${c.id}','${c.name}')">🗑️</button><span class="tooltip">Delete</span></div>
            </div>
          </td>
        </tr>
      `).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👥</div><p>No clients found. Add your first client!</p></div></td></tr>`;
    };

    el.innerHTML = `
      <div class="table-page-header">
        <div><h1>Clients</h1><div class="subtitle">Manage all client accounts — full CRUD</div></div>
        <button class="btn btn-primary" id="add-client-btn" onclick="CRUD.createClient()">＋ Add Client</button>
      </div>
      <div class="table-controls">
        <div class="search-input-wrap">
          <span style="color:var(--text-muted);">🔍</span>
          <input type="text" id="client-search" placeholder="Search by name, email, industry…" oninput="Pages._filterClients(this.value)">
        </div>
        <span class="badge active">${(ApiService.get('clients')||[]).length} Total</span>
      </div>
      <div class="table-card">
        <table class="data-table">
          <thead><tr>
            <th>Client</th><th>Contact</th><th>Location</th><th>Status</th><th>Joined</th><th>Actions</th>
          </tr></thead>
          <tbody id="clients-tbody"></tbody>
        </table>
      </div>
    `;

    Pages._filterClients = render;
    render();
  },

  /* ---------- CAMPAIGNS ---------- */
  campaigns(el) {
    const render = (filter = '') => {
      const all = ApiService.get('campaigns') || [];
      const clients = ApiService.get('clients') || [];
      const list = filter ? all.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        (c.platform||'').toLowerCase().includes(filter.toLowerCase())
      ) : all;

      const tbody = document.getElementById('camps-tbody');
      if (!tbody) return;
      tbody.innerHTML = list.length ? list.map(c => {
        const cl = clients.find(x => x.id === c.clientId);
        const bi = budgetInfo(c);
        const rowBg = bi.cls === 'overbudget' ? 'background:rgba(239,68,68,0.04);' : bi.cls === 'warning' ? 'background:rgba(245,158,11,0.04);' : '';
        return `
        <tr style="${rowBg}">
          <td>
            <div class="td-main">${c.name}</div>
            <div class="td-sub">${c.platform || '—'}</div>
          </td>
          <td><div class="td-main">${cl?.name || '—'}</div></td>
          <td><div class="td-main">${Fmt.currency(c.budget)}</div></td>
          <td>
            <div class="td-main">${Fmt.currency(c.spent)}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:5px;">
              <div class="budget-progress-mini"><div class="budget-progress-mini-fill" style="width:${Math.min(bi.pct,100)}%;background:${bi.fill};"></div></div>
              <span class="budget-badge ${bi.cls}">${bi.pct >= 85 ? (bi.cls === 'overbudget' ? '🚨 ' : '⚠ ') : '✓ '}${bi.pct}%</span>
            </div>
          </td>
          <td><span class="badge ${c.status}">${c.status}</span></td>
          <td>${Fmt.date(c.startDate)}</td>
          <td>
            <div class="action-buttons">
              <div class="tooltip-wrap"><button class="btn-icon btn-view" id="view-camp-${c.id}" onclick="CRUD.viewCampaign('${c.id}')">👁</button><span class="tooltip">View Details</span></div>
              <div class="tooltip-wrap"><button class="btn-icon btn-edit" id="edit-camp-${c.id}" onclick="CRUD.editCampaign('${c.id}')">✏️</button><span class="tooltip">Edit Campaign</span></div>
              <div class="tooltip-wrap"><button class="btn-icon btn-delete" id="del-camp-${c.id}" onclick="CRUD.confirmDelete('campaign','${c.id}','${c.name.replace(/'/g,"\\'")}')">🗑️</button><span class="tooltip">Delete</span></div>
            </div>
          </td>
        </tr>`;
      }).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📢</div><p>No campaigns found.</p></div></td></tr>`;
    };

    el.innerHTML = `
      <div class="table-page-header">
        <div><h1>Campaigns</h1><div class="subtitle">Monitor budgets & manage all campaigns</div></div>
        <button class="btn btn-primary" id="add-camp-btn" onclick="CRUD.createCampaign()">＋ Add Campaign</button>
      </div>
      <div class="table-controls">
        <div class="search-input-wrap">
          <span style="color:var(--text-muted);">🔍</span>
          <input type="text" placeholder="Search campaigns or platform…" oninput="Pages._filterCamps(this.value)">
        </div>
      </div>
      <div class="table-card">
        <table class="data-table">
          <thead><tr>
            <th>Campaign</th><th>Client</th><th>Budget</th><th>Spent / Usage</th><th>Status</th><th>Start Date</th><th>Actions</th>
          </tr></thead>
          <tbody id="camps-tbody"></tbody>
        </table>
      </div>
    `;

    Pages._filterCamps = render;
    render();
  },

  /* ---------- LEADS ---------- */
  leads(el) {
    const render = (filter = '') => {
      const all      = ApiService.get('leads')     || [];
      const clients  = ApiService.get('clients')   || [];
      const campaigns= ApiService.get('campaigns') || [];
      const list = filter ? all.filter(l =>
        l.name.toLowerCase().includes(filter.toLowerCase()) ||
        l.email.toLowerCase().includes(filter.toLowerCase()) ||
        (l.phone||'').includes(filter)
      ) : all;

      const tbody = document.getElementById('leads-tbody');
      if (!tbody) return;
      tbody.innerHTML = list.length ? list.map(l => {
        const cl = clients.find(x => x.id === l.clientId);
        const cp = campaigns.find(x => x.id === l.campaignId);
        return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,rgba(6,182,212,0.3),rgba(6,182,212,0.1));display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0;border:1px solid rgba(6,182,212,0.2);">${Fmt.initials(l.name)}</div>
              <div><div class="td-main">${l.name}</div><div class="td-sub">${l.email}</div></div>
            </div>
          </td>
          <td>${l.phone || '—'}</td>
          <td>${cl?.name || '—'}</td>
          <td><div class="td-main">${cp?.name || '—'}</div></td>
          <td><span class="badge ${l.status}">${l.status}</span></td>
          <td>${l.source || '—'}</td>
          <td>${Fmt.date(l.createdAt)}</td>
          <td>
            <div class="action-buttons">
              <div class="tooltip-wrap"><button class="btn-icon btn-view" id="view-l-${l.id}" onclick="CRUD.viewLead('${l.id}')">👁</button><span class="tooltip">View Lead</span></div>
              <div class="tooltip-wrap"><button class="btn-icon btn-edit" id="edit-l-${l.id}" onclick="CRUD.editLead('${l.id}')">✏️</button><span class="tooltip">Edit Lead</span></div>
              <div class="tooltip-wrap"><button class="btn-icon btn-delete" id="del-l-${l.id}" onclick="CRUD.confirmDelete('lead','${l.id}','${l.name.replace(/'/g,"\\'")}')">🗑️</button><span class="tooltip">Delete</span></div>
            </div>
          </td>
        </tr>`;
      }).join('') : `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🎯</div><p>No leads found.</p></div></td></tr>`;
    };

    el.innerHTML = `
      <div class="table-page-header">
        <div><h1>Leads</h1><div class="subtitle">Track and manage all leads across clients</div></div>
        <button class="btn btn-primary" id="add-lead-btn" onclick="CRUD.createLead()">＋ Add Lead</button>
      </div>
      <div class="table-controls">
        <div class="search-input-wrap">
          <span style="color:var(--text-muted);">🔍</span>
          <input type="text" placeholder="Search by name, email, phone…" oninput="Pages._filterLeads(this.value)">
        </div>
        <span class="badge active">${(ApiService.get('leads')||[]).length} Total</span>
      </div>
      <div class="table-card">
        <table class="data-table">
          <thead><tr>
            <th>Lead</th><th>Phone</th><th>Client</th><th>Campaign</th><th>Status</th><th>Source</th><th>Date</th><th>Actions</th>
          </tr></thead>
          <tbody id="leads-tbody"></tbody>
        </table>
      </div>
    `;

    Pages._filterLeads = render;
    render();
  },

  /* ---------- USERS ---------- */
  users(el) {
    const render = (filter = '') => {
      const all     = ApiService.get('users')   || [];
      const clients = ApiService.get('clients') || [];
      const list = filter ? all.filter(u =>
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase())
      ) : all;

      const tbody = document.getElementById('users-tbody');
      if (!tbody) return;
      tbody.innerHTML = list.length ? list.map(u => {
        const cl = u.clientId ? clients.find(c => c.id === u.clientId) : null;
        return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:#fff;flex-shrink:0;">${Fmt.initials(u.name)}</div>
              <div><div class="td-main">${u.name}</div><div class="td-sub">${u.email}</div></div>
            </div>
          </td>
          <td><span class="badge ${u.role}">${u.role}</span></td>
          <td>${cl?.name || (u.role === 'admin' ? '— All Clients' : '—')}</td>
          <td><span class="badge ${u.status}">${u.status}</span></td>
          <td>${Fmt.date(u.createdAt)}</td>
          <td>
            <div class="action-buttons">
              <div class="tooltip-wrap"><button class="btn-icon btn-view" id="view-u-${u.id}" onclick="CRUD.viewUser('${u.id}')">👁</button><span class="tooltip">View Account</span></div>
              <div class="tooltip-wrap"><button class="btn-icon btn-edit" id="edit-u-${u.id}" onclick="CRUD.editUser('${u.id}')">✏️</button><span class="tooltip">Edit Account</span></div>
              ${u.status === 'active'
                ? `<div class="tooltip-wrap"><button class="btn-icon" id="dis-u-${u.id}" style="color:var(--warning);" onclick="CRUD.toggleUser('${u.id}','disable')">🚫</button><span class="tooltip">Disable Account</span></div>`
                : `<div class="tooltip-wrap"><button class="btn-icon" id="en-u-${u.id}"  style="color:var(--success);" onclick="CRUD.toggleUser('${u.id}','enable')">✅</button><span class="tooltip">Enable Account</span></div>`}
              <div class="tooltip-wrap"><button class="btn-icon btn-delete" id="del-u-${u.id}" onclick="CRUD.confirmDelete('user','${u.id}','${u.name.replace(/'/g,"\\'")}')">🗑️</button><span class="tooltip">Delete</span></div>
            </div>
          </td>
        </tr>`;
      }).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🔑</div><p>No user accounts found.</p></div></td></tr>`;
    };

    el.innerHTML = `
      <div class="table-page-header">
        <div><h1>User Accounts</h1><div class="subtitle">Manage login accounts and access permissions</div></div>
        <button class="btn btn-primary" id="add-user-btn" onclick="CRUD.createUser()">＋ Add User</button>
      </div>
      <div class="table-controls">
        <div class="search-input-wrap">
          <span style="color:var(--text-muted);">🔍</span>
          <input type="text" placeholder="Search users…" oninput="Pages._filterUsers(this.value)">
        </div>
        <span class="badge active">${(ApiService.get('users')||[]).length} Total</span>
      </div>
      <div class="table-card">
        <table class="data-table">
          <thead><tr>
            <th>User</th><th>Role</th><th>Associated Client</th><th>Status</th><th>Created</th><th>Actions</th>
          </tr></thead>
          <tbody id="users-tbody"></tbody>
        </table>
      </div>
    `;

    Pages._filterUsers = render;
    render();
  },

  /* ---------- CLIENT DASHBOARD ---------- */
  clientDashboard(el) {
    const u = Auth.currentUser;
    const { clients, campaigns, leads } = ApiService.all();
    const myClient   = clients.find(c => c.id === u.clientId);
    const myCamps    = campaigns.filter(c => c.clientId === u.clientId);
    const myLeads    = leads.filter(l => l.clientId === u.clientId);
    const totalBudget= myCamps.reduce((s, c) => s + c.budget, 0);
    const totalSpent = myCamps.reduce((s, c) => s + c.spent, 0);
    const usagePct   = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const converted  = myLeads.filter(l => l.status === 'converted').length;

    el.innerHTML = `
      <div class="client-portal-header">
        <div class="client-tag">🏢 CLIENT PORTAL</div>
        <div class="client-name-header">${myClient?.name || u.name}</div>
        <div class="client-since">Member since ${Fmt.date(myClient?.createdAt)} · ${myClient?.industry || ''}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-icon">📢</div>
          <div class="stat-value">${myCamps.length}</div>
          <div class="stat-label">Active Campaigns</div>
          <div class="stat-change up">↑ Running</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">${myLeads.length}</div>
          <div class="stat-label">Total Leads</div>
          <div class="stat-change up">↑ All Time</div>
        </div>
        <div class="stat-card cyan">
          <div class="stat-icon">💰</div>
          <div class="stat-value">${Fmt.currency(totalSpent)}</div>
          <div class="stat-label">Total Spent</div>
          <div class="stat-change up">↑ This Period</div>
        </div>
        <div class="stat-card pink">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">${converted}</div>
          <div class="stat-label">Leads Converted</div>
          <div class="stat-change up">↑ Converted</div>
        </div>
      </div>

      <!-- Campaign summary -->
      ${myCamps.map(c => {
        const bi = budgetInfo(c);
        return `
        <div class="budget-alert-card ${bi.cls !== 'healthy' ? bi.cls : ''}" style="margin-bottom:16px;${bi.cls === 'healthy' ? 'border-color:var(--border);background:var(--bg-card);' : ''}">
          <div class="alert-card-header">
            <div class="alert-card-info">
              ${bi.cls !== 'healthy' ? `<div class="alert-badge ${bi.cls}">${bi.cls === 'warning' ? '<span class="badge-dot"></span> ⚠ Budget Alert' : '🚨 Over Budget'}</div>` : ''}
              <div class="alert-campaign-name">${c.name}</div>
              <div class="alert-client-name">${c.platform} · ${Fmt.date(c.startDate)} → ${Fmt.date(c.endDate)}</div>
            </div>
            <div class="alert-percentage" style="${bi.cls === 'healthy' ? 'color:var(--success);' : ''}">${bi.pct}%</div>
          </div>
          <div class="alert-progress-bar"><div class="alert-progress-fill" style="width:${Math.min(bi.pct,100)}%;background:${bi.fill};"></div></div>
          <div class="alert-card-footer">
            <div class="alert-amounts"><strong>${Fmt.currency(c.spent)}</strong> / ${Fmt.currency(c.budget)} spent</div>
            <span class="badge ${c.status}">${c.status}</span>
          </div>
        </div>`;
      }).join('')}

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:24px;">
        <div class="chart-card">
          <div class="chart-title">📊 Budget Allocation vs Spend</div>
          <canvas id="clientChart" height="220"></canvas>
        </div>
        <div class="chart-card">
          <div class="chart-title">🎯 Lead Sources</div>
          <canvas id="clientSourcesChart" height="220"></canvas>
        </div>
      </div>
    `;

    setTimeout(() => {
      const ctx = document.getElementById('clientChart');
      if (!ctx || !myCamps.length) return;
      if (window._clientChart) window._clientChart.destroy();
      window._clientChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: myCamps.map(c => c.name),
          datasets: [
            { label:'Budget', data: myCamps.map(c => c.budget), backgroundColor:'rgba(99,102,241,0.25)', borderColor:'#6366f1', borderWidth:2, borderRadius:6 },
            { label:'Spent',  data: myCamps.map(c => c.spent),  backgroundColor: myCamps.map(c => budgetInfo(c).fill + 'aa'), borderColor: myCamps.map(c => budgetInfo(c).fill), borderWidth:2, borderRadius:6 }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend:{ labels:{ color:'#94a3b8', font:{family:'Inter'} } }, tooltip:{ callbacks:{ label: c => ' '+Fmt.currency(c.raw) } } },
          scales: {
            x: { ticks:{ color:'#64748b', font:{family:'Inter'} }, grid:{ color:'rgba(255,255,255,0.04)' } },
            y: { ticks:{ color:'#64748b', font:{family:'Inter'}, callback: v => '₹'+(v/1000)+'k' }, grid:{ color:'rgba(255,255,255,0.04)' } }
          }
        }
      });

      const sourcesCtx = document.getElementById('clientSourcesChart');
      if (sourcesCtx && myLeads.length) {
        if (window._clientSourcesChart) window._clientSourcesChart.destroy();
        const sources = myLeads.reduce((acc, l) => { acc[l.source||'Other'] = (acc[l.source||'Other']||0)+1; return acc; }, {});
        window._clientSourcesChart = new Chart(sourcesCtx, {
          type: 'doughnut',
          data: {
            labels: Object.keys(sources),
            datasets: [{
              data: Object.values(sources),
              backgroundColor: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'],
              borderWidth: 0
            }]
          },
          options: { responsive: true, plugins: { legend: { position: 'right', labels: { color:'#94a3b8', font:{family:'Inter', size:11} } } } }
        });
      }
    }, 80);
  },

  /* ---------- CLIENT CAMPAIGNS (read-only) ---------- */
  clientCampaigns(el) {
    const myCamps = (ApiService.get('campaigns') || []).filter(c => c.clientId === Auth.currentUser.clientId);
    el.innerHTML = `
      <div class="page-header"><h1>My Campaigns</h1><div class="subtitle">View-only access to your campaign data</div></div>
      <div class="table-card">
        <table class="data-table">
          <thead><tr><th>Campaign</th><th>Budget</th><th>Spent / Usage</th><th>Status</th><th>Start</th><th>End</th></tr></thead>
          <tbody>
            ${myCamps.map(c => {
              const bi = budgetInfo(c);
              return `
              <tr>
                <td><div class="td-main">${c.name}</div><div class="td-sub">${c.platform}</div></td>
                <td>${Fmt.currency(c.budget)}</td>
                <td>
                  <div class="td-main">${Fmt.currency(c.spent)}</div>
                  <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                    <div class="budget-progress-mini"><div class="budget-progress-mini-fill" style="width:${Math.min(bi.pct,100)}%;background:${bi.fill};"></div></div>
                    <span class="budget-badge ${bi.cls}">${bi.pct}%</span>
                  </div>
                </td>
                <td><span class="badge ${c.status}">${c.status}</span></td>
                <td>${Fmt.date(c.startDate)}</td>
                <td>${Fmt.date(c.endDate)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  /* ---------- CLIENT LEADS (read-only) ---------- */
  clientLeads(el) {
    const campaigns = ApiService.get('campaigns') || [];
    const myLeads   = (ApiService.get('leads') || []).filter(l => l.clientId === Auth.currentUser.clientId);
    el.innerHTML = `
      <div class="page-header"><h1>My Leads</h1><div class="subtitle">View-only access to your leads data</div></div>
      <div class="table-card">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Campaign</th><th>Status</th><th>Source</th><th>Date</th></tr></thead>
          <tbody>
            ${myLeads.map(l => {
              const cp = campaigns.find(c => c.id === l.campaignId);
              return `
              <tr>
                <td class="td-main">${l.name}</td>
                <td>${l.email}</td>
                <td>${l.phone || '—'}</td>
                <td>${cp?.name || '—'}</td>
                <td><span class="badge ${l.status}">${l.status}</span></td>
                <td>${l.source || '—'}</td>
                <td>${Fmt.date(l.createdAt)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  /* ---------- REGISTRATION REQUESTS (ADMIN) ---------- */
  async requests(el) {
    el.innerHTML = '<div class="page-header"><h1>Registration Requests</h1></div><div style="padding:20px;text-align:center;">Loading...</div>';
    try {
      const res = await fetch(`${API_URL}/pending-requests`, {
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const pending = await res.json();
      
      const renderRow = (u) => `
        <tr>
          <td>
            <div style="font-weight:600;">${esc(u.name)}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">${esc(u.email)}</div>
          </td>
          <td>${esc(u.company)}</td>
          <td>${esc(u.role)}</td>
          <td><span class="badge ${u.status === 'pending' ? 'warning' : 'danger'}">${u.status}</span></td>
          <td>${Fmt.date(u.createdAt)}</td>
          <td>
            ${u.status === 'pending' ? `
            <button class="btn btn-sm btn-primary" onclick="CRUD.approveUser('${u.id}')">Approve</button>
            <button class="btn btn-sm btn-danger" onclick="CRUD.rejectUser('${u.id}')">Reject</button>
            ` : '—'}
          </td>
        </tr>
      `;
      
      el.innerHTML = `
        <div class="page-header">
          <h1>Registration Requests</h1>
          <div class="subtitle">Review and approve new user accounts</div>
        </div>
        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Company</th>
                <th>Requested Role</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${pending.length ? pending.map(renderRow).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px;">No pending or rejected requests.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } catch(err) {
      el.innerHTML = '<div style="color:red;padding:20px;">Error loading requests.</div>';
    }
  }
};

/* ====================================================
   CRUD OPERATIONS
   ==================================================== */
const CRUD = {

  async approveUser(id) {
    try {
      const res = await fetch(`${API_URL}/approve-user/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast('User approved successfully.', 'success');
        Router.go('requests');
      } else toast(data.error, 'error');
    } catch(e) { toast('Network error', 'error'); }
  },
  
  async rejectUser(id) {
    try {
      const res = await fetch(`${API_URL}/reject-user/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast('User rejected.', 'warning');
        Router.go('requests');
      } else toast(data.error, 'error');
    } catch(e) { toast('Network error', 'error'); }
  },

  /* ----- CLIENTS ----- */
  viewClient(id) {
    const c = (ApiService.get('clients') || []).find(x => x.id === id);
    if (!c) return;
    const camps = (ApiService.get('campaigns') || []).filter(x => x.clientId === id);
    showDetail('Client Details', `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Name</div><div class="detail-value">${c.name}</div></div>
        <div class="detail-item"><div class="detail-label">Industry</div><div class="detail-value">${c.industry || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${c.email}</div></div>
        <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${c.phone || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Address</div><div class="detail-value">${c.address || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="badge ${c.status}">${c.status}</span></div></div>
        <div class="detail-item"><div class="detail-label">Joined</div><div class="detail-value">${Fmt.date(c.createdAt)}</div></div>
        <div class="detail-item"><div class="detail-label">Campaigns</div><div class="detail-value">${camps.length}</div></div>
      </div>
    `);
  },

  createClient() {
    showForm('Add New Client', `
      <div class="form-row">
        <div class="form-group"><label>Client Name *</label><input class="form-control" id="f-name" placeholder="e.g. Fashion Hub"></div>
        <div class="form-group"><label>Industry</label><input class="form-control" id="f-industry" placeholder="e.g. Fashion & Retail"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email *</label><input class="form-control" id="f-email" type="email" placeholder="contact@client.com"></div>
        <div class="form-group"><label>Phone</label><input class="form-control" id="f-phone" placeholder="+91 XXXXX XXXXX"></div>
      </div>
      <div class="form-group"><label>Address</label><input class="form-control" id="f-address" placeholder="City, State"></div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="f-status"><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </div>
    `, () => {
      const name = v('f-name'), email = v('f-email');
      if (!name || !email) { toast('Name and Email are required.', 'error'); return; }
      const list = ApiService.get('clients') || [];
      list.push({ id:uid(), name, email, phone:v('f-phone'), address:v('f-address'), industry:v('f-industry'), status:v('f-status'), createdAt:new Date().toISOString() });
      ApiService.set('clients', list);
      addActivity('created client', 'client', name, 'create');
      Modal.hideAll();
      toast(`Client "${name}" created!`);
      Pages.clients(document.getElementById('page-content'));
    });
  },

  editClient(id) {
    const list = ApiService.get('clients') || [];
    const c = list.find(x => x.id === id);
    if (!c) return;
    showForm('Edit Client', `
      <div class="form-row">
        <div class="form-group"><label>Client Name *</label><input class="form-control" id="f-name" value="${esc(c.name)}"></div>
        <div class="form-group"><label>Industry</label><input class="form-control" id="f-industry" value="${esc(c.industry||'')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email *</label><input class="form-control" id="f-email" type="email" value="${esc(c.email)}"></div>
        <div class="form-group"><label>Phone</label><input class="form-control" id="f-phone" value="${esc(c.phone||'')}"></div>
      </div>
      <div class="form-group"><label>Address</label><input class="form-control" id="f-address" value="${esc(c.address||'')}"></div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="f-status">
          <option value="active" ${c.status==='active'?'selected':''}>Active</option>
          <option value="inactive" ${c.status==='inactive'?'selected':''}>Inactive</option>
        </select>
      </div>
    `, () => {
      const idx = list.findIndex(x => x.id === id);
      list[idx] = { ...c, name:v('f-name'), email:v('f-email'), phone:v('f-phone'), address:v('f-address'), industry:v('f-industry'), status:v('f-status') };
      ApiService.set('clients', list);
      addActivity('updated client', 'client', list[idx].name, 'edit');
      Modal.hideAll(); toast('Client updated!');
      Pages.clients(document.getElementById('page-content'));
    }, 'Update Client');
  },

  /* ----- CAMPAIGNS ----- */
  viewCampaign(id) {
    const c = (ApiService.get('campaigns') || []).find(x => x.id === id);
    if (!c) return;
    const cl = (ApiService.get('clients') || []).find(x => x.id === c.clientId);
    const bi = budgetInfo(c);
    showDetail('Campaign Details', `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Campaign Name</div><div class="detail-value">${c.name}</div></div>
        <div class="detail-item"><div class="detail-label">Client</div><div class="detail-value">${cl?.name || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Platform</div><div class="detail-value">${c.platform || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="badge ${c.status}">${c.status}</span></div></div>
        <div class="detail-item"><div class="detail-label">Budget</div><div class="detail-value">${Fmt.currency(c.budget)}</div></div>
        <div class="detail-item"><div class="detail-label">Amount Spent</div><div class="detail-value">${Fmt.currency(c.spent)}</div></div>
        <div class="detail-item"><div class="detail-label">Budget Usage</div><div class="detail-value"><span class="budget-badge ${bi.cls}">${bi.pct >= 85 ? (bi.cls==='overbudget'?'🚨 ':'⚠ ') : '✓ '}${bi.pct}%</span></div></div>
        <div class="detail-item"><div class="detail-label">Start Date</div><div class="detail-value">${Fmt.date(c.startDate)}</div></div>
        <div class="detail-item"><div class="detail-label">End Date</div><div class="detail-value">${Fmt.date(c.endDate)}</div></div>
      </div>
      <div style="margin-top:18px;">
        <div class="alert-progress-bar" style="height:10px;"><div class="alert-progress-fill" style="width:${Math.min(bi.pct,100)}%;background:${bi.fill};"></div></div>
        <div style="margin-top:8px;font-size:0.8rem;color:var(--text-muted);">${Fmt.currency(c.budget - c.spent)} remaining</div>
      </div>
      ${c.description ? `<hr class="divider"><div class="detail-label">Description</div><div style="margin-top:8px;font-size:0.875rem;color:var(--text-secondary);line-height:1.6;">${c.description}</div>` : ''}
    `);
  },

  createCampaign() {
    const clients = ApiService.get('clients') || [];
    showForm('Add New Campaign', `
      <div class="form-group"><label>Campaign Name *</label><input class="form-control" id="f-name" placeholder="e.g. Summer Sale Campaign"></div>
      <div class="form-row">
        <div class="form-group"><label>Client *</label>
          <select class="form-control" id="f-clientId">
            <option value="">— Select Client —</option>
            ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Platform</label>
          <select class="form-control" id="f-platform">
            ${['Instagram','Facebook','Google Ads','YouTube','Twitter / X','LinkedIn'].map(p => `<option>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Budget (₹) *</label><input class="form-control" id="f-budget" type="number" min="0" placeholder="100000"></div>
        <div class="form-group"><label>Amount Spent (₹)</label><input class="form-control" id="f-spent" type="number" min="0" placeholder="0" value="0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Start Date</label><input class="form-control" id="f-start" type="date"></div>
        <div class="form-group"><label>End Date</label><input class="form-control" id="f-end" type="date"></div>
      </div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="f-status">
          <option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option>
        </select>
      </div>
      <div class="form-group"><label>Description</label><textarea class="form-control" id="f-desc" rows="3" placeholder="Campaign description…"></textarea></div>
    `, () => {
      const name     = v('f-name');
      const clientId = v('f-clientId');
      const budget   = parseFloat(v('f-budget'));
      const spent    = parseFloat(v('f-spent')) || 0;
      if (!name || !clientId || !budget) { toast('Name, Client and Budget are required.', 'error'); return; }
      const list = ApiService.get('campaigns') || [];
      list.push({ id:uid(), name, clientId, budget, spent, platform:v('f-platform'), status:v('f-status'), startDate:v('f-start') || new Date().toISOString(), endDate:v('f-end') || new Date().toISOString(), description:v('f-desc') });
      ApiService.set('campaigns', list);
      if ((spent / budget) * 100 >= 85) addActivity('budget crossed 85% threshold', 'campaign', name, 'warning');
      addActivity('created campaign', 'campaign', name, 'create');
      Modal.hideAll(); toast(`Campaign "${name}" created!`);
      Pages.campaigns(document.getElementById('page-content'));
    });
  },

  editCampaign(id) {
    const list    = ApiService.get('campaigns') || [];
    const clients = ApiService.get('clients')   || [];
    const c = list.find(x => x.id === id);
    if (!c) return;
    showForm('Edit Campaign', `
      <div class="form-group"><label>Campaign Name *</label><input class="form-control" id="f-name" value="${esc(c.name)}"></div>
      <div class="form-row">
        <div class="form-group"><label>Client *</label>
          <select class="form-control" id="f-clientId">
            ${clients.map(cl => `<option value="${cl.id}" ${cl.id===c.clientId?'selected':''}>${cl.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Platform</label>
          <select class="form-control" id="f-platform">
            ${['Instagram','Facebook','Google Ads','YouTube','Twitter / X','LinkedIn'].map(p => `<option ${p===c.platform?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Budget (₹) *</label><input class="form-control" id="f-budget" type="number" min="0" value="${c.budget}"></div>
        <div class="form-group"><label>Amount Spent (₹)</label><input class="form-control" id="f-spent" type="number" min="0" value="${c.spent}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Start Date</label><input class="form-control" id="f-start" type="date" value="${c.startDate ? c.startDate.split('T')[0] : ''}"></div>
        <div class="form-group"><label>End Date</label><input class="form-control" id="f-end" type="date" value="${c.endDate ? c.endDate.split('T')[0] : ''}"></div>
      </div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="f-status">
          ${['active','paused','completed'].map(s => `<option value="${s}" ${s===c.status?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Description</label><textarea class="form-control" id="f-desc" rows="3">${c.description || ''}</textarea></div>
    `, () => {
      const idx    = list.findIndex(x => x.id === id);
      const budget = parseFloat(v('f-budget'));
      const spent  = parseFloat(v('f-spent')) || 0;
      list[idx] = { ...c, name:v('f-name'), clientId:v('f-clientId'), platform:v('f-platform'), budget, spent, status:v('f-status'), startDate:v('f-start')||c.startDate, endDate:v('f-end')||c.endDate, description:v('f-desc') };
      ApiService.set('campaigns', list);
      if ((spent / budget) * 100 >= 85) addActivity('budget crossed 85% threshold', 'campaign', list[idx].name, 'warning');
      addActivity('updated campaign', 'campaign', list[idx].name, 'edit');
      Modal.hideAll(); toast('Campaign updated!');
      Pages.campaigns(document.getElementById('page-content'));
    }, 'Update Campaign');
  },

  /* ----- LEADS ----- */
  viewLead(id) {
    const l  = (ApiService.get('leads')     || []).find(x => x.id === id);
    if (!l) return;
    const cl = (ApiService.get('clients')   || []).find(x => x.id === l.clientId);
    const cp = (ApiService.get('campaigns') || []).find(x => x.id === l.campaignId);
    showDetail('Lead Details', `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Name</div><div class="detail-value">${l.name}</div></div>
        <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${l.email}</div></div>
        <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${l.phone || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Source</div><div class="detail-value">${l.source || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Client</div><div class="detail-value">${cl?.name || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Campaign</div><div class="detail-value">${cp?.name || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="badge ${l.status}">${l.status}</span></div></div>
        <div class="detail-item"><div class="detail-label">Created</div><div class="detail-value">${Fmt.date(l.createdAt)}</div></div>
      </div>
    `);
  },

  createLead() {
    const clients   = ApiService.get('clients')   || [];
    const campaigns = ApiService.get('campaigns') || [];
    showForm('Add New Lead', `
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input class="form-control" id="f-name" placeholder="Lead's full name"></div>
        <div class="form-group"><label>Email *</label><input class="form-control" id="f-email" type="email" placeholder="email@example.com"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Phone</label><input class="form-control" id="f-phone" placeholder="+91 XXXXX XXXXX"></div>
        <div class="form-group"><label>Source</label>
          <select class="form-control" id="f-source">
            ${['Instagram','Facebook','Google','WhatsApp','Website','Referral','Cold Call'].map(s => `<option>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Client *</label>
          <select class="form-control" id="f-clientId" onchange="CRUD._loadCampaigns(this.value)">
            <option value="">— Select Client —</option>
            ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Campaign</label>
          <select class="form-control" id="f-campaignId">
            <option value="">— Select Campaign —</option>
            ${campaigns.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="f-status">
          <option value="new">New</option><option value="qualified">Qualified</option><option value="converted">Converted</option><option value="inactive">Inactive</option>
        </select>
      </div>
    `, () => {
      const name = v('f-name'), email = v('f-email'), clientId = v('f-clientId');
      if (!name || !email || !clientId) { toast('Name, Email and Client are required.', 'error'); return; }
      const list = ApiService.get('leads') || [];
      list.push({ id:uid(), name, email, clientId, phone:v('f-phone'), source:v('f-source'), campaignId:v('f-campaignId'), status:v('f-status'), createdAt:new Date().toISOString() });
      ApiService.set('leads', list);
      addActivity('added lead', 'lead', name, 'create');
      Modal.hideAll(); toast(`Lead "${name}" added!`);
      Pages.leads(document.getElementById('page-content'));
    });
  },

  editLead(id) {
    const list      = ApiService.get('leads')     || [];
    const clients   = ApiService.get('clients')   || [];
    const campaigns = ApiService.get('campaigns') || [];
    const l = list.find(x => x.id === id);
    if (!l) return;
    showForm('Edit Lead', `
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input class="form-control" id="f-name" value="${esc(l.name)}"></div>
        <div class="form-group"><label>Email *</label><input class="form-control" id="f-email" value="${esc(l.email)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Phone</label><input class="form-control" id="f-phone" value="${esc(l.phone||'')}"></div>
        <div class="form-group"><label>Source</label>
          <select class="form-control" id="f-source">
            ${['Instagram','Facebook','Google','WhatsApp','Website','Referral','Cold Call'].map(s => `<option ${s===l.source?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Client</label>
          <select class="form-control" id="f-clientId">
            ${clients.map(c => `<option value="${c.id}" ${c.id===l.clientId?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Campaign</label>
          <select class="form-control" id="f-campaignId">
            <option value="">— None —</option>
            ${campaigns.map(c => `<option value="${c.id}" ${c.id===l.campaignId?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="f-status">
          ${['new','qualified','converted','inactive'].map(s => `<option value="${s}" ${s===l.status?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    `, () => {
      const idx = list.findIndex(x => x.id === id);
      list[idx] = { ...l, name:v('f-name'), email:v('f-email'), phone:v('f-phone'), source:v('f-source'), clientId:v('f-clientId'), campaignId:v('f-campaignId'), status:v('f-status') };
      ApiService.set('leads', list);
      addActivity('updated lead', 'lead', list[idx].name, 'edit');
      Modal.hideAll(); toast('Lead updated!');
      Pages.leads(document.getElementById('page-content'));
    }, 'Update Lead');
  },

  /* ----- USERS ----- */
  viewUser(id) {
    const u  = (ApiService.get('users')   || []).find(x => x.id === id);
    if (!u) return;
    const cl = u.clientId ? (ApiService.get('clients') || []).find(c => c.id === u.clientId) : null;
    showDetail('User Account', `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Name</div><div class="detail-value">${u.name}</div></div>
        <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${u.email}</div></div>
        <div class="detail-item"><div class="detail-label">Role</div><div class="detail-value"><span class="badge ${u.role}">${u.role}</span></div></div>
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value"><span class="badge ${u.status}">${u.status}</span></div></div>
        <div class="detail-item"><div class="detail-label">Associated Client</div><div class="detail-value">${cl?.name || (u.role==='admin'?'All Clients':'—')}</div></div>
        <div class="detail-item"><div class="detail-label">Created</div><div class="detail-value">${Fmt.date(u.createdAt)}</div></div>
      </div>
    `);
  },

  createUser() {
    const clients = ApiService.get('clients') || [];
    showForm('Add User Account', `
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input class="form-control" id="f-name" placeholder="User's full name"></div>
        <div class="form-group"><label>Email *</label><input class="form-control" id="f-email" type="email" placeholder="user@example.com"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Password *</label><input class="form-control" id="f-pass" type="password" placeholder="Minimum 6 characters"></div>
        <div class="form-group"><label>Role</label>
          <select class="form-control" id="f-role" onchange="CRUD._toggleClientWrap(this.value)">
            <option value="client">Client</option><option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div class="form-group" id="f-client-wrap">
        <label>Associated Client *</label>
        <select class="form-control" id="f-clientId">
          <option value="">— Select Client —</option>
          ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="f-status"><option value="active">Active</option><option value="disabled">Disabled</option></select>
      </div>
    `, () => {
      const name = v('f-name'), email = v('f-email'), pass = v('f-pass'), role = v('f-role'), clientId = v('f-clientId');
      if (!name || !email || !pass) { toast('Name, Email and Password are required.', 'error'); return; }
      if (pass.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
      if (role === 'client' && !clientId) { toast('Please select an associated client.', 'error'); return; }
      const list = ApiService.get('users') || [];
      if (list.find(u => u.email.toLowerCase() === email.toLowerCase())) { toast('Email already exists.', 'error'); return; }
      list.push({ id:uid(), name, email, password:pass, role, clientId: role==='client' ? clientId : null, status:v('f-status'), createdAt:new Date().toISOString() });
      ApiService.set('users', list);
      addActivity('created user account', 'user', email, 'create');
      Modal.hideAll(); toast(`Account "${email}" created!`);
      Pages.users(document.getElementById('page-content'));
    });
  },

  editUser(id) {
    const list    = ApiService.get('users')   || [];
    const clients = ApiService.get('clients') || [];
    const u = list.find(x => x.id === id);
    if (!u) return;
    showForm('Edit User Account', `
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input class="form-control" id="f-name" value="${esc(u.name)}"></div>
        <div class="form-group"><label>Email *</label><input class="form-control" id="f-email" value="${esc(u.email)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>New Password</label><input class="form-control" id="f-pass" type="password" placeholder="Leave blank to keep current"></div>
        <div class="form-group"><label>Role</label>
          <select class="form-control" id="f-role" onchange="CRUD._toggleClientWrap(this.value)">
            <option value="client" ${u.role==='client'?'selected':''}>Client</option>
            <option value="admin"  ${u.role==='admin' ?'selected':''}>Admin</option>
          </select>
        </div>
      </div>
      <div class="form-group" id="f-client-wrap" ${u.role==='admin'?'style="display:none;"':''}>
        <label>Associated Client</label>
        <select class="form-control" id="f-clientId">
          <option value="">— None —</option>
          ${clients.map(c => `<option value="${c.id}" ${c.id===u.clientId?'selected':''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Status</label>
        <select class="form-control" id="f-status">
          <option value="active"   ${u.status==='active'  ?'selected':''}>Active</option>
          <option value="disabled" ${u.status==='disabled'?'selected':''}>Disabled</option>
        </select>
      </div>
    `, () => {
      const idx    = list.findIndex(x => x.id === id);
      const newPass= v('f-pass');
      const role   = v('f-role');
      list[idx] = { ...u, name:v('f-name'), email:v('f-email'), password: newPass || u.password, role, clientId: role==='client' ? v('f-clientId') : null, status:v('f-status') };
      ApiService.set('users', list);
      addActivity('updated user account', 'user', list[idx].email, 'edit');
      Modal.hideAll(); toast('User account updated!');
      Pages.users(document.getElementById('page-content'));
    }, 'Update User');
  },

  toggleUser(id, action) {
    const list = ApiService.get('users') || [];
    const idx  = list.findIndex(u => u.id === id);
    if (idx === -1) return;
    list[idx].status = action === 'disable' ? 'disabled' : 'active';
    ApiService.set('users', list);
    addActivity(`${action}d account`, 'user', list[idx].email, 'edit');
    toast(`Account ${action}d.`, action === 'disable' ? 'warning' : 'success');
    Pages.users(document.getElementById('page-content'));
  },

  /* ----- DELETE ----- */
  _del: null,
  confirmDelete(type, id, name) {
    this._del = { type, id, name };
    document.getElementById('del-type').textContent = type;
    document.getElementById('del-name').textContent = name;
    Modal.show('delete-modal');
  },

  executeDelete() {
    const { type, id, name } = this._del || {};
    if (!type) return;
    const map = { client:'clients', campaign:'campaigns', lead:'leads', user:'users' };
    let list = ApiService.get(map[type]) || [];
    list = list.filter(x => x.id !== id);
    ApiService.set(map[type], list);
    addActivity(`deleted ${type}`, type, name, 'delete');
    Modal.hideAll();
    toast(`${type.charAt(0).toUpperCase()+type.slice(1)} "${name}" deleted.`, 'warning');
    const pageMap = { client:'clients', campaign:'campaigns', lead:'leads', user:'users' };
    Router.go(pageMap[type] || Router.current);
  },

  /* ----- Helpers ----- */
  _toggleClientWrap(role) {
    const wrap = document.getElementById('f-client-wrap');
    if (wrap) wrap.style.display = role === 'admin' ? 'none' : 'block';
  },
  _loadCampaigns(clientId) {
    const camps = (ApiService.get('campaigns') || []).filter(c => c.clientId === clientId);
    const sel   = document.getElementById('f-campaignId');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Campaign —</option>' +
      camps.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
};

/* ====================================================
   MODAL HELPERS
   ==================================================== */
function showDetail(title, content) {
  document.getElementById('detail-modal-title').textContent = title;
  document.getElementById('detail-modal-body').innerHTML    = content;
  Modal.show('detail-modal');
}

function showForm(title, bodyHTML, onSave, saveLabel = 'Create') {
  document.getElementById('form-modal-title').textContent = title;
  document.getElementById('form-modal-body').innerHTML    = bodyHTML;
  document.getElementById('form-modal-save').textContent  = saveLabel;
  document.getElementById('form-modal-save').onclick      = onSave;
  Modal.show('form-modal');
}

/* DOM value shorthand */
const v   = id => (document.getElementById(id)?.value || '').trim();
const esc = s  => (s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ====================================================
   AUTH HANDLERS
   ==================================================== */
async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const result   = await Auth.login(email, password);

  if (result.ok) {
    const page = result.user.role === 'admin' ? 'dashboard' : 'client-dashboard';
    Router.go(page);
  } else {
    const err = document.getElementById('login-error');
    err.textContent    = result.msg;
    err.style.display  = 'block';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-submit-btn');
  if (btn.disabled) return;
  
  const phone = v('reg-phone');
  if (phone.length !== 10) {
    toast('Phone number must be exactly 10 digits.', 'error');
    return;
  }

  const payload = {
    name: v('reg-name'),
    company: v('reg-company'),
    email: v('reg-email'),
    phone: phone,
    role: v('reg-role'),
    password: v('reg-password')
  };
  
  try {
    const res = await fetch(`${API_URL}/auth/register-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      toast(data.message, 'success');
      switchAuthView('login');
      document.getElementById('register-form').reset();
    } else {
      toast(data.error, 'error');
    }
  } catch(err) {
    toast('Network error. Backend not running?', 'error');
  }
}

async function handleForgot(e) {
  e.preventDefault();
  const email = v('forgot-email');
  try {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    toast(data.message || data.error, res.ok ? 'success' : 'error');
    if (res.ok) switchAuthView('reset');
  } catch(err) {
    toast('Network error', 'error');
  }
}

async function handleReset(e) {
  e.preventDefault();
  const btn = document.getElementById('reset-submit-btn');
  if (btn.disabled) return;
  const payload = {
    email: v('reset-email'),
    token: v('reset-token'),
    newPassword: v('reset-password')
  };
  try {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      toast(data.message, 'success');
      switchAuthView('login');
    } else {
      toast(data.error, 'error');
    }
  } catch(err) {
    toast('Network error', 'error');
  }
}

function autoFill(email, password) {
  document.getElementById('login-email').value     = email;
  document.getElementById('login-password').value  = password;
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('login-email').focus();
}

/* ====================================================
   BOOTSTRAP
   ==================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  if (await Auth.restore()) {
    Router.go(Auth.currentUser.role === 'admin' ? 'dashboard' : 'client-dashboard');
  } else {
    App.render();
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  
  const regForm = document.getElementById('register-form');
  if (regForm) regForm.addEventListener('submit', handleRegister);
  
  const forgotForm = document.getElementById('forgot-form');
  if (forgotForm) forgotForm.addEventListener('submit', handleForgot);
  
  const resetForm = document.getElementById('reset-form');
  if (resetForm) resetForm.addEventListener('submit', handleReset);
  
  // Phone validation (only digits, 10 max)
  const phoneInput = document.getElementById('reg-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 10);
    });
  }
});
