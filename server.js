// Load environment variables first
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { initDatabase, getQueries, db } = require('./database');
const { scanDirectory, importFromJson, exportToJson } = require('./projectScanner');
const { checkProjectUrls, getCacheStats } = require('./portChecker');

const app = express();

// Configuration from environment variables
const PORT = parseInt(process.env.PORT || process.env.PORT_FRONTEND || '9343');
const SESSION_SECRET = process.env.SESSION_SECRET || 'pagaaiertools-secret-key-2024-CHANGE-THIS';
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE || '86400000'); // 24 hours
const DEFAULT_PROJECT_PORT = parseInt(process.env.DEFAULT_PROJECT_PORT || '3000');

// Network configuration
const SERVER_LAN_IP = process.env.SERVER_LAN_IP || '10.46.54.180';
const SERVER_VPN_IP = process.env.SERVER_VPN_IP || '10.0.0.9';
const SHOW_LOCALHOST_URLS = process.env.SHOW_LOCALHOST_URLS !== 'false';
const SHOW_LAN_URLS = process.env.SHOW_LAN_URLS !== 'false';
const SHOW_VPN_URLS = process.env.SHOW_VPN_URLS !== 'false';
const SHOW_OFFLINE_PROJECTS = process.env.SHOW_OFFLINE_PROJECTS !== 'false';

// Initialiseer database
initDatabase();

// Krijg queries na initialisatie
const queries = getQueries();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: SESSION_MAX_AGE }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/admin/login');
}

/**
 * Expand URLs to include localhost, LAN, and VPN variants
 * @param {Array} urls - Original URLs from project
 * @returns {Array} - Expanded URLs with all network variants
 */
function expandProjectUrls(urls) {
  const expanded = [];

  for (const urlObj of urls) {
    const url = urlObj.url || '';

    // Check if it's a localhost URL with a port
    const localhostMatch = url.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/i);

    if (localhostMatch) {
      const port = localhostMatch[1];
      const baseLabel = urlObj.label || urlObj.type || 'Port';

      // Add localhost variant
      if (SHOW_LOCALHOST_URLS) {
        expanded.push({
          ...urlObj,
          url: `http://localhost:${port}`,
          label: `${baseLabel} (localhost)`,
          network: 'localhost',
          port: parseInt(port)
        });
      }

      // Add LAN variant
      if (SHOW_LAN_URLS && SERVER_LAN_IP) {
        expanded.push({
          ...urlObj,
          url: `http://${SERVER_LAN_IP}:${port}`,
          label: `${baseLabel} (LAN)`,
          network: 'lan',
          port: parseInt(port)
        });
      }

      // Add VPN variant
      if (SHOW_VPN_URLS && SERVER_VPN_IP) {
        expanded.push({
          ...urlObj,
          url: `http://${SERVER_VPN_IP}:${port}`,
          label: `${baseLabel} (VPN)`,
          network: 'vpn',
          port: parseInt(port)
        });
      }
    } else {
      // Non-localhost URL, keep as-is
      expanded.push({
        ...urlObj,
        network: 'external'
      });
    }
  }

  return expanded;
}

// Routes

// Health check endpoint (public, for monitoring)
app.get('/health', (req, res) => {
  try {
    // Check database connection
    const dbCheck = db.prepare('SELECT 1 as healthy').get();

    // Get basic statistics
    const projectCount = queries.getAllProjects.all().length;
    const enabledProjectCount = queries.getEnabledProjects.all().length;

    // Get cache stats
    const cacheStats = getCacheStats();

    // Get uptime
    const uptime = process.uptime();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      database: {
        connected: dbCheck.healthy === 1,
        projects: {
          total: projectCount,
          enabled: enabledProjectCount
        }
      },
      cache: {
        size: cacheStats.size,
        ttl: parseInt(process.env.PORT_STATUS_CACHE_TTL || '5000')
      },
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Home page - simple public view with online LAN/VPN projects
app.get('/', async (req, res) => {
  try {
    let projects = queries.getEnabledProjects.all();

    // Process each project
    const processedProjects = [];
    for (const project of projects) {
      const urls = project.urls ? JSON.parse(project.urls) : [];

      // Expand URLs
      const expandedUrls = expandProjectUrls(urls);

      // Check port status
      const urlsWithStatus = await checkProjectUrls(expandedUrls);

      // Find first online LAN or VPN URL (prefer LAN)
      const lanUrl = urlsWithStatus.find(u => u.online && u.network === 'lan');
      const vpnUrl = urlsWithStatus.find(u => u.online && u.network === 'vpn');

      const primaryUrl = lanUrl || vpnUrl;

      if (primaryUrl) {
        // Append frontend_path if configured
        const frontendPath = project.frontend_path || '/';
        const fullUrl = primaryUrl.url.replace(/\/$/, '') + (frontendPath === '/' ? '' : frontendPath);

        processedProjects.push({
          ...project,
          primaryUrl: fullUrl
        });
      }
    }

    res.render('index', {
      projects: processedProjects
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    res.status(500).send('Error loading projects');
  }
});

// Projects overview with filters (admin view)
app.get('/admin/projects', requireAuth, async (req, res) => {
  try {
    let projects = queries.getEnabledProjects.all();

    // Process each project
    for (const project of projects) {
      const urls = project.urls ? JSON.parse(project.urls) : [];

      // Expand URLs to include localhost, LAN, and VPN variants
      const expandedUrls = expandProjectUrls(urls);

      // Check port status for expanded URLs
      project.urlsWithStatus = await checkProjectUrls(expandedUrls);

      // Determine if project has any online URLs
      project.hasOnlineUrl = project.urlsWithStatus.some(u => u.online);
    }

    // Filter offline projects if configured
    if (!SHOW_OFFLINE_PROJECTS) {
      projects = projects.filter(p => p.hasOnlineUrl);
    }

    res.render('projects', {
      username: req.session.username,
      projects,
      showOfflineProjects: SHOW_OFFLINE_PROJECTS
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    res.status(500).send('Error loading projects');
  }
});

// API endpoint to check port status
app.get('/api/projects/:id/status', async (req, res) => {
  try {
    const project = queries.getProjectById.get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const urls = project.urls ? JSON.parse(project.urls) : [];
    const urlsWithStatus = await checkProjectUrls(urls);

    res.json({
      id: project.id,
      name: project.name,
      urls: urlsWithStatus
    });
  } catch (error) {
    console.error('Error checking project status:', error);
    res.status(500).json({ error: 'Error checking project status' });
  }
});

// Admin login page
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/admin');
  }
  res.render('login', { error: null });
});

// Admin login POST
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  try {
    const user = queries.getUserByUsername.get(username);

    if (!user) {
      return res.render('login', { error: 'Ongeldige gebruikersnaam of wachtwoord' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);

    if (!passwordMatch) {
      return res.render('login', { error: 'Ongeldige gebruikersnaam of wachtwoord' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.redirect('/admin');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { error: 'Er is een fout opgetreden' });
  }
});

// Admin logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Admin dashboard
app.get('/admin', requireAuth, (req, res) => {
  try {
    const projects = queries.getAllProjects.all();
    res.render('admin', {
      username: req.session.username,
      projects,
      message: null
    });
  } catch (error) {
    console.error('Error loading admin page:', error);
    res.status(500).send('Error loading admin page');
  }
});

// Add project
app.post('/admin/projects/add', requireAuth, (req, res) => {
  const { name, description, directory_path, port, setup_type, urls } = req.body;

  try {
    const urlsJson = urls || JSON.stringify([{ type: 'main', url: `http://localhost:${port}` }]);
    queries.createProject.run(name, description, directory_path, parseInt(port), 1, setup_type || 'manual', urlsJson);
    res.redirect('/admin');
  } catch (error) {
    console.error('Error adding project:', error);
    const projects = queries.getAllProjects.all();
    res.render('admin', {
      username: req.session.username,
      projects,
      message: 'Error: Could not add project'
    });
  }
});

// Edit project page
app.get('/admin/projects/:id/edit', requireAuth, (req, res) => {
  const projectId = req.params.id;

  try {
    const project = queries.getProjectById.get(projectId);
    if (!project) {
      return res.redirect('/admin');
    }

    // Parse URLs
    project.urlsArray = project.urls ? JSON.parse(project.urls) : [];

    res.render('edit-project', {
      username: req.session.username,
      project,
      error: null
    });
  } catch (error) {
    console.error('Error loading project:', error);
    res.redirect('/admin');
  }
});

// Update project
app.post('/admin/projects/:id/edit', requireAuth, (req, res) => {
  const projectId = req.params.id;
  const { name, description, directory_path, port, setup_type, enabled, urls, frontend_path } = req.body;

  try {
    queries.updateProject.run(
      name,
      description,
      directory_path,
      parseInt(port),
      enabled === 'on' ? 1 : 0,
      setup_type || 'manual',
      urls || JSON.stringify([]),
      frontend_path || '/',
      projectId
    );
    res.redirect('/admin');
  } catch (error) {
    console.error('Error updating project:', error);
    const project = queries.getProjectById.get(projectId);
    project.urlsArray = project.urls ? JSON.parse(project.urls) : [];
    res.render('edit-project', {
      username: req.session.username,
      project,
      error: 'Could not update project'
    });
  }
});

// Toggle project enabled
app.post('/admin/projects/:id/toggle', requireAuth, (req, res) => {
  const projectId = req.params.id;

  try {
    queries.toggleProjectEnabled.run(projectId);
    res.redirect('/admin');
  } catch (error) {
    console.error('Error toggling project:', error);
    res.redirect('/admin');
  }
});

// Delete project
app.post('/admin/projects/:id/delete', requireAuth, (req, res) => {
  const projectId = req.params.id;

  try {
    queries.deleteProject.run(projectId);
    res.redirect('/admin');
  } catch (error) {
    console.error('Error deleting project:', error);
    res.redirect('/admin');
  }
});

// Scan directory for projects
app.post('/admin/scan', requireAuth, (req, res) => {
  const { scan_path } = req.body;

  try {
    const result = scanDirectory(scan_path);

    if (!result.success) {
      const projects = queries.getAllProjects.all();
      return res.render('admin', {
        username: req.session.username,
        projects,
        message: `Scan fout: ${result.error}`
      });
    }

    // Sla scan resultaten op in sessie voor review
    req.session.scannedProjects = result.projects;
    res.redirect('/admin/scan-results');
  } catch (error) {
    console.error('Error scanning directory:', error);
    const projects = queries.getAllProjects.all();
    res.render('admin', {
      username: req.session.username,
      projects,
      message: 'Error tijdens scannen'
    });
  }
});

// Scan results page
app.get('/admin/scan-results', requireAuth, (req, res) => {
  const scannedProjects = req.session.scannedProjects || [];

  res.render('scan-results', {
    username: req.session.username,
    projects: scannedProjects,
    jsonExport: exportToJson(scannedProjects)
  });
});

// Import scanned projects
app.post('/admin/import-scanned', requireAuth, (req, res) => {
  const { selected_projects } = req.body;

  try {
    const scannedProjects = req.session.scannedProjects || [];
    const selectedIndices = Array.isArray(selected_projects) ? selected_projects : [selected_projects];

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const index of selectedIndices) {
      const project = scannedProjects[parseInt(index)];
      if (project) {
        // Check of project al bestaat op basis van directory_path
        const existing = queries.getProjectByPath.get(project.directory_path);

        const port = project.ports && project.ports.length > 0 ? project.ports[0] : DEFAULT_PROJECT_PORT;
        const urlsJson = JSON.stringify(project.urls);

        if (existing) {
          // Update bestaand project
          queries.updateProject.run(
            project.name,
            project.description || existing.description || '',
            project.directory_path,
            port,
            existing.enabled,
            project.setup_type || existing.setup_type || 'unknown',
            urlsJson,
            existing.frontend_path || '/',
            existing.id
          );
          updated++;
        } else {
          // Nieuw project toevoegen
          queries.createProject.run(
            project.name,
            project.description || '',
            project.directory_path,
            port,
            1,
            project.setup_type || 'unknown',
            urlsJson
          );
          imported++;
        }
      } else {
        skipped++;
      }
    }

    console.log(`Import complete: ${imported} new, ${updated} updated, ${skipped} skipped`);
    req.session.scannedProjects = null;
    res.redirect('/admin');
  } catch (error) {
    console.error('Error importing projects:', error);
    res.redirect('/admin/scan-results');
  }
});

// Import from JSON
app.post('/admin/import-json', requireAuth, (req, res) => {
  const { json_data } = req.body;

  try {
    const result = importFromJson(json_data);

    if (!result.success) {
      const projects = queries.getAllProjects.all();
      return res.render('admin', {
        username: req.session.username,
        projects,
        message: `JSON import fout: ${result.error}`
      });
    }

    // Importeer alle projecten
    let imported = 0;
    let updated = 0;

    for (const project of result.projects) {
      const port = project.ports && project.ports.length > 0 ? project.ports[0] : project.port || 3000;
      const urlsJson = JSON.stringify(project.urls || []);

      // Check of project al bestaat
      const existing = queries.getProjectByPath.get(project.directory_path);

      if (existing) {
        // Update bestaand project
        queries.updateProject.run(
          project.name,
          project.description || existing.description || '',
          project.directory_path,
          port,
          project.enabled !== undefined ? project.enabled : existing.enabled,
          project.setup_type || existing.setup_type || 'unknown',
          urlsJson,
          project.frontend_path || existing.frontend_path || '/',
          existing.id
        );
        updated++;
      } else {
        // Nieuw project
        queries.createProject.run(
          project.name,
          project.description || '',
          project.directory_path,
          port,
          project.enabled !== undefined ? project.enabled : 1,
          project.setup_type || 'unknown',
          urlsJson
        );
        imported++;
      }
    }

    console.log(`JSON import complete: ${imported} new, ${updated} updated`);
    res.redirect('/admin');
  } catch (error) {
    console.error('Error importing JSON:', error);
    const projects = queries.getAllProjects.all();
    res.render('admin', {
      username: req.session.username,
      projects,
      message: 'Error tijdens JSON import'
    });
  }
});

// Export all projects to JSON
app.get('/admin/export-json', requireAuth, (req, res) => {
  try {
    const projects = queries.getAllProjects.all();

    // Parse URLs voor elk project
    const exportProjects = projects.map(p => ({
      ...p,
      urls: p.urls ? JSON.parse(p.urls) : []
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=projects-export.json');
    res.send(exportToJson(exportProjects));
  } catch (error) {
    console.error('Error exporting JSON:', error);
    res.status(500).send('Error exporting projects');
  }
});

// Proxy requests naar projecten
// Dit moet als LAATSTE route komen
app.use('/project/:id', (req, res, next) => {
  const projectId = req.params.id;

  try {
    const project = queries.getProjectById.get(projectId);

    if (!project || !project.enabled) {
      return res.status(404).send('Project not found or disabled');
    }

    const proxy = createProxyMiddleware({
      target: `http://localhost:${project.port}`,
      changeOrigin: true,
      pathRewrite: {
        [`^/project/${projectId}`]: '',
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).send(`Error: Could not connect to ${project.name}. Make sure the application is running on port ${project.port}.`);
      }
    });

    proxy(req, res, next);
  } catch (error) {
    console.error('Error setting up proxy:', error);
    res.status(500).send('Error setting up proxy');
  }
});

// Start server
const os = require('os');

app.listen(PORT, '0.0.0.0', () => {
  const hostname = os.hostname();
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';

  // Zoek het eerste niet-interne IPv4 adres
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
  }

  console.log(`\n===========================================`);
  console.log(`Webportaal PagaaierTools is gestart!`);
  console.log(`===========================================`);
  console.log(`\nLokale toegang:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://${localIP}:${PORT}`);
  console.log(`\nNetwerk toegang (via Nginx reverse proxy):`);
  console.log(`  http://pagaaier.school`);
  console.log(`  http://${hostname}.local`);
  console.log(`  http://${localIP}`);
  console.log(`\nAdmin panel:`);
  console.log(`  http://pagaaier.school/admin`);
  console.log(`\nDefault login:`);
  console.log(`  Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`  Password: ${process.env.ADMIN_PASSWORD || '(set in .env file)'}`);
  }
  console.log(`\nNOTE: Nginx draait op poort 80 en forwarded naar deze app op poort ${PORT}`);
  console.log(`      DNS server (dnsmasq) resolves *.school domeinen naar dit IP`);
  console.log(`===========================================\n`);
});
