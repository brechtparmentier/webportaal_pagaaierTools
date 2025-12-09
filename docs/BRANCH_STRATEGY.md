# 🌿 Git Branch Strategy - PagaaierTools

## 📋 Branch Structure

### Main Branches
- **`main`** - Production-ready code, always deployable
- **`develop`** - Integration branch for features, pre-production testing

### Supporting Branches

#### Feature Branches
**Pattern:** `feature/<issue-number>-<short-description>`  
**Example:** `feature/2-environment-variables`  
**Purpose:** New features and enhancements  
**Base:** `develop`  
**Merge to:** `develop`

#### Fix Branches
**Pattern:** `fix/<issue-number>-<short-description>`  
**Example:** `fix/15-login-validation`  
**Purpose:** Bug fixes  
**Base:** `develop`  
**Merge to:** `develop`

#### Hotfix Branches
**Pattern:** `hotfix/<issue-number>-<short-description>`  
**Example:** `hotfix/42-critical-security-patch`  
**Purpose:** Critical production fixes  
**Base:** `main`  
**Merge to:** `main` AND `develop`

#### Chore Branches
**Pattern:** `chore/<issue-number>-<short-description>`  
**Example:** `chore/10-update-dependencies`  
**Purpose:** Maintenance, documentation, refactoring  
**Base:** `develop`  
**Merge to:** `develop`

---

## 🚀 Workflow

### 1. Starting New Work

```bash
# Update develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/2-environment-variables

# Or for a fix
git checkout -b fix/15-login-validation

# Or for a chore
git checkout -b chore/22-database-indices
```

### 2. During Development

```bash
# Make changes
git add .
git commit -m "feat: implement environment variables

- Add .env file with all secrets
- Install dotenv package
- Update server.js to load env vars
- Create .env.example template

Closes #2"

# Push to remote
git push -u origin feature/2-environment-variables
```

### 3. Creating Pull Request

```bash
# Using GitHub CLI
gh pr create \
  --base develop \
  --title "feat: Implement Environment Variables for Security" \
  --body "Closes #2

## Changes
- Added .env file configuration
- Installed dotenv package
- Moved all secrets to environment variables
- Created .env.example template

## Testing
- [x] Tested with different environment configurations
- [x] Verified secrets are not in code
- [x] Documentation updated"

# Or push and create PR via web interface
git push -u origin feature/2-environment-variables
# Then create PR on GitHub
```

### 4. After PR Approval

```bash
# Merge via GitHub (squash and merge recommended)
# Then delete branch locally
git checkout develop
git pull origin develop
git branch -d feature/2-environment-variables
```

---

## 📝 Commit Message Convention

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation only
- **style:** Formatting, missing semicolons, etc.
- **refactor:** Code restructuring without behavior change
- **perf:** Performance improvements
- **test:** Adding or updating tests
- **chore:** Maintenance tasks, dependency updates

### Examples

```bash
# Feature
git commit -m "feat(auth): add rate limiting to login endpoint

Implement express-rate-limit to prevent brute-force attacks.
Limited to 5 attempts per 15 minutes.

Closes #5"

# Fix
git commit -m "fix(admin): resolve port status display bug

Port status was showing stale data due to missing cache invalidation.

Fixes #28"

# Chore
git commit -m "chore(deps): update dependencies to latest versions

- express 4.18.0 -> 4.18.2
- better-sqlite3 8.5.0 -> 8.7.0

No breaking changes."

# Documentation
git commit -m "docs(readme): add setup instructions for environment variables"
```

---

## 🎯 Branch Mapping to Issues

### High Priority (Security & Stability)
```bash
feature/1-persistent-sessions      # Issue #1
feature/2-environment-variables    # Issue #2
feature/3-database-backups         # Issue #3
feature/4-winston-logging          # Issue #4
feature/5-rate-limiting            # Issue #5
```

### Medium Priority (Admin UX)
```bash
feature/6-admin-port-status        # Issue #6
feature/7-bulk-operations          # Issue #7
feature/8-project-controls         # Issue #8
feature/9-user-management          # Issue #9
feature/10-project-tags            # Issue #10
```

### Low Priority (End User UX)
```bash
feature/11-search-filter           # Issue #11
feature/12-recent-favorites        # Issue #12
feature/13-realtime-updates        # Issue #13
feature/14-project-screenshots     # Issue #14
feature/15-dark-mode               # Issue #15
feature/16-usage-analytics         # Issue #16
feature/17-custom-branding         # Issue #17
feature/18-health-monitoring       # Issue #18
feature/19-qr-codes                # Issue #19
feature/20-markdown-support        # Issue #20
```

### Technical Optimizations
```bash
chore/21-status-caching            # Issue #21
chore/22-database-indices          # Issue #22
chore/23-static-caching            # Issue #23
chore/24-graceful-shutdown         # Issue #24
feature/25-health-endpoint         # Issue #25
```

---

## 🔄 Complete Example Workflow

### Scenario: Implementing Environment Variables (Issue #2)

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/2-environment-variables

# 3. Make changes
npm install dotenv
# Create .env file
# Update server.js
# Create .env.example

# 4. Commit changes
git add .
git commit -m "feat(security): implement environment variables

- Install dotenv package
- Create .env file with SESSION_SECRET, credentials
- Update server.js to load environment variables
- Add .env.example template for documentation
- Update .gitignore to exclude .env files

Closes #2"

# 5. Push to remote
git push -u origin feature/2-environment-variables

# 6. Create pull request
gh pr create \
  --base develop \
  --title "feat: Implement Environment Variables for Security" \
  --assignee "@me" \
  --label "priority:high,security"

# 7. After review and approval, merge via GitHub UI
# 8. Clean up local branch
git checkout develop
git pull origin develop
git branch -d feature/2-environment-variables
```

---

## 🎨 Branch Naming Quick Reference

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<issue>-<desc>` | `feature/6-admin-dashboard` |
| Fix | `fix/<issue>-<desc>` | `fix/12-port-checker-bug` |
| Hotfix | `hotfix/<issue>-<desc>` | `hotfix/99-critical-security` |
| Chore | `chore/<issue>-<desc>` | `chore/21-add-caching` |

---

## ⚠️ Important Rules

1. **Never commit directly to `main`**
2. **Always branch from `develop` (except hotfixes)**
3. **Use issue numbers in branch names**
4. **Keep branches focused** - one issue per branch
5. **Write descriptive commit messages**
6. **Reference issues** in commits and PRs
7. **Delete branches** after merging
8. **Squash commits** when merging to keep history clean
9. **Test locally** before creating PR
10. **Update documentation** in the same PR as code changes

---

## 🚦 Release Process

### When Ready to Deploy

```bash
# 1. Merge develop into main
git checkout main
git pull origin main
git merge develop

# 2. Tag the release
git tag -a v1.1.0 -m "Release v1.1.0

Features:
- Environment variables (#2)
- Database backups (#3)
- Winston logging (#4)
- Rate limiting (#5)

Improvements:
- Admin port status (#6)
- Caching implementation (#21)"

# 3. Push to remote
git push origin main --tags

# 4. Deploy to production
# (Your deployment process here)
```

---

## 📚 Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Semantic Versioning](https://semver.org/)

---

## 🤝 Getting Help

```bash
# View all branches
git branch -a

# View branch history
git log --oneline --graph --all

# Find which branch contains a commit
git branch --contains <commit-hash>

# Sync with remote
git fetch --all --prune

# View current branch status
git status
```
