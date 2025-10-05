# Being MBCT - Bare Repository with Worktrees

**Structure**: Bare repository with multiple worktrees for parallel feature development
**Created**: 2025-10-03
**Repository**: `/Users/max/Development/active/being`

---

## 🏗️ Repository Structure

```
/Users/max/Development/active/being/
├── .git/                              # Bare repository (git database only)
│   ├── refs/
│   ├── objects/
│   ├── worktrees/                     # Worktree metadata
│   │   ├── development/
│   │   ├── main/
│   │   ├── feat-23/
│   │   ├── feat-41/
│   │   └── feat-42/
│   └── HEAD                           # Points to: refs/heads/_bare
│
├── .claude/                           # ⭐ Shared configuration (NOT in git)
│   ├── CLAUDE.md                      # Project-specific instructions
│   ├── agents/                        # Domain agents (crisis, compliance, clinician)
│   ├── commands/                      # Custom slash commands
│   ├── templates/                     # Agent orchestration templates
│   └── settings.local.json            # Local settings
│
├── development/                       # Worktree: development branch
│   ├── .git                          # File → ../.git/worktrees/development
│   ├── .claude/                      # Symlink → /Users/max/Development/active/being/.claude
│   ├── app/                          # Full project source code
│   └── ...
│
├── main/                             # Worktree: main branch
│   ├── .git                          # File → ../.git/worktrees/main
│   ├── .claude/                      # Symlink → /Users/max/Development/active/being/.claude
│   └── ...
│
├── feat-23/                          # Worktree: FEAT-23 branch
├── feat-41/                          # Worktree: FEAT-41 branch
└── feat-42/                          # Worktree: FEAT-42 branch
```

---

## 🎯 Key Concepts

### Bare Repository
- **What**: Git database without working files (just `.git/` directory contents)
- **Purpose**: Serves as central database for multiple worktrees
- **Location**: `/Users/max/Development/active/being/.git/`
- **HEAD**: Points to dummy ref `_bare` (not a real branch) to avoid conflicts

### Worktrees
- **What**: Separate checkouts of different branches, all sharing the same git database
- **How**: Each worktree has a `.git` FILE (not directory) pointing to `../.git/worktrees/[name]/`
- **Benefit**: Work on multiple branches simultaneously without switching
- **Shared**: All worktrees share commits, branches, tags instantly

### Shared Configuration
- **Location**: `being/.claude/` (at bare repo root)
- **Access**: Symlinked into each worktree as `.claude/`
- **Git**: NOT tracked (listed in `.gitignore`)
- **Purpose**: Single source of truth for project configuration, agent definitions, templates

---

## 🚀 Daily Workflow

### Launch Claude Code
```bash
cd ~/being  # or /Users/max/Development/active/being
claude
```
→ All MCP servers load from single configuration
→ Can work with any worktree directory

### Work on Feature Branch
```bash
cd ~/being/feat-23
# Make changes to code
git add .
git commit -m "feat: implement feature"
git push
```

### Switch Between Features (No Branch Switching!)
```bash
cd ~/being/development  # Work on development
cd ~/being/feat-41      # Switch to FEAT-41
# Just cd between directories - no git checkout needed!
```

### Check All Worktrees
```bash
cd ~/being
git worktree list
```

### View Status Across All Worktrees
```bash
cd ~/being
for dir in development main feat-*/; do
  echo "=== $dir ==="
  cd $dir && git status --short && cd ..
done
```

---

## ➕ Adding New Feature Branch

### Create Feature Branch and Worktree
```bash
cd ~/being
git worktree add feat-99 -b feat/FEAT-99-new-feature development
```

### Create .claude/ Symlink
```bash
rm -rf feat-99/.claude
ln -s /Users/max/Development/active/being/.claude feat-99/.claude
```

### Verify Setup
```bash
cd feat-99
git status
ls -la .claude/  # Should show shared config files
```

### Start Working
```bash
cd ~/being/feat-99
# Start developing!
```

---

## 🗑️ Removing Completed Feature

### After Feature is Merged
```bash
cd ~/being
git worktree remove feat-23
# Worktree directory removed, branch still exists
```

### Delete Branch (if no longer needed)
```bash
git branch -d feat/FEAT-23-habit-formation-optimization
# Delete remote branch
git push origin --delete feat/FEAT-23-habit-formation-optimization
```

---

## 🔧 MCP Configuration

### Single Configuration for All Worktrees
- **Location**: `~/.claude.json`
- **Project Path**: `/Users/max/Development/active/being`
- **Git MCP**: Points to `/Users/max/Development/active/being/.git`

### MCP Servers Configured
- **context7**: Library documentation lookup
- **filesystem**: File operations across project
- **brave-search**: Web search capabilities
- **git**: Git operations on bare repository
- **notionApi**: Notion integration for PM

### No Per-Worktree Configuration Needed
All worktrees automatically access MCP servers when launching Claude from `being/` directory.

---

## 📝 Configuration Management

### Global Configuration
- **Location**: `~/.claude/CLAUDE.md`
- **Scope**: All projects
- **Contains**: Global standards, agent capabilities, MCP server usage

### Project Configuration
- **Location**: `being/.claude/CLAUDE.md`
- **Scope**: Being MBCT project only
- **Contains**: Domain agents, clinical standards, testing requirements

### Editing Configuration
```bash
# Edit shared config (affects all worktrees)
code being/.claude/CLAUDE.md

# Changes immediately visible in all worktrees via symlink
cd being/development && cat .claude/CLAUDE.md  # Same content
cd being/feat-23 && cat .claude/CLAUDE.md      # Same content
```

---

## ⚠️ Important Notes

### .claude/ Directory
- ❌ **NOT tracked in git** (listed in `.gitignore`)
- ✅ **Shared via symlinks** from bare repo root
- ✅ **Single source of truth** for all worktrees
- ⚠️ Changes affect ALL worktrees immediately

### Git Operations
- ✅ Commits in any worktree are **instantly visible** in all others
- ✅ Each worktree can be on **different commit** of its branch
- ✅ Can work on **same branch** in different worktrees (different commits)
- ⚠️ Cannot checkout same branch in multiple worktrees at same commit

### HEAD in Bare Repository
- Points to dummy ref: `refs/heads/_bare`
- **Purpose**: Prevents conflicts when creating worktrees
- **DO NOT** change to point to real branch

---

## 🛠️ Troubleshooting

### Issue: Can't create worktree - branch already in use
```bash
# Check which worktree is using the branch
cd ~/being
git worktree list

# Remove the worktree if no longer needed
git worktree remove [worktree-name]
```

### Issue: .claude/ symlink broken
```bash
# Recreate symlink with absolute path
cd ~/being/[worktree-name]
rm -rf .claude
ln -s /Users/max/Development/active/being/.claude .claude
```

### Issue: Git operations fail in worktree
```bash
# Verify you're in a worktree, not bare repo root
pwd
# Should show: /Users/max/Development/active/being/[worktree-name]

# If in bare repo root, cd into a worktree
cd development
```

### Issue: MCP servers not loading
```bash
# Verify MCP config points to bare repo
cat ~/.claude.json | jq '"/Users/max/Development/active/being"'

# Restart Claude Code from bare repo root
cd ~/being
claude
```

### Issue: Changes in .claude/ not visible
```bash
# Verify symlink exists and points correctly
ls -la development/.claude
# Should show: .claude -> /Users/max/Development/active/being/.claude

# Test symlink
cat development/.claude/CLAUDE.md
# Should show project configuration
```

---

## 🔄 Migration History

### Previous Structure
- **Main repo**: `/Users/max/Development/active/fullmind/`
- **Worktrees**: `fullmind-feat-23/`, `fullmind-feat-41/`, `fullmind-feat-42/`
- **MCP**: Required separate entry for each worktree (not scalable)

### Current Structure (Migrated 2025-10-03)
- **Bare repo**: `/Users/max/Development/active/being/`
- **Worktrees**: `being/development/`, `being/main/`, `being/feat-*/`
- **MCP**: Single entry for entire project (scalable)

### Backup
- **Location**: `/Users/max/Development/active/fullmind-backup-20251003-153752.tar.gz`
- **Size**: ~600MB
- **Contains**: Full state before migration

---

## 📚 Additional Resources

### Git Worktrees Documentation
- Official: https://git-scm.com/docs/git-worktree
- Tutorial: https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging

### Bare Repository Reference
- Layout: https://git-scm.com/docs/gitrepository-layout
- Best practices: https://git-scm.com/book/en/v2/Git-on-the-Server-Getting-Git-on-a-Server

### Claude Code MCP
- Documentation: https://docs.claude.com/en/docs/claude-code/mcp
- Server setup: https://docs.claude.com/en/docs/claude-code/mcp-servers

### Detailed Conversion Plan
- **Location**: `/Users/max/dtemp/bare-repo-worktree-conversion-plan.md`
- **Contains**: 8-phase step-by-step conversion process
- **Includes**: Rollback procedures, troubleshooting, verification steps

---

## ✅ Quick Reference

```bash
# Launch Claude
cd ~/being && claude

# List all worktrees
git worktree list

# Create new feature worktree
cd ~/being
git worktree add feat-X -b feat/FEAT-X-description development
ln -s /Users/max/Development/active/being/.claude feat-X/.claude

# Switch between features
cd ~/being/development  # or main, feat-23, feat-41, feat-42

# Remove completed feature
git worktree remove feat-X

# Check status of all worktrees
for dir in development main feat-*/; do echo "=== $dir ===" && cd $dir && git status -s && cd ..; done
```

---

**Questions or Issues?** Refer to the detailed conversion plan at `/Users/max/dtemp/bare-repo-worktree-conversion-plan.md`
