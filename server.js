const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { initDatabase, getQueries } = require('./database');
const { scanDirectory, importFromJson, exportToJson } = require('./projectScanner');
const { checkProjectUrls } = require('./portChecker');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialiseer database
initDatabase();

// Krijg queries na initialisatie
const queries = getQueries();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'pagaaiertools-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 uur
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

// Routes

// Home page - toon alle beschikbare projecten
app.get('/', async (req, res) => {
  try {
    const projects = queries.getEnabledProjects.all();

    // Check port status for each project
    for (const project of projects) {
      const urls = project.urls ? JSON.parse(project.urls) : [];
      project.urlsWithStatus = await checkProjectUrls(urls);
    }

    res.render('index', { projects });
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
  const { name, description, directory_path, port, setup_type, enabled, urls } = req.body;

  try {
    queries.updateProject.run(
      name,
      description,
      directory_path,
      parseInt(port),
      enabled === 'on' ? 1 : 0,
      setup_type || 'manual',
      urls || JSON.stringify([]),
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

    for (const index of selectedIndices) {
      const project = scannedProjects[parseInt(index)];
      if (project) {
        const port = project.ports && project.ports.length > 0 ? project.ports[0] : 3000;
        const urlsJson = JSON.stringify(project.urls);

        queries.createProject.run(
          project.name,
          project.description || '',
          project.directory_path,
          port,
          1,
          project.setup_type || 'unknown',
          urlsJson
        );
      }
    }

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
    for (const project of result.projects) {
      const port = project.ports && project.ports.length > 0 ? project.ports[0] : project.port || 3000;
      const urlsJson = JSON.stringify(project.urls || []);

      queries.createProject.run(
        project.name,
        project.description || '',
        project.directory_path,
        port,
        project.enabled !== undefined ? project.enabled : 1,
        project.setup_type || 'unknown',
        urlsJson
      );
    }

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
  console.log(`  Username: brecht`);
  console.log(`  Password: He33e-8620_;`);
  console.log(`\nNOTE: Nginx draait op poort 80 en forwarded naar deze app op poort ${PORT}`);
  console.log(`      DNS server (dnsmasq) resolves *.school domeinen naar dit IP`);
  console.log(`===========================================\n`);
});
