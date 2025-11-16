#!/bin/bash

# Being App - Migration Validation Script
# Validates codebase state after each migration phase

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../app" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Being App Migration Validation      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

cd "$APP_DIR"

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}━━━ $1 ━━━${NC}"
}

# 1. Check TypeScript Configuration
section "TypeScript Configuration"

if [ -f "tsconfig.json" ]; then
    pass "tsconfig.json exists"

    # Check for new path aliases
    if grep -q "@/core/\*" tsconfig.json && \
       grep -q "@/features/\*" tsconfig.json && \
       grep -q "@/compliance/\*" tsconfig.json && \
       grep -q "@/analytics/\*" tsconfig.json; then
        pass "New path aliases configured"
    else
        fail "Missing new path aliases in tsconfig.json"
    fi
else
    fail "tsconfig.json not found"
fi

# 2. Type Checking
section "Type Checking"

info "Running TypeScript compiler..."
if npx tsc --noEmit --skipLibCheck 2>&1 | tee /tmp/tsc-output.txt; then
    ERROR_COUNT=$(grep -c "error TS" /tmp/tsc-output.txt || echo "0")
    if [ "$ERROR_COUNT" -eq "0" ]; then
        pass "No TypeScript errors"
    else
        fail "Found $ERROR_COUNT TypeScript errors"
        warn "Check /tmp/tsc-output.txt for details"
    fi
else
    fail "Type checking failed"
    warn "Check /tmp/tsc-output.txt for details"
fi

# 3. Check for Circular Dependencies
section "Circular Dependencies"

if command -v madge &> /dev/null; then
    info "Checking for circular dependencies..."
    if madge --circular src/ > /tmp/madge-output.txt 2>&1; then
        if [ -s /tmp/madge-output.txt ]; then
            fail "Circular dependencies detected"
            cat /tmp/madge-output.txt
        else
            pass "No circular dependencies"
        fi
    else
        warn "Madge check failed (might not be an issue)"
    fi
else
    warn "Madge not installed - skipping circular dependency check"
    info "Install with: npm install -g madge"
fi

# 4. Directory Structure
section "Directory Structure"

# Check for new directories (Phase 1+)
if [ -d "src/core" ]; then
    pass "src/core/ exists"
else
    info "src/core/ not yet created (expected before Phase 1)"
fi

if [ -d "src/features" ]; then
    pass "src/features/ exists"

    # Count features
    FEATURE_COUNT=$(find src/features -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
    info "Found $FEATURE_COUNT features"
else
    info "src/features/ not yet created (expected before Phase 2)"
fi

# Check old directories still exist (during migration)
if [ -d "src/components" ] || [ -d "src/services" ] || [ -d "src/screens" ]; then
    info "Legacy directories still present (expected during migration)"
fi

# 5. Import Validation
section "Import Validation"

info "Checking for common import issues..."

# Check for relative imports that should use aliases
RELATIVE_IMPORTS=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "from '\.\./\.\./\.\." | wc -l | tr -d ' ')
if [ "$RELATIVE_IMPORTS" -gt "20" ]; then
    warn "Found $RELATIVE_IMPORTS files with deep relative imports (../../..)"
    info "Consider migrating to path aliases"
else
    pass "Minimal deep relative imports ($RELATIVE_IMPORTS files)"
fi

# Check for forbidden patterns (core importing features)
if find src/core -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "from '@/features/" 2>/dev/null; then
    fail "Found core/ importing from features/ (forbidden)"
else
    if [ -d "src/core" ]; then
        pass "No forbidden core → features imports"
    fi
fi

# 6. Package Dependencies
section "Package Dependencies"

if [ -f "package.json" ]; then
    pass "package.json exists"

    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        pass "node_modules/ exists"
    else
        warn "node_modules/ not found - run npm install"
    fi
else
    fail "package.json not found"
fi

# 7. Test Files
section "Test Files"

TEST_FILES=$(find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l | tr -d ' ')
SPEC_FILES=$(find src -name "*.spec.ts" -o -name "*.spec.tsx" | wc -l | tr -d ' ')
TOTAL_TESTS=$((TEST_FILES + SPEC_FILES))

if [ "$TOTAL_TESTS" -gt "0" ]; then
    pass "Found $TOTAL_TESTS test files"
else
    warn "No test files found"
fi

# 8. Documentation
section "Documentation"

if [ -f "../docs/architecture/README.md" ]; then
    pass "Architecture documentation exists"
else
    warn "Architecture documentation not found"
fi

if [ -f "../docs/architecture/migration-checklist.md" ]; then
    pass "Migration checklist exists"
else
    warn "Migration checklist not found"
fi

# 9. Git Status
section "Git Status"

info "Git status:"
git status --short | head -20

UNCOMMITTED=$(git status --short | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt "0" ]; then
    warn "$UNCOMMITTED uncommitted changes"
else
    pass "Working directory clean"
fi

# Summary
section "Summary"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))

echo ""
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Pass Rate: ${BLUE}$PASS_RATE%${NC}"
echo ""

if [ "$TESTS_FAILED" -eq "0" ]; then
    echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ Validation Passed              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ Validation Failed              ║${NC}"
    echo -e "${RED}╚════════════════════════════════════╝${NC}"
    exit 1
fi
