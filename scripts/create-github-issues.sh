#!/bin/bash
# ==============================================================================
# GitHub Issues Creation Script for PagaaierTools Improvements
# ==============================================================================
# This script creates 25 GitHub issues based on IMPROVEMENTS.md
# Prerequisites: GitHub CLI (gh) installed and authenticated
# Usage: bash scripts/create-github-issues.sh
# ==============================================================================

set -e  # Exit on error

echo "🚀 Creating GitHub Issues for PagaaierTools Improvements..."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Install it: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI ready"
echo ""

# ==============================================================================
# 🔴 HIGH PRIORITY - Security & Stability
# ==============================================================================

echo "📍 Creating HIGH PRIORITY issues..."

gh issue create \
  --title "🔴 [SECURITY] Implement Persistent Session Storage" \
  --body "## 📋 Description
Implement persistent session storage using SQLite to prevent session loss on server restarts.

## 🎯 Problem
Sessions are currently stored in-memory and are lost on every server restart, forcing users to re-login.

## 💡 Solution
- Install \`better-sqlite3-session-store\`
- Configure SQLite session store with 15-minute cleanup interval
- Use environment variable for session secret

## ✅ Acceptance Criteria
- [ ] Sessions persist across server restarts
- [ ] Session cleanup runs every 15 minutes
- [ ] SESSION_SECRET loaded from environment variables
- [ ] Existing sessions migrated (if applicable)
- [ ] Documentation updated

## 📦 Dependencies
- better-sqlite3-session-store package
- Issue #2 (Environment Variables)

## ⏱️ Estimated Effort
Small (2-3h)

## 🏷️ Priority
🔴 High - Security & Stability

## 📝 Implementation Notes
\`\`\`javascript
const SqliteStore = require('better-sqlite3-session-store')(session);
app.use(session({
  store: new SqliteStore({
    client: db,
    expired: { clear: true, intervalMs: 900000 }
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
\`\`\`

Related: IMPROVEMENTS.md #1" \
  --label "priority:high,security,enhancement" \
  --assignee "@me"

gh issue create \
  --title "🔴 [SECURITY] Implement Environment Variables for Security" \
  --body "## 📋 Description
Move all hardcoded credentials and secrets to environment variables.

## 🎯 Problem
Credentials are hardcoded in source code, creating security risks and making environment-specific configuration difficult.

## 💡 Solution
- Create \`.env\` file template
- Install dotenv package
- Move SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, PORT to .env
- Update .gitignore to exclude .env files
- Create .env.example for documentation

## ✅ Acceptance Criteria
- [ ] .env file created and excluded from git
- [ ] All secrets moved to environment variables
- [ ] .env.example provided with placeholder values
- [ ] Documentation updated with setup instructions
- [ ] No hardcoded credentials remain in codebase

## 📦 Dependencies
- dotenv package

## ⏱️ Estimated Effort
Quick Win (30min)

## 🏷️ Priority
🔴 High - Security

## 📝 Environment Variables
\`\`\`env
SESSION_SECRET=your-random-secret-min-32-chars
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
\`\`\`

Related: IMPROVEMENTS.md #2" \
  --label "priority:high,security,enhancement,quick-win" \
  --assignee "@me"

gh issue create \
  --title "🔴 [STABILITY] Implement Automated Database Backup System" \
  --body "## 📋 Description
Create automated daily database backups with retention policy.

## 🎯 Problem
No backup mechanism exists for the SQLite database, risking data loss.

## 💡 Solution
- Create \`backupDatabase.js\` script
- Implement daily backup with timestamp
- Keep last 7 backups, auto-delete older ones
- Add cron job for automated execution
- Store backups in dedicated directory

## ✅ Acceptance Criteria
- [ ] Backup script creates timestamped database copies
- [ ] Backup directory created and excluded from git
- [ ] Retention policy keeps only 7 most recent backups
- [ ] Cron job configured for daily 2 AM execution
- [ ] Manual backup command documented
- [ ] Restore procedure documented

## 📦 Dependencies
None (uses native Node.js fs module)

## ⏱️ Estimated Effort
Quick Win (45min)

## 🏷️ Priority
🔴 High - Stability

## 📝 Cron Configuration
\`\`\`bash
0 2 * * * cd /home/brecht/repos/webportaal_pagaaierTools && node backupDatabase.js
\`\`\`

Related: IMPROVEMENTS.md #3" \
  --label "priority:high,stability,enhancement,quick-win" \
  --assignee "@me"

gh issue create \
  --title "🔴 [STABILITY] Implement Structured Logging with Winston" \
  --body "## 📋 Description
Replace console.log with structured logging system using Winston.

## 🎯 Problem
Minimal error logging makes debugging difficult. No log rotation or structured output.

## 💡 Solution
- Install winston package
- Create \`logger.js\` module
- Configure file transports (error.log, combined.log)
- Add console transport for development
- Replace all console.log/error with logger
- Configure log levels via environment

## ✅ Acceptance Criteria
- [ ] Winston configured with JSON formatting
- [ ] Separate error and combined log files
- [ ] Log rotation implemented
- [ ] All console.log replaced with logger calls
- [ ] Log levels configurable via LOG_LEVEL env var
- [ ] Logs directory excluded from git

## 📦 Dependencies
- winston package
- Issue #2 (Environment Variables)

## ⏱️ Estimated Effort
Medium (3-4h)

## 🏷️ Priority
🔴 High - Stability

## 📝 Usage Example
\`\`\`javascript
const logger = require('./logger');
logger.info('Server started', { port: 3000 });
logger.error('Database error', { error: err.message });
\`\`\`

Related: IMPROVEMENTS.md #4" \
  --label "priority:high,stability,enhancement" \
  --assignee "@me"

gh issue create \
  --title "🔴 [SECURITY] Implement Rate Limiting for API and Login" \
  --body "## 📋 Description
Add rate limiting to prevent brute-force attacks and API abuse.

## 🎯 Problem
No protection against brute-force login attempts or API abuse.

## 💡 Solution
- Install express-rate-limit package
- Configure login limiter (5 attempts per 15 minutes)
- Configure API limiter (100 requests per minute)
- Add clear error messages for rate-limited requests

## ✅ Acceptance Criteria
- [ ] Login endpoint limited to 5 attempts per 15 minutes
- [ ] API endpoints limited to 100 requests per minute
- [ ] Clear error messages displayed when rate limited
- [ ] Rate limit headers included in responses
- [ ] Configuration documented

## 📦 Dependencies
- express-rate-limit package

## ⏱️ Estimated Effort
Small (1-2h)

## 🏷️ Priority
🔴 High - Security

## 📝 Configuration
\`\`\`javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Te veel login pogingen, probeer over 15 minuten opnieuw'
});
\`\`\`

Related: IMPROVEMENTS.md #5" \
  --label "priority:high,security,enhancement" \
  --assignee "@me"

echo "✅ Created 5 HIGH PRIORITY issues"
echo ""

# ==============================================================================
# 🟡 MEDIUM PRIORITY - Admin UX
# ==============================================================================

echo "📍 Creating MEDIUM PRIORITY issues..."

gh issue create \
  --title "🟡 [FEATURE] Add Real-time Port Status to Admin Dashboard" \
  --body "## 📋 Description
Display real-time online/offline status for all projects in admin dashboard.

## 🎯 Problem
Admin cannot see which projects are currently online without manual checking.

## 💡 Solution
- Check port status for all projects on admin page load
- Display status indicator (online/offline) next to each project
- Add status column to admin table
- Cache status to avoid repeated checks

## ✅ Acceptance Criteria
- [ ] Port status checked on admin dashboard load
- [ ] Visual indicator shows online/offline status
- [ ] Status column added to projects table
- [ ] Caching implemented to improve performance
- [ ] Tooltip shows URL details on hover

## 📦 Dependencies
- Issue #21 (Caching implementation)

## ⏱️ Estimated Effort
Quick Win (1h)

## 🏷️ Priority
🟡 Medium - Admin UX

Related: IMPROVEMENTS.md #6" \
  --label "priority:medium,enhancement,admin-ux,quick-win" \
  --assignee "@me"

gh issue create \
  --title "🟡 [FEATURE] Implement Bulk Operations in Admin Panel" \
  --body "## 📋 Description
Enable bulk enable/disable/delete operations for multiple projects.

## 🎯 Problem
Managing many projects one-by-one is time-consuming.

## 💡 Solution
- Add checkboxes for project selection
- Add 'Enable Selected' button
- Add 'Disable Selected' button
- Add 'Delete Selected' button (with confirmation)
- Add 'Re-analyze Selected' for URL updates
- Add 'Select All' checkbox

## ✅ Acceptance Criteria
- [ ] Checkboxes added to each project row
- [ ] 'Select All' functionality works
- [ ] Bulk enable/disable functional
- [ ] Bulk delete with confirmation dialog
- [ ] Bulk re-analyze updates URLs
- [ ] Success/error messages displayed

## ⏱️ Estimated Effort
Medium (4-6h)

## 🏷️ Priority
🟡 Medium - Admin UX

Related: IMPROVEMENTS.md #7" \
  --label "priority:medium,enhancement,admin-ux" \
  --assignee "@me"

gh issue create \
  --title "🟡 [FEATURE] Add Project Start/Stop Controls" \
  --body "## 📋 Description
Enable starting/stopping projects directly from admin interface.

## 🎯 Problem
Projects must be manually started/stopped outside the portal.

## 💡 Solution
- Add start_command, stop_command, auto_start columns to database
- Create projectManager.js module
- Add Start/Stop buttons in admin UI
- Display command output/errors
- Implement auto-start on server boot

## ✅ Acceptance Criteria
- [ ] Database schema updated
- [ ] projectManager module created
- [ ] Start/Stop buttons functional
- [ ] Command output displayed to user
- [ ] Auto-start feature implemented
- [ ] Timeout protection (30s)
- [ ] Error handling with clear messages

## 📦 Dependencies
- Database migration

## ⏱️ Estimated Effort
Medium (5-7h)

## 🏷️ Priority
🟡 Medium - Admin UX

Related: IMPROVEMENTS.md #8" \
  --label "priority:medium,enhancement,admin-ux,database" \
  --assignee "@me"

gh issue create \
  --title "🟡 [FEATURE] Implement User Management System" \
  --body "## 📋 Description
Create multi-user system with role-based access control.

## 🎯 Problem
Only one hardcoded admin user exists. No support for multiple administrators.

## 💡 Solution
- Create users table with roles (admin, viewer)
- Build CRUD interface in admin panel
- Implement password change functionality
- Add last login tracking
- Hash passwords with bcrypt

## ✅ Acceptance Criteria
- [ ] Users table created
- [ ] User CRUD interface functional
- [ ] Role-based access implemented
- [ ] Password hashing with bcrypt
- [ ] Password change feature
- [ ] Last login timestamp tracked
- [ ] Current user can't delete themselves
- [ ] At least one admin must exist

## 📦 Dependencies
- bcrypt package
- Database migration

## ⏱️ Estimated Effort
Large (8-10h)

## 🏷️ Priority
🟡 Medium - Admin UX

Related: IMPROVEMENTS.md #9" \
  --label "priority:medium,enhancement,admin-ux,database,security" \
  --assignee "@me"

gh issue create \
  --title "🟡 [FEATURE] Add Project Categories and Tags System" \
  --body "## 📋 Description
Organize projects with tags/categories for better navigation.

## 🎯 Problem
Large number of projects becomes difficult to navigate and organize.

## 💡 Solution
- Create tags and project_tags tables
- Add tag management UI in admin
- Allow multiple tags per project
- Add tag filtering in both admin and user views
- Display tags as colored badges

## ✅ Acceptance Criteria
- [ ] Tags table created
- [ ] Project-tag associations functional
- [ ] Tag CRUD in admin panel
- [ ] Projects can have multiple tags
- [ ] Filter by tag in admin view
- [ ] Filter by tag in user view
- [ ] Visual tag badges displayed

## 📦 Dependencies
- Database migration

## ⏱️ Estimated Effort
Medium (5-6h)

## 🏷️ Priority
🟡 Medium - UX

Related: IMPROVEMENTS.md #10" \
  --label "priority:medium,enhancement,ux,database" \
  --assignee "@me"

echo "✅ Created 5 MEDIUM PRIORITY issues"
echo ""

# ==============================================================================
# 🟢 LOW PRIORITY - End User UX
# ==============================================================================

echo "📍 Creating LOW PRIORITY (End User UX) issues..."

gh issue create \
  --title "🟢 [FEATURE] Add Search and Filter Functionality" \
  --body "## 📋 Description
Implement client-side search and filtering for project list.

## 🎯 Problem
Finding specific projects in a long list is time-consuming.

## 💡 Solution
- Add search bar with live filtering
- Filter by status (online/offline)
- Filter by type (nextjs, python, docker)
- Sort options (name, recently used)
- Persist filter/sort preferences in localStorage

## ✅ Acceptance Criteria
- [ ] Search bar filters projects in real-time
- [ ] Status filter functional
- [ ] Type filter functional
- [ ] Multiple sort options available
- [ ] Preferences saved in localStorage
- [ ] Clear filters button
- [ ] Mobile-responsive design

## ⏱️ Estimated Effort
Quick Win (2h)

## 🏷️ Priority
🟢 Low - End User UX

Related: IMPROVEMENTS.md #11" \
  --label "priority:low,enhancement,ux,quick-win" \
  --assignee "@me"

gh issue create \
  --title "🟢 [FEATURE] Add Recent Viewed and Favorites" \
  --body "## 📋 Description
Track recently viewed projects and allow users to favorite projects.

## 🎯 Problem
Users must search for frequently used projects repeatedly.

## 💡 Solution
- Cookie-based 'Recently Viewed' (last 5 projects)
- localStorage favorites with star icon
- Display favorites and recent at top of homepage
- Persist across sessions

## ✅ Acceptance Criteria
- [ ] Recent viewed tracked (max 5)
- [ ] Star icon toggles favorites
- [ ] Favorites section at top of page
- [ ] Recent viewed section displayed
- [ ] Data persists across sessions
- [ ] Clear all functionality

## ⏱️ Estimated Effort
Small (3-4h)

## 🏷️ Priority
🟢 Low - End User UX

Related: IMPROVEMENTS.md #12" \
  --label "priority:low,enhancement,ux" \
  --assignee "@me"

gh issue create \
  --title "🟢 [FEATURE] Implement Real-time Status Updates" \
  --body "## 📋 Description
Show live project status updates without page refresh.

## 🎯 Problem
Status only updates on page load, showing outdated information.

## 💡 Solution
- Implement Server-Sent Events (SSE) endpoint
- Client subscribes to status stream
- Server pushes updates every 5 seconds
- Update UI elements without refresh

## ✅ Acceptance Criteria
- [ ] SSE endpoint implemented
- [ ] Client subscribes to status updates
- [ ] UI updates without page refresh
- [ ] Connection resilience (auto-reconnect)
- [ ] Status updates every 5 seconds
- [ ] Graceful degradation if SSE not supported

## ⏱️ Estimated Effort
Medium (5-6h)

## 🏷️ Priority
🟢 Low - End User UX

Related: IMPROVEMENTS.md #13" \
  --label "priority:low,enhancement,ux" \
  --assignee "@me"

gh issue create \
  --title "🟢 [FEATURE] Add Project Screenshots/Previews" \
  --body "## 📋 Description
Allow screenshot uploads and display thumbnails for projects.

## 🎯 Problem
Users don't know what projects look like without opening them.

## 💡 Solution
- Add screenshot upload in admin
- Store images in public/screenshots/
- Display thumbnails on project cards
- Lightbox modal on click
- Support multiple screenshots per project

## ✅ Acceptance Criteria
- [ ] Screenshot upload in admin
- [ ] Images stored in organized structure
- [ ] Thumbnails displayed on cards
- [ ] Lightbox modal functional
- [ ] Multiple images supported
- [ ] Delete screenshot functionality
- [ ] Image size limits enforced

## 📦 Dependencies
- Image upload handling (multer)

## ⏱️ Estimated Effort
Medium (6-7h)

## 🏷️ Priority
🟢 Low - End User UX

Related: IMPROVEMENTS.md #14" \
  --label "priority:low,enhancement,ux" \
  --assignee "@me"

gh issue create \
  --title "🟢 [FEATURE] Implement Dark Mode" \
  --body "## 📋 Description
Add dark mode toggle for better viewing comfort.

## 🎯 Problem
Bright mode can be tiring in low-light environments.

## 💡 Solution
- Toggle button in header
- Save preference in localStorage
- Dark color scheme CSS
- Smooth transition between modes
- System preference detection

## ✅ Acceptance Criteria
- [ ] Toggle button functional
- [ ] Dark mode CSS complete
- [ ] Preference persists across sessions
- [ ] Smooth color transitions
- [ ] System preference detected on first visit
- [ ] All pages support dark mode

## ⏱️ Estimated Effort
Small (2-3h)

## 🏷️ Priority
🟢 Low - End User UX

Related: IMPROVEMENTS.md #15" \
  --label "priority:low,enhancement,ux" \
  --assignee "@me"

gh issue create \
  --title "🟢 [FEATURE] Add Project Usage Analytics" \
  --body "## 📋 Description
Track project views to identify popular projects.

## 🎯 Problem
No visibility into which projects are most used.

## 💡 Solution
- Create project_views table
- Track views on project access
- Display view count in admin
- Show trending projects
- Privacy-conscious (IP hashing)

## ✅ Acceptance Criteria
- [ ] project_views table created
- [ ] Views tracked on access
- [ ] View count displayed in admin
- [ ] Trending projects section
- [ ] IP addresses hashed for privacy
- [ ] Analytics dashboard page

## 📦 Dependencies
- Database migration

## ⏱️ Estimated Effort
Medium (4-5h)

## 🏷️ Priority
🟢 Low - Admin UX

Related: IMPROVEMENTS.md #16" \
  --label "priority:low,enhancement,analytics,database" \
  --assignee "@me"

gh issue create \
  --title "🟢 [FEATURE] Add Custom Branding per School" \
  --body "## 📋 Description
Make branding configurable for multi-school deployments.

## 🎯 Problem
Hardcoded 'PagaaierTools' name limits reusability.

## 💡 Solution
- Create settings table
- Configurable school name, logo, colors, footer
- Admin interface for branding settings
- Logo upload functionality
- CSS variable injection

## ✅ Acceptance Criteria
- [ ] Settings table created
- [ ] School name configurable
- [ ] Logo upload functional
- [ ] Color scheme customizable
- [ ] Footer text configurable
- [ ] Changes reflected immediately
- [ ] Admin settings UI complete

## 📦 Dependencies
- Database migration
- Image upload handling

## ⏱️ Estimated Effort
Medium (6-8h)

## 🏷️ Priority
🟢 Low - Configuration

Related: IMPROVEMENTS.md #17" \
  --label "priority:low,enhancement,configuration,database" \
  --assignee "@me"

gh issue create \
  --title "🟢 [FEATURE] Implement Project Health Monitoring" \
  --body "## 📋 Description
Add detailed health metrics beyond simple online/offline status.

## 🎯 Problem
Cannot detect slow or struggling projects.

## 💡 Solution
- Measure response times
- Track memory/CPU usage
- Calculate uptime percentage (24h/7d)
- Alert on repeated crashes (>3x)
- Health dashboard

## ✅ Acceptance Criteria
- [ ] Response time measured
- [ ] Resource usage tracked
- [ ] Uptime percentage calculated
- [ ] Crash detection implemented
- [ ] Alert system functional
- [ ] Health metrics displayed
- [ ] Historical data stored

## 📦 Dependencies
- Database migration for metrics storage

## ⏱️ Estimated Effort
Large (10-12h)

## 🏷️ Priority
🟢 Low - Monitoring

Related: IMPROVEMENTS.md #18" \
  --label "priority:low,enhancement,monitoring,database" \
  --assignee "@me"

gh issue create \
  --title "🟢 [FEATURE] Add QR Codes for Mobile Access" \
  --body "## 📋 Description
Generate QR codes for easy mobile access to projects.

## 🎯 Problem
Typing URLs on mobile devices is cumbersome for students.

## 💡 Solution
- Install qrcode package
- Generate QR codes for project URLs
- Display QR in project detail modal
- Download QR code option
- Print-friendly QR sheet

## ✅ Acceptance Criteria
- [ ] QR codes generated for each project
- [ ] QR displayed in project modal
- [ ] Download QR code functional
- [ ] Print view with multiple QR codes
- [ ] QR codes work on mobile scanners

## 📦 Dependencies
- qrcode package

## ⏱️ Estimated Effort
Small (2-3h)

## 🏷️ Priority
🟢 Low - Mobile UX

Related: IMPROVEMENTS.md #19" \
  --label "priority:low,enhancement,mobile-ux" \
  --assignee "@me"

gh issue create \
  --title "🟢 [FEATURE] Add Markdown Support for Descriptions" \
  --body "## 📋 Description
Enable Markdown formatting in project descriptions.

## 🎯 Problem
Plain text descriptions lack formatting capabilities.

## 💡 Solution
- Install marked package
- Parse descriptions as Markdown
- Render formatted HTML
- Add Markdown editor in admin
- Preview functionality

## ✅ Acceptance Criteria
- [ ] Markdown parsed and rendered
- [ ] Markdown editor in admin panel
- [ ] Live preview while editing
- [ ] Sanitization for security
- [ ] Support common Markdown features
- [ ] Backward compatible with plain text

## 📦 Dependencies
- marked package
- DOMPurify for sanitization

## ⏱️ Estimated Effort
Small (3-4h)

## 🏷️ Priority
🟢 Low - UX Enhancement

Related: IMPROVEMENTS.md #20" \
  --label "priority:low,enhancement,ux" \
  --assignee "@me"

echo "✅ Created 10 LOW PRIORITY issues"
echo ""

# ==============================================================================
# 🔧 TECHNICAL OPTIMIZATIONS
# ==============================================================================

echo "📍 Creating TECHNICAL OPTIMIZATION issues..."

gh issue create \
  --title "🔧 [OPTIMIZATION] Implement Caching for Port Status" \
  --body "## 📋 Description
Cache port status checks to improve performance.

## 🎯 Problem
Every page load checks all ports, causing slow response times.

## 💡 Solution
- Install node-cache package
- Cache status for 30 seconds
- Implement cache invalidation
- Background refresh strategy

## ✅ Acceptance Criteria
- [ ] Port status cached for 30 seconds
- [ ] Cache miss handled gracefully
- [ ] Manual cache clear option
- [ ] Background refresh implemented
- [ ] Performance improvement measured

## 📦 Dependencies
- node-cache package

## ⏱️ Estimated Effort
Quick Win (1h)

## 🏷️ Priority
🔧 Technical - Performance

Related: IMPROVEMENTS.md #21" \
  --label "technical,performance,enhancement,quick-win" \
  --assignee "@me"

gh issue create \
  --title "🔧 [OPTIMIZATION] Add Database Indices" \
  --body "## 📋 Description
Add database indices to improve query performance.

## 🎯 Problem
Queries can become slow with many projects.

## 💡 Solution
- Add index on projects.enabled
- Add index on projects.setup_type
- Add index on users.username
- Measure query performance improvement

## ✅ Acceptance Criteria
- [ ] Indices created on key columns
- [ ] Query performance measured before/after
- [ ] Migration script created
- [ ] Documentation updated

## 📦 Dependencies
- Database migration

## ⏱️ Estimated Effort
Quick Win (30min)

## 🏷️ Priority
🔧 Technical - Performance

Related: IMPROVEMENTS.md #22" \
  --label "technical,performance,database,quick-win" \
  --assignee "@me"

gh issue create \
  --title "🔧 [OPTIMIZATION] Implement Static Asset Caching" \
  --body "## 📋 Description
Configure proper caching headers for static assets.

## 🎯 Problem
CSS/JS files are re-downloaded on every page load.

## 💡 Solution
- Configure express.static with maxAge
- Enable ETag headers
- Set cache-control headers
- Configure asset versioning

## ✅ Acceptance Criteria
- [ ] Static assets cached for 1 day
- [ ] ETag headers enabled
- [ ] Cache headers verified
- [ ] Asset versioning strategy documented
- [ ] Performance improvement measured

## ⏱️ Estimated Effort
Quick Win (30min)

## 🏷️ Priority
🔧 Technical - Performance

Related: IMPROVEMENTS.md #23" \
  --label "technical,performance,enhancement,quick-win" \
  --assignee "@me"

gh issue create \
  --title "🔧 [STABILITY] Implement Graceful Shutdown" \
  --body "## 📋 Description
Handle SIGTERM signals gracefully to prevent abrupt shutdowns.

## 🎯 Problem
Server stops abruptly, cutting off active requests.

## 💡 Solution
- Listen for SIGTERM/SIGINT signals
- Close server gracefully
- Close database connections
- Force shutdown after 10s timeout
- Log shutdown events

## ✅ Acceptance Criteria
- [ ] SIGTERM handler implemented
- [ ] Server closes gracefully
- [ ] Database connection closed properly
- [ ] Timeout protection (10s)
- [ ] Shutdown logged
- [ ] In-flight requests completed

## ⏱️ Estimated Effort
Small (1-2h)

## 🏷️ Priority
🔧 Technical - Stability

Related: IMPROVEMENTS.md #24" \
  --label "technical,stability,enhancement" \
  --assignee "@me"

gh issue create \
  --title "🔧 [MONITORING] Add Health Check Endpoint" \
  --body "## 📋 Description
Create /health endpoint for monitoring and load balancers.

## 🎯 Problem
External monitoring tools cannot verify application health.

## 💡 Solution
- Create /health endpoint
- Check database connectivity
- Return uptime and timestamp
- Return 503 on unhealthy state
- Add to monitoring systems

## ✅ Acceptance Criteria
- [ ] /health endpoint implemented
- [ ] Database health checked
- [ ] JSON response with status, uptime, timestamp
- [ ] 200 for healthy, 503 for unhealthy
- [ ] Documentation updated
- [ ] Added to nginx monitoring

## ⏱️ Estimated Effort
Quick Win (30min)

## 🏷️ Priority
🔧 Technical - Monitoring

Related: IMPROVEMENTS.md #25" \
  --label "technical,monitoring,enhancement,quick-win" \
  --assignee "@me"

echo "✅ Created 5 TECHNICAL OPTIMIZATION issues"
echo ""

# ==============================================================================
# Summary
# ==============================================================================

echo "🎉 SUCCESS! Created 25 GitHub issues"
echo ""
echo "📊 Summary:"
echo "  🔴 High Priority (Security & Stability): 5 issues"
echo "  🟡 Medium Priority (Admin UX): 5 issues"
echo "  🟢 Low Priority (End User UX): 10 issues"
echo "  🔧 Technical Optimizations: 5 issues"
echo ""
echo "🔗 View all issues:"
echo "  gh issue list"
echo ""
echo "📋 Next steps:"
echo "  1. Review created issues: gh issue list"
echo "  2. Assign additional team members if needed"
echo "  3. Create project board: gh project create --title 'PagaaierTools Improvements'"
echo "  4. Link issues to milestones"
echo "  5. Start with Quick Wins! 🚀"
echo ""
