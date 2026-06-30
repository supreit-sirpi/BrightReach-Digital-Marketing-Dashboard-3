const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const isVercel = process.env.VERCEL || process.env.NOW_REGION;
const dbPath = isVercel
  ? '/tmp/database.sqlite'
  : path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        company TEXT,
        role TEXT DEFAULT 'client',
        status TEXT DEFAULT 'pending',
        clientId TEXT,
        resetToken TEXT,
        resetTokenExpiry INTEGER,
        createdAt TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        industry TEXT,
        status TEXT DEFAULT 'active',
        createdAt TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        clientId TEXT NOT NULL,
        name TEXT NOT NULL,
        budget REAL DEFAULT 0,
        spent REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        platform TEXT,
        startDate TEXT,
        endDate TEXT,
        description TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        clientId TEXT,
        campaignId TEXT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        status TEXT,
        source TEXT,
        createdAt TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS activity (
        id TEXT PRIMARY KEY,
        type TEXT,
        entity TEXT,
        name TEXT,
        user TEXT,
        action TEXT,
        timestamp TEXT
      )`);

      // Seed demo data after tables are ready
      db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
        if (!err && row.count === 0) {
          await seedDemoData();
          console.log('Demo data seeded successfully!');
        } else {
          console.log('Database already has data, skipping seed.');
        }
      });
    });
  }
});

async function seedDemoData() {
  const now = new Date();
  const ago = (days) => { const d = new Date(now); d.setDate(d.getDate() - days); return d.toISOString(); };
  const fwd = (days) => { const d = new Date(now); d.setDate(d.getDate() + days); return d.toISOString(); };

  // Hash passwords
  const adminHash  = await bcrypt.hash('Admin@123',  10);
  const clientHash = await bcrypt.hash('Client@123', 10);

  // --- USERS ---
  const users = [
    { id:'u1', name:'Admin User',       email:'admin@brightreach.com',      password:adminHash,  role:'admin',  clientId:null, status:'active', createdAt:ago(60) },
    { id:'u2', name:'Fashion Hub',      email:'fashionhub@client.com',      password:clientHash, role:'client', clientId:'c1', status:'active', createdAt:ago(25) },
    { id:'u3', name:'Royal Restaurant', email:'royalrestaurant@client.com', password:clientHash, role:'client', clientId:'c2', status:'active', createdAt:ago(20) },
    { id:'u4', name:'Smart Academy',    email:'smartacademy@client.com',    password:clientHash, role:'client', clientId:'c3', status:'active', createdAt:ago(15) },
  ];
  for (const u of users) {
    await dbRun(
      'INSERT INTO users (id,name,email,password,role,clientId,status,createdAt) VALUES (?,?,?,?,?,?,?,?)',
      [u.id, u.name, u.email, u.password, u.role, u.clientId, u.status, u.createdAt]
    );
  }

  // --- CLIENTS ---
  const clients = [
    { id:'c1', name:'Fashion Hub',            email:'contact@fashionhub.com',   phone:'9876543210', address:'Mumbai, Maharashtra', industry:'Fashion & Retail', status:'active', createdAt:ago(90) },
    { id:'c2', name:'Royal Restaurant',       email:'info@royalrestaurant.com', phone:'8765432109', address:'Delhi, NCR',           industry:'Food & Beverage',  status:'active', createdAt:ago(75) },
    { id:'c3', name:'Smart Coaching Academy', email:'admin@smartacademy.com',   phone:'7654321098', address:'Bangalore, Karnataka', industry:'Education',        status:'active', createdAt:ago(50) },
  ];
  for (const c of clients) {
    await dbRun(
      'INSERT INTO clients (id,name,email,phone,address,industry,status,createdAt) VALUES (?,?,?,?,?,?,?,?)',
      [c.id, c.name, c.email, c.phone, c.address, c.industry, c.status, c.createdAt]
    );
  }

  // --- CAMPAIGNS ---
  const campaigns = [
    { id:'camp1', clientId:'c1', name:'Summer Collection Ads',  budget:100000, spent:92000, status:'active', platform:'Instagram',  startDate:ago(45), endDate:fwd(15), description:'Summer fashion collection promotion across social media platforms targeting young urban consumers.' },
    { id:'camp2', clientId:'c2', name:'Weekend Food Promotion', budget:150000, spent:55000, status:'active', platform:'Facebook',   startDate:ago(30), endDate:fwd(30), description:'Weekend special offers and food promotions for Royal Restaurant across Delhi NCR.' },
    { id:'camp3', clientId:'c3', name:'Admissions Campaign',    budget:200000, spent:75000, status:'active', platform:'Google Ads', startDate:ago(20), endDate:fwd(40), description:'Student admissions drive for upcoming academic year 2026-27 targeting 10th-12th grade students.' },
  ];
  for (const c of campaigns) {
    await dbRun(
      'INSERT INTO campaigns (id,clientId,name,budget,spent,status,platform,startDate,endDate,description) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [c.id, c.clientId, c.name, c.budget, c.spent, c.status, c.platform, c.startDate, c.endDate, c.description]
    );
  }

  // --- LEADS ---
  const leads = [
    { id:'l1', clientId:'c1', campaignId:'camp1', name:'Priya Sharma', email:'priya.sharma@email.com', phone:'9123456789', status:'qualified', source:'Instagram', createdAt:ago(5) },
    { id:'l2', clientId:'c1', campaignId:'camp1', name:'Arun Kumar',   email:'arun.kumar@email.com',   phone:'9012345678', status:'new',       source:'Instagram', createdAt:ago(3) },
    { id:'l3', clientId:'c1', campaignId:'camp1', name:'Sneha Patel',  email:'sneha.patel@email.com',  phone:'8901234567', status:'converted', source:'Instagram', createdAt:ago(8) },
    { id:'l4', clientId:'c2', campaignId:'camp2', name:'Raj Verma',    email:'raj.verma@email.com',    phone:'7890123456', status:'new',       source:'Facebook',  createdAt:ago(2) },
    { id:'l5', clientId:'c2', campaignId:'camp2', name:'Meena Reddy',  email:'meena.reddy@email.com',  phone:'6789012345', status:'qualified', source:'Facebook',  createdAt:ago(6) },
    { id:'l6', clientId:'c3', campaignId:'camp3', name:'Vikram Singh', email:'vikram.singh@email.com', phone:'5678901234', status:'new',       source:'Google',    createdAt:ago(1) },
    { id:'l7', clientId:'c3', campaignId:'camp3', name:'Ananya Joshi', email:'ananya.joshi@email.com', phone:'4567890123', status:'qualified', source:'Google',    createdAt:ago(4) },
    { id:'l8', clientId:'c3', campaignId:'camp3', name:'Deepak Nair',  email:'deepak.nair@email.com',  phone:'3456789012', status:'converted', source:'Google',    createdAt:ago(10) },
  ];
  for (const l of leads) {
    await dbRun(
      'INSERT INTO leads (id,clientId,campaignId,name,email,phone,status,source,createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
      [l.id, l.clientId, l.campaignId, l.name, l.email, l.phone, l.status, l.source, l.createdAt]
    );
  }

  // --- ACTIVITY LOG ---
  const activity = [
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
  for (const a of activity) {
    await dbRun(
      'INSERT INTO activity (id,type,entity,name,user,action,timestamp) VALUES (?,?,?,?,?,?,?)',
      [a.id, a.type, a.entity, a.name, a.user, a.action, a.timestamp]
    );
  }
}

// Helper functions wrapping sqlite3 in promises
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err); else resolve(this);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err); else resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err); else resolve(rows);
  });
});

module.exports = { db, dbRun, dbGet, dbAll };
