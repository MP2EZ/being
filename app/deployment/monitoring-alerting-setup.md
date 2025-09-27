# Crisis Detection Monitoring & Alerting Setup
## DRD-FLOW-005 Standalone Assessments - Production Monitoring

### Overview
This document establishes comprehensive monitoring and alerting for crisis detection systems, ensuring <200ms response times and 100% availability of life-saving features.

## Critical Monitoring Architecture

### Core Monitoring Stack
- **Sentry**: Error tracking and performance monitoring
- **Supabase Metrics**: Database performance and query analysis  
- **EAS Insights**: Build and deployment monitoring
- **Custom Dashboard**: Real-time crisis metrics and health checks

### Alert Severity Levels
- **P0 - Critical**: Crisis detection failure, immediate response required
- **P1 - High**: Performance degradation affecting user safety
- **P2 - Medium**: Non-critical feature issues
- **P3 - Low**: Performance optimization opportunities

## Crisis Detection Monitoring

### P0 Critical Metrics

#### 1. Crisis Response Time Monitoring
```javascript
// scripts/monitoring/crisis-response-monitor.js
const CrisisResponseMonitor = {
  threshold: 200, // milliseconds
  checkInterval: 30000, // 30 seconds
  
  async measureCrisisResponse() {
    const startTime = Date.now();
    
    try {
      // Simulate crisis button press
      const response = await fetch('/api/crisis/simulate-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (responseTime > this.threshold) {
        await this.triggerCriticalAlert({
          metric: 'crisis_response_time',
          value: responseTime,
          threshold: this.threshold,
          severity: 'P0'
        });
      }
      
      return responseTime;
    } catch (error) {
      await this.triggerCriticalAlert({
        metric: 'crisis_detection_failure',
        error: error.message,
        severity: 'P0'
      });
      throw error;
    }
  },
  
  async triggerCriticalAlert(alert) {
    // Immediate notification to crisis team
    await this.notifySlack('#crisis-alerts', alert);
    await this.notifyPagerDuty(alert);
    await this.notifyEmail(['crisis-team@being.app', 'on-call@being.app']);
  }
};

// Run continuous monitoring
setInterval(() => {
  CrisisResponseMonitor.measureCrisisResponse();
}, CrisisResponseMonitor.checkInterval);
```

#### 2. 988 Hotline Availability Monitoring
```javascript
// scripts/monitoring/hotline-monitor.js
const HotlineMonitor = {
  async verify988Availability() {
    try {
      // Check if 988 integration is operational
      const response = await fetch('/api/crisis/988/status');
      const status = await response.json();
      
      if (!status.available || !status.reachable) {
        await this.triggerP0Alert({
          metric: '988_hotline_unavailable',
          status: status,
          severity: 'P0',
          message: 'CRITICAL: 988 Suicide Prevention Lifeline unreachable'
        });
      }
      
      return status;
    } catch (error) {
      await this.triggerP0Alert({
        metric: '988_integration_failure',
        error: error.message,
        severity: 'P0'
      });
    }
  },
  
  async triggerP0Alert(alert) {
    // Multiple redundant notification channels
    const notifications = [
      this.notifySlack('#crisis-emergency'),
      this.notifyPagerDuty(alert),
      this.notifyPhone(['+1-555-CRISIS']),
      this.notifyEmail(['crisis-director@being.app'])
    ];
    
    await Promise.all(notifications);
  }
};
```

#### 3. Assessment Accuracy Monitoring
```javascript
// scripts/monitoring/clinical-accuracy-monitor.js
const ClinicalAccuracyMonitor = {
  async validateAssessmentAccuracy() {
    const testCases = [
      // PHQ-9 test cases
      { type: 'PHQ9', responses: [3,3,3,3,3,3,3,3,3], expectedScore: 27 },
      { type: 'PHQ9', responses: [2,2,2,2,2,2,2,2,2], expectedScore: 18 },
      { type: 'PHQ9', responses: [1,1,1,1,1,1,1,1,1], expectedScore: 9 },
      
      // GAD-7 test cases
      { type: 'GAD7', responses: [3,3,3,3,3,3,3], expectedScore: 21 },
      { type: 'GAD7', responses: [2,2,2,2,2,2,2], expectedScore: 14 },
      { type: 'GAD7', responses: [1,1,1,1,1,1,1], expectedScore: 7 }
    ];
    
    for (const testCase of testCases) {
      const result = await this.testAssessmentScoring(testCase);
      
      if (result.calculatedScore !== testCase.expectedScore) {
        await this.triggerClinicalAlert({
          metric: 'assessment_scoring_error',
          testCase: testCase,
          expected: testCase.expectedScore,
          actual: result.calculatedScore,
          severity: 'P0',
          message: `CRITICAL: ${testCase.type} scoring accuracy failure`
        });
      }
    }
  },
  
  async testAssessmentScoring(testCase) {
    const response = await fetch('/api/assessments/calculate-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase)
    });
    
    return await response.json();
  }
};
```

### P1 High Priority Metrics

#### Performance Degradation Monitoring
```javascript
// scripts/monitoring/performance-monitor.js
const PerformanceMonitor = {
  thresholds: {
    appLaunch: 3000,      // 3 seconds (warning at 2s target)
    crisisButton: 200,     // 200ms (critical threshold)
    assessmentLoad: 500,   // 500ms (warning at 300ms target)
    breathingFps: 55       // 55fps (warning at 60fps target)
  },
  
  async monitorAppPerformance() {
    const metrics = await this.collectPerformanceMetrics();
    
    for (const [metric, value] of Object.entries(metrics)) {
      const threshold = this.thresholds[metric];
      
      if (value > threshold) {
        const severity = metric === 'crisisButton' ? 'P0' : 'P1';
        
        await this.triggerPerformanceAlert({
          metric,
          value,
          threshold,
          severity,
          impact: this.getImpactDescription(metric)
        });
      }
    }
  },
  
  getImpactDescription(metric) {
    const impacts = {
      appLaunch: 'Users may abandon app during startup',
      crisisButton: 'CRITICAL: Crisis intervention delayed',
      assessmentLoad: 'Assessment experience degraded',
      breathingFps: 'Therapeutic breathing exercise impacted'
    };
    
    return impacts[metric] || 'Performance degradation detected';
  }
};
```

## Real-Time Dashboard Setup

### Crisis Metrics Dashboard
```javascript
// dashboard/crisis-metrics.js
const CrisisDashboard = {
  metrics: {
    crisisResponseTime: { 
      current: 0, 
      target: 150, 
      threshold: 200,
      status: 'healthy'
    },
    hotlineAvailability: {
      current: 100,
      target: 100,
      threshold: 99.9,
      status: 'healthy'
    },
    crisisDetectionAccuracy: {
      current: 100,
      target: 100,
      threshold: 99.9,
      status: 'healthy'
    },
    emergencyContactSuccess: {
      current: 99.8,
      target: 99.5,
      threshold: 95,
      status: 'healthy'
    }
  },
  
  async updateMetrics() {
    // Fetch real-time metrics from monitoring endpoints
    const updates = await Promise.all([
      this.fetchCrisisResponseTime(),
      this.fetchHotlineStatus(),
      this.fetchDetectionAccuracy(),
      this.fetchContactSuccess()
    ]);
    
    this.updateDashboard(updates);
  },
  
  updateDashboard(updates) {
    // Update dashboard UI with real-time data
    // Implement color-coded status indicators
    // Red: Critical issues
    // Yellow: Warning levels
    // Green: Healthy status
  }
};
```

### Health Check Endpoints

#### Crisis System Health
```javascript
// api/health/crisis.js
export async function GET(request) {
  const healthChecks = {
    crisisDetection: await checkCrisisDetection(),
    hotline988: await check988Integration(),
    emergencyContacts: await checkEmergencyContacts(),
    responseTime: await measureResponseTime()
  };
  
  const allHealthy = Object.values(healthChecks).every(check => check.healthy);
  
  return Response.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: healthChecks
  }, {
    status: allHealthy ? 200 : 503
  });
}

async function checkCrisisDetection() {
  try {
    const startTime = Date.now();
    // Simulate crisis detection
    await simulateCrisisDetection();
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: responseTime < 200,
      responseTime,
      threshold: 200
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}
```

## Alerting Configuration

### Slack Integration
```javascript
// scripts/alerting/slack-alerts.js
const SlackAlerter = {
  webhooks: {
    critical: process.env.SLACK_WEBHOOK_CRITICAL,
    warning: process.env.SLACK_WEBHOOK_WARNING,
    info: process.env.SLACK_WEBHOOK_INFO
  },
  
  async sendCrisisAlert(alert) {
    const message = {
      channel: '#crisis-alerts',
      username: 'Crisis Monitor',
      icon_emoji: ':rotating_light:',
      attachments: [{
        color: 'danger',
        title: `🚨 CRISIS SYSTEM ALERT - ${alert.severity}`,
        text: alert.message,
        fields: [
          { title: 'Metric', value: alert.metric, short: true },
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Timestamp', value: new Date().toISOString(), short: true },
          { title: 'Response Required', value: 'IMMEDIATE', short: true }
        ],
        footer: 'Being Crisis Monitoring System'
      }]
    };
    
    await this.sendWebhook(this.webhooks.critical, message);
  },
  
  async sendPerformanceAlert(alert) {
    const severity = alert.severity === 'P0' ? 'danger' : 'warning';
    const color = alert.severity === 'P0' ? 'danger' : '#ffaa00';
    
    const message = {
      channel: '#performance-alerts',
      attachments: [{
        color,
        title: `📊 Performance Alert - ${alert.severity}`,
        text: `${alert.metric}: ${alert.value}ms (threshold: ${alert.threshold}ms)`,
        fields: [
          { title: 'Impact', value: alert.impact, short: false }
        ]
      }]
    };
    
    await this.sendWebhook(this.webhooks.warning, message);
  }
};
```

### PagerDuty Integration
```javascript
// scripts/alerting/pagerduty-alerts.js
const PagerDutyAlerter = {
  serviceKey: process.env.PAGERDUTY_SERVICE_KEY,
  
  async triggerIncident(alert) {
    const incident = {
      routing_key: this.serviceKey,
      event_action: 'trigger',
      dedup_key: `crisis-${alert.metric}-${Date.now()}`,
      payload: {
        summary: `Crisis System Alert: ${alert.metric}`,
        severity: this.mapSeverity(alert.severity),
        source: 'being-crisis-monitor',
        component: 'crisis-detection',
        group: 'mental-health-safety',
        class: 'crisis-intervention',
        custom_details: alert
      }
    };
    
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident)
    });
    
    if (!response.ok) {
      console.error('PagerDuty alert failed:', await response.text());
    }
  },
  
  mapSeverity(severity) {
    const mapping = {
      'P0': 'critical',
      'P1': 'error',
      'P2': 'warning',
      'P3': 'info'
    };
    return mapping[severity] || 'error';
  }
};
```

## Automated Response System

### Auto-Healing for Non-Critical Issues
```javascript
// scripts/auto-healing/performance-optimizer.js
const AutoHealer = {
  async handlePerformanceDegradation(alert) {
    switch (alert.metric) {
      case 'appLaunch':
        await this.clearAppCache();
        await this.optimizeAssetLoading();
        break;
        
      case 'assessmentLoad':
        await this.preloadAssessmentData();
        await this.optimizeDatabase();
        break;
        
      case 'breathingFps':
        await this.reduceAnimationComplexity();
        await this.enablePerformanceMode();
        break;
        
      default:
        console.log(`No auto-healing available for ${alert.metric}`);
    }
  },
  
  async clearAppCache() {
    // Trigger cache cleanup for improved performance
  },
  
  async optimizeAssetLoading() {
    // Enable asset compression and lazy loading
  }
};
```

### Crisis System Failover
```javascript
// scripts/auto-healing/crisis-failover.js
const CrisisFailover = {
  async handleCrisisSystemFailure(alert) {
    console.log('🚨 INITIATING CRISIS SYSTEM FAILOVER');
    
    // 1. Enable backup crisis detection
    await this.enableBackupCrisisSystem();
    
    // 2. Switch to direct 988 integration
    await this.enableDirect988Mode();
    
    // 3. Activate emergency contact failover
    await this.activateEmergencyFailover();
    
    // 4. Notify all stakeholders
    await this.notifyEmergencyTeam(alert);
  },
  
  async enableBackupCrisisSystem() {
    // Switch to redundant crisis detection system
  },
  
  async enableDirect988Mode() {
    // Bypass app routing, direct phone integration
  }
};
```

## Monitoring Scripts

### Production Health Check Script
```bash
#!/bin/bash
# scripts/monitoring/production-health-check.sh

echo "🔍 Running Production Health Checks..."

# Crisis system checks
echo "Checking crisis detection system..."
CRISIS_RESPONSE=$(curl -s -w "%{time_total}" -o /dev/null https://api.being.app/health/crisis)
if (( $(echo "$CRISIS_RESPONSE > 0.2" | bc -l) )); then
    echo "❌ Crisis response time: ${CRISIS_RESPONSE}s (>200ms threshold)"
    npm run alert:crisis-response-slow
else
    echo "✅ Crisis response time: ${CRISIS_RESPONSE}s"
fi

# 988 hotline check
echo "Checking 988 hotline integration..."
HOTLINE_STATUS=$(curl -s https://api.being.app/crisis/988/status | jq -r '.available')
if [ "$HOTLINE_STATUS" != "true" ]; then
    echo "❌ 988 hotline unavailable"
    npm run alert:hotline-unavailable
else
    echo "✅ 988 hotline operational"
fi

# Clinical accuracy check
echo "Checking assessment accuracy..."
npm run test:clinical --silent
if [ $? -ne 0 ]; then
    echo "❌ Clinical accuracy test failed"
    npm run alert:clinical-accuracy-failure
else
    echo "✅ Clinical accuracy validated"
fi

# Performance checks
echo "Checking performance metrics..."
npm run perf:crisis --silent
if [ $? -ne 0 ]; then
    echo "❌ Performance benchmarks not met"
    npm run alert:performance-degradation
else
    echo "✅ Performance benchmarks met"
fi

echo "✅ Production health checks completed"
```

### Continuous Monitoring Setup
```bash
# Add to package.json scripts
"monitor:production": "node scripts/monitoring/continuous-monitor.js",
"monitor:crisis": "node scripts/monitoring/crisis-monitor.js",
"monitor:performance": "node scripts/monitoring/performance-monitor.js",
"alert:crisis-response-slow": "node scripts/alerting/crisis-alerts.js response-time",
"alert:hotline-unavailable": "node scripts/alerting/crisis-alerts.js hotline",
"alert:clinical-accuracy-failure": "node scripts/alerting/crisis-alerts.js clinical",
"alert:performance-degradation": "node scripts/alerting/performance-alerts.js degradation"
```

### Cron Job Setup
```bash
# Set up continuous monitoring
# Add to system crontab
*/1 * * * * cd /app && npm run monitor:crisis
*/5 * * * * cd /app && npm run monitor:performance
*/15 * * * * cd /app && ./scripts/monitoring/production-health-check.sh
```

## Success Metrics

### Monitoring Effectiveness KPIs
- **Alert Accuracy**: >95% of alerts require action
- **Response Time**: <2 minutes for P0 alerts
- **False Positive Rate**: <5% of total alerts
- **System Uptime**: 99.99% crisis detection availability

### Crisis Detection Metrics
- **Response Time**: <200ms (99.9% of requests)
- **Detection Accuracy**: 100% crisis threshold identification
- **Hotline Availability**: 100% 988 reachability
- **Emergency Contact Success**: >99.5% contact rate

This comprehensive monitoring and alerting setup ensures immediate detection and response to any issues affecting the safety-critical crisis detection systems while maintaining optimal performance for all therapeutic features.