# Git Version Control Guide for SyntraBI

## Table of Contents
1. [Initial GitHub Repository Setup](#initial-github-repository-setup)
2. [Daily Development Workflow](#daily-development-workflow)
3. [Working with Claude Code](#working-with-claude-code)
4. [Version Tagging and Releases](#version-tagging-and-releases)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Initial GitHub Repository Setup

### Step 1: Create GitHub Repository

1. Go to https://github.com and log in
2. Click the "+" icon in the top-right corner
3. Select "New repository"
4. Fill in the details:
   - **Repository name**: `syntrabi` (or your preferred name)
   - **Description**: "SyntraBI - Open-source Business Intelligence platform with report designer and analytics"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

### Step 2: Connect Local Repository to GitHub

```bash
# View current git status
git status

# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/syntrabi.git

# Verify the remote was added
git remote -v

# Push your existing commits to GitHub
git push -u origin master
```

### Step 3: Verify Upload

1. Refresh your GitHub repository page
2. You should see all your files and commit history
3. Verify the three commits are visible:
   - Initial commit: Complete SyntraBI implementation
   - Major functionality implementation
   - Documentation update

---

## Daily Development Workflow

### Before Starting Work

```bash
# 1. Check current status
git status

# 2. Pull latest changes from GitHub (if working in a team)
git pull origin master

# 3. Create a new branch for your feature (optional but recommended)
git checkout -b feature/your-feature-name
# Example: git checkout -b feature/add-export-functionality
```

### During Development

```bash
# Check what files have changed
git status

# View detailed changes in files
git diff

# View changes for a specific file
git diff backend/app/routes/workspaces.py
```

### Committing Changes

#### Option A: Commit All Changes

```bash
# Stage all modified and new files
git add .

# Create a commit with a descriptive message
git commit -m "Add export functionality for reports

- Implemented PDF export using ReportLab
- Added Excel export support
- Created new export_service.py
- Updated frontend to include export buttons

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Option B: Commit Specific Files

```bash
# Stage specific files
git add backend/app/routes/exports.py
git add frontend/src/components/designer/ExportMenu.tsx

# Commit only staged files
git commit -m "Add export menu component"
```

### Pushing to GitHub

```bash
# If working on master branch
git push origin master

# If working on a feature branch
git push origin feature/your-feature-name
```

---

## Working with Claude Code

### When Claude Code Makes Changes

Claude Code will typically:
1. Make changes to files using Edit/Write tools
2. Suggest creating a commit when work is complete

**Your workflow after Claude makes changes:**

```bash
# 1. Review what Claude changed
git status
git diff

# 2. If you're satisfied with the changes, stage them
git add .

# 3. Commit with descriptive message
git commit -m "Implement data refresh functionality

- Added automatic refresh intervals
- Created refresh service in backend
- Updated UI with refresh button
- Fixed cache invalidation issues

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. Push to GitHub
git push origin master
```

### Claude Code Git Workflow Best Practices

1. **Let Claude help with commits**: You can ask Claude to create commits by saying:
   - "Please commit these changes with an appropriate message"
   - "Create a commit for the authentication feature we just built"

2. **Review before committing**: Always run `git diff` to review changes

3. **Atomic commits**: Commit related changes together
   - ✅ Good: "Add user authentication with login/logout"
   - ❌ Bad: "Fixed stuff and added features"

4. **Don't commit sensitive data**:
   - Never commit `.env` files
   - Never commit credentials or API keys
   - Never commit `node_modules` or `__pycache__`

---

## Version Tagging and Releases

### Semantic Versioning

Use the format: `vMAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (v1.0.0 → v2.0.0)
- **MINOR**: New features, backward compatible (v1.0.0 → v1.1.0)
- **PATCH**: Bug fixes (v1.0.0 → v1.0.1)

### Creating a Version Tag

```bash
# 1. Ensure all changes are committed
git status

# 2. Create an annotated tag
git tag -a v1.0.0 -m "Release version 1.0.0

Major features:
- Complete report designer with drag-drop
- Data source connectivity (PostgreSQL, MySQL, CSV)
- Multiple visualization types
- User workspace management
- Authentication and permissions
- Export to PDF and Excel"

# 3. Push the tag to GitHub
git push origin v1.0.0

# 4. Push all tags
git push origin --tags
```

### Creating a GitHub Release

1. Go to your repository on GitHub
2. Click on "Releases" (right sidebar)
3. Click "Create a new release"
4. Fill in:
   - **Tag version**: v1.0.0
   - **Release title**: "Version 1.0.0 - Initial Production Release"
   - **Description**: Copy from CHANGELOG.md or write summary
   - **Attach binaries** (optional): ZIP files, documentation
5. Click "Publish release"

### Version Workflow Example

```bash
# After completing a set of features for version 1.1.0

# 1. Update version numbers in code
# Edit: backend/app/core/config.py
# Edit: frontend/package.json
# Edit: CHANGELOG.md

# 2. Commit version bump
git add .
git commit -m "Bump version to 1.1.0"

# 3. Create and push tag
git tag -a v1.1.0 -m "Release version 1.1.0 - Added real-time collaboration"
git push origin master
git push origin v1.1.0

# 4. Create GitHub release (via web interface)
```

---

## Best Practices

### Commit Message Guidelines

**Good commit messages:**
```
Add real-time collaboration feature

- Implemented WebSocket connections
- Added user presence indicators
- Created conflict resolution for simultaneous edits
- Updated frontend with live cursors

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Structure:**
1. **Subject line**: Brief summary (50 chars or less)
2. **Blank line**
3. **Body**: Detailed explanation with bullet points
4. **Blank line**
5. **Co-author attribution** (when using Claude Code)

### Branching Strategy

#### Simple Workflow (Solo Developer)
```bash
# Work directly on master
git checkout master
# make changes
git add .
git commit -m "message"
git push origin master
```

#### Feature Branch Workflow (Recommended)
```bash
# Create feature branch
git checkout -b feature/new-visualization-types

# Work on feature
# make changes
git add .
git commit -m "Add new chart types"

# Push feature branch
git push origin feature/new-visualization-types

# Merge to master when ready
git checkout master
git merge feature/new-visualization-types
git push origin master

# Delete feature branch
git branch -d feature/new-visualization-types
git push origin --delete feature/new-visualization-types
```

### What to Commit

**DO commit:**
- Source code files (`.py`, `.tsx`, `.ts`, `.css`, etc.)
- Configuration files (`package.json`, `requirements.txt`, `docker-compose.yml`)
- Documentation (`.md` files)
- Database schemas (`.sql` migration files)
- `.gitignore` file

**DON'T commit:**
- Dependencies (`node_modules/`, `__pycache__/`, `venv/`)
- Environment files (`.env`, `.env.local`)
- Build artifacts (`dist/`, `build/`, `*.pyc`)
- IDE settings (`.vscode/`, `.idea/`)
- Log files (`*.log`)
- Database files (`*.db`, `*.sqlite`)
- Temporary files

### .gitignore File

Ensure your `.gitignore` includes:

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
*.egg-info/

# Node
node_modules/
npm-debug.log*
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Database
*.db
*.sqlite
*.sqlite3

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db
```

---

## Troubleshooting

### Problem: Merge Conflicts

```bash
# When pulling changes causes conflicts
git pull origin master
# CONFLICT (content): Merge conflict in file.py

# 1. Open the conflicting file and look for:
<<<<<<< HEAD
Your changes
=======
Incoming changes
>>>>>>> branch-name

# 2. Manually resolve conflicts (choose what to keep)

# 3. Mark as resolved
git add file.py

# 4. Complete the merge
git commit -m "Resolve merge conflict in file.py"
```

### Problem: Accidentally Committed Wrong Files

```bash
# Remove file from staging (before commit)
git reset HEAD unwanted-file.txt

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) - CAREFUL!
git reset --hard HEAD~1
```

### Problem: Need to Undo Changes

```bash
# Discard changes in working directory (before commit)
git checkout -- filename.py

# Discard all uncommitted changes - CAREFUL!
git reset --hard HEAD

# Revert a specific commit (creates new commit)
git revert <commit-hash>
```

### Problem: Want to See History

```bash
# View commit history
git log

# View condensed history
git log --oneline

# View history with graph
git log --graph --oneline --all

# View changes in a specific commit
git show <commit-hash>
```

### Problem: Need to Update Remote URL

```bash
# View current remote
git remote -v

# Change remote URL
git remote set-url origin https://github.com/NEW_USERNAME/new-repo.git

# Verify change
git remote -v
```

---

## Quick Reference Commands

### Daily Commands
```bash
git status                          # Check current status
git add .                           # Stage all changes
git add file.py                     # Stage specific file
git commit -m "message"             # Commit with message
git push origin master              # Push to GitHub
git pull origin master              # Pull from GitHub
git diff                            # View changes
git log --oneline                   # View history
```

### Branch Commands
```bash
git branch                          # List branches
git checkout -b new-branch          # Create and switch to branch
git checkout master                 # Switch to master
git merge feature-branch            # Merge branch into current
git branch -d branch-name           # Delete local branch
```

### Tag Commands
```bash
git tag                             # List tags
git tag -a v1.0.0 -m "message"     # Create annotated tag
git push origin v1.0.0             # Push specific tag
git push origin --tags             # Push all tags
git tag -d v1.0.0                  # Delete local tag
```

---

## Workflow Summary

### Standard Development Cycle

1. **Start work**: `git pull origin master`
2. **Make changes**: Edit files using Claude Code or manually
3. **Check status**: `git status` and `git diff`
4. **Stage changes**: `git add .`
5. **Commit**: `git commit -m "descriptive message"`
6. **Push**: `git push origin master`
7. **Repeat**: Go back to step 2

### Release Cycle

1. **Complete features**: Ensure all changes committed
2. **Update version files**: Bump version numbers
3. **Update CHANGELOG.md**: Document changes
4. **Commit version bump**: `git commit -m "Bump version to X.Y.Z"`
5. **Create tag**: `git tag -a vX.Y.Z -m "Release X.Y.Z"`
6. **Push**: `git push origin master && git push origin --tags`
7. **Create GitHub release**: Via web interface

---

## Additional Resources

- **Git Documentation**: https://git-scm.com/doc
- **GitHub Guides**: https://guides.github.com/
- **Semantic Versioning**: https://semver.org/
- **Conventional Commits**: https://www.conventionalcommits.org/

---

*Document Version: 1.0*
*Last Updated: 2025-10-27*
