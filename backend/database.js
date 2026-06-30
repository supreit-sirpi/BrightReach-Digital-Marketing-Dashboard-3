const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const isVercel = process.env.VERCEL || process.env.NOW_REGION;
const dbPath = isVercel
  ? '/tmp/database.json'
  : path.resolve(__dirname, 'database.json');

let dbData = {
  users: [],
  clients: [],
  campaigns: [],
  leads: [],
  activity: []
};

// Initial Seed Data Helper
function seedDemoData() {
  const now = new Date();
  const ago = (days) => { const d = new Date(now); d.setDate(d.getDate() - days); return d.toISOString(); };
  const fwd = (days) => { const d = new Date(now); d.setDate(d.getDate() + days); return d.toISOString(); };

  const adminHash  = bcrypt.hashSync('Admin@123',  10);
  const clientHash = bcrypt.hashSync('Client@123', 10);

  dbData.users = [
    { id:'u1', name:'Admin User',       email:'admin@brightreach.com',      password:adminHash,  role:'admin',  clientId:null, status:'active', createdAt:ago(60) },
    { id:'u2', name:'Fashion Hub',      email:'fashionhub@client.com',      password:clientHash, role:'client', clientId:'c1', status:'active', createdAt:ago(25) },
    { id:'u3', name:'Royal Restaurant', email:'royalrestaurant@client.com', password:clientHash, role:'client', clientId:'c2', status:'active', createdAt:ago(20) },
    { id:'u4', name:'Smart Academy',    email:'smartacademy@client.com',    password:clientHash, role:'client', clientId:'c3', status:'active', createdAt:ago(15) },
  ];

  dbData.clients = [
    { id:'c1', name:'Fashion Hub',            email:'contact@fashionhub.com',   phone:'9876543210', address:'Mumbai, Maharashtra', industry:'Fashion & Retail', status:'active', createdAt:ago(90) },
    { id:'c2', name:'Royal Restaurant',       email:'info@royalrestaurant.com', phone:'8765432109', address:'Delhi, NCR',           industry:'Food & Beverage',  status:'active', createdAt:ago(75) },
    { id:'c3', name:'Smart Coaching Academy', email:'admin@smartacademy.com',   phone:'7654321098', address:'Bangalore, Karnataka', industry:'Education',        status:'active', createdAt:ago(50) },
  ];

  dbData.campaigns = [
    { id:'camp1', clientId:'c1', name:'Summer Collection Ads',  budget:100000, spent:92000, status:'active', platform:'Instagram',  startDate:ago(45), endDate:fwd(15), description:'Summer fashion collection promotion across social media platforms targeting young urban consumers.' },
    { id:'camp2', clientId:'c2', name:'Weekend Food Promotion', budget:150000, spent:55000, status:'active', platform:'Facebook',   startDate:ago(30), endDate:fwd(30), description:'Weekend special offers and food promotions for Royal Restaurant across Delhi NCR.' },
    { id:'camp3', clientId:'c3', name:'Admissions Campaign',    budget:200000, spent:75000, status:'active', platform:'Google Ads', startDate:ago(20), endDate:fwd(40), description:'Student admissions drive for upcoming academic year 2026-27 targeting 10th-12th grade students.' },
  ];

  dbData.leads = [
    { id:'l1', clientId:'c1', campaignId:'camp1', name:'Priya Sharma', email:'priya.sharma@email.com', phone:'9123456789', status:'qualified', source:'Instagram', createdAt:ago(5) },
    { id:'l2', clientId:'c1', campaignId:'camp1', name:'Arun Kumar',   email:'arun.kumar@email.com',   phone:'9012345678', status:'new',       source:'Instagram', createdAt:ago(3) },
    { id:'l3', clientId:'c1', campaignId:'camp1', name:'Sneha Patel',  email:'sneha.patel@email.com',  phone:'8901234567', status:'converted', source:'Instagram', createdAt:ago(8) },
    { id:'l4', clientId:'c2', campaignId:'camp2', name:'Raj Verma',    email:'raj.verma@email.com',    phone:'7890123456', status:'new',       source:'Facebook',  createdAt:ago(2) },
    { id:'l5', clientId:'c2', campaignId:'camp2', name:'Meena Reddy',  email:'meena.reddy@email.com',  phone:'6789012345', status:'qualified', source:'Facebook',  createdAt:ago(6) },
    { id:'l6', clientId:'c3', campaignId:'camp3', name:'Vikram Singh', email:'vikram.singh@email.com', phone:'5678901234', status:'new',       source:'Google',    createdAt:ago(1) },
    { id:'l7', clientId:'c3', campaignId:'camp3', name:'Ananya Joshi', email:'ananya.joshi@email.com', phone:'4567890123', status:'qualified', source:'Google',    createdAt:ago(4) },
    { id:'l8', clientId:'c3', campaignId:'camp3', name:'Deepak Nair',  email:'deepak.nair@email.com',  phone:'3456789012', status:'converted', source:'Google',    createdAt:ago(10) },
  ];

  dbData.activity = [
    { id:'a1',  type:'create',  entity:'client',   name:'Fashion Hub',            user:'Admin',  action:'created client',               timestamp:ago(90) },
    { id:'a2',  type:'create',  entity:'client',   name:'Royal Restaurant',       user:'Admin',  action:'created client',               timestamp:ago(75) },
    { id:'a3',  type:'create',  entity:'client',   name:'Smart Coaching Academy', user:'Admin',  action:'created client',               timestamp:ago(50) },
    { id:'a4',  type:'create',  entity:'campaign', name:'Summer Collection Ads',  user:'Admin',  action:'created campaign',             timestamp:ago(45) },
    { id:'a5',  type:'create',  entity:'campaign', name:'Weekend Food Promotion', user:'Admin',  action:'created campaign',             timestamp:ago(30) },
    { id:'a6',  type:'create',  entity:'campaign', name:'Admissions Campaign',    user:'Admin',  action:'created campaign',             timestamp:ago(20) },
    { id:'a7',  type:'warning', entity:'campaign', name:'Summer Collection Ads',  user:'System', action:'budget crossed 85% threshold', timestamp:ago(3) },
    { id:'a8',  type:'create',  entity:'lead',     name:'Priya Sharma',           user:'Admin',  action:'added lead',                   timestamp:ago(5) },
    { id:'a9',  type:'edit',    entity:'lead',     name:'Priya Sharma',           user:'Admin',  action:'status changed to Qualified',  timestamp:ago(4) },
    { id:'a10', type:'create',  entity:'user',     name:'fashionhub@client.com',  user:'Admin',  action:'created client login account', timestamp:ago(25) },
  ];
  saveDb();
}

function loadDb() {
  if (fs.existsSync(dbPath)) {
    try {
      dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      console.log('Database loaded successfully from ' + dbPath);
      ensureDefaultUsers();
      return;
    } catch (e) {
      console.error('Error parsing JSON database, recreating...', e);
    }
  }
  console.log('No database file found. Seeding initial demo data...');
  seedDemoData();
}

function ensureDefaultUsers() {
  try {
    const adminHash = bcrypt.hashSync('Admin@123', 10);
    const clientHash = bcrypt.hashSync('Client@123', 10);
    
    if (!dbData.users) dbData.users = [];
    
    // Ensure Admin
    let admin = dbData.users.find(u => u.email === 'admin@brightreach.com');
    if (!admin) {
      dbData.users.push({ id:'u1', name:'Admin User', email:'admin@brightreach.com', password:adminHash, role:'admin', clientId:null, status:'active', createdAt:new Date().toISOString() });
    } else {
      admin.password = adminHash;
      admin.status = 'active';
    }

    // Ensure Clients
    const clients = [
      { id: 'u2', name: 'Fashion Hub', email: 'fashionhub@client.com', clientId: 'c1' },
      { id: 'u3', name: 'Royal Restaurant', email: 'royalrestaurant@client.com', clientId: 'c2' },
      { id: 'u4', name: 'Smart Academy', email: 'smartacademy@client.com', clientId: 'c3' }
    ];

    clients.forEach(c => {
      let u = dbData.users.find(user => user.email === c.email);
      if (!u) {
        dbData.users.push({ id:c.id, name:c.name, email:c.email, password:clientHash, role:'client', clientId:c.clientId, status:'active', createdAt:new Date().toISOString() });
      } else {
        u.password = clientHash;
        u.status = 'active';
      }
    });

    saveDb();
  } catch(e) {
    console.error('Error ensuring default users', e);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving database', e);
  }
}

// Load DB immediately on start
loadDb();

/* ====================================================
   DATABASE API WRAPPERS (Mocking SQL with JSON operations)
   ==================================================== */

const dbGet = async (sql, params = []) => {
  loadDb();
  const query = sql.toLowerCase();

  // 1. SELECT * FROM users WHERE email = ?
  if (query.includes('select * from users where email =')) {
    return dbData.users.find(u => u.email.toLowerCase() === params[0].toLowerCase()) || null;
  }
  
  // 2. SELECT id, resetTokenExpiry FROM users WHERE email = ? AND resetToken = ?
  if (query.includes('resettokenexpiry') && query.includes('email =') && query.includes('resettoken =')) {
    const u = dbData.users.find(u => u.email.toLowerCase() === params[0].toLowerCase() && u.resetToken === params[1]);
    return u ? { id: u.id, resetTokenExpiry: u.resetTokenExpiry } : null;
  }

  // 3. SELECT id FROM users WHERE email = ?
  if (query.includes('select id from users where email =')) {
    const u = dbData.users.find(u => u.email.toLowerCase() === params[0].toLowerCase());
    return u ? { id: u.id } : null;
  }

  // 4. SELECT email FROM users WHERE id = ?
  if (query.includes('select email from users where id =')) {
    const u = dbData.users.find(u => u.id === params[0]);
    return u ? { email: u.email } : null;
  }

  // 5. General single row fetches
  if (query.includes('users where id =')) {
    return dbData.users.find(u => u.id === params[0]) || null;
  }

  return null;
};

const dbAll = async (sql, params = []) => {
  loadDb();
  const query = sql.toLowerCase();

  if (query.includes('select * from clients')) return dbData.clients;
  if (query.includes('select * from campaigns')) return dbData.campaigns;
  if (query.includes('select * from leads')) return dbData.leads;
  if (query.includes('select * from activity')) {
    return dbData.activity.slice(0, 60);
  }
  if (query.includes('select id, name, email, role, status, clientid, createdat from users')) {
    if (params[0]) {
      return dbData.users.filter(u => u.id === params[0]);
    }
    return dbData.users.map(({password, ...u}) => u);
  }

  // Pending users list: SELECT ... FROM users WHERE status IN ("pending", "rejected")
  if (query.includes('status in ("pending", "rejected")')) {
    return dbData.users
      .filter(u => u.status === 'pending' || u.status === 'rejected')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return [];
};

const dbRun = async (sql, params = []) => {
  loadDb();
  const query = sql.toLowerCase();

  // 1. INSERT INTO users
  if (query.includes('insert into users')) {
    const [id, name, email, password, phone, company, role, status, createdAt] = params;
    dbData.users.push({ id, name, email, password, phone, company, role, status, createdAt });
  }
  // 2. INSERT INTO clients
  else if (query.includes('insert into clients')) {
    const [id, name, email, phone, address, industry, status, createdAt] = params;
    dbData.clients.push({ id, name, email, phone, address, industry, status, createdAt });
  }
  // 3. INSERT INTO campaigns
  else if (query.includes('insert into campaigns')) {
    const [id, clientId, name, budget, spent, status, platform, startDate, endDate, description] = params;
    dbData.campaigns.push({ id, clientId, name, budget, spent, status, platform, startDate, endDate, description });
  }
  // 4. INSERT INTO leads
  else if (query.includes('insert into leads')) {
    const [id, clientId, campaignId, name, email, phone, status, source, createdAt] = params;
    dbData.leads.push({ id, clientId, campaignId, name, email, phone, status, source, createdAt });
  }
  // 5. INSERT INTO activity
  else if (query.includes('insert into activity')) {
    const [id, type, entity, name, user, action, timestamp] = params;
    dbData.activity.unshift({ id, type, entity, name, user, action, timestamp });
  }
  // 6. UPDATE users (Status / Details)
  else if (query.includes('update users set status =')) {
    const idx = dbData.users.findIndex(u => u.id === params[0]);
    if (idx !== -1) {
      if (query.includes('active')) dbData.users[idx].status = 'active';
      else if (query.includes('rejected')) dbData.users[idx].status = 'rejected';
      else if (query.includes('disabled')) dbData.users[idx].status = 'disabled';
    }
  }
  else if (query.includes('update users set resettoken =')) {
    const idx = dbData.users.findIndex(u => u.id === params[2]);
    if (idx !== -1) {
      dbData.users[idx].resetToken = params[0];
      dbData.users[idx].resetTokenExpiry = params[1];
    }
  }
  else if (query.includes('update users set password =')) {
    const idx = dbData.users.findIndex(u => u.id === params[1]);
    if (idx !== -1) {
      dbData.users[idx].password = params[0];
      dbData.users[idx].resetToken = null;
      dbData.users[idx].resetTokenExpiry = null;
    }
  }
  else if (query.includes('update users set name=')) {
    const idx = dbData.users.findIndex(u => u.id === params[5]);
    if (idx !== -1) {
      dbData.users[idx].name = params[0];
      dbData.users[idx].email = params[1];
      dbData.users[idx].role = params[2];
      dbData.users[idx].status = params[3];
      dbData.users[idx].clientId = params[4];
    }
  }
  // 7. DELETES
  else if (query.includes('delete from clients')) dbData.clients = [];
  else if (query.includes('delete from campaigns')) dbData.campaigns = [];
  else if (query.includes('delete from leads')) dbData.leads = [];
  else if (query.includes('delete from activity')) dbData.activity = [];

  saveDb();
  return { changes: 1 };
};

module.exports = { dbGet, dbAll, dbRun };
