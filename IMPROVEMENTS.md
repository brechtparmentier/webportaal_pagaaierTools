# Aanbevolen Verbeteringen voor Webportaal PagaaierTools

Deze document beschrijft aanbevolen verbeteringen voor stabiliteit en gebruikerscomfort, geordend op prioriteit.

## 🔴 HOGE PRIORITEIT - Stabiliteit & Security

### 1. **Persistent Session Storage**
**Probleem:** Sessions worden in-memory opgeslagen en gaan verloren bij server restart
**Impact:** Gebruikers moeten opnieuw inloggen na elke server restart
**Oplossing:**
```bash
npm install better-sqlite3-session-store
```
```javascript
const SqliteStore = require('better-sqlite3-session-store')(session);
app.use(session({
  store: new SqliteStore({
    client: db,
    expired: {
      clear: true,
      intervalMs: 900000 // 15 min
    }
  }),
  secret: process.env.SESSION_SECRET || 'pagaaiertools-secret-key-2024',
  // ... rest
}));
```

### 2. **Environment Variables voor Security**
**Probleem:** Hardcoded credentials en secrets in code
**Impact:** Security risico, moeilijk te wijzigen per omgeving
**Oplossing:**
Maak `.env` file:
```env
SESSION_SECRET=your-random-secret-here-min-32-chars
ADMIN_USERNAME=brecht
ADMIN_PASSWORD=He33e-8620_;
PORT=3000
NODE_ENV=production
```

Install dotenv:
```bash
npm install dotenv
```

Update `server.js`:
```javascript
require('dotenv').config();
const PORT = process.env.PORT || 3000;
```

### 3. **Database Backup Systeem**
**Probleem:** Geen backups van projecten database
**Impact:** Data verlies bij corruptie of fout
**Oplossing:**
Maak `backupDatabase.js`:
```javascript
const fs = require('fs');
const path = require('path');

function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupDir = path.join(__dirname, 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const backupFile = path.join(backupDir, `portaal-${timestamp}.db`);
  fs.copyFileSync('portaal.db', backupFile);

  // Keep only last 7 backups
  const files = fs.readdirSync(backupDir).sort().reverse();
  files.slice(7).forEach(f => fs.unlinkSync(path.join(backupDir, f)));

  console.log(`Backup created: ${backupFile}`);
}

// Run daily
setInterval(backupDatabase, 24 * 60 * 60 * 1000);
```

Voeg toe aan crontab:
```bash
0 2 * * * cd /home/brecht/repos/webportaal_pagaaierTools && node backupDatabase.js
```

### 4. **Error Handling & Logging**
**Probleem:** Minimale error logging, moeilijk debuggen
**Impact:** Problemen zijn moeilijk te traceren
**Oplossing:**
```bash
npm install winston
```

Maak `logger.js`:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

Gebruik overal:
```javascript
const logger = require('./logger');
logger.error('Database error:', error);
logger.info('Project added:', project.name);
```

### 5. **Rate Limiting voor API & Login**
**Probleem:** Geen bescherming tegen brute-force attacks
**Impact:** Security risico
**Oplossing:**
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuten
  max: 5, // max 5 pogingen
  message: 'Te veel login pogingen, probeer over 15 minuten opnieuw'
});

app.post('/admin/login', loginLimiter, (req, res) => {
  // ... login logic
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

app.use('/api/', apiLimiter);
```

## 🟡 MEDIUM PRIORITEIT - Gebruikerscomfort (Admin)

### 6. **Admin Dashboard met Port Status**
**Probleem:** Admin ziet niet welke projecten online zijn
**Impact:** Moet handmatig checken
**Oplossing:**
Update admin dashboard om ook port status te tonen:
```javascript
app.get('/admin', requireAuth, async (req, res) => {
  const projects = queries.getAllProjects.all();

  // Check status for all projects
  for (const project of projects) {
    const urls = project.urls ? JSON.parse(project.urls) : [];
    project.urlsWithStatus = await checkProjectUrls(urls);
    project.anyOnline = project.urlsWithStatus.some(u => u.online);
  }

  res.render('admin', { username: req.session.username, projects });
});
```

Voeg status column toe in admin table.

### 7. **Bulk Operations Admin Panel**
**Probleem:** Projecten één voor één enablen/disablen/verwijderen
**Impact:** Tijdrovend bij veel projecten
**Oplossing:**
- Checkboxes voor bulk selectie
- "Enable Selected", "Disable Selected", "Delete Selected" buttons
- "Re-analyze Selected" om URLs te updaten

### 8. **Project Start/Stop Controls**
**Probleem:** Projecten moeten handmatig gestart worden buiten portaal
**Impact:** Onhandig voor beheerders
**Oplossing:**
Voeg start/stop commando's toe aan database:
```sql
ALTER TABLE projects ADD COLUMN start_command TEXT;
ALTER TABLE projects ADD COLUMN stop_command TEXT;
ALTER TABLE projects ADD COLUMN auto_start BOOLEAN DEFAULT 0;
```

Maak `projectManager.js`:
```javascript
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function startProject(project) {
  if (!project.start_command) return { success: false, error: 'No start command' };

  try {
    const { stdout, stderr } = await execAsync(project.start_command, {
      cwd: project.directory_path,
      timeout: 30000
    });
    return { success: true, output: stdout };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

Voeg Start/Stop buttons toe in admin interface.

### 9. **User Management Systeem**
**Probleem:** Alleen één hardcoded admin user
**Impact:** Meerdere beheerders niet mogelijk
**Oplossing:**
- CRUD interface voor users in admin panel
- Role-based access (admin, viewer)
- Password change functionaliteit
- Last login tracking

### 10. **Project Categorieën/Tags**
**Probleem:** Veel projecten worden onoverzichtelijk
**Impact:** Moeilijk navigeren
**Oplossing:**
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE
);

CREATE TABLE project_tags (
  project_id INTEGER,
  tag_id INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);
```

Filter op tag in admin en user interface.

## 🟢 LAGE PRIORITEIT - Gebruikerscomfort (Eindgebruiker)

### 11. **Search & Filter Functionaliteit**
**Probleem:** Bij veel projecten is homepage onoverzichtelijk
**Impact:** Traag om project te vinden
**Oplossing:**
- Search bar met live filter
- Filter op status (online/offline)
- Filter op type (nextjs, python, docker)
- Sorteer opties (naam, recent gebruikt)

### 12. **Recent Viewed / Favorites**
**Probleem:** Vaak gebruikte projecten telkens zoeken
**Impact:** Extra clicks
**Oplossing:**
- Cookie-based "recent viewed" (laatste 5)
- LocalStorage favorites (sterretje icon)
- Toon bovenaan homepage

### 13. **Real-time Status Updates**
**Probleem:** Status alleen bij page load, niet live
**Impact:** Verouderde informatie
**Oplossing:**
Gebruik Server-Sent Events of polling:
```javascript
// Client-side
const eventSource = new EventSource('/api/status-stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateProjectStatus(data);
};

// Server-side
app.get('/api/status-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const interval = setInterval(async () => {
    const projects = queries.getEnabledProjects.all();
    // Check status...
    res.write(`data: ${JSON.stringify(statusData)}\n\n`);
  }, 5000);

  req.on('close', () => clearInterval(interval));
});
```

### 14. **Project Preview/Screenshots**
**Probleem:** Gebruikers weten niet hoe project eruit ziet
**Impact:** Moeten project openen om te zien
**Oplossing:**
- Upload screenshot functionaliteit in admin
- Toon thumbnail op project card
- Lightbox bij click

### 15. **Dark Mode**
**Probleem:** Bright mode kan vermoeiend zijn
**Impact:** Gebruikerscomfort
**Oplossing:**
```javascript
// Toggle button in header
const darkMode = localStorage.getItem('darkMode') === 'true';
document.body.classList.toggle('dark-mode', darkMode);
```

CSS:
```css
body.dark-mode {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #eee;
}
/* ... rest */
```

### 16. **Project Usage Analytics**
**Probleem:** Geen inzicht welke projecten populair zijn
**Impact:** Beheerders weten niet wat relevant is
**Oplossing:**
```sql
CREATE TABLE project_views (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  user_ip TEXT,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

Track views bij proxy access, toon stats in admin.

### 17. **Custom Branding per School**
**Probleem:** Hardcoded "PagaaierTools" naam
**Impact:** Niet herbruikbaar voor andere scholen
**Oplossing:**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

Configureerbaar:
- School naam
- Logo
- Kleurenschema
- Footer tekst

### 18. **Project Health Monitoring**
**Probleem:** Alleen online/offline, geen performance info
**Impact:** Trage projecten niet detecteerbaar
**Oplossing:**
- Response time meting
- Memory/CPU usage (via OS commands)
- Uptime percentage (laatste 24u/7d)
- Alert als project > 3x crashed

### 19. **QR Codes voor Mobile Access**
**Probleem:** URL's typen op mobiel is omslachtig
**Impact:** Onhandig voor studenten met tablets
**Oplossing:**
```bash
npm install qrcode
```

```javascript
const QRCode = require('qrcode');

app.get('/api/projects/:id/qr', async (req, res) => {
  const project = queries.getProjectById.get(req.params.id);
  const url = `http://pagaaier.school/project/${project.id}`;
  const qr = await QRCode.toDataURL(url);
  res.json({ qr });
});
```

Toon QR code in project detail modal.

### 20. **Markdown Support voor Descriptions**
**Probleem:** Beschrijvingen zijn plain text
**Impact:** Geen formatting mogelijk
**Oplossing:**
```bash
npm install marked
```

```javascript
const marked = require('marked');
project.descriptionHtml = marked(project.description);
```

Render met `<%- project.descriptionHtml %>` in EJS.

## 🔧 TECHNISCHE OPTIMALISATIES

### 21. **Caching voor Port Status**
**Probleem:** Elke page load checkt alle ports opnieuw (kan traag zijn)
**Impact:** Langzame homepage bij veel projecten
**Oplossing:**
```javascript
const NodeCache = require('node-cache');
const statusCache = new NodeCache({ stdTTL: 30 }); // 30 seconden

async function getProjectStatus(projectId) {
  const cached = statusCache.get(projectId);
  if (cached) return cached;

  const status = await checkProjectUrls(urls);
  statusCache.set(projectId, status);
  return status;
}
```

### 22. **Database Indices**
**Probleem:** Queries kunnen traag worden met veel projecten
**Impact:** Performance
**Oplossing:**
```sql
CREATE INDEX idx_projects_enabled ON projects(enabled);
CREATE INDEX idx_projects_setup_type ON projects(setup_type);
CREATE INDEX idx_users_username ON users(username);
```

### 23. **Static Asset Caching**
**Probleem:** CSS/JS elke keer opnieuw geladen
**Impact:** Langzamer laden
**Oplossing:**
```javascript
app.use('/static', express.static('public', {
  maxAge: '1d',
  etag: true
}));
```

### 24. **Graceful Shutdown**
**Probleem:** Server stopt abrupt, requests worden afgebroken
**Impact:** Bad user experience
**Oplossing:**
```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing gracefully');

  server.close(() => {
    db.close();
    console.log('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcing shutdown');
    process.exit(1);
  }, 10000);
});
```

### 25. **Health Check Endpoint**
**Probleem:** Nginx/monitoring tools kunnen niet checken of app healthy is
**Impact:** Downtime detectie
**Oplossing:**
```javascript
app.get('/health', (req, res) => {
  try {
    // Check database
    db.prepare('SELECT 1').get();

    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## 📊 PRIORITEITEN OVERZICHT

**Direct implementeren (Veiligheid & Stabiliteit):**
1. Environment Variables
2. Session Storage
3. Database Backups
4. Rate Limiting
5. Logging Systeem

**Deze maand (Admin Comfort):**
6. Admin Dashboard Port Status
7. Project Start/Stop Controls
8. Bulk Operations
9. User Management

**Later (Nice to have):**
10. Search & Filter
11. Real-time Updates
12. Dark Mode
13. Analytics
14. QR Codes

**Technisch (Performance):**
15. Caching
16. Database Indices
17. Graceful Shutdown
18. Health Check

## 🚀 Quick Wins (Meeste Impact, Minste Werk)

1. **Environment Variables** (30 min) - Direct veiliger
2. **Admin Port Status** (1 uur) - Code al bijna klaar
3. **Database Backup Script** (45 min) - Data veiligheid
4. **Search Filter** (2 uur) - Grote UX verbetering
5. **Caching** (1 uur) - Snelheidswinst

---

**Totale implementatie tijd geschat:**
- Hoge prioriteit: ~8 uur
- Medium prioriteit: ~20 uur
- Lage prioriteit: ~30 uur
- Technisch: ~6 uur

**Aanbeveling:** Start met de Quick Wins en werk daarna de Hoge Prioriteit items af.
