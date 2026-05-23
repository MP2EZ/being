#!/bin/bash
# MAINT-122: Validate .gitignore security patterns are working
# Run from the development worktree or app directory

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Security Pattern Validation (MAINT-122)"
echo "=========================================="
echo ""

# Test files that SHOULD be ignored
TEST_PATTERNS=(
    ".env.local"
    "credentials.json"
    "secrets.yaml"
    "test.secret"
    "id_rsa"
    "id_ed25519"
    "cert.pfx"
    "service-account.json"
    "my-credentials.json"
    "app-service-key.json"
)

# Test files that should NOT be ignored (allowed exceptions)
ALLOWED_PATTERNS=(
    ".env.example"
    ".env.production"
    "credentials.example.json"
    "secrets.example.yaml"
)

FAILED=0

echo "Testing patterns that SHOULD be ignored:"
echo "-----------------------------------------"
for pattern in "${TEST_PATTERNS[@]}"; do
    # Create temp file path
    test_path="$pattern"

    if git check-ignore -q "$test_path" 2>/dev/null; then
        echo -e "  ${GREEN}PASS${NC}: $test_path (ignored)"
    else
        echo -e "  ${RED}FAIL${NC}: $test_path (NOT ignored - security risk!)"
        FAILED=1
    fi
done

echo ""
echo "Testing patterns that should NOT be ignored (exceptions):"
echo "----------------------------------------------------------"
for pattern in "${ALLOWED_PATTERNS[@]}"; do
    if git check-ignore -q "$pattern" 2>/dev/null; then
        echo -e "  ${YELLOW}WARN${NC}: $pattern (ignored, but may be intentional)"
    else
        echo -e "  ${GREEN}PASS${NC}: $pattern (not ignored - allowed)"
    fi
done

echo ""
echo "Checking pre-commit hook:"
echo "-------------------------"
# Check both worktree-specific and main repo hooks (worktrees share main hooks)
GIT_DIR="$(git rev-parse --git-dir)"
WORKTREE_HOOK="$GIT_DIR/hooks/pre-commit"
MAIN_HOOK="$(git rev-parse --git-common-dir)/hooks/pre-commit"

HOOK_FOUND=false
if [ -f "$WORKTREE_HOOK" ] && [ -x "$WORKTREE_HOOK" ]; then
    echo -e "  ${GREEN}PASS${NC}: Pre-commit hook installed (worktree-specific)"
    HOOK_FOUND=true
elif [ -f "$MAIN_HOOK" ] && [ -x "$MAIN_HOOK" ]; then
    echo -e "  ${GREEN}PASS${NC}: Pre-commit hook installed (shared across worktrees)"
    HOOK_FOUND=true
fi

if [ "$HOOK_FOUND" = false ]; then
    echo -e "  ${RED}FAIL${NC}: Pre-commit hook not installed or not executable"
    echo "  Expected at: $MAIN_HOOK"
    FAILED=1
fi

echo ""
echo "Checking git history for secrets:"
echo "----------------------------------"
SECRET_COMMITS=$(git log --all --full-history --oneline -- "*.env" ".env*" "!*.env.example" "!*.env.production" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SECRET_COMMITS" = "0" ]; then
    echo -e "  ${GREEN}PASS${NC}: No .env files (except allowed) in git history"
else
    echo -e "  ${YELLOW}INFO${NC}: Found $SECRET_COMMITS commits touching .env files"
    echo "  Run: git log --all --full-history --oneline -- '*.env*'"
fi

echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All security checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some security checks failed!${NC}"
    exit 1
fi
