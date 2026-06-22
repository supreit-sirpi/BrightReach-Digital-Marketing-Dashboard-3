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
const ApiService = {
  get(key) {
    try { return JSON.parse(localStorage.getItem('br_' + key)) || null; }
    catch { return null; }
  },
  set(key, data) { localStorage.setItem('br_' + key, JSON.stringify(data)); },
  all() {
    return {
      users:     this.get('users')    || [],
      clients:   this.get('clients')  || [],
      campaigns: this.get('campaigns')|| [],
      leads:     this.get('leads')    || [],
      activity:  this.get('activity') || [],
    };
  }
};

/* ====================================================
   DEMO DATA SEED
   ==================================================== */
function seedDemoData() {
  if (ApiService.get('seeded')) return;

  const ago  = d => { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString(); };
  const fwd  = d => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString(); };

  ApiService.set('users', [
    { id:'u1', name:'Admin User',          email:'admin@brightreach.com',        password:'Admin@123',  role:'admin',  clientId:null, status:'active', createdAt:ago(60) },
    { id:'u2', name:'Fashion Hub',         email:'fashionhub@client.com',        password:'Client@123', role:'client', clientId:'c1', status:'active', createdAt:ago(25) },
    { id:'u3', name:'Royal Restaurant',    email:'royalrestaurant@client.com',   password:'Client@123', role:'client', clientId:'c2', status:'active', createdAt:ago(20) },
    { id:'u4', name:'Smart Academy',       email:'smartacademy@client.com',      password:'Client@123', role:'client', clientId:'c3', status:'active', createdAt:ago(15) },
  ]);

  ApiService.set('clients', [
    { id:'c1', name:'Fashion Hub',             email:'contact@fashionhub.com',     phone:'+91 98765 43210', address:'Mumbai, Maharashtra',   industry:'Fashion & Retail',  status:'active', createdAt:ago(90) },
    { id:'c2', name:'Royal Restaurant',        email:'info@royalrestaurant.com',   phone:'+91 87654 32109', address:'Delhi, NCR',             industry:'Food & Beverage',   status:'active', createdAt:ago(75) },
    { id:'c3', name:'Smart Coaching Academy',  email:'admin@smartacademy.com',     phone:'+91 76543 21098', address:'Bangalore, Karnataka',   industry:'Education',         status:'active', createdAt:ago(50) },
  ]);

  ApiService.set('campaigns', [
    { id:'camp1', clientId:'c1', name:'Summer Collection Ads',  budget:100000, spent:92000, status:'active', platform:'Instagram',  startDate:ago(45), endDate:fwd(15), description:'Summer fashion collection promotion across social media platforms targeting young urban consumers.' },
    { id:'camp2', clientId:'c2', name:'Weekend Food Promotion', budget:150000, spent:55000, status:'active', platform:'Facebook',   startDate:ago(30), endDate:fwd(30), description:'Weekend special offers and food promotions for Royal Restaurant across Delhi NCR.' },
    { id:'camp3', clientId:'c3', name:'Admissions Campaign',    budget:200000, spent:75000, status:'active', platform:'Google Ads', startDate:ago(20), endDate:fwd(40), description:'Student admissions drive for the upcoming academic year 2026-27 targeting 10th-12th grade students.' },
  ]);

  ApiService.set('leads', [
    { id:'l1', clientId:'c1', campaignId:'camp1', name:'Priya Sharma',   email:'priya.sharma@email.com',  phone:'+91 91234 56789', status:'qualified',  source:'Instagram', createdAt:ago(5) },
    { id:'l2', clientId:'c1', campaignId:'camp1', name:'Arun Kumar',     email:'arun.kumar@email.com',    phone:'+91 90123 45678', status:'new',         source:'Instagram', createdAt:ago(3) },
    { id:'l3', clientId:'c1', campaignId:'camp1', name:'Sneha Patel',    email:'sneha.patel@email.com',   phone:'+91 89012 34567', status:'converted',   source:'Instagram', createdAt:ago(8) },
    { id:'l4', clientId:'c2', campaignId:'camp2', name:'Raj Verma',      email:'raj.verma@email.com',     phone:'+91 78901 23456', status:'new',         source:'Facebook',  createdAt:ago(2) },
    { id:'l5', clientId:'c2', campaignId:'camp2', name:'Meena Reddy',    email:'meena.reddy@email.com',   phone:'+91 67890 12345', status:'qualified',   source:'Facebook',  createdAt:ago(6) },
    { id:'l6', clientId:'c3', campaignId:'camp3', name:'Vikram Singh',   email:'vikram.singh@email.com',  phone:'+91 56789 01234', status:'new',         source:'Google',    createdAt:ago(1) },
    { id:'l7', clientId:'c3', campaignId:'camp3', name:'Ananya Joshi',   email:'ananya.joshi@email.com',  phone:'+91 45678 90123', status:'qualified',   source:'Google',    createdAt:ago(4) },
    { id:'l8', clientId:'c3', campaignId:'camp3', name:'Deepak Nair',    email:'deepak.nair@email.com',   phone:'+91 34567 89012', status:'converted',   source:'Google',    createdAt:ago(10) },
  ]);

  ApiService.set('activity', [
    { id:'a1', type:'create',  entity:'client',   name:'Fashion Hub',            user:'Admin', action:'created client',               timestamp:ago(90) },
    { id:'a2', type:'create',  entity:'client',   name:'Royal Restaurant',       user:'Admin', action:'created client',               timestamp:ago(75) },
    { id:'a3', type:'create',  entity:'client',   name:'Smart Coaching Academy', user:'Admin', action:'created client',               timestamp:ago(50) },
    { id:'a4', type:'create',  entity:'campaign', name:'Summer Collection Ads',  user:'Admin', action:'created campaign',             timestamp:ago(45) },
    { id:'a5', type:'create',  entity:'campaign', name:'Weekend Food Promotion', user:'Admin', action:'created campaign',             timestamp:ago(30) },
    { id:'a6', type:'create',  entity:'campaign', name:'Admissions Campaign',    user:'Admin', action:'created campaign',             timestamp:ago(20) },
    { id:'a7', type:'warning', entity:'campaign', name:'Summer Collection Ads',  user:'System',action:'budget crossed 85% threshold', timestamp:ago(3) },
    { id:'a8', type:'create',  entity:'lead',     name:'Priya Sharma',           user:'Admin', action:'added lead',                   timestamp:ago(5) },
    { id:'a9', type:'edit',    entity:'lead',     name:'Priya Sharma',           user:'Admin', action:'status changed to Qualified',  timestamp:ago(4) },
    { id:'a10',type:'create',  entity:'user',     name:'fashionhub@client.com',  user:'Admin', action:'created client login account', timestamp:ago(25) },
  ]);

  ApiService.set('seeded', true);
}

/* ====================================================
   AUTH
   ==================================================== */
const Auth = {
  currentUser: null,

  login(email, password) {
    const users = ApiService.get('users') || [];
    const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user)                    return { ok: false, msg: 'Invalid email or password.' };
    if (user.status === 'disabled') return { ok: false, msg: 'Account is disabled. Contact the administrator.' };
    this.currentUser = user;
    sessionStorage.setItem('br_session', JSON.stringify(user));
    return { ok: true, user };
  },

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('br_session');
    Router.go('login');
  },

  isAdmin()  { return this.currentUser?.role === 'admin'; },
  isClient() { return this.currentUser?.role === 'client'; },

  restore() {
    try {
      const s = sessionStorage.getItem('br_session');
      if (s) { this.currentUser = JSON.parse(s); return true; }
    } catch {}
    return false;
  }
};

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
  }
};

/* ====================================================
   CRUD OPERATIONS
   ==================================================== */
const CRUD = {

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
   LOGIN HANDLERS
   ==================================================== */
function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const result   = Auth.login(email, password);

  if (result.ok) {
    const page = result.user.role === 'admin' ? 'dashboard' : 'client-dashboard';
    Router.go(page);
  } else {
    const err = document.getElementById('login-error');
    err.textContent    = result.msg;
    err.style.display  = 'block';
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
document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();

  if (Auth.restore()) {
    Router.go(Auth.currentUser.role === 'admin' ? 'dashboard' : 'client-dashboard');
  } else {
    App.render();
  }

  document.getElementById('login-form').addEventListener('submit', handleLogin);
});
