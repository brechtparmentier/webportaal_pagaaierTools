#!/bin/bash
# ==============================================================================
# PagaaierTools - Complete Setup & Initialization Script
# ==============================================================================
# This script automates the complete setup of your GitHub workflow
# ==============================================================================

set -e  # Exit on error

echo "🚀 PagaaierTools - GitHub Workflow Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Git installed"

if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} GitHub CLI not installed. Install from: https://cli.github.com/"
    echo "   Continuing without GitHub integration..."
    GH_AVAILABLE=false
else
    echo -e "${GREEN}✓${NC} GitHub CLI installed"
    GH_AVAILABLE=true
fi

if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Node.js not installed"
else
    echo -e "${GREEN}✓${NC} Node.js installed"
fi

echo ""

# Initialize Git repository
echo "🔧 Initializing Git repository..."
if [ ! -d .git ]; then
    git init
    echo -e "${GREEN}✓${NC} Git repository initialized"
else
    echo -e "${YELLOW}⚠${NC} Git repository already exists"
fi

# Create initial commit if needed
if ! git rev-parse HEAD &> /dev/null; then
    echo "📝 Creating initial commit..."
    git add .
    git commit -m "chore: initial commit with GitHub workflow setup

- Add .gitignore with comprehensive rules
- Add GitHub issue templates
- Add PR template with checklist
- Add branch strategy documentation
- Add Kanban worklist for task tracking
- Add CI/CD workflows (test, deploy, backup)
- Add GitHub issues creation script
- Add complete execution guide"
    echo -e "${GREEN}✓${NC} Initial commit created"
else
    echo -e "${YELLOW}⚠${NC} Repository already has commits"
fi

# Create develop branch
echo "🌿 Setting up branches..."
git checkout -b develop 2>/dev/null || git checkout develop
echo -e "${GREEN}✓${NC} Develop branch ready"

# GitHub setup
if [ "$GH_AVAILABLE" = true ]; then
    echo ""
    echo "🐙 GitHub Setup"
    echo "==============="
    echo ""
    
    # Check if authenticated
    if gh auth status &> /dev/null; then
        echo -e "${GREEN}✓${NC} Authenticated with GitHub"
        
        # Ask if user wants to create repo
        read -p "Create GitHub repository now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Creating repository..."
            gh repo create webportaal_pagaaierTools \
                --public \
                --description "PagaaierTools Web Portal - Project management dashboard" \
                --source=. \
                --remote=origin || echo "Repository might already exist"
            
            # Push branches
            git push -u origin main 2>/dev/null || echo "Main branch already pushed"
            git push -u origin develop 2>/dev/null || echo "Develop branch already pushed"
            echo -e "${GREEN}✓${NC} Repository created and pushed"
        fi
        
        # Ask about creating issues
        echo ""
        read -p "Create all 25 GitHub issues now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            chmod +x scripts/create-github-issues.sh
            bash scripts/create-github-issues.sh
        fi
        
    else
        echo -e "${YELLOW}⚠${NC} Not authenticated with GitHub"
        echo "   Run: gh auth login"
    fi
fi

echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "📁 Created Files:"
echo "   • .gitignore"
echo "   • .github/workflows/ci.yml"
echo "   • .github/workflows/deploy.yml"
echo "   • .github/workflows/dependency-update.yml"
echo "   • .github/workflows/backup.yml"
echo "   • .github/PULL_REQUEST_TEMPLATE.md"
echo "   • .github/ISSUE_TEMPLATE/feature_request.md"
echo "   • docs/BRANCH_STRATEGY.md"
echo "   • docs/WORKLIST.md"
echo "   • docs/EXECUTION_GUIDE.md"
echo "   • scripts/create-github-issues.sh"
echo ""
echo "📚 Next Steps:"
echo "   1. Read: docs/EXECUTION_GUIDE.md"
echo "   2. Create GitHub repo (if not done): gh repo create"
echo "   3. Create issues: bash scripts/create-github-issues.sh"
echo "   4. Start first task: git checkout -b feature/2-environment-variables"
echo ""
echo "🎯 Quick Win Path:"
echo "   Start with issues: #2, #22, #23, #25, #3, #6, #11, #21"
echo ""
echo "📖 Documentation:"
echo "   • Workflow Guide: docs/EXECUTION_GUIDE.md"
echo "   • Branch Strategy: docs/BRANCH_STRATEGY.md"
echo "   • Task Tracking: docs/WORKLIST.md"
echo ""
echo "🚀 Happy coding!"
