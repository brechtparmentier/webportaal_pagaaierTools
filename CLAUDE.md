# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Webportaal PagaaierTools is a Node.js web platform for managing and providing access to local development projects in a school network environment. It functions as a reverse proxy and project dashboard with an admin interface.

The application allows teachers/admins to add multiple web projects (running on different ports) and make them accessible through a single portal with clean URLs.

## Core Architecture

### Server Components (server.js:1-417)

**Main Application**: Express.js server with session-based authentication
- Listens on port 3000 (or PORT env variable) on 0.0.0.0
- Uses EJS for server-side templating (views/ directory)
- Session management with express-session
- bcrypt for password hashing

**Authentication Flow**:
- Admin access protected by `requireAuth` middleware (server.js:37-42)
- Sessions stored in-memory (not persistent across restarts)
- Default credentials: username "brecht", password stored as bcrypt hash

**Reverse Proxy System** (server.js:351-378):
- Projects accessed via `/project/:id` route
- Uses http-proxy-middleware to forward requests to local ports
- Each project has a configured port where it runs independently
- The portal doesn't start/stop projects, it only routes to them

### Database Layer (database.js:1-113)

**SQLite Database**: Uses better-sqlite3 for synchronous database operations
- Database file: `portaal.db` in project root
- Two main tables: `users` and `projects`

**Projects Table Structure**:
- `id`, `name`, `description`, `directory_path`, `port`
- `enabled` (boolean) - toggles visibility on homepage
- `setup_type` - detected framework (nextjs, python-flask, docker-compose, etc.)
- `urls` - JSON array of URLs (deployment URLs, dev URLs, etc.)
- Timestamps: `created_at`, `updated_at`

**Query Pattern**: All prepared statements exported via `getQueries()` function after initialization
- Must call `initDatabase()` first, then `getQueries()`
- Synchronous API used throughout (`.all()`, `.get()`, `.run()`)

### Project Scanner (projectScanner.js:1-244)

**Intelligent Project Detection**:
- Scans directories to automatically detect project types
- Recognizes: Next.js, React, Vue, Node.js/Express, Python (Flask/Django/FastAPI/Streamlit), Docker, PM2
- Detection based on: package.json, requirements.txt, docker-compose.yml, etc.

**Port Detection**:
- Scans package.json scripts and docker-compose.yml for port configurations
- Falls back to framework defaults (Next.js: 3000, Flask: 5000, Django: 8000, etc.)

**URL Discovery**:
- Parses .env files (.env, .env.local, .env.development, .env.production)
- Extracts deployment URLs and categorizes them (production, staging, development, demo)
- Stores URLs as JSON in database for quick reference

**Import/Export**:
- Projects can be exported to JSON for backup/sharing
- JSON import validates structure and creates projects in database

## Development Workflow

### Running the Application

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

### Database Operations

The database initializes automatically on first run with:
- Default admin user (username: brecht)
- Three default projects if none exist

To reset the database, delete `portaal.db` and restart the server.

### Adding Projects

Projects can be added via:
1. **Manual entry** in admin panel (`/admin`)
2. **Directory scanning** - scans a directory and detects all projects automatically
3. **JSON import** - bulk import from exported JSON

Each project must be **running independently** on its configured port for the proxy to work.

## Network Configuration

### Access Methods

The application supports multiple access patterns for school networks:

**1. Local access**: `http://localhost:3000`

**2. mDNS (.local domain)**: `http://$(hostname).local:3000`
- Requires avahi-daemon on Linux
- Works automatically on macOS/iOS/Android
- See setup-mdns.md for configuration

**3. Custom DNS (.school domain)**: `http://pagaaier.school`
- Requires dnsmasq DNS server configured on the host
- Nginx reverse proxy on port 80 forwards to app on port 3000
- Clients must set DNS server to host IP (10.46.53.180)
- See DNS-SETUP.md for full configuration

### Reverse Proxy Chain

For .school domain access:
```
Client → dnsmasq (DNS resolution) → Nginx (port 80) → Express app (port 3000) → Project (various ports)
```

For direct access:
```
Client → Express app (port 3000) → Project (various ports)
```

## Key Routes

**Public**:
- `/` - Homepage showing enabled projects
- `/project/:id` - Reverse proxy to specific project

**Admin** (requires authentication):
- `/admin` - Dashboard with all projects
- `/admin/login`, `/admin/logout` - Authentication
- `/admin/projects/:id/edit` - Edit project details
- `/admin/scan` - Scan directory for projects
- `/admin/scan-results` - Review scanned projects before import
- `/admin/import-json` - Bulk import from JSON
- `/admin/export-json` - Export all projects to JSON

## Important Technical Details

**Session Configuration** (server.js:22-27):
- Secret: hardcoded as 'pagaaiertools-secret-key-2024'
- Cookie maxAge: 24 hours
- Not using secure cookies (designed for internal network, not HTTPS)

**Project URLs Storage**:
- Stored as JSON strings in database
- Parsed when rendering views
- Structure: `[{ type: 'main', url: 'http://localhost:3000' }, ...]`
- Types: 'main', 'production', 'development', 'staging', 'demo', 'other'

**Framework Detection Logic** (projectScanner.js:58-99):
- Checks package.json dependencies in order: next → react → vue → express → generic nodejs
- Python: checks requirements.txt for flask, django, fastapi, streamlit
- Docker: prioritizes docker-compose over Dockerfile

**Error Handling in Proxy** (server.js:367-370):
- Returns 500 with helpful message if target project isn't running
- Message includes project name and expected port for debugging

## Deployment Context

Designed for school networks where:
- Multiple educational web projects need to be accessible
- Students/teachers access from various devices (laptops, tablets, phones)
- Projects run on a single Linux server
- No internet required - fully local network operation
- Admin manages projects centrally through web interface
