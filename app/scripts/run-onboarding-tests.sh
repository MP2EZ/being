#!/bin/bash

# OnboardingScreen Simple Test Runner
# Following ExercisesScreen test patterns for basic validation

echo "🧪 Starting OnboardingScreen Simple Test Validation"
echo "======================================================"

# Set test environment
export NODE_ENV=test
export JEST_TIMEOUT=30000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}Running OnboardingScreen test suite...${NC}"

# Run the main test file
echo -e "\n${YELLOW}📋 Testing: OnboardingScreen.simple.test.tsx${NC}"

npx jest src/screens/__tests__/OnboardingScreen.simple.test.tsx \
  --verbose \
  --coverage \
  --coverageReporters=text \
  --testTimeout=30000 \
  --silent=false

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ OnboardingScreen tests PASSED${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ OnboardingScreen tests FAILED${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi

TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Summary
echo -e "\n======================================================"
echo -e "${BLUE}🏁 Test Execution Summary${NC}"
echo -e "======================================================"
echo -e "Total Test Suites: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "\n${GREEN}🎉 ALL TESTS PASSED! OnboardingScreen validation complete.${NC}"
  echo -e "${GREEN}✅ PHQ-9 scoring tests: 4 representative combinations${NC}"
  echo -e "${GREEN}✅ GAD-7 scoring tests: 4 representative combinations${NC}"
  echo -e "${GREEN}✅ Crisis detection: PHQ≥20, GAD≥15, Q9>0${NC}"
  echo -e "${GREEN}✅ Accessibility: 44pt targets, labels, crisis button${NC}"
  echo -e "${GREEN}✅ Performance: <200ms crisis detection${NC}"
  exit 0
else
  echo -e "\n${RED}💥 Some tests failed. Please review the output above.${NC}"
  exit 1
fi