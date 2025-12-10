// Load environment variables
require('dotenv').config();

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'portaal.db');
const db = new Database(dbPath);

// Initialiseer database schema
function initDatabase() {
  // Users tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Projects tabel
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      directory_path TEXT NOT NULL UNIQUE,
      port INTEGER NOT NULL,
      enabled BOOLEAN DEFAULT 1,
      setup_type TEXT,
      urls TEXT,
      frontend_path TEXT DEFAULT '/',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indices for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_enabled ON projects(enabled);
    CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
    CREATE INDEX IF NOT EXISTS idx_projects_port ON projects(port);
  `);

  // One-time check for duplicates on startup (logs if found)
  const duplicateCheck = db.prepare(`
    SELECT directory_path, COUNT(*) as count 
    FROM projects 
    GROUP BY directory_path 
    HAVING count > 1
  `).all();

  if (duplicateCheck.length > 0) {
    console.log(`⚠️  Found ${duplicateCheck.length} duplicate project(s) in database`);
    duplicateCheck.forEach(dup => {
      console.log(`   - ${dup.directory_path} (${dup.count} entries)`);
    });
    console.log('   Run migration script to remove duplicates: node migrate-db.js');
  }

  // Check of default admin user bestaat
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-please';

  const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get(adminUsername);

  if (adminExists.count === 0) {
    // Maak default admin user
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(adminUsername, passwordHash);
    console.log(`Default admin user created: ${adminUsername}`);
  }

  // Check of er projecten zijn, zo niet, voeg de standaard projecten toe
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();

  if (projectCount.count === 0) {
    const defaultProjects = [
      {
        name: 'Klasspiegels MVP',
        description: 'Next.js applicatie voor klasspiegels',
        directory_path: path.join(process.env.HOME, 'repos', 'nextjs_klasspiegelsMVP'),
        port: 3001
      },
      {
        name: 'Rubrics Observatie Tool',
        description: 'Python applicatie voor rubrics observatie',
        directory_path: path.join(process.env.HOME, 'repos', 'python_rubricsObservatieTool'),
        port: 5001
      },
      {
        name: 'Leerlokaal FV',
        description: 'Python applicatie voor leerlokaal',
        directory_path: path.join(process.env.HOME, 'repos', 'python_leerlokaalFV'),
        port: 5002
      }
    ];

    const insertProject = db.prepare(`
      INSERT INTO projects (name, description, directory_path, port, enabled, setup_type, urls)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `);

    for (const project of defaultProjects) {
      const urls = JSON.stringify([{ type: 'main', url: `http://localhost:${project.port}` }]);
      insertProject.run(project.name, project.description, project.directory_path, project.port, 'manual', urls);
    }
    console.log('Default projects added to database');
  }
}

// Functie om queries te krijgen (pas na initDatabase)
function getQueries() {
  return {
    // User queries
    getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
    createUser: db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)'),

    // Project queries
    getAllProjects: db.prepare('SELECT * FROM projects ORDER BY name'),
    getEnabledProjects: db.prepare('SELECT * FROM projects WHERE enabled = 1 ORDER BY name'),
    getProjectById: db.prepare('SELECT * FROM projects WHERE id = ?'),
    getProjectByPath: db.prepare('SELECT * FROM projects WHERE directory_path = ?'),
    createProject: db.prepare(`
      INSERT OR IGNORE INTO projects (name, description, directory_path, port, enabled, setup_type, urls)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    updateProject: db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, directory_path = ?, port = ?, enabled = ?, setup_type = ?, urls = ?, frontend_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    deleteProject: db.prepare('DELETE FROM projects WHERE id = ?'),
    toggleProjectEnabled: db.prepare('UPDATE projects SET enabled = NOT enabled WHERE id = ?')
  };
}

module.exports = {
  db,
  initDatabase,
  getQueries
};
