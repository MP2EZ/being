#!/bin/bash

# Emergency Rollback Script - HISTORICAL REFERENCE
# Generated: December 17, 2024
# Updated: September 17, 2025
# STATUS: Renaming completed successfully - rollback not needed

set -euo pipefail

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EMERGENCY_LOG="$PROJECT_ROOT/docs/scripts/emergency-rollback-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="$PROJECT_ROOT/emergency-backup-$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Emergency contact information (replace with actual contacts)
TECHNICAL_LEAD="tech-lead@example.com"
CLINICAL_SUPERVISOR="clinical@example.com"
DEVOPS_ENGINEER="devops@example.com"
SECURITY_OFFICER="security@example.com"

# Timing for phases (in seconds)
PHASE_TIMEOUT=300  # 5 minutes per phase max

# Logging function
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp]${NC} $1" | tee -a "$EMERGENCY_LOG"
}

emergency() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[$timestamp] [EMERGENCY]${NC} $1" | tee -a "$EMERGENCY_LOG"
}

warning() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[$timestamp] [WARNING]${NC} $1" | tee -a "$EMERGENCY_LOG"
}

success() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp] [SUCCESS]${NC} $1" | tee -a "$EMERGENCY_LOG"
}

critical() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${PURPLE}[$timestamp] [CRITICAL]${NC} $1" | tee -a "$EMERGENCY_LOG"
}

# Function to send emergency notifications
send_emergency_alert() {
    local subject="$1"
    local message="$2"
    local severity="$3"  # LOW, MEDIUM, HIGH, CRITICAL
    
    log "Sending emergency alert: $subject"
    
    # Log to emergency file for manual follow-up
    echo "=== EMERGENCY ALERT ===" >> "$EMERGENCY_LOG"
    echo "Time: $(date)" >> "$EMERGENCY_LOG"
    echo "Severity: $severity" >> "$EMERGENCY_LOG"
    echo "Subject: $subject" >> "$EMERGENCY_LOG"
    echo "Message: $message" >> "$EMERGENCY_LOG"
    echo "Contacts: $TECHNICAL_LEAD, $CLINICAL_SUPERVISOR, $DEVOPS_ENGINEER, $SECURITY_OFFICER" >> "$EMERGENCY_LOG"
    echo "========================" >> "$EMERGENCY_LOG"
    
    # In production, this would integrate with actual notification systems
    # Examples: Slack, PagerDuty, email, SMS
    warning "MANUAL ACTION REQUIRED: Contact emergency response team"
    warning "Technical Lead: $TECHNICAL_LEAD"
    warning "Clinical Supervisor: $CLINICAL_SUPERVISOR"
    warning "DevOps: $DEVOPS_ENGINEER"
    warning "Security: $SECURITY_OFFICER"
}

# Function to timeout phases
timeout_phase() {
    local phase_name="$1"
    local phase_function="$2"
    
    log "Starting $phase_name with $PHASE_TIMEOUT second timeout..."
    
    if timeout $PHASE_TIMEOUT bash -c "$phase_function"; then
        success "$phase_name completed successfully"
        return 0
    else
        emergency "$phase_name timed out or failed"
        return 1
    fi
}

# Validate environment
validate_environment() {
    log "Validating environment for emergency rollback..."
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/app/app.json" ]]; then
        emergency "Not in correct project directory - app.json not found"
        exit 1
    fi
    
    # Check if git is available
    if ! command -v git >/dev/null 2>&1; then
        emergency "Git not available - cannot perform repository rollback"
        exit 1
    fi
    
    # Check if we have backup data
    if [[ ! -d "$PROJECT_ROOT/backup-"* ]] && [[ ! -f "$PROJECT_ROOT/docs/scripts/migrate-user-data.js" ]]; then
        warning "No backup directories found - data recovery may be limited"
    fi
    
    # Check git status
    cd "$PROJECT_ROOT"
    if [[ -n $(git status --porcelain) ]]; then
        warning "Working directory has uncommitted changes"
    fi
    
    success "Environment validation completed"
}

# Phase 1: Immediate Safety Measures
phase1_immediate_safety() {
    critical "=== PHASE 1: IMMEDIATE SAFETY MEASURES ==="
    
    # Create emergency backup immediately
    log "Creating emergency backup..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup critical files that might be needed for recovery
    cp -r "$PROJECT_ROOT/app" "$BACKUP_DIR/app-current" 2>/dev/null || true
    cp "$PROJECT_ROOT/app/app.json" "$BACKUP_DIR/app.json.emergency" 2>/dev/null || true
    cp "$PROJECT_ROOT/app/eas.json" "$BACKUP_DIR/eas.json.emergency" 2>/dev/null || true
    
    # Backup current state for analysis
    git log --oneline -10 > "$BACKUP_DIR/recent-commits.log" 2>/dev/null || true
    git status > "$BACKUP_DIR/git-status.log" 2>/dev/null || true
    git diff > "$BACKUP_DIR/current-diff.log" 2>/dev/null || true
    
    # If migration script exists, backup current storage mappings
    if [[ -f "$PROJECT_ROOT/docs/scripts/migrate-user-data.js" ]]; then
        node -e "console.log(JSON.stringify(require('$PROJECT_ROOT/docs/scripts/migrate-user-data.js').STORAGE_KEY_MAPPINGS, null, 2))" > "$BACKUP_DIR/current-storage-mappings.json" 2>/dev/null || true
    fi
    
    success "Emergency backup created at $BACKUP_DIR"
    
    # Send immediate emergency alert
    send_emergency_alert "EMERGENCY ROLLBACK INITIATED" "Being. app emergency rollback in progress. User safety protocols activated." "CRITICAL"
    
    # Log critical information for post-incident analysis
    log "Emergency rollback initiated at $(date)"
    log "Triggering condition: ${ROLLBACK_REASON:-Not specified}"
    log "Initiated by: ${USER:-Unknown}"
    log "Project directory: $PROJECT_ROOT"
    log "Emergency backup: $BACKUP_DIR"
}

# Phase 2: Data Protection
phase2_data_protection() {
    critical "=== PHASE 2: DATA PROTECTION ==="
    
    # Run data migration script in emergency backup mode
    if [[ -f "$PROJECT_ROOT/docs/scripts/migrate-user-data.js" ]]; then
        log "Creating emergency data backup..."
        cd "$PROJECT_ROOT"
        
        # Try to create data backup if Node.js available
        if command -v node >/dev/null 2>&1; then
            node ./docs/scripts/migrate-user-data.js --emergency-backup > "$BACKUP_DIR/data-backup.log" 2>&1 || warning "Data backup script failed - proceeding with rollback"
        else
            warning "Node.js not available - cannot run data backup script"
        fi
    fi
    
    # Document current AsyncStorage state (if accessible)
    log "Documenting current storage state..."
    echo "Storage state captured at $(date)" > "$BACKUP_DIR/storage-state.log"
    
    success "Data protection measures completed"
}

# Phase 3: Repository Rollback
phase3_repository_rollback() {
    critical "=== PHASE 3: REPOSITORY ROLLBACK ==="
    
    cd "$PROJECT_ROOT"
    
    # Find the last commit before renaming
    log "Identifying last stable commit..."
    local last_stable_commit
    
    # Look for commits before the renaming process
    # This assumes the renaming was recent and identifiable
    last_stable_commit=$(git log --oneline --grep="renaming\|being\|Being" --invert-grep -1 --format="%H" | head -1)
    
    if [[ -z "$last_stable_commit" ]]; then
        # Fallback: look for a commit with "fullmind" in files
        last_stable_commit=$(git log --oneline --name-only | grep -B1 -A5 "fullmind" | grep -E "^[a-f0-9]{7,}" | head -1 | cut -d' ' -f1)
    fi
    
    if [[ -z "$last_stable_commit" ]]; then
        # Final fallback: go back 10 commits
        last_stable_commit=$(git log --oneline -10 --format="%H" | tail -1)
        warning "Could not identify renaming commit - using fallback commit: $last_stable_commit"
    else
        log "Identified last stable commit: $last_stable_commit"
    fi
    
    # Create emergency branch for current state
    local emergency_branch="emergency-rollback-$(date +%Y%m%d-%H%M%S)"
    git checkout -b "$emergency_branch" 2>/dev/null || warning "Could not create emergency branch"
    
    # Perform rollback to stable commit
    log "Rolling back to stable commit: $last_stable_commit"
    git checkout main
    git reset --hard "$last_stable_commit"
    
    # Verify rollback
    if git log -1 --format="%H" | grep -q "$last_stable_commit"; then
        success "Repository rollback successful"
    else
        emergency "Repository rollback failed"
        exit 1
    fi
    
    success "Repository rollback completed"
}

# Phase 4: Configuration Restoration
phase4_configuration_restoration() {
    critical "=== PHASE 4: CONFIGURATION RESTORATION ==="
    
    # Restore app.json to Fullmind configuration
    if [[ -f "$PROJECT_ROOT/app/app.json" ]]; then
        log "Restoring app.json configuration..."
        
        # Basic restoration (this should be more sophisticated in production)
        sed -i.emergency 's/"Being\."/"FullMind"/g' "$PROJECT_ROOT/app/app.json"
        sed -i.emergency 's/"being-mbct"/"fullmind-mbct"/g' "$PROJECT_ROOT/app/app.json"
        sed -i.emergency 's/com\.being\.mbct/com.fullmind.mbct/g' "$PROJECT_ROOT/app/app.json"
        sed -i.emergency 's/"being"/"fullmind"/g' "$PROJECT_ROOT/app/app.json"
        sed -i.emergency 's/being-deep-linking/fullmind-deep-linking/g' "$PROJECT_ROOT/app/app.json"
        sed -i.emergency 's/group\.com\.being\.mbct/group.com.fullmind.mbct/g' "$PROJECT_ROOT/app/app.json"
        sed -i.emergency 's/Being\. integrates/FullMind integrates/g' "$PROJECT_ROOT/app/app.json"
        sed -i.emergency 's/Being\. can save/FullMind can save/g' "$PROJECT_ROOT/app/app.json"
        sed -i.emergency 's/expo-being-widgets/expo-fullmind-widgets/g' "$PROJECT_ROOT/app/app.json"
        
        success "app.json restored"
    fi
    
    # Restore eas.json to Fullmind configuration
    if [[ -f "$PROJECT_ROOT/app/eas.json" ]]; then
        log "Restoring eas.json configuration..."
        
        sed -i.emergency 's/com\.being\.mbct/com.fullmind.mbct/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.emergency 's/api\.being\.app/api.fullmind.app/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.emergency 's/staging\.being\.app/staging.fullmind.app/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.emergency 's/being\.app/fullmind.app/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.emergency 's/being-deep-linking/fullmind-deep-linking/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.emergency 's/"being"/"fullmind"/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.emergency 's/group\.com\.being\.mbct/group.com.fullmind.mbct/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.emergency 's/Being\. Health Technologies/FullMind Health Technologies/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.emergency 's/Being\. MBCT/FullMind MBCT/g' "$PROJECT_ROOT/app/eas.json"
        sed -i.emergency 's/being-mbct-ios/fullmind-mbct-ios/g' "$PROJECT_ROOT/app/eas.json"
        
        success "eas.json restored"
    fi
    
    # Restore widget plugin filename
    if [[ -f "$PROJECT_ROOT/app/plugins/expo-being-widgets.js" ]]; then
        mv "$PROJECT_ROOT/app/plugins/expo-being-widgets.js" "$PROJECT_ROOT/app/plugins/expo-fullmind-widgets.js" 2>/dev/null || warning "Could not rename widget plugin file"
        success "Widget plugin file restored"
    fi
    
    success "Configuration restoration completed"
}

# Phase 5: Data Recovery
phase5_data_recovery() {
    critical "=== PHASE 5: DATA RECOVERY ==="
    
    # Run data migration rollback if script is available
    if [[ -f "$PROJECT_ROOT/docs/scripts/migrate-user-data.js" ]] && command -v node >/dev/null 2>&1; then
        log "Attempting data migration rollback..."
        
        # Find the most recent backup
        local backup_key
        # This would need to be more sophisticated in production
        backup_key="@being_migration_backup_$(date +%Y%m%d)"
        
        cd "$PROJECT_ROOT"
        node ./docs/scripts/migrate-user-data.js --rollback --backup-key="$backup_key" > "$BACKUP_DIR/data-rollback.log" 2>&1 || warning "Data rollback script failed - manual intervention may be required"
        
        success "Data recovery attempted"
    else
        warning "Data recovery script not available - manual data restoration may be required"
    fi
    
    # Log what data recovery was attempted
    log "Data recovery summary logged to $BACKUP_DIR/data-rollback.log"
}

# Phase 6: Critical System Validation
phase6_critical_validation() {
    critical "=== PHASE 6: CRITICAL SYSTEM VALIDATION ==="
    
    # Run validation script if available
    if [[ -f "$PROJECT_ROOT/docs/scripts/validate-renaming.sh" ]]; then
        log "Running rollback validation..."
        cd "$PROJECT_ROOT"
        bash ./docs/scripts/validate-renaming.sh --rollback-mode > "$BACKUP_DIR/validation-results.log" 2>&1 || warning "Validation script reported issues"
        success "Validation completed - see $BACKUP_DIR/validation-results.log"
    fi
    
    # Manual critical checks
    log "Performing manual critical system checks..."
    
    # Check that critical files exist
    local critical_files=(
        "app/app.json"
        "app/eas.json"
        "app/App.tsx"
    )
    
    for file in "${critical_files[@]}"; do
        if [[ -f "$PROJECT_ROOT/$file" ]]; then
            success "Critical file exists: $file"
        else
            emergency "Critical file missing: $file"
        fi
    done
    
    # Check for remaining "being" references that should be "fullmind"
    local being_refs=$(find "$PROJECT_ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) -not -path "*/node_modules/*" -exec grep -l "being\|Being" {} \; 2>/dev/null | wc -l)
    
    if [[ $being_refs -gt 0 ]]; then
        warning "Found $being_refs files still containing 'being' references - manual cleanup may be needed"
    else
        success "No remaining 'being' references found"
    fi
    
    success "Critical system validation completed"
}

# Main emergency rollback function
main() {
    local start_time=$(date +%s)
    
    critical "🚨 EMERGENCY ROLLBACK INITIATED 🚨"
    log "Rollback reason: ${ROLLBACK_REASON:-Not specified}"
    log "Emergency log: $EMERGENCY_LOG"
    
    # Validate environment
    validate_environment
    
    # Execute rollback phases with timeouts
    if ! timeout_phase "Phase 1: Immediate Safety" "phase1_immediate_safety"; then
        emergency "Phase 1 failed - manual intervention required"
        exit 1
    fi
    
    if ! timeout_phase "Phase 2: Data Protection" "phase2_data_protection"; then
        emergency "Phase 2 failed - data may be at risk"
        # Continue with rollback despite data protection failure
    fi
    
    if ! timeout_phase "Phase 3: Repository Rollback" "phase3_repository_rollback"; then
        emergency "Phase 3 failed - repository rollback unsuccessful"
        exit 1
    fi
    
    if ! timeout_phase "Phase 4: Configuration Restoration" "phase4_configuration_restoration"; then
        emergency "Phase 4 failed - configuration may be inconsistent"
        # Continue as this can be fixed manually
    fi
    
    if ! timeout_phase "Phase 5: Data Recovery" "phase5_data_recovery"; then
        warning "Phase 5 had issues - data recovery may be incomplete"
        # Continue as manual data recovery may be possible
    fi
    
    if ! timeout_phase "Phase 6: Critical Validation" "phase6_critical_validation"; then
        warning "Phase 6 had issues - manual validation recommended"
    fi
    
    # Calculate total time
    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))
    
    success "🎉 EMERGENCY ROLLBACK COMPLETED 🎉"
    log "Total rollback time: ${total_time} seconds"
    log "Emergency backup location: $BACKUP_DIR"
    log "Emergency log location: $EMERGENCY_LOG"
    
    # Send completion notification
    send_emergency_alert "EMERGENCY ROLLBACK COMPLETED" "Being. app rollback completed in ${total_time} seconds. Manual validation recommended." "HIGH"
    
    critical "NEXT STEPS REQUIRED:"
    log "1. Manually test critical functionality (crisis button, assessments)"
    log "2. Verify user data integrity"
    log "3. Check app builds and deploys successfully"
    log "4. Contact clinical supervisor to verify safety systems"
    log "5. Review emergency log: $EMERGENCY_LOG"
    log "6. Conduct post-incident review within 24 hours"
    
    # Final safety reminder
    critical "CRITICAL: Verify 988 crisis hotline integration before declaring rollback complete"
    critical "CRITICAL: Test PHQ-9/GAD-7 assessment accuracy before resuming normal operations"
}

# Parse command line arguments
ROLLBACK_REASON=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --reason)
            ROLLBACK_REASON="$2"
            shift 2
            ;;
        --help)
            echo "Emergency Rollback Script for Being. → Fullmind"
            echo ""
            echo "Usage: $0 [--reason \"description\"]"
            echo ""
            echo "Options:"
            echo "  --reason    Reason for emergency rollback (for logging)"
            echo "  --help      Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 --reason \"Crisis button not responding\""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Confirmation before proceeding
echo -e "${RED}WARNING: This script will perform an EMERGENCY ROLLBACK${NC}"
echo -e "${RED}This will revert all 'Being.' changes back to 'Fullmind'${NC}"
echo ""
echo "Reason: ${ROLLBACK_REASON:-Not specified}"
echo "Project: $PROJECT_ROOT"
echo ""
read -p "$(echo -e ${YELLOW}Are you absolutely sure you want to proceed? Type 'EMERGENCY ROLLBACK' to continue:${NC}) " -r

if [[ $REPLY != "EMERGENCY ROLLBACK" ]]; then
    log "Emergency rollback cancelled by user"
    exit 1
fi

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi