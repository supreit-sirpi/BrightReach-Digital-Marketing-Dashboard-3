const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { dbRun, dbGet, dbAll } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'brightreach_super_secret_key_2026';

// Middleware: Authenticate Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expired or invalid token.' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') next();
  else res.status(403).json({ error: 'Requires admin privileges.' });
};

const uid = () => 'id_' + Math.random().toString(36).substr(2, 9) + Date.now();
const logActivity = async (type, entity, name, user, action) => {
  const now = new Date().toISOString();
  await dbRun('INSERT INTO activity (id, type, entity, name, user, action, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uid(), type, entity, name, user, action, now]);
};

/* ====================================================
   AUTH APIs
   ==================================================== */
app.post('/api/auth/register-request', async (req, res) => {
  try {
    const { name, email, phone, company, role, password } = req.body;
    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) return res.status(400).json({ error: 'Email already exists.' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const now = new Date().toISOString();
    
    await dbRun(
      'INSERT INTO users (id, name, email, password, phone, company, role, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uid(), name, email, hash, phone, company, role || 'client', 'pending', now]
    );
    await logActivity('create', 'user', email, 'System', 'submitted registration request');
    res.status(201).json({ message: 'Registration request submitted successfully. Please wait for admin approval.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(401).json({ error: 'Invalid email or password.' });

    if (user.status === 'pending') return res.status(403).json({ error: 'Your account is awaiting administrator approval.' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'Your registration request was rejected.' });
    if (user.status === 'disabled') return res.status(403).json({ error: 'Your account is disabled.' });

    const tokenPayload = { id: user.id, name: user.name, email: user.email, role: user.role, clientId: user.clientId };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '2h' }); // 2 hours session

    res.json({ token, user: { ...tokenPayload, status: user.status } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/check-session', authenticateToken, async (req, res) => {
  // If token is valid (checked by middleware), return user data
  const user = await dbGet('SELECT id, name, email, role, status, clientId FROM users WHERE id = ?', [req.user.id]);
  if (!user || user.status !== 'active') return res.status(403).json({ error: 'Session invalid or account inactive.' });
  res.json({ user });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) return res.json({ message: 'If that email exists, a reset link has been generated.' }); // Generic message for security

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 3600000; // 1 hour

    await dbRun('UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE id = ?', [resetToken, expiry, user.id]);
    
    // MOCK EMAIL SENDING
    console.log(`\n============================================`);
    console.log(`[MOCK EMAIL] Password Reset Request for: \${email}`);
    console.log(`Reset Token: \${resetToken}`);
    console.log(`============================================\n`);

    res.json({ message: 'If that email exists, a reset link has been generated. (Check server console for token)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const user = await dbGet('SELECT id, resetTokenExpiry FROM users WHERE email = ? AND resetToken = ?', [email, token]);
    
    if (!user) return res.status(400).json({ error: 'Invalid reset token or email.' });
    if (Date.now() > user.resetTokenExpiry) return res.status(400).json({ error: 'Reset token has expired.' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await dbRun('UPDATE users SET password = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?', [hash, user.id]);
    await logActivity('edit', 'user', email, 'System', 'reset password');
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ====================================================
   ADMIN WORKFLOW APIs
   ==================================================== */
app.get('/api/pending-requests', authenticateToken, isAdmin, async (req, res) => {
  const users = await dbAll('SELECT id, name, email, phone, company, role, status, createdAt FROM users WHERE status IN ("pending", "rejected") ORDER BY createdAt DESC');
  res.json(users);
});

app.patch('/api/approve-user/:id', authenticateToken, isAdmin, async (req, res) => {
  await dbRun('UPDATE users SET status = "active" WHERE id = ?', [req.params.id]);
  const u = await dbGet('SELECT email FROM users WHERE id = ?', [req.params.id]);
  await logActivity('edit', 'user', u?.email, req.user.name, 'approved registration');
  res.json({ message: 'User approved successfully.' });
});

app.patch('/api/reject-user/:id', authenticateToken, isAdmin, async (req, res) => {
  await dbRun('UPDATE users SET status = "rejected" WHERE id = ?', [req.params.id]);
  const u = await dbGet('SELECT email FROM users WHERE id = ?', [req.params.id]);
  await logActivity('edit', 'user', u?.email, req.user.name, 'rejected registration');
  res.json({ message: 'User rejected.' });
});

/* ====================================================
   DATA APIs (Replaces localStorage)
   ==================================================== */
app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    const clients = await dbAll('SELECT * FROM clients');
    const campaigns = await dbAll('SELECT * FROM campaigns');
    const leads = await dbAll('SELECT * FROM leads');
    const activity = await dbAll('SELECT * FROM activity ORDER BY timestamp DESC LIMIT 60');
    let users = [];
    if (req.user.role === 'admin') {
      users = await dbAll('SELECT id, name, email, role, status, clientId, createdAt FROM users');
    } else {
      users = [await dbGet('SELECT id, name, email, role, status, clientId, createdAt FROM users WHERE id = ?', [req.user.id])];
    }
    res.json({ clients, campaigns, leads, activity, users });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Since the frontend previously managed entire arrays for updates, we provide a unified sync endpoint 
// for simplicity in migrating this specific frontend, although RESTful is better.
app.post('/api/sync', authenticateToken, async (req, res) => {
  try {
    const { clients, campaigns, leads, activity, users } = req.body;
    
    // We will do a full sync overwrite for this demo app simplicity.
    // In a real app, this should be individual POST/PUT endpoints.
    if (clients) {
      await dbRun('DELETE FROM clients');
      for (const c of clients) {
        await dbRun('INSERT INTO clients (id, name, email, phone, address, industry, status, createdAt) VALUES (?,?,?,?,?,?,?,?)',
          [c.id, c.name, c.email, c.phone, c.address, c.industry, c.status, c.createdAt]);
      }
    }
    if (campaigns) {
      await dbRun('DELETE FROM campaigns');
      for (const c of campaigns) {
        await dbRun('INSERT INTO campaigns (id, clientId, name, budget, spent, status, platform, startDate, endDate, description) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [c.id, c.clientId, c.name, c.budget, c.spent, c.status, c.platform, c.startDate, c.endDate, c.description]);
      }
    }
    if (leads) {
      await dbRun('DELETE FROM leads');
      for (const l of leads) {
        await dbRun('INSERT INTO leads (id, clientId, campaignId, name, email, phone, status, source, createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
          [l.id, l.clientId, l.campaignId, l.name, l.email, l.phone, l.status, l.source, l.createdAt]);
      }
    }
    if (activity) {
      await dbRun('DELETE FROM activity');
      for (const a of activity) {
        await dbRun('INSERT INTO activity (id, type, entity, name, user, action, timestamp) VALUES (?,?,?,?,?,?,?)',
          [a.id, a.type, a.entity, a.name, a.user, a.action, a.timestamp]);
      }
    }
    if (users && req.user.role === 'admin') {
      // only update non-admin users or existing users carefully. For this sync, we update status/role/clientId.
      for (const u of users) {
        if (u.id !== 'u_admin') {
          // If it's a new user created from Admin panel
          const exists = await dbGet('SELECT id FROM users WHERE id = ?', [u.id]);
          if (exists) {
            await dbRun('UPDATE users SET name=?, email=?, role=?, status=?, clientId=? WHERE id=?', 
              [u.name, u.email, u.role, u.status, u.clientId, u.id]);
            if (u.password && u.password.length > 5) {
               const hash = await bcrypt.hash(u.password, 10);
               await dbRun('UPDATE users SET password=? WHERE id=?', [hash, u.id]);
            }
          } else {
            const hash = await bcrypt.hash(u.password || 'Client@123', 10);
            await dbRun('INSERT INTO users (id, name, email, password, role, status, clientId, createdAt) VALUES (?,?,?,?,?,?,?,?)',
              [u.id, u.name, u.email, hash, u.role, u.status, u.clientId, u.createdAt || new Date().toISOString()]);
          }
        }
      }
    }

    res.json({ message: 'Sync successful' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
