You are performing a cleanup audit of recent work on a dedicated branch.

## Scope
$ARGUMENTS (default: "recent" - last 10 commits + uncommitted changes)

Options:
- "recent" (default) - Last 10 commits + uncommitted
- "all" - Full repository scan
- "docs" - Documentation only
- "since <date>" - Custom time range

## Steps

### 1. Create Cleanup Branch

```bash
git checkout -b cleanup/$(date +%Y%m%d-%H%M%S)
```

This branch provides automatic safety - all changes are isolated. Don't like the results? Just `git checkout main` and delete the branch.

### 2. Discovery Phase

Run these commands to understand recent work:

```bash
git log --oneline -10
git status
find . -type f -mtime -7 2>/dev/null | head -20
ls -la docs/
ls -la app/*.md 2>/dev/null || echo "✓ No prohibited .md files in /app/"
```

### 3. Identify Cleanup Candidates

Scan for these categories:

**HIGH PRIORITY - Prohibited Items**:
- `.md` files in `/app/` directory (PROHIBITED by project policy)
- Files matching gitignore patterns that are still tracked
- Obvious temp files in root (`temp-*`, `debug-*`, `test-*.log`)

**Completed Work Artifacts**:
- Phase reports (patterns: `*phase*`, `*Phase-*-Implementation*`, `*Phase-*-Summary*`)
- Validation reports in docs/ (check if work merged to main)
- Old PR summaries and implementation docs
- Files named like `*-validation.md`, `*-report.md` in project root

**Duplicates**:
- Files with very similar names (e.g., `guide.md` and `guide-copy.md`)
- Multiple validation reports for same feature
- Redundant test fixtures or mock data files

**Stale Artifacts**:
- Test results older than 30 days (`test-results/*.json`, `app/test-results/*.json`)
- Superseded performance reports
- Old migration scripts (if confirmed migrations are stable)
- Backup files (`*.bak`, `*.backup`, `*~`)

**Documentation Organization**:
- Docs in root or wrong locations (should be in `/docs/{technical,clinical,security,brand-legal}/`)
- Implementation guides that should be in `/docs/technical/`
- Misplaced architecture docs

**Code/Build Artifacts** (if not gitignored):
- `.DS_Store` files
- Log files (`*.log`, `npm-debug.log`)
- Build artifacts accidentally tracked
- Old screenshots or test recordings

### 4. Reference Check

For each file identified for deletion, quickly check if it's still referenced:

```bash
# Check code references
rg -l "filename-without-extension" --type-not md 2>/dev/null

# Check documentation references
rg "filename" docs/ 2>/dev/null

# Check README references
rg "filename" README.md 2>/dev/null
```

**Rule**: If references found → Move to "Needs Manual Review" category, don't auto-delete

### 5. Domain Agent Validation

**CRITICAL**: For domain-specific content, you MUST consult appropriate agents:

| Content Pattern | Agent | Level | Action |
|-----------------|-------|-------|--------|
| PHQ/GAD scoring, crisis detection, 988, safety protocols | crisis | L3-Complex | REQUIRED |
| HIPAA, encryption, privacy, consent, data storage | compliance | L3-Complex | REQUIRED |
| MBCT content, therapeutic language, clinical assessment | clinician | L2-Standard | REQUIRED |
| Security patterns, auth, encryption implementation | security | L2-Standard | RECOMMENDED |

**How to validate**:
- Use the Task tool to invoke the appropriate agent
- Provide file path and context about why it's being considered for deletion
- **If agent rejects or raises concerns → DO NOT DELETE that file**
- Document agent approval in commit message

**Agent Handoff Format**:
```
I'm performing a cleanup and found [file] that appears to be [reason for deletion].

File context: [brief description of content]
Appears to be: [completed work / duplicate / stale artifact]
Last modified: [date]

Question: Is this safe to delete from a [clinical/compliance/crisis] perspective?
Are there any [safety/regulatory/therapeutic] concerns?
```

### 6. Present Preview

Before making ANY changes, show the user:

```
## 🧹 Cleanup Preview

Branch: cleanup/[timestamp]
Scope: $ARGUMENTS

### 📋 Summary
- [X] files to delete
- [Y] files to move
- [Z] files need manual review

### 🚨 Prohibited Items (Auto-delete)
- app/some-doc.md - Violates /app/*.md policy

### ✅ Completed Work Artifacts
- docs/Phase-2A-Implementation-Summary.md - Feature merged [date]
- docs/validation-report-old.md - Superseded by newer report

### 📋 Duplicates
- docs/guide-copy.md - Duplicate of docs/technical/guide.md

### 📁 Files to Move
- implementation-guide.md → docs/technical/implementation-guide.md
- architecture-notes.md → docs/technical/architecture-notes.md

### 🔍 Domain Validation
- [file] - ✅ Approved by [agent]
- [file] - ⚠️ Needs manual review (agent raised concerns)

### ⏸️ Skipped (Active References)
- [file] - Referenced in [locations]

**Proceed with cleanup?** (y/n)
```

Wait for user confirmation before proceeding.

### 7. Execute Cleanup

After user confirms:

```bash
# Delete approved files
git rm [file1] [file2] [file3]

# Move misplaced docs
git mv [source] [dest]

# Add any new locations
git add .

# Commit with detailed message
git commit -m "chore: cleanup artifacts from [scope]

Removed:
- [list of deleted files with brief reason]

Moved:
- [source] → [dest]

Domain validation:
- [agent]: approved [file] deletion
- [agent]: approved [file] deletion

Skipped (active references):
- [files that were skipped]

Scope: [recent/all/docs/since date]
Branch: cleanup/[timestamp]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
"
```

### 8. Present Results & Next Steps

```
## ✅ Cleanup Complete

Branch: cleanup/[timestamp]
Commit: [hash]

### Changes Made
- Deleted [X] files
- Moved [Y] files
- Preserved [Z] files (active references)
- Consulted [agents] for validation

### Review Changes

```bash
# See what changed
git diff main...HEAD

# See commit details
git show HEAD

# Verify tests still pass
npm test
```

### Decision Time

**If satisfied with cleanup**:
```bash
git checkout main
git merge cleanup/[timestamp]
git branch -d cleanup/[timestamp]
```

**If you want to discard changes**:
```bash
git checkout main
git branch -D cleanup/[timestamp]  # Deletes branch and all changes
```

**If you want to refine**:
```bash
# Stay on cleanup branch and make adjustments
git add .
git commit --amend
```

---

**Pro tip**: Run `npm test` on the cleanup branch before merging to catch any broken references.
```

## Project-Specific Rules (Being. MBCT)

**PROHIBITED** (delete on sight):
- `/app/*.md` files (project policy violation)
- Phase reports after merge to main
- Duplicate validation docs

**DOMAIN TRIGGERS** (MUST consult agents):
- Any file containing: PHQ-9, GAD-7, crisis, 988, suicide, intervention → **crisis agent**
- Any file containing: HIPAA, encryption, privacy, AsyncStorage, secure → **compliance agent**
- Any file containing: MBCT, therapeutic, mindfulness, clinical → **clinician agent**
- Any file containing: security patterns, auth, crypto → **security agent**

**VERIFY NECESSITY** before moving docs:
1. Check references: `rg "filename"`
2. Check if superseded by newer doc
3. Confirm destination is appropriate category

**DO NOT DELETE**:
- Files in `/docs/clinical/` without clinician approval
- Files in `/docs/security/` without security approval
- Crisis-related docs without crisis agent approval
- Any file with references in active code

## Safety Mechanisms

1. ✅ **Branch isolation** - All changes on cleanup branch, easily discarded
2. ✅ **Domain agent validation** - Required for safety-critical content
3. ✅ **Reference checking** - Prevents breaking active code
4. ✅ **User preview** - See all changes before execution
5. ✅ **User confirmation** - Explicit approval required
6. ✅ **Test verification** - User runs tests before merging
7. ✅ **Standard git workflow** - Review diff, merge or discard

## Recovery

If you merged but want to undo:

```bash
# Undo the merge commit (keeps changes in history)
git reset --hard HEAD~1

# Or revert the merge (adds new commit)
git revert -m 1 HEAD
```

## Notes

- Cleanup branch is automatically dated for easy identification
- All domain agent validations must be documented in commit
- When in doubt, skip deletion and flag for manual review
- Better to be conservative - can always delete later manually
