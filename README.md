# Being - Bare Repository with Worktrees

**Structure**: Bare repository with worktrees for parallel feature development
**Repository**: `/Users/max/Development/active/being`

---

## 🏗️ Repository Structure

```
/Users/max/Development/active/being/
├── .git/                              # Bare repository (git database only)
│   ├── refs/
│   ├── objects/
│   ├── worktrees/                     # Worktree metadata
│   └── HEAD                           # Points to: refs/heads/_bare
│
├── .claude/                           # ⭐ Shared configuration (NOT in git)
│   ├── CLAUDE.md                      # Project-specific instructions
│   ├── agents/                        # Domain agents
│   │   ├── compliance.md              # HIPAA, privacy, regulatory
│   │   ├── crisis.md                  # Safety protocols, 988
│   │   └── philosopher.md             # Stoic Mindfulness validation
│   ├── commands/                      # Custom slash commands
│   │   ├── b-create.md                # Create work item in Notion
│   │   ├── b-work.md                  # Begin work on item
│   │   ├── b-close.md                 # Close & merge
│   │   ├── b-cleanup.md               # Branch cleanup
│   │   ├── b-crisis.md                # Crisis feature workflow
│   │   └── b-hotfix.md                # Safety bug hotfix
│   ├── templates/                     # Agent orchestration templates
│   └── settings.local.json            # Local settings
│
├── development/                       # Worktree: development branch
│   ├── .git                          # File → ../.git/worktrees/development
│   ├── .claude/                      # Symlink → shared .claude/
│   └── app/                          # Full project source code
│
├── main/                             # Worktree: main branch
│   ├── .git                          # File → ../.git/worktrees/main
│   └── .claude/                      # Symlink → shared .claude/
│
└── feat-*/                           # Feature worktrees (created as needed)
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
cd ~/being/feat-X
# Make changes to code
git add .
git commit -m "feat: implement feature"
git push
```

### Switch Between Branches (No git checkout!)
```bash
cd ~/being/development  # Work on development
cd ~/being/main         # Switch to main
cd ~/being/feat-X       # Switch to feature
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
for dir in development main; do
  echo "=== $dir ===" && (cd $dir && git status --short)
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
git worktree remove feat-X
# Worktree directory removed, branch still exists
```

### Delete Branch (if no longer needed)
```bash
git branch -d feat/FEAT-X-description
# Delete remote branch
git push origin --delete feat/FEAT-X-description
```

---

## 🔧 MCP Configuration

### Single Configuration for All Worktrees
- **Project Path**: `/Users/max/Development/active/being`
- **Git MCP**: Points to `/Users/max/Development/active/being/.git`

### MCP Servers Configured
- **context7**: Library documentation lookup
- **filesystem**: File operations across project
- **git**: Git operations on bare repository
- **notionApi**: Notion integration for PM

### No Per-Worktree Configuration Needed
All worktrees share MCP servers when launching Claude from `being/` directory.

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

## 📚 Additional Resources

### Git Worktrees Documentation
- Official: https://git-scm.com/docs/git-worktree
- Layout: https://git-scm.com/docs/gitrepository-layout

### Claude Code
- Documentation: https://docs.anthropic.com/en/docs/claude-code
- MCP Servers: https://docs.anthropic.com/en/docs/claude-code/mcp-servers

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

# Switch between branches
cd ~/being/development  # or main, feat-X

# Remove completed feature
git worktree remove feat-X
```


## 🔗 Related Repositories

- **Website**: [being-website](https://github.com/MP2EZ/being-website) - Marketing website for Being app (Next.js, Cloudflare Pages)
