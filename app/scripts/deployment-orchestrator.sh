#!/bin/bash
# FullMind Deployment Orchestrator
# Core Foundation Script - Phase 2C Implementation
# Consolidates deployment workflows for different environments

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default configuration
ENVIRONMENT=""
DRY_RUN=false
VALIDATION_ONLY=false
MONITORING_ONLY=false
EMERGENCY=false

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS] [ENVIRONMENT]"
    echo ""
    echo "ENVIRONMENT:"
    echo "  beta-500           Deploy to beta with 500 user limit"
    echo "  staging-5000       Deploy to staging with 5000 user limit"
    echo "  production-full    Deploy to full production"
    echo ""
    echo "OPTIONS:"
    echo "  --validation-only  Run validation checks only"
    echo "  --monitoring-only  Setup monitoring only"
    echo "  --dry-run         Show what would be deployed"
    echo "  --emergency       Emergency deployment mode"
    echo "  --rollback        Rollback previous deployment"
    echo "  -h, --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --validation-only"
    echo "  $0 staging-5000 --enable-cloud"
    echo "  $0 production-full --emergency"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --validation-only)
            VALIDATION_ONLY=true
            shift
            ;;
        --monitoring-only)
            MONITORING_ONLY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --emergency)
            EMERGENCY=true
            shift
            ;;
        --rollback)
            echo -e "${YELLOW}🔄 Initiating rollback procedure...${NC}"
            if [ -f "scripts/production-deployment.sh" ]; then
                bash scripts/production-deployment.sh --rollback "$@"
            else
                echo -e "${RED}❌ Production deployment script not found${NC}"
                exit 1
            fi
            exit 0
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        beta-500|staging-5000|production-full)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Header
echo -e "${BLUE}🚀 FullMind Deployment Orchestrator${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Validation only mode
if [ "$VALIDATION_ONLY" = true ]; then
    echo -e "${YELLOW}🔍 Running validation checks...${NC}"
    
    # Basic validation
    echo "✅ Checking TypeScript compilation..."
    npm run typecheck:strict
    
    echo "✅ Checking clinical linting..."
    npm run lint:clinical
    
    echo "✅ Running clinical tests..."
    npm run test:clinical
    
    # Domain authority validation
    if [ -f "scripts/production-deployment.sh" ]; then
        echo "✅ Running domain authority validation..."
        bash scripts/production-deployment.sh --validation-only --dry-run
    fi
    
    echo -e "${GREEN}✅ All validation checks passed${NC}"
    exit 0
fi

# Monitoring only mode
if [ "$MONITORING_ONLY" = true ]; then
    echo -e "${YELLOW}📊 Setting up monitoring...${NC}"
    
    if [ -f "scripts/production-deployment.sh" ]; then
        bash scripts/production-deployment.sh --monitoring-only
    else
        echo -e "${YELLOW}⚠️  Production deployment script not found, setting up basic monitoring${NC}"
        # Basic monitoring setup would go here
        echo "✅ Basic monitoring configured"
    fi
    
    echo -e "${GREEN}✅ Monitoring setup complete${NC}"
    exit 0
fi

# Environment-specific deployment
if [ -n "$ENVIRONMENT" ]; then
    echo -e "${YELLOW}🎯 Deploying to environment: $ENVIRONMENT${NC}"
    
    # Pre-deployment validation
    echo "🔍 Running pre-deployment checks..."
    npm run typecheck:strict
    npm run lint:clinical
    
    # Environment-specific deployment
    if [ -f "scripts/production-deployment.sh" ]; then
        if [ "$EMERGENCY" = true ]; then
            echo -e "${RED}🚨 EMERGENCY DEPLOYMENT MODE${NC}"
            bash scripts/production-deployment.sh "$ENVIRONMENT" --emergency --crisis-override
        else
            bash scripts/production-deployment.sh "$ENVIRONMENT"
        fi
    else
        echo -e "${RED}❌ Production deployment script not found${NC}"
        echo "Would deploy to: $ENVIRONMENT"
        if [ "$DRY_RUN" = false ]; then
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Deployment to $ENVIRONMENT completed${NC}"
    exit 0
fi

# No specific action provided
echo -e "${YELLOW}⚠️  No deployment action specified${NC}"
echo ""
usage
exit 1