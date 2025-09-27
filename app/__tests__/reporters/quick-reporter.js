/**
 * Quick Test Reporter
 * Minimal, fast feedback for rapid development iteration
 */

class QuickReporter {
  constructor() {
    this.startTime = Date.now();
    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;
    this.crisisTests = [];
  }

  onRunStart() {
    console.log('⚡ Quick test mode - Fast feedback enabled\n');
  }

  onTestResult(test, testResult) {
    testResult.testResults.forEach(result => {
      this.testCount++;
      
      if (result.status === 'passed') {
        this.passCount++;
        // Quick success indicator for crisis tests
        if (this.isCrisisTest(result.fullName)) {
          console.log(`✅ Crisis: ${result.title}`);
          this.crisisTests.push({ name: result.fullName, status: 'passed' });
        }
      } else {
        this.failCount++;
        // Immediate failure feedback
        console.log(`❌ FAIL: ${result.fullName}`);
        if (this.isCrisisTest(result.fullName)) {
          console.log(`🚨 CRISIS TEST FAILED: ${result.fullName}`);
          this.crisisTests.push({ name: result.fullName, status: 'failed' });
        }
      }
    });
  }

  onRunComplete() {
    const duration = Date.now() - this.startTime;
    const successRate = Math.round((this.passCount / this.testCount) * 100);
    
    console.log('\n⚡ Quick Test Summary');
    console.log('==================');
    console.log(`Duration: ${duration}ms`);
    console.log(`Tests: ${this.passCount}/${this.testCount} passed (${successRate}%)`);
    
    if (this.crisisTests.length > 0) {
      const crisisPassed = this.crisisTests.filter(t => t.status === 'passed').length;
      console.log(`Crisis Tests: ${crisisPassed}/${this.crisisTests.length} passed`);
    }
    
    if (this.failCount === 0) {
      console.log('✅ All quick tests passed!');
    } else {
      console.log(`❌ ${this.failCount} test(s) failed`);
    }
    console.log('==================\n');
  }

  isCrisisTest(testName) {
    return /crisis|emergency|988/i.test(testName);
  }
}

module.exports = QuickReporter;