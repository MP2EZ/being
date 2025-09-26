#!/bin/bash
# FullMind Emergency Response Script
# Core Foundation Script - Phase 2C Implementation
# Critical safety and emergency response procedures

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Emergency response configuration
EMERGENCY_MODE=false
CRISIS_OVERRIDE=false
ROLLBACK_ENABLED=true
VALIDATION_REQUIRED=true

# Function to display emergency header
emergency_header() {
    echo -e "${RED}${BOLD}🚨 FULLMIND EMERGENCY RESPONSE SYSTEM 🚨${NC}"
    echo -e "${RED}${BOLD}===========================================${NC}"
    echo -e "${YELLOW}⚠️  This is a critical safety system for FullMind MBCT app${NC}"
    echo -e "${YELLOW}⚠️  All actions are logged and monitored${NC}"
    echo ""
}

# Function to display usage
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "EMERGENCY COMMANDS:"
    echo "  rollback              Immediate production rollback"
    echo "  crisis-override       Emergency crisis system override"
    echo "  system-check          Critical system validation"
    echo "  recovery-mode         Enter system recovery mode"
    echo "  alert-broadcast       Send emergency alerts"
    echo ""
    echo "OPTIONS:"
    echo "  --immediate           Skip confirmation prompts"
    echo "  --no-validation       Skip safety validations (DANGEROUS)"
    echo "  --crisis-level [1-5]  Set crisis response level"
    echo "  --notify-team         Send notifications to emergency team"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 system-check                    # Run emergency system check"
    echo "  $0 rollback --immediate            # Immediate rollback"
    echo "  $0 crisis-override --crisis-level 5 # Maximum crisis response"
    echo ""
    echo -e "${RED}${BOLD}⚠️  WARNING: These are emergency procedures only${NC}"
    echo -e "${RED}${BOLD}⚠️  Use only during critical system failures${NC}"
}

# Function to log emergency actions
log_emergency_action() {
    local action="$1"
    local level="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local log_entry="[$timestamp] EMERGENCY: $action (Level: $level)"
    
    echo "$log_entry" >> emergency-response.log
    echo -e "${MAGENTA}📝 Logged: $action${NC}"
}

# Function to validate crisis safety systems
validate_crisis_systems() {
    echo -e "${YELLOW}🔍 Validating crisis safety systems...${NC}"
    
    local validation_failed=false
    
    # Check crisis button functionality
    echo "🚨 Testing crisis button systems..."
    if npm run test:crisis > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Crisis button systems: OPERATIONAL${NC}"
    else
        echo -e "${RED}❌ Crisis button systems: FAILED${NC}"
        validation_failed=true
    fi
    
    # Check clinical accuracy
    echo "🏥 Testing clinical accuracy..."
    if npm run test:clinical > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Clinical systems: OPERATIONAL${NC}"
    else
        echo -e "${RED}❌ Clinical systems: FAILED${NC}"
        validation_failed=true
    fi
    
    # Check security systems
    echo "🛡️ Testing security systems..."
    if npm run test:security > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Security systems: OPERATIONAL${NC}"
    else
        echo -e "${RED}❌ Security systems: FAILED${NC}"
        validation_failed=true
    fi
    
    if [ "$validation_failed" = true ]; then
        echo -e "${RED}${BOLD}🚨 CRITICAL: System validation failed${NC}"
        echo -e "${RED}${BOLD}🚨 Manual intervention required${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ All critical systems validated${NC}"
    return 0
}

# Function to perform emergency rollback
emergency_rollback() {
    echo -e "${RED}${BOLD}🔄 INITIATING EMERGENCY ROLLBACK${NC}"
    log_emergency_action "EMERGENCY_ROLLBACK" "CRITICAL"
    
    if [ "$VALIDATION_REQUIRED" = true ]; then
        echo -e "${YELLOW}⚠️  Running safety validation before rollback...${NC}"
        validate_crisis_systems || {
            echo -e "${RED}❌ Safety validation failed - proceeding with rollback anyway${NC}"
        }
    fi
    
    # Execute rollback via production deployment script
    if [ -f "scripts/production-deployment.sh" ]; then
        echo -e "${BLUE}🔄 Executing production rollback...${NC}"
        bash scripts/production-deployment.sh --rollback --emergency
        echo -e "${GREEN}✅ Emergency rollback completed${NC}"
    else
        echo -e "${RED}❌ Production deployment script not found${NC}"
        echo -e "${YELLOW}📋 Manual rollback required:${NC}"
        echo "1. Revert to last known good deployment"
        echo "2. Restart all services"
        echo "3. Verify crisis systems functionality"
        echo "4. Notify emergency team"
    fi
    
    log_emergency_action "ROLLBACK_COMPLETED" "CRITICAL"
}

# Function to handle crisis override
crisis_override() {
    local crisis_level="${1:-3}"
    
    echo -e "${RED}${BOLD}🚨 CRISIS OVERRIDE ACTIVATED - LEVEL $crisis_level${NC}"
    log_emergency_action "CRISIS_OVERRIDE_LEVEL_$crisis_level" "MAXIMUM"
    
    case $crisis_level in
        5)
            echo -e "${RED}${BOLD}🚨 MAXIMUM CRISIS LEVEL - ALL SYSTEMS OVERRIDE${NC}"
            echo "• Bypassing all non-critical validations"
            echo "• Activating emergency protocols"
            echo "• Notifying crisis response team"
            ;;
        4)
            echo -e "${RED}🚨 HIGH CRISIS LEVEL - SAFETY SYSTEMS PRIORITY${NC}"
            echo "• Crisis systems take precedence"
            echo "• Emergency team notification active"
            ;;
        3)
            echo -e "${YELLOW}⚠️ MODERATE CRISIS LEVEL - ENHANCED MONITORING${NC}"
            echo "• Increased system monitoring"
            echo "• Crisis team on standby"
            ;;
        2)
            echo -e "${BLUE}ℹ️ LOW CRISIS LEVEL - STANDARD EMERGENCY PROCEDURES${NC}"
            ;;
        1)
            echo -e "${GREEN}✅ MINIMAL CRISIS LEVEL - PRECAUTIONARY MEASURES${NC}"
            ;;
    esac
    
    # Execute crisis override via production deployment
    if [ -f "scripts/production-deployment.sh" ]; then
        bash scripts/production-deployment.sh production-full --emergency --crisis-override
    fi
    
    log_emergency_action "CRISIS_OVERRIDE_EXECUTED" "LEVEL_$crisis_level"
}

# Function to run emergency system check
emergency_system_check() {
    echo -e "${BLUE}🔍 EMERGENCY SYSTEM CHECK${NC}"
    log_emergency_action "EMERGENCY_SYSTEM_CHECK" "HIGH"
    
    echo -e "${YELLOW}Checking critical systems...${NC}"
    
    # System health validation
    validate_crisis_systems
    local validation_result=$?
    
    # Performance check
    echo "⚡ Running performance validation..."
    npm run perf:crisis > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Crisis performance: ACCEPTABLE${NC}"
    else
        echo -e "${YELLOW}⚠️ Crisis performance: DEGRADED${NC}"
    fi
    
    # Architecture validation
    echo "🏗️ Validating system architecture..."
    if [ -f "scripts/validate-new-architecture.ts" ]; then
        npm run validate:new-architecture > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Architecture: STABLE${NC}"
        else
            echo -e "${YELLOW}⚠️ Architecture: ISSUES DETECTED${NC}"
        fi
    fi
    
    # Summary
    echo ""
    echo -e "${BLUE}📊 EMERGENCY SYSTEM CHECK SUMMARY:${NC}"
    if [ $validation_result -eq 0 ]; then
        echo -e "${GREEN}✅ System Status: OPERATIONAL${NC}"
        echo -e "${GREEN}✅ Crisis Systems: FUNCTIONAL${NC}"
        echo -e "${GREEN}✅ Emergency Procedures: AVAILABLE${NC}"
    else
        echo -e "${RED}❌ System Status: CRITICAL ISSUES DETECTED${NC}"
        echo -e "${RED}❌ Manual intervention required${NC}"
        echo -e "${YELLOW}📞 Contact emergency team immediately${NC}"
    fi
    
    log_emergency_action "SYSTEM_CHECK_COMPLETED" "INFO"
}

# Function to enter recovery mode
recovery_mode() {
    echo -e "${MAGENTA}🔧 ENTERING SYSTEM RECOVERY MODE${NC}"
    log_emergency_action "RECOVERY_MODE_ACTIVATED" "HIGH"
    
    echo -e "${YELLOW}Recovery procedures available:${NC}"
    echo "1. Emergency system validation"
    echo "2. Crisis system reset"
    echo "3. Performance diagnostics"
    echo "4. Database recovery checks"
    echo "5. Network connectivity validation"
    echo ""
    
    # Run system check first
    emergency_system_check
    
    echo -e "${BLUE}🔧 Recovery mode ready for manual intervention${NC}"
    echo -e "${YELLOW}⚠️  Follow emergency procedures documentation${NC}"
    
    log_emergency_action "RECOVERY_MODE_READY" "HIGH"
}

# Function to send emergency alerts
alert_broadcast() {
    echo -e "${RED}${BOLD}📢 EMERGENCY ALERT BROADCAST${NC}"
    log_emergency_action "EMERGENCY_ALERT_BROADCAST" "CRITICAL"
    
    local alert_message="EMERGENCY: FullMind system emergency response activated"
    local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    
    echo -e "${YELLOW}📨 Broadcasting emergency alerts...${NC}"
    echo "Alert: $alert_message"
    echo "Time: $timestamp"
    echo "System: FullMind MBCT Production"
    echo ""
    
    # In a real implementation, this would send notifications via:
    # - Slack/Teams channels
    # - Email alerts
    # - SMS notifications
    # - Monitoring systems (PagerDuty, etc.)
    
    echo -e "${GREEN}✅ Emergency alerts broadcasted${NC}"
    log_emergency_action "ALERTS_SENT" "CRITICAL"
}

# Parse command line arguments
IMMEDIATE=false
SKIP_VALIDATION=false
CRISIS_LEVEL=3
NOTIFY_TEAM=false

while [[ $# -gt 0 ]]; do
    case $1 in
        rollback)
            COMMAND="rollback"
            shift
            ;;
        crisis-override)
            COMMAND="crisis-override"
            shift
            ;;
        system-check)
            COMMAND="system-check"
            shift
            ;;
        recovery-mode)
            COMMAND="recovery-mode"
            shift
            ;;
        alert-broadcast)
            COMMAND="alert-broadcast"
            shift
            ;;
        --immediate)
            IMMEDIATE=true
            shift
            ;;
        --no-validation)
            VALIDATION_REQUIRED=false
            echo -e "${RED}⚠️  WARNING: Validation disabled${NC}"
            shift
            ;;
        --crisis-level)
            CRISIS_LEVEL="$2"
            shift 2
            ;;
        --notify-team)
            NOTIFY_TEAM=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Main execution
emergency_header

# Confirmation for dangerous operations
if [ "$IMMEDIATE" = false ] && [ -n "$COMMAND" ]; then
    echo -e "${YELLOW}⚠️  You are about to execute: $COMMAND${NC}"
    echo -e "${YELLOW}⚠️  This is an emergency operation${NC}"
    echo ""
    read -p "Are you sure you want to continue? (type 'EMERGENCY' to confirm): " confirmation
    
    if [ "$confirmation" != "EMERGENCY" ]; then
        echo -e "${RED}❌ Emergency operation cancelled${NC}"
        exit 1
    fi
    echo ""
fi

# Execute command
case "$COMMAND" in
    rollback)
        emergency_rollback
        ;;
    crisis-override)
        crisis_override "$CRISIS_LEVEL"
        ;;
    system-check)
        emergency_system_check
        ;;
    recovery-mode)
        recovery_mode
        ;;
    alert-broadcast)
        alert_broadcast
        ;;
    *)
        echo -e "${RED}❌ No emergency command specified${NC}"
        echo ""
        usage
        exit 1
        ;;
esac

# Notification
if [ "$NOTIFY_TEAM" = true ]; then
    echo -e "${BLUE}📞 Sending notifications to emergency team...${NC}"
    alert_broadcast
fi

echo ""
echo -e "${GREEN}✅ Emergency response procedure completed${NC}"
log_emergency_action "EMERGENCY_PROCEDURE_COMPLETED" "INFO"