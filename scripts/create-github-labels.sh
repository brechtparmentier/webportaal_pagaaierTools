#!/bin/bash
# ==============================================================================
# GitHub Labels Creation Script
# ==============================================================================
# Creates all necessary labels for the PagaaierTools project
# ==============================================================================

set -e

echo "🏷️  Creating GitHub Labels..."
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found"
    exit 1
fi

# Priority Labels
echo "📊 Creating priority labels..."
gh label create "priority:high" --description "High priority - security & stability" --color "d73a4a" --force
gh label create "priority:medium" --description "Medium priority - admin UX" --color "fbca04" --force
gh label create "priority:low" --description "Low priority - nice to have" --color "0e8a16" --force

# Type Labels
echo "🏗️  Creating type labels..."
gh label create "enhancement" --description "New feature or request" --color "a2eeef" --force
gh label create "bug" --description "Something isn't working" --color "d73a4a" --force
gh label create "security" --description "Security related" --color "d73a4a" --force
gh label create "performance" --description "Performance improvement" --color "0052cc" --force
gh label create "documentation" --description "Documentation improvements" --color "0075ca" --force

# Category Labels
echo "📁 Creating category labels..."
gh label create "admin-ux" --description "Admin user experience" --color "5319e7" --force
gh label create "ux" --description "End-user experience" --color "bfdadc" --force
gh label create "mobile-ux" --description "Mobile user experience" --color "bfdadc" --force
gh label create "stability" --description "Stability improvements" --color "0052cc" --force
gh label create "technical" --description "Technical improvements" --color "1d76db" --force
gh label create "database" --description "Database related" --color "fef2c0" --force
gh label create "monitoring" --description "Monitoring & observability" --color "0e8a16" --force
gh label create "analytics" --description "Analytics & tracking" --color "c5def5" --force
gh label create "configuration" --description "Configuration changes" --color "ededed" --force

# Status Labels
echo "🚦 Creating status labels..."
gh label create "quick-win" --description "Quick win - high impact, low effort" --color "00ff00" --force
gh label create "dependencies" --description "Pull requests that update dependencies" --color "0366d6" --force
gh label create "automated" --description "Automated process" --color "ededed" --force

echo ""
echo "✅ All labels created successfully!"
echo ""
echo "📋 Created labels:"
gh label list
