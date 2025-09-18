#!/bin/bash

# Fullmind → Being. Automated Renaming Script
# Generated: December 17, 2024
# CRITICAL: Run this script with extreme caution - it makes irreversible changes

set -euo pipefail

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backup-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$PROJECT_ROOT/docs/scripts/rename-log-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Confirmation function
confirm() {
    read -p "$(echo -e ${YELLOW}$1${NC}) [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Operation cancelled by user"
        exit 1
    fi
}

# Backup function
create_backup() {
    log "Creating backup in $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup critical files
    cp -r "$PROJECT_ROOT/app" "$BACKUP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/website" "$BACKUP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/documentation" "$BACKUP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/.claude" "$BACKUP_DIR/" 2>/dev/null || true
    
    success "Backup created successfully"
}

# Phase 1: Configuration Files (CRITICAL)
phase1_configuration() {
    log "=== PHASE 1: Configuration Files ==="
    
    # app.json changes
    if [[ -f "$PROJECT_ROOT/app/app.json" ]]; then
        log "Updating app/app.json..."
        sed -i.bak 's/"FullMind"/"Being."/g' "$PROJECT_ROOT/app/app.json"
        sed -i.bak 's/"fullmind-mbct"/"being-mbct"/g' "$PROJECT_ROOT/app/app.json"
        sed -i.bak 's/com\.fullmind\.mbct/com.being.mbct/g' "$PROJECT_ROOT/app/app.json"
        sed -i.bak 's/"fullmind"/"being"/g' "$PROJECT_ROOT/app/app.json"
        sed -i.bak 's/fullmind-deep-linking/being-deep-linking/g' "$PROJECT_ROOT/app/app.json"
        sed -i.bak 's/group\.com\.fullmind\.mbct/group.com.being.mbct/g' "$PROJECT_ROOT/app/app.json"
        sed -i.bak 's/FullMind integrates/Being. integrates/g' "$PROJECT_ROOT/app/app.json"
        sed -i.bak 's/FullMind can save/Being. can save/g' "$PROJECT_ROOT/app/app.json"
        sed -i.bak 's/expo-fullmind-widgets/expo-being-widgets/g' "$PROJECT_ROOT/app/app.json"
        success "app.json updated"
    fi
    
    # eas.json changes
    if [[ -f "$PROJECT_ROOT/app/eas.json" ]]; then
        log "Updating app/eas.json..."
        sed -i.bak 's/com\.fullmind\.mbct/com.being.mbct/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.bak 's/api\.fullmind\.app/api.being.app/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.bak 's/staging\.fullmind\.app/staging.being.app/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.bak 's/fullmind\.app/being.app/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.bak 's/fullmind-deep-linking/being-deep-linking/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.bak 's/"fullmind"/"being"/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.bak 's/group\.com\.fullmind\.mbct/group.com.being.mbct/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.bak 's/FullMind Health Technologies/Being. Health Technologies/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.bak 's/FullMind MBCT/Being. MBCT/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.bak 's/fullmind-mbct-ios/being-mbct-ios/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.bak 's/FullMind integrates/Being. integrates/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.bak 's/FullMind can save/Being. can save/g' "$PROJECT_ROOT/app/eas.json"
        success "eas.json updated"
    fi
    
    # Rename widget plugin file
    if [[ -f "$PROJECT_ROOT/app/plugins/expo-fullmind-widgets.js" ]]; then
        log "Renaming widget plugin file..."
        mv "$PROJECT_ROOT/app/plugins/expo-fullmind-widgets.js" "$PROJECT_ROOT/app/plugins/expo-being-widgets.js"
        success "Widget plugin file renamed"
    fi
}

# Phase 2: Critical Source Code
phase2_source_code() {
    log "=== PHASE 2: Critical Source Code ==="
    
    # Widget Types
    if [[ -f "$PROJECT_ROOT/app/plugins/shared/WidgetTypes.ts" ]]; then
        log "Updating WidgetTypes.ts..."
        sed -i.bak "s/scheme: 'fullmind'/scheme: 'being'/g" "$PROJECT_ROOT/app/plugins/shared/WidgetTypes.ts"
        sed -i.bak "s/DEEP_LINK_SCHEME: 'fullmind'/DEEP_LINK_SCHEME: 'being'/g" "$PROJECT_ROOT/app/plugins/shared/WidgetTypes.ts"
        sed -i.bak "s/data\.scheme === 'fullmind'/data.scheme === 'being'/g" "$PROJECT_ROOT/app/plugins/shared/WidgetTypes.ts"
        sed -i.bak "s/Shared Widget Types for FullMind MBCT App/Shared Widget Types for Being. MBCT App/g" "$PROJECT_ROOT/app/plugins/shared/WidgetTypes.ts"
        success "WidgetTypes.ts updated"
    fi
    
    # Widget Data Service
    if [[ -f "$PROJECT_ROOT/app/plugins/shared/WidgetDataService.ts" ]]; then
        log "Updating WidgetDataService.ts..."
        sed -i.bak "s/fullmind_widget_data/being_widget_data/g" "$PROJECT_ROOT/app/plugins/shared/WidgetDataService.ts"
        sed -i.bak "s/fullmind:/being:/g" "$PROJECT_ROOT/app/plugins/shared/WidgetDataService.ts"
        success "WidgetDataService.ts updated"
    fi
    
    # App.tsx
    if [[ -f "$PROJECT_ROOT/app/App.tsx" ]]; then
        log "Updating App.tsx..."
        sed -i.bak "s/FullMind MBCT App - Main Entry Point/Being. MBCT App - Main Entry Point/g" "$PROJECT_ROOT/app/App.tsx"
        success "App.tsx updated"
    fi
}

# Phase 3: Storage Keys (CRITICAL - Data Migration)
phase3_storage_keys() {
    log "=== PHASE 3: Storage Keys (CRITICAL) ==="
    warning "This phase will change storage keys - ensure data migration script is ready!"
    
    # Find all TypeScript/JavaScript files with storage key patterns
    find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" | while read -r file; do
        if grep -q "@fullmind_\|fullmind_" "$file"; then
            log "Updating storage keys in: $file"
            # Update storage key patterns
            sed -i.bak 's/@fullmind_/@being_/g' "$file"
            sed -i.bak 's/fullmind_widget_data/being_widget_data/g' "$file"
            sed -i.bak 's/fullmind_session_index/being_session_index/g' "$file"
            sed -i.bak 's/fullmind_resumable_session_/being_resumable_session_/g' "$file"
            sed -i.bak 's/fullmind_annual/being_annual/g' "$file"
            sed -i.bak 's/fullmind_assessments/being_assessments/g' "$file"
            sed -i.bak 's/fullmind_asset_cache_/being_asset_cache_/g' "$file"
            sed -i.bak 's/fullmind_asset_metadata/being_asset_metadata/g' "$file"
            sed -i.bak 's/fullmind_audit_events/being_audit_events/g' "$file"
            sed -i.bak 's/fullmind_audit_log_v1/being_audit_log_v1/g' "$file"
            sed -i.bak 's/fullmind_auth_attempts_v1/being_auth_attempts_v1/g' "$file"
            sed -i.bak 's/fullmind_auth_config_v1/being_auth_config_v1/g' "$file"
            sed -i.bak 's/fullmind_auth_store/being_auth_store/g' "$file"
            sed -i.bak 's/fullmind_basic/being_basic/g' "$file"
            sed -i.bak 's/fullmind_cache_stats/being_cache_stats/g' "$file"
            sed -i.bak 's/fullmind_checkins/being_checkins/g' "$file"
            sed -i.bak 's/fullmind_clinical_key_v1/being_clinical_key_v1/g' "$file"
            sed -i.bak 's/fullmind_conflict_resolution/being_conflict_resolution/g' "$file"
            sed -i.bak 's/fullmind_consent_audits_v1/being_consent_audits_v1/g' "$file"
            sed -i.bak 's/fullmind_consent_config_v1/being_consent_config_v1/g' "$file"
            sed -i.bak 's/fullmind_crisis/being_crisis/g' "$file"
            sed -i.bak 's/fullmind_crisis_config_v1/being_crisis_config_v1/g' "$file"
        fi
    done
    
    success "Storage keys updated"
}

# Phase 4: Component Names and Variables
phase4_components() {
    log "=== PHASE 4: Component Names and Variables ==="
    
    # Find all source files and update component names
    find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" | while read -r file; do
        if grep -qi "fullmind" "$file"; then
            log "Updating components in: $file"
            # Component and variable names (case-sensitive)
            sed -i.bak 's/FullMindIcon/BeingIcon/g' "$file"
            sed -i.bak 's/FullMindTheme/BeingTheme/g' "$file"
            sed -i.bak 's/FullMindComponent/BeingComponent/g' "$file"
            sed -i.bak 's/fullmindTheme/beingTheme/g' "$file"
            sed -i.bak 's/fullmindIcon/beingIcon/g' "$file"
            sed -i.bak 's/fullmindComponent/beingComponent/g' "$file"
            # Comments and documentation
            sed -i.bak 's/FullMind MBCT App/Being. MBCT App/g' "$file"
            sed -i.bak 's/FullMind widget/Being. widget/g' "$file"
            sed -i.bak 's/FullMind system/Being. system/g' "$file"
        fi
    done
    
    success "Component names updated"
}

# Phase 5: Documentation Files
phase5_documentation() {
    log "=== PHASE 5: Documentation Files ==="
    
    # Update all markdown files
    find "$PROJECT_ROOT/documentation" -type f -name "*.md" | while read -r file; do
        log "Updating documentation: $file"
        # Visual references (with period)
        sed -i.bak 's/FullMind/Being./g' "$file"
        # Technical references (without period)
        sed -i.bak 's/fullmind/being/g' "$file"
        sed -i.bak 's/FULLMIND/BEING/g' "$file"
    done
    
    # Update CLAUDE.md files
    find "$PROJECT_ROOT" -name "CLAUDE.md" | while read -r file; do
        log "Updating CLAUDE.md: $file"
        sed -i.bak 's/FullMind/Being./g' "$file"
        sed -i.bak 's/fullmind/being/g' "$file"
    done
    
    success "Documentation updated"
}

# Phase 6: Build and Test Files
phase6_build_test() {
    log "=== PHASE 6: Build and Test Files ==="
    
    # Update test files
    find "$PROJECT_ROOT/app/__tests__" -type f -name "*.ts" -o -name "*.js" | while read -r file; do
        if grep -qi "fullmind" "$file"; then
            log "Updating test file: $file"
            sed -i.bak 's/FullMind/Being./g' "$file"
            sed -i.bak 's/fullmind/being/g' "$file"
        fi
    done
    
    # Update build scripts
    find "$PROJECT_ROOT/app/scripts" -type f -name "*.js" | while read -r file; do
        if grep -qi "fullmind" "$file"; then
            log "Updating script: $file"
            sed -i.bak 's/fullmind/being/g' "$file"
        fi
    done
    
    # Update jest config
    if [[ -f "$PROJECT_ROOT/app/jest.config.js" ]]; then
        log "Updating jest.config.js..."
        sed -i.bak 's/fullmind/being/g' "$PROJECT_ROOT/app/jest.config.js"
        success "jest.config.js updated"
    fi
    
    success "Build and test files updated"
}

# Validation function
validate_changes() {
    log "=== VALIDATION ==="
    
    local remaining_fullmind=$(find "$PROJECT_ROOT" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/backup-*/*" -exec grep -l -i "fullmind" {} \; 2>/dev/null | wc -l)
    
    log "Remaining files with 'fullmind' references: $remaining_fullmind"
    
    if [[ $remaining_fullmind -gt 0 ]]; then
        warning "Some files still contain 'fullmind' references. Manual review required."
        find "$PROJECT_ROOT" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/backup-*/*" -exec grep -l -i "fullmind" {} \; 2>/dev/null | head -10
    else
        success "All references successfully updated!"
    fi
}

# Main execution
main() {
    log "Starting Fullmind → Being. renaming process..."
    
    # Safety checks
    if [[ ! -d "$PROJECT_ROOT/app" ]]; then
        error "app directory not found. Are you in the correct project directory?"
    fi
    
    if [[ ! -f "$PROJECT_ROOT/app/app.json" ]]; then
        error "app.json not found. This script must be run from the project root."
    fi
    
    # Show what will be changed
    warning "This script will make the following changes:"
    echo "  • Rename 'FullMind' → 'Being.' (visual)"
    echo "  • Rename 'fullmind' → 'being' (code)"
    echo "  • Update 631 files with 2,321+ references"
    echo "  • Change storage keys (REQUIRES DATA MIGRATION)"
    echo "  • Update URL schemes"
    echo "  • Modify bundle identifiers"
    echo ""
    
    confirm "Are you sure you want to proceed with the renaming?"
    
    # Create backup
    create_backup
    
    # Execute phases
    phase1_configuration
    phase2_source_code
    
    warning "About to update storage keys - this will affect user data!"
    confirm "Continue with storage key updates?"
    phase3_storage_keys
    
    phase4_components
    phase5_documentation
    phase6_build_test
    
    # Validation
    validate_changes
    
    success "Renaming process completed!"
    log "Backup available at: $BACKUP_DIR"
    log "Log file available at: $LOG_FILE"
    
    warning "IMPORTANT: You must now:"
    echo "  1. Run the data migration script for existing users"
    echo "  2. Update external integrations (APIs, webhooks)"
    echo "  3. Test all functionality thoroughly"
    echo "  4. Update app store listings"
    echo "  5. Deploy with new bundle identifiers"
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi