#!/bin/bash

# Cross-Device Sync Test Execution Script
# Comprehensive testing for the complete cross-device sync system

set -e

echo "🚀 Starting Cross-Device Sync Test Suite"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_CONFIG="__tests__/cross-device-sync/test-runner.config.js"
RESULTS_DIR="./test-results/cross-device-sync"
COVERAGE_DIR="./coverage/cross-device-sync"

# Create results directory
mkdir -p "$RESULTS_DIR"
mkdir -p "$COVERAGE_DIR"

# Function to run tests with proper error handling
run_test_suite() {
    local suite_name="$1"
    local test_pattern="$2"
    local description="$3"

    echo -e "\n${BLUE}📋 Running $suite_name${NC}"
    echo "Description: $description"
    echo "Pattern: $test_pattern"
    echo "----------------------------------------"

    if npm test -- --config="$TEST_CONFIG" --testNamePattern="$test_pattern" --verbose; then
        echo -e "${GREEN}✅ $suite_name completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ $suite_name failed${NC}"
        return 1
    fi
}

# Function to check performance requirements
check_performance_requirements() {
    echo -e "\n${BLUE}🔍 Checking Performance Requirements${NC}"
    echo "----------------------------------------"

    if [ -f "$RESULTS_DIR/performance-report.json" ]; then
        # Check crisis response times
        CRISIS_VIOLATIONS=$(node -e "
            const report = require('./$RESULTS_DIR/performance-report.json');
            const violations = report.violations?.filter(v => v.type === 'CRISIS_RESPONSE_TIME_VIOLATION') || [];
            console.log(violations.length);
        ")

        if [ "$CRISIS_VIOLATIONS" -eq 0 ]; then
            echo -e "${GREEN}✅ Crisis response times within 200ms requirement${NC}"
        else
            echo -e "${RED}❌ $CRISIS_VIOLATIONS crisis response time violations detected${NC}"
            return 1
        fi

        # Check memory usage
        MEMORY_VIOLATIONS=$(node -e "
            const report = require('./$RESULTS_DIR/performance-report.json');
            const violations = report.violations?.filter(v => v.type === 'MEMORY_USAGE_VIOLATION') || [];
            console.log(violations.length);
        ")

        if [ "$MEMORY_VIOLATIONS" -eq 0 ]; then
            echo -e "${GREEN}✅ Memory usage within 50MB limit${NC}"
        else
            echo -e "${RED}❌ $MEMORY_VIOLATIONS memory usage violations detected${NC}"
            return 1
        fi

        # Check success rate
        SUCCESS_RATE=$(node -e "
            const report = require('./$RESULTS_DIR/performance-report.json');
            const rate = report.statistics?.overallSuccessRate?.rate || 0;
            console.log((rate * 100).toFixed(1));
        ")

        if (( $(echo "$SUCCESS_RATE >= 95" | bc -l) )); then
            echo -e "${GREEN}✅ Success rate ${SUCCESS_RATE}% meets 95% requirement${NC}"
        else
            echo -e "${RED}❌ Success rate ${SUCCESS_RATE}% below 95% requirement${NC}"
            return 1
        fi

    else
        echo -e "${YELLOW}⚠️ Performance report not found, skipping validation${NC}"
    fi
}

# Function to check security requirements
check_security_requirements() {
    echo -e "\n${BLUE}🔒 Checking Security Requirements${NC}"
    echo "----------------------------------------"

    if [ -f "$RESULTS_DIR/security-report.json" ]; then
        # Check encryption validation
        ENCRYPTION_VALID=$(node -e "
            const report = require('./$RESULTS_DIR/security-report.json');
            console.log(report.encryptionValidation?.passed ? 'true' : 'false');
        ")

        if [ "$ENCRYPTION_VALID" = "true" ]; then
            echo -e "${GREEN}✅ Encryption validation passed${NC}"
        else
            echo -e "${RED}❌ Encryption validation failed${NC}"
            return 1
        fi

        # Check audit trail
        AUDIT_COMPLETE=$(node -e "
            const report = require('./$RESULTS_DIR/security-report.json');
            console.log(report.auditTrail?.complete ? 'true' : 'false');
        ")

        if [ "$AUDIT_COMPLETE" = "true" ]; then
            echo -e "${GREEN}✅ Audit trail complete${NC}"
        else
            echo -e "${RED}❌ Audit trail incomplete${NC}"
            return 1
        fi

    else
        echo -e "${YELLOW}⚠️ Security report not found, skipping validation${NC}"
    fi
}

# Function to generate coverage report
generate_coverage_report() {
    echo -e "\n${BLUE}📊 Generating Coverage Report${NC}"
    echo "----------------------------------------"

    if npm test -- --config="$TEST_CONFIG" --coverage --coverageDirectory="$COVERAGE_DIR"; then
        echo -e "${GREEN}✅ Coverage report generated successfully${NC}"
        echo "📁 Coverage report: $COVERAGE_DIR/lcov-report/index.html"

        # Check critical component coverage
        CRITICAL_COVERAGE=$(node -e "
            const fs = require('fs');
            try {
                const summary = JSON.parse(fs.readFileSync('$COVERAGE_DIR/coverage-summary.json'));
                const criticalFiles = [
                    'src/services/cloud/CrossDeviceSyncAPI.ts',
                    'src/components/sync/SyncStatusIndicator.tsx'
                ];

                let allMeetRequirement = true;
                criticalFiles.forEach(file => {
                    const coverage = summary[file];
                    if (coverage && coverage.lines.pct < 95) {
                        console.log('Failed: ' + file + ' (' + coverage.lines.pct + '%)');
                        allMeetRequirement = false;
                    }
                });

                console.log(allMeetRequirement ? 'true' : 'false');
            } catch (e) {
                console.log('false');
            }
        ")

        if [ "$CRITICAL_COVERAGE" = "true" ]; then
            echo -e "${GREEN}✅ Critical components meet 95% coverage requirement${NC}"
        else
            echo -e "${RED}❌ Some critical components below 95% coverage${NC}"
            return 1
        fi

    else
        echo -e "${RED}❌ Coverage report generation failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    local exit_code=0

    echo "🧪 Test Configuration: $TEST_CONFIG"
    echo "📁 Results Directory: $RESULTS_DIR"
    echo "📊 Coverage Directory: $COVERAGE_DIR"

    # Check if required files exist
    if [ ! -f "$TEST_CONFIG" ]; then
        echo -e "${RED}❌ Test configuration not found: $TEST_CONFIG${NC}"
        exit 1
    fi

    # Run test suites based on command line argument
    case "${1:-all}" in
        "unit")
            echo -e "\n${YELLOW}🔧 Running Unit Tests Only${NC}"
            run_test_suite "Unit Tests" "Unit Tests" "Fast unit tests for individual components" || exit_code=1
            ;;
        "integration")
            echo -e "\n${YELLOW}🔗 Running Integration Tests Only${NC}"
            run_test_suite "Integration Tests" "Integration Tests" "Multi-component workflow testing" || exit_code=1
            ;;
        "e2e")
            echo -e "\n${YELLOW}🎭 Running E2E Tests Only${NC}"
            run_test_suite "E2E Tests" "E2E Tests" "Complete user journey validation" || exit_code=1
            ;;
        "performance")
            echo -e "\n${YELLOW}⚡ Running Performance Tests Only${NC}"
            run_test_suite "Performance Tests" "Performance Tests" "Performance and resource validation" || exit_code=1
            check_performance_requirements || exit_code=1
            ;;
        "security")
            echo -e "\n${YELLOW}🔒 Running Security Tests Only${NC}"
            run_test_suite "Security Tests" "Security Tests" "Security and compliance validation" || exit_code=1
            check_security_requirements || exit_code=1
            ;;
        "crisis")
            echo -e "\n${YELLOW}🚨 Running Crisis Safety Tests Only${NC}"
            run_test_suite "Crisis Tests" "crisis.*response|emergency|Crisis" "Crisis safety and response validation" || exit_code=1
            ;;
        "coverage")
            echo -e "\n${YELLOW}📊 Generating Coverage Report Only${NC}"
            generate_coverage_report || exit_code=1
            ;;
        "all"|*)
            echo -e "\n${YELLOW}🔄 Running Complete Test Suite${NC}"

            # Run all test suites in order
            run_test_suite "Unit Tests" "Unit Tests" "Fast unit tests for individual components" || exit_code=1
            run_test_suite "Integration Tests" "Integration Tests" "Multi-component workflow testing" || exit_code=1
            run_test_suite "E2E Tests" "E2E Tests" "Complete user journey validation" || exit_code=1
            run_test_suite "Performance Tests" "Performance Tests" "Performance and resource validation" || exit_code=1
            run_test_suite "Security Tests" "Security Tests" "Security and compliance validation" || exit_code=1

            # Validate requirements
            check_performance_requirements || exit_code=1
            check_security_requirements || exit_code=1

            # Generate coverage report
            generate_coverage_report || exit_code=1
            ;;
    esac

    # Final summary
    echo -e "\n========================================"
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 Cross-Device Sync Test Suite PASSED${NC}"
        echo -e "${GREEN}✅ All requirements validated successfully${NC}"

        # Display key metrics if available
        if [ -f "$RESULTS_DIR/performance-report.json" ]; then
            echo -e "\n${BLUE}📈 Key Performance Metrics:${NC}"
            node -e "
                const report = require('./$RESULTS_DIR/performance-report.json');
                if (report.statistics?.crisisResponseTimes) {
                    console.log('  Crisis Response: ' + report.statistics.crisisResponseTimes.average.toFixed(2) + 'ms avg');
                }
                if (report.statistics?.memoryUsage) {
                    console.log('  Memory Peak: ' + (report.statistics.memoryUsage.peak / 1024 / 1024).toFixed(2) + 'MB');
                }
                if (report.statistics?.overallSuccessRate) {
                    console.log('  Success Rate: ' + (report.statistics.overallSuccessRate.rate * 100).toFixed(1) + '%');
                }
            " 2>/dev/null || true
        fi

        echo -e "\n${BLUE}📁 Generated Reports:${NC}"
        [ -f "$RESULTS_DIR/performance-report.json" ] && echo "  📊 Performance: $RESULTS_DIR/performance-report.json"
        [ -f "$RESULTS_DIR/security-report.json" ] && echo "  🔒 Security: $RESULTS_DIR/security-report.json"
        [ -f "$COVERAGE_DIR/lcov-report/index.html" ] && echo "  📈 Coverage: $COVERAGE_DIR/lcov-report/index.html"

    else
        echo -e "${RED}💥 Cross-Device Sync Test Suite FAILED${NC}"
        echo -e "${RED}❌ Some requirements not met - see output above${NC}"
    fi

    exit $exit_code
}

# Help function
show_help() {
    echo "Cross-Device Sync Test Suite"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  all         Run complete test suite (default)"
    echo "  unit        Run unit tests only"
    echo "  integration Run integration tests only"
    echo "  e2e         Run end-to-end tests only"
    echo "  performance Run performance tests only"
    echo "  security    Run security tests only"
    echo "  crisis      Run crisis safety tests only"
    echo "  coverage    Generate coverage report only"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 unit              # Run unit tests only"
    echo "  $0 performance       # Run performance validation"
    echo "  $0 crisis            # Run crisis safety tests"
    echo ""
    echo "Critical Requirements:"
    echo "  • Crisis response <200ms"
    echo "  • Memory usage <50MB"
    echo "  • Success rate >95%"
    echo "  • 95% coverage for critical components"
}

# Parse command line arguments
if [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run main function
main "$@"