#!/bin/bash

# Validation Script for Fullmind → Being. Renaming
# Generated: December 17, 2024
# CRITICAL: Run this script after renaming to verify all changes

set -euo pipefail

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VALIDATION_LOG="$PROJECT_ROOT/docs/scripts/validation-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$VALIDATION_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$VALIDATION_LOG"
    ((FAILED_CHECKS++))
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$VALIDATION_LOG"
    ((WARNING_CHECKS++))
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$VALIDATION_LOG"
    ((PASSED_CHECKS++))
}

check() {
    ((TOTAL_CHECKS++))
}

# Critical file validation
validate_critical_files() {
    log "=== VALIDATING CRITICAL FILES ==="
    
    # Check app.json
    check
    if [[ -f "$PROJECT_ROOT/app/app.json" ]]; then
        local app_json_issues=0
        
        # Check for old references
        if grep -q "FullMind" "$PROJECT_ROOT/app/app.json" 2>/dev/null; then
            error "app.json still contains 'FullMind' references"
            ((app_json_issues++))
        fi
        
        if grep -q "fullmind-mbct" "$PROJECT_ROOT/app/app.json" 2>/dev/null; then
            error "app.json still contains 'fullmind-mbct' slug"
            ((app_json_issues++))
        fi
        
        if grep -q "com.fullmind.mbct" "$PROJECT_ROOT/app/app.json" 2>/dev/null; then
            error "app.json still contains old bundle identifier"
            ((app_json_issues++))
        fi
        
        # Check for new references
        if ! grep -q "Being\." "$PROJECT_ROOT/app/app.json" 2>/dev/null; then
            error "app.json missing 'Being.' references"
            ((app_json_issues++))
        fi
        
        if ! grep -q "being-mbct" "$PROJECT_ROOT/app/app.json" 2>/dev/null; then
            error "app.json missing new slug 'being-mbct'"
            ((app_json_issues++))
        fi
        
        if ! grep -q "com.being.mbct" "$PROJECT_ROOT/app/app.json" 2>/dev/null; then
            error "app.json missing new bundle identifier"
            ((app_json_issues++))
        fi
        
        if [[ $app_json_issues -eq 0 ]]; then
            success "app.json validation passed"
        fi
    else
        error "app.json not found"
    fi
    
    # Check eas.json
    check
    if [[ -f "$PROJECT_ROOT/app/eas.json" ]]; then
        local eas_json_issues=0
        
        if grep -q "com.fullmind.mbct" "$PROJECT_ROOT/app/eas.json" 2>/dev/null; then
            error "eas.json still contains old bundle identifiers"
            ((eas_json_issues++))
        fi
        
        if grep -q "fullmind\.app" "$PROJECT_ROOT/app/eas.json" 2>/dev/null; then
            error "eas.json still contains old domain references"
            ((eas_json_issues++))
        fi
        
        if ! grep -q "being\.app" "$PROJECT_ROOT/app/eas.json" 2>/dev/null; then
            error "eas.json missing new domain references"
            ((eas_json_issues++))
        fi
        
        if [[ $eas_json_issues -eq 0 ]]; then
            success "eas.json validation passed"
        fi
    else
        error "eas.json not found"
    fi
    
    # Check widget plugin file exists with new name
    check
    if [[ -f "$PROJECT_ROOT/app/plugins/expo-being-widgets.js" ]]; then
        success "Widget plugin file correctly renamed"
    else
        error "Widget plugin file not found at expected location: app/plugins/expo-being-widgets.js"
    fi
    
    # Check old widget plugin file doesn't exist
    check
    if [[ -f "$PROJECT_ROOT/app/plugins/expo-fullmind-widgets.js" ]]; then
        error "Old widget plugin file still exists: app/plugins/expo-fullmind-widgets.js"
    else
        success "Old widget plugin file correctly removed"
    fi
}

# Widget system validation
validate_widget_system() {
    log "=== VALIDATING WIDGET SYSTEM ==="
    
    # Check WidgetTypes.ts
    check
    if [[ -f "$PROJECT_ROOT/app/plugins/shared/WidgetTypes.ts" ]]; then
        local widget_types_issues=0
        
        if grep -q "scheme: 'fullmind'" "$PROJECT_ROOT/app/plugins/shared/WidgetTypes.ts" 2>/dev/null; then
            error "WidgetTypes.ts still contains old scheme"
            ((widget_types_issues++))
        fi
        
        if ! grep -q "scheme: 'being'" "$PROJECT_ROOT/app/plugins/shared/WidgetTypes.ts" 2>/dev/null; then
            error "WidgetTypes.ts missing new scheme"
            ((widget_types_issues++))
        fi
        
        if grep -q "DEEP_LINK_SCHEME: 'fullmind'" "$PROJECT_ROOT/app/plugins/shared/WidgetTypes.ts" 2>/dev/null; then
            error "WidgetTypes.ts still contains old deep link scheme"
            ((widget_types_issues++))
        fi
        
        if [[ $widget_types_issues -eq 0 ]]; then
            success "WidgetTypes.ts validation passed"
        fi
    else
        error "WidgetTypes.ts not found"
    fi
    
    # Check WidgetDataService.ts
    check
    if [[ -f "$PROJECT_ROOT/app/plugins/shared/WidgetDataService.ts" ]]; then
        local widget_service_issues=0
        
        if grep -q "fullmind_widget_data" "$PROJECT_ROOT/app/plugins/shared/WidgetDataService.ts" 2>/dev/null; then
            error "WidgetDataService.ts still contains old storage key"
            ((widget_service_issues++))
        fi
        
        if ! grep -q "being_widget_data" "$PROJECT_ROOT/app/plugins/shared/WidgetDataService.ts" 2>/dev/null; then
            error "WidgetDataService.ts missing new storage key"
            ((widget_service_issues++))
        fi
        
        if grep -q "fullmind:" "$PROJECT_ROOT/app/plugins/shared/WidgetDataService.ts" 2>/dev/null; then
            error "WidgetDataService.ts still contains old URL protocol"
            ((widget_service_issues++))
        fi
        
        if [[ $widget_service_issues -eq 0 ]]; then
            success "WidgetDataService.ts validation passed"
        fi
    else
        error "WidgetDataService.ts not found"
    fi
}

# Storage key validation
validate_storage_keys() {
    log "=== VALIDATING STORAGE KEYS ==="
    
    local storage_issues=0
    
    # Check for old storage key patterns in source code
    check
    local old_storage_keys=$(find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -exec grep -l "@fullmind_\|fullmind_widget_data\|fullmind_session" {} \; 2>/dev/null | wc -l)
    
    if [[ $old_storage_keys -gt 0 ]]; then
        error "Found $old_storage_keys files still containing old storage key patterns"
        # Show which files
        find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -exec grep -l "@fullmind_\|fullmind_widget_data\|fullmind_session" {} \; 2>/dev/null | head -5
        ((storage_issues++))
    else
        success "No old storage key patterns found in source code"
    fi
    
    # Check for new storage key patterns
    check
    local new_storage_keys=$(find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -exec grep -l "@being_\|being_widget_data\|being_session" {} \; 2>/dev/null | wc -l)
    
    if [[ $new_storage_keys -eq 0 ]]; then
        warning "No new storage key patterns found - this might indicate incomplete migration"
        ((storage_issues++))
    else
        success "Found $new_storage_keys files with new storage key patterns"
    fi
    
    if [[ $storage_issues -eq 0 ]]; then
        success "Storage key validation passed"
    fi
}

# URL scheme validation
validate_url_schemes() {
    log "=== VALIDATING URL SCHEMES ==="
    
    local url_issues=0
    
    # Check for old URL schemes
    check
    local old_schemes=$(find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) -not -path "*/node_modules/*" -exec grep -l "fullmind://" {} \; 2>/dev/null | wc -l)
    
    if [[ $old_schemes -gt 0 ]]; then
        error "Found $old_schemes files still containing old URL scheme 'fullmind://'"
        ((url_issues++))
    else
        success "No old URL schemes found"
    fi
    
    # Check for new URL schemes
    check
    local new_schemes=$(find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) -not -path "*/node_modules/*" -exec grep -l "being://" {} \; 2>/dev/null | wc -l)
    
    if [[ $new_schemes -eq 0 ]]; then
        warning "No new URL schemes found - this might indicate incomplete migration"
        ((url_issues++))
    else
        success "Found $new_schemes files with new URL schemes"
    fi
    
    if [[ $url_issues -eq 0 ]]; then
        success "URL scheme validation passed"
    fi
}

# Component name validation
validate_component_names() {
    log "=== VALIDATING COMPONENT NAMES ==="
    
    local component_issues=0
    
    # Check for old component patterns
    check
    local old_components=$(find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -exec grep -l "FullMindIcon\|FullMindTheme\|FullMindComponent" {} \; 2>/dev/null | wc -l)
    
    if [[ $old_components -gt 0 ]]; then
        error "Found $old_components files still containing old component names"
        ((component_issues++))
    else
        success "No old component names found"
    fi
    
    if [[ $component_issues -eq 0 ]]; then
        success "Component name validation passed"
    fi
}

# Build validation
validate_build_config() {
    log "=== VALIDATING BUILD CONFIGURATION ==="
    
    # Check jest config
    check
    if [[ -f "$PROJECT_ROOT/app/jest.config.js" ]]; then
        if grep -q "fullmind" "$PROJECT_ROOT/app/jest.config.js" 2>/dev/null; then
            error "jest.config.js still contains 'fullmind' references"
        else
            success "jest.config.js validation passed"
        fi
    else
        warning "jest.config.js not found"
    fi
    
    # Check if app builds successfully
    check
    if command -v npm >/dev/null 2>&1; then
        log "Testing TypeScript compilation..."
        cd "$PROJECT_ROOT/app"
        if npm run tsc --noEmit >/dev/null 2>&1; then
            success "TypeScript compilation successful"
        else
            error "TypeScript compilation failed - there may be import errors"
        fi
        cd - >/dev/null
    else
        warning "npm not available - skipping build test"
    fi
}

# Documentation validation
validate_documentation() {
    log "=== VALIDATING DOCUMENTATION ==="
    
    local doc_issues=0
    
    # Count files still containing old references
    check
    local old_doc_refs=$(find "$PROJECT_ROOT/documentation" -name "*.md" -exec grep -l "FullMind" {} \; 2>/dev/null | wc -l)
    
    if [[ $old_doc_refs -gt 0 ]]; then
        warning "Found $old_doc_refs documentation files still containing 'FullMind' - manual review may be needed"
        ((doc_issues++))
    else
        success "All documentation files updated"
    fi
    
    # Check critical documents exist
    check
    local critical_docs=(
        "documentation/mobile-app/Being. TRD v2.0.md"
        "documentation/mobile-app/Being. PRD v2.0.md"
        "documentation/mobile-app/Being. Design Library v1.1.tsx"
    )
    
    local missing_docs=0
    for doc in "${critical_docs[@]}"; do
        if [[ ! -f "$PROJECT_ROOT/$doc" ]]; then
            warning "Critical document not found: $doc"
            ((missing_docs++))
        fi
    done
    
    if [[ $missing_docs -eq 0 ]]; then
        success "All critical documents found"
    else
        warning "$missing_docs critical documents missing or not renamed"
    fi
}

# Clinical safety validation
validate_clinical_safety() {
    log "=== VALIDATING CLINICAL SAFETY ==="
    
    local safety_issues=0
    
    # Check that PHQ-9/GAD-7 references are preserved
    check
    local phq9_refs=$(find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -exec grep -l "PHQ-9\|PHQ9" {} \; 2>/dev/null | wc -l)
    local gad7_refs=$(find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -exec grep -l "GAD-7\|GAD7" {} \; 2>/dev/null | wc -l)
    
    if [[ $phq9_refs -eq 0 ]]; then
        error "No PHQ-9 references found - clinical assessment may be broken"
        ((safety_issues++))
    else
        success "PHQ-9 references preserved ($phq9_refs files)"
    fi
    
    if [[ $gad7_refs -eq 0 ]]; then
        error "No GAD-7 references found - clinical assessment may be broken"
        ((safety_issues++))
    else
        success "GAD-7 references preserved ($gad7_refs files)"
    fi
    
    # Check crisis hotline reference (988)
    check
    local crisis_refs=$(find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -exec grep -l "988" {} \; 2>/dev/null | wc -l)
    
    if [[ $crisis_refs -eq 0 ]]; then
        error "No 988 crisis hotline references found - emergency protocols may be broken"
        ((safety_issues++))
    else
        success "Crisis hotline references preserved ($crisis_refs files)"
    fi
    
    if [[ $safety_issues -eq 0 ]]; then
        success "Clinical safety validation passed"
    fi
}

# Performance check
validate_performance() {
    log "=== VALIDATING PERFORMANCE ==="
    
    # Check for any obvious performance regressions
    check
    local large_files=$(find "$PROJECT_ROOT/app" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs wc -l | awk '$1 > 1000 {print $2}' | wc -l)
    
    if [[ $large_files -gt 10 ]]; then
        warning "Found $large_files large files (>1000 lines) - monitor for performance impact"
    else
        success "No obvious performance concerns detected"
    fi
}

# Main validation function
main() {
    log "Starting validation for Fullmind → Being. renaming..."
    
    # Safety checks
    if [[ ! -d "$PROJECT_ROOT/app" ]]; then
        error "app directory not found. Are you in the correct project directory?"
        exit 1
    fi
    
    # Run all validations
    validate_critical_files
    validate_widget_system
    validate_storage_keys
    validate_url_schemes
    validate_component_names
    validate_build_config
    validate_documentation
    validate_clinical_safety
    validate_performance
    
    # Final summary
    log "=== VALIDATION SUMMARY ==="
    log "Total checks performed: $TOTAL_CHECKS"
    success "Passed checks: $PASSED_CHECKS"
    
    if [[ $WARNING_CHECKS -gt 0 ]]; then
        warning "Warning checks: $WARNING_CHECKS"
    fi
    
    if [[ $FAILED_CHECKS -gt 0 ]]; then
        error "Failed checks: $FAILED_CHECKS"
        log "VALIDATION FAILED - Please review and fix issues before proceeding"
        exit 1
    else
        success "ALL VALIDATIONS PASSED!"
        log "Renaming appears to be successful and safe to proceed"
    fi
    
    log "Validation log saved to: $VALIDATION_LOG"
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi