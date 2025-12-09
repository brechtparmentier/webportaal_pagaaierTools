# ==============================================================================
# PagaaierTools Makefile
# ==============================================================================
# Convenient commands for managing the PagaaierTools web portal
# Usage: make [command]
# ==============================================================================

.PHONY: help install start stop restart status logs logs-follow clean backup restore test dev prod health

# Default target - show help
help:
	@echo "╔═══════════════════════════════════════════════════════════════╗"
	@echo "║           PagaaierTools - Available Commands                 ║"
	@echo "╚═══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📦 Setup & Installation:"
	@echo "  make install          Install dependencies"
	@echo "  make setup            Complete first-time setup"
	@echo ""
	@echo "🚀 Server Management:"
	@echo "  make start            Start the server (with PM2 if available)"
	@echo "  make stop             Stop the server"
	@echo "  make restart          Restart the server"
	@echo "  make dev              Start in development mode (with nodemon)"
	@echo "  make status           Show server status"
	@echo ""
	@echo "📊 Monitoring & Logs:"
	@echo "  make logs             Show recent logs"
	@echo "  make logs-follow      Follow logs in real-time"
	@echo "  make watch            Watch server logs"
	@echo "  make tail             Tail log file"
	@echo "  make health           Check application health"
	@echo "  make ps               Show running Node processes"
	@echo ""
	@echo "🔧 PM2 Management:"
	@echo "  make pm2-status       Show PM2 processes"
	@echo "  make pm2-logs         Stream PM2 logs"
	@echo "  make pm2-monit        Open PM2 monitor"
	@echo "  make pm2-restart      Restart with PM2"
	@echo "  make pm2-reload       Zero-downtime reload"
	@echo "  make pm2-startup      Configure auto-startup"
	@echo "  make pm2-save         Save PM2 process list"
	@echo ""
	@echo "💾 Database Management:"
	@echo "  make backup           Create database backup"
	@echo "  make restore          Restore from latest backup"
	@echo "  make backup-list      List all available backups"
	@echo ""
	@echo "🧪 Development & Testing:"
	@echo "  make test             Run tests"
	@echo "  make lint             Run linter"
	@echo "  make format           Format code"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean            Clean temporary files and logs"
	@echo "  make clean-all        Deep clean (includes node_modules)"
	@echo "  make update           Update dependencies"
	@echo "  make deploy           Backup + update + restart"
	@echo "  make reset            Complete reset (DANGEROUS!)"
	@echo ""
	@echo "🔧 Utilities:"
	@echo "  make port-check       Check what's on configured port"
	@echo "  make kill-port        Kill process on configured port"
	@echo "  make open             Open app in browser"
	@echo "  make env              Show environment config"
	@echo "  make info             Show project info"
	@echo ""
	@echo "ℹ️  Server runs on port 9344 (configured in .env)"
	@echo ""

# ==============================================================================
# Setup & Installation
# ==============================================================================

install:
	@echo "📦 Installing dependencies..."
	npm install
	@echo "✅ Dependencies installed"

setup: install
	@echo "🔧 Setting up project..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ Created .env file from .env.example"; \
		echo "⚠️  Please edit .env and update the values!"; \
	else \
		echo "⚠️  .env already exists, skipping..."; \
	fi
	@mkdir -p logs backups
	@echo "✅ Created logs and backups directories"
	@echo "✅ Setup complete! Run 'make start' to begin."

# ==============================================================================
# Server Management (PM2)
# ==============================================================================

start:
	@echo "🚀 Starting PagaaierTools server..."
	@if command -v pm2 > /dev/null; then \
		pm2 start server.js --name webportaal_pagaaierTools --time; \
		pm2 save; \
		echo "✅ Server started with PM2"; \
	else \
		echo "⚠️  PM2 not found, starting with Node directly..."; \
		echo "   Install PM2 globally: npm install -g pm2"; \
		nohup node server.js > logs/server.log 2>&1 & \
		echo $$! > .server.pid; \
		echo "✅ Server started (PID: $$(cat .server.pid))"; \
	fi
	@echo ""
	@echo "🌐 Application running on:"
	@echo "   http://localhost:$$(grep -E '^PORT=' .env | cut -d '=' -f2 || echo 9344)"
	@echo "   http://pagaaier.school (via nginx)"

stop:
	@echo "🛑 Stopping PagaaierTools server..."
	@if command -v pm2 > /dev/null && pm2 list | grep -q webportaal_pagaaierTools; then \
		pm2 stop webportaal_pagaaierTools; \
		pm2 delete webportaal_pagaaierTools; \
		pm2 save --force; \
		echo "✅ Server stopped (PM2)"; \
	elif [ -f .server.pid ]; then \
		kill $$(cat .server.pid) 2>/dev/null || true; \
		rm -f .server.pid; \
		echo "✅ Server stopped"; \
	else \
		pkill -f "node server.js" || echo "⚠️  No server process found"; \
	fi

restart: stop start
	@echo "✅ Server restarted"

status:
	@echo "📊 Server Status:"
	@echo ""
	@# Check PM2
	@if command -v pm2 >/dev/null 2>&1; then \
		if pm2 list 2>/dev/null | grep -q webportaal_pagaaierTools 2>/dev/null; then \
			echo "🟢 Running with PM2:"; \
			pm2 list | grep webportaal_pagaaierTools || true; \
		fi; \
	fi
	@# Check PID file
	@if [ -f .server.pid ]; then \
		if ps -p `cat .server.pid` >/dev/null 2>&1; then \
			echo "🟢 Running (PID: `cat .server.pid`)"; \
			ps -p `cat .server.pid` -o pid,%cpu,%mem,etime,cmd --no-headers 2>/dev/null || true; \
		else \
			echo "🔴 Not running (stale PID file)"; \
			rm -f .server.pid; \
		fi; \
	fi
	@# Check by process name
	@NODE_PID=`pgrep -f "node.*server.js" | head -1`; \
	if [ -n "$$NODE_PID" ]; then \
		echo "🟢 Node server found (PID: $$NODE_PID)"; \
		ps -p $$NODE_PID -o pid,%cpu,%mem,etime,cmd --no-headers 2>/dev/null || true; \
	else \
		if [ ! -f .server.pid ]; then \
			echo "🔴 Server is not running"; \
		fi; \
	fi
	@echo ""
	@# Check port
	@PORT=`grep -E '^PORT=' .env 2>/dev/null | cut -d '=' -f2 || echo 9344`; \
	echo "🔌 Port $$PORT:"; \
	if lsof -i :$$PORT >/dev/null 2>&1; then \
		echo "🟢 In use"; \
		lsof -i :$$PORT 2>/dev/null | tail -n +2 || true; \
	else \
		echo "🔴 Not in use"; \
	fi

# ==============================================================================
# Development Mode
# ==============================================================================

dev:
	@echo "🔧 Starting in development mode..."
	@if command -v nodemon > /dev/null; then \
		nodemon server.js; \
	else \
		echo "⚠️  nodemon not found, installing..."; \
		npm install -g nodemon; \
		nodemon server.js; \
	fi

# ==============================================================================
# Monitoring & Logs
# ==============================================================================

logs:
	@echo "📜 Recent logs:"
	@echo ""
	@if command -v pm2 > /dev/null && pm2 list | grep -q webportaal_pagaaierTools; then \
		pm2 logs webportaal_pagaaierTools --lines 50 --nostream; \
	elif [ -f logs/server.log ]; then \
		tail -n 50 logs/server.log; \
	else \
		echo "⚠️  No log file found"; \
	fi

logs-follow:
	@echo "📜 Following logs (Ctrl+C to stop)..."
	@echo ""
	@if command -v pm2 > /dev/null && pm2 list | grep -q webportaal_pagaaierTools; then \
		pm2 logs webportaal_pagaaierTools; \
	elif [ -f logs/server.log ]; then \
		tail -f logs/server.log; \
	else \
		echo "⚠️  No log file found"; \
	fi

health:
	@echo "🏥 Checking application health..."
	@PORT=$$(grep -E '^PORT=' .env | cut -d '=' -f2 || echo 9344); \
	if curl -s -f http://localhost:$$PORT/health > /dev/null 2>&1; then \
		echo "✅ Application is healthy"; \
		curl -s http://localhost:$$PORT/health | json_pp 2>/dev/null || curl -s http://localhost:$$PORT/health; \
	else \
		echo "❌ Application health check failed"; \
		exit 1; \
	fi

ps:
	@echo "🔍 Node processes:"
	@echo ""
	@ps aux | grep -E "(node|PID)" | grep -v grep || echo "No Node processes found"

# ==============================================================================
# Database Management
# ==============================================================================

backup:
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	@TIMESTAMP=$$(date +%Y-%m-%d_%H-%M-%S); \
	cp portaal.db backups/portaal_$$TIMESTAMP.db 2>/dev/null || echo "⚠️  Database file not found"; \
	echo "✅ Backup created: backups/portaal_$$TIMESTAMP.db"
	@echo ""
	@echo "📦 Keeping last 7 backups..."
	@cd backups && ls -t portaal_*.db 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
	@echo "✅ Old backups cleaned"

restore:
	@echo "💾 Available backups:"
	@ls -lht backups/portaal_*.db 2>/dev/null | head -n 5 || echo "No backups found"
	@echo ""
	@LATEST=$$(ls -t backups/portaal_*.db 2>/dev/null | head -n 1); \
	if [ -n "$$LATEST" ]; then \
		echo "❓ Restore from: $$LATEST? (y/N)"; \
		read -r confirm; \
		if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
			cp portaal.db portaal.db.before-restore 2>/dev/null || true; \
			cp $$LATEST portaal.db; \
			echo "✅ Database restored from $$LATEST"; \
			echo "   Previous database saved as portaal.db.before-restore"; \
		else \
			echo "❌ Restore cancelled"; \
		fi \
	else \
		echo "❌ No backups available"; \
	fi

backup-list:
	@echo "💾 Available backups:"
	@ls -lht backups/portaal_*.db 2>/dev/null || echo "No backups found"

# ==============================================================================
# Development & Testing
# ==============================================================================

test:
	@echo "🧪 Running tests..."
	@if grep -q '"test":' package.json; then \
		npm test; \
	else \
		echo "⚠️  No tests configured in package.json"; \
		echo "   Add a test script to package.json"; \
	fi

lint:
	@echo "🔍 Running linter..."
	@if command -v eslint > /dev/null; then \
		eslint *.js; \
	else \
		echo "⚠️  ESLint not installed"; \
		echo "   Install: npm install -g eslint"; \
	fi

format:
	@echo "✨ Formatting code..."
	@if command -v prettier > /dev/null; then \
		prettier --write "**/*.{js,json,md}"; \
	else \
		echo "⚠️  Prettier not installed"; \
		echo "   Install: npm install -g prettier"; \
	fi

# ==============================================================================
# Maintenance & Cleanup
# ==============================================================================

clean:
	@echo "🧹 Cleaning temporary files..."
	@rm -rf logs/*.log
	@rm -f .server.pid
	@rm -f portaal.db-journal
	@rm -f npm-debug.log*
	@echo "✅ Cleanup complete"

clean-all: clean
	@echo "🧹 Deep cleaning..."
	@rm -rf node_modules
	@rm -f package-lock.json
	@echo "✅ Deep cleanup complete"
	@echo "   Run 'make install' to reinstall dependencies"

update:
	@echo "📦 Updating dependencies..."
	@npm update
	@echo "✅ Dependencies updated"
	@echo ""
	@echo "📊 Checking for outdated packages:"
	@npm outdated || echo "All packages up to date"

# ==============================================================================
# Production Deployment
# ==============================================================================

prod: backup stop
	@echo "🚀 Deploying to production..."
	@git pull origin main || git pull origin master || echo "⚠️  Git pull failed"
	@npm install --production
	@make start
	@echo "✅ Production deployment complete"

# ==============================================================================
# Quick Actions
# ==============================================================================

# Show what's running on configured port
port-check:
	@PORT=$$(grep -E '^PORT=' .env | cut -d '=' -f2 || echo 9344); \
	echo "🔍 Checking port $$PORT..."; \
	lsof -i :$$PORT || echo "Nothing running on port $$PORT"

# Open application in browser
open:
	@PORT=$$(grep -E '^PORT=' .env | cut -d '=' -f2 || echo 9344); \
	xdg-open http://localhost:$$PORT 2>/dev/null || \
	open http://localhost:$$PORT 2>/dev/null || \
	echo "🌐 Open http://localhost:$$PORT in your browser"

# Show environment configuration
env:
	@echo "⚙️  Environment Configuration:"
	@echo ""
	@cat .env 2>/dev/null | grep -v "PASSWORD" | grep -v "SECRET" || echo ".env file not found"

# Quick info
info:
	@echo "ℹ️  PagaaierTools Information:"
	@echo ""
	@echo "Project:      webportaal_pagaaierTools"
	@echo "Node version: $$(node --version 2>/dev/null || echo 'not installed')"
	@echo "NPM version:  $$(npm --version 2>/dev/null || echo 'not installed')"
	@echo "Main port:    $$(grep -E '^PORT=' .env 2>/dev/null | cut -d '=' -f2 || echo '9344 (default)')"
	@echo ""
	@echo "📁 Directories:"
	@echo "  Database:  portaal.db"
	@echo "  Backups:   ./backups"
	@echo "  Logs:      ./logs"
	@echo ""
	@echo "🔗 URLs:"
	@echo "  Local:     http://localhost:$$(grep -E '^PORT=' .env 2>/dev/null | cut -d '=' -f2 || echo 9344)"
	@echo "  Production: http://pagaaier.school"
	@echo "  Admin:     http://pagaaier.school/admin"

# ==============================================================================
# PM2 Advanced Management
# ==============================================================================

pm2-status:
	@echo "📊 PM2 Process Status:"
	@pm2 list

pm2-logs:
	@echo "📋 PM2 Logs (streaming):"
	@pm2 logs webportaal_pagaaierTools

pm2-monit:
	@echo "📈 Opening PM2 Monitor..."
	@pm2 monit

pm2-restart:
	@echo "🔄 Restarting with PM2..."
	@pm2 restart webportaal_pagaaierTools || make start

pm2-reload:
	@echo "🔄 Reloading (zero-downtime)..."
	@pm2 reload webportaal_pagaaierTools

pm2-startup:
	@echo "⚙️  Configuring PM2 startup..."
	@pm2 startup
	@echo ""
	@echo "⚠️  Run the command shown above, then:"
	@echo "   make pm2-save"

pm2-save:
	@echo "💾 Saving PM2 process list..."
	@pm2 save

# ==============================================================================
# Development Helpers
# ==============================================================================

tail:
	@echo "📜 Tailing logs..."
	@tail -f logs/server.log 2>/dev/null || echo "No logs found. Server not running or using PM2."

watch:
	@echo "👀 Watching server logs..."
	@if command -v pm2 > /dev/null && pm2 list | grep -q webportaal_pagaaierTools; then \
		pm2 logs webportaal_pagaaierTools --lines 50; \
	else \
		tail -f logs/server.log; \
	fi

kill-port:
	@echo "⚠️  Killing processes on configured port..."
	@PORT=$$(grep -E '^PORT=' .env 2>/dev/null | cut -d '=' -f2 || echo 9344); \
	echo "Killing processes on port $$PORT..."; \
	lsof -ti:$$PORT | xargs kill -9 2>/dev/null || echo "No processes found on port $$PORT"
	@echo "✅ Done"

# Quick deploy with backup
deploy: backup stop install start
	@echo "🚀 Deployment complete!"
	@sleep 2
	@make status

# Complete reset (dangerous!)
reset: clean-all
	@echo "⚠️  WARNING: This will remove the database!"
	@echo "❓ Are you sure? Type 'yes' to continue:"
	@read confirm; \
	if [ "$$confirm" = "yes" ]; then \
		rm -f portaal.db portaal.db.before-restore; \
		echo "✅ Database removed"; \
		echo "   Run 'make setup && make start' to reinitialize"; \
	else \
		echo "❌ Reset cancelled"; \
	fi
