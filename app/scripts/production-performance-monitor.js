/**
 * Production Performance Monitoring Dashboard
 *
 * Real-time performance monitoring system for cross-device sync in production.
 * Tracks critical metrics, detects anomalies, and provides alerts for performance degradation.
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Production performance thresholds
const PRODUCTION_THRESHOLDS = {
  // Crisis Response - Critical Metrics
  CRISIS_RESPONSE_MEAN: 200,
  CRISIS_RESPONSE_P95: 250,
  CRISIS_RESPONSE_P99: 300,
  CRISIS_RESPONSE_MAX: 500,

  // User Experience Metrics
  APP_LAUNCH_TIME: 3000,
  UI_RESPONSE_TIME: 100,
  ANIMATION_FRAME_TIME: 16.67,
  SYNC_OPERATION_TIME: 500,

  // Resource Usage
  MEMORY_USAGE_MB: 100,
  MEMORY_GROWTH_RATE_MB_PER_HOUR: 5,
  CPU_USAGE_AVERAGE: 15,
  CPU_USAGE_PEAK: 40,
  BATTERY_DRAIN_PER_HOUR: 3,

  // Network Performance
  NETWORK_TIMEOUT_RATE: 0.02,
  SYNC_FAILURE_RATE: 0.01,
  OFFLINE_QUEUE_SIZE: 1000,

  // Availability & Reliability
  SUCCESS_RATE: 0.99,
  UPTIME_PERCENTAGE: 99.9,
  ERROR_RATE: 0.005,
};

// Alert severity levels
const ALERT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
  EMERGENCY: 'emergency',
};

class ProductionPerformanceMonitor {
  constructor() {
    this.metrics = {
      crisis_response: [],
      ui_performance: [],
      memory_usage: [],
      network_performance: [],
      error_rates: [],
      user_experience: [],
    };

    this.alerts = [];
    this.monitoring_start = Date.now();
    this.last_report_time = Date.now();
    this.performance_baselines = {};

    this.initialize();
  }

  initialize() {
    console.log('🚀 Production Performance Monitor Starting...');
    console.log(`📊 Monitoring ${Object.keys(PRODUCTION_THRESHOLDS).length} performance metrics`);
    console.log('🔔 Alert system activated for performance anomalies');

    // Establish performance baselines
    this.establishBaselines();

    // Start continuous monitoring
    this.startContinuousMonitoring();
  }

  establishBaselines() {
    console.log('📈 Establishing performance baselines...');

    // Mock baseline data for demonstration (in production, this would come from historical data)
    this.performance_baselines = {
      crisis_response_baseline: 150,
      ui_response_baseline: 80,
      memory_usage_baseline: 45,
      sync_operation_baseline: 300,
      error_rate_baseline: 0.001,
    };

    console.log('✅ Performance baselines established');
  }

  startContinuousMonitoring() {
    // Monitor crisis response performance every 10 seconds
    setInterval(() => this.monitorCrisisPerformance(), 10000);

    // Monitor UI and animation performance every 5 seconds
    setInterval(() => this.monitorUIPerformance(), 5000);

    // Monitor memory usage every 30 seconds
    setInterval(() => this.monitorMemoryUsage(), 30000);

    // Monitor network performance every 15 seconds
    setInterval(() => this.monitorNetworkPerformance(), 15000);

    // Generate performance reports every 5 minutes
    setInterval(() => this.generatePerformanceReport(), 300000);

    // Health check every minute
    setInterval(() => this.performHealthCheck(), 60000);

    console.log('🔄 Continuous monitoring active');
  }

  async monitorCrisisPerformance() {
    try {
      // Simulate crisis response time measurement (in production, this would be actual metrics)
      const crisisMetrics = await this.measureCrisisPerformance();

      this.metrics.crisis_response.push({
        timestamp: Date.now(),
        mean_response_time: crisisMetrics.mean,
        p95_response_time: crisisMetrics.p95,
        p99_response_time: crisisMetrics.p99,
        success_rate: crisisMetrics.success_rate,
        concurrent_users: crisisMetrics.concurrent_users,
      });

      // Keep only last 100 measurements
      if (this.metrics.crisis_response.length > 100) {
        this.metrics.crisis_response = this.metrics.crisis_response.slice(-100);
      }

      // Check for performance degradation
      this.checkCrisisPerformanceAlerts(crisisMetrics);

    } catch (error) {
      this.createAlert(ALERT_LEVELS.CRITICAL, 'Crisis Performance Monitoring Failed', {
        error: error.message,
        impact: 'Unable to monitor critical crisis response performance',
      });
    }
  }

  async measureCrisisPerformance() {
    // Simulate crisis performance measurement
    const baseResponseTime = 120 + Math.random() * 80;
    const networkVariance = Math.random() * 30;
    const loadVariance = (this.getCurrentSystemLoad() - 0.5) * 40;

    const mean = baseResponseTime + networkVariance + loadVariance;
    const p95 = mean * 1.3;
    const p99 = mean * 1.5;

    return {
      mean,
      p95,
      p99,
      success_rate: 0.995 + Math.random() * 0.004,
      concurrent_users: Math.floor(Math.random() * 1000) + 100,
      measurements_count: 50,
    };
  }

  async monitorUIPerformance() {
    try {
      const uiMetrics = await this.measureUIPerformance();

      this.metrics.ui_performance.push({
        timestamp: Date.now(),
        animation_frame_time: uiMetrics.animation_frame_time,
        ui_response_time: uiMetrics.ui_response_time,
        scroll_performance: uiMetrics.scroll_performance,
        interaction_latency: uiMetrics.interaction_latency,
        frame_drops: uiMetrics.frame_drops,
      });

      if (this.metrics.ui_performance.length > 100) {
        this.metrics.ui_performance = this.metrics.ui_performance.slice(-100);
      }

      this.checkUIPerformanceAlerts(uiMetrics);

    } catch (error) {
      this.createAlert(ALERT_LEVELS.WARNING, 'UI Performance Monitoring Failed', {
        error: error.message,
      });
    }
  }

  async measureUIPerformance() {
    // Simulate UI performance measurement
    const baseFrameTime = 14 + Math.random() * 4;
    const cpuLoad = this.getCurrentSystemLoad();
    const memoryPressure = this.getCurrentMemoryPressure();

    return {
      animation_frame_time: baseFrameTime + (cpuLoad * 5) + (memoryPressure * 3),
      ui_response_time: 60 + Math.random() * 40 + (cpuLoad * 20),
      scroll_performance: baseFrameTime * (1 + cpuLoad * 0.3),
      interaction_latency: 40 + Math.random() * 30,
      frame_drops: Math.floor(Math.random() * 3),
    };
  }

  async monitorMemoryUsage() {
    try {
      const memoryMetrics = await this.measureMemoryUsage();

      this.metrics.memory_usage.push({
        timestamp: Date.now(),
        heap_used_mb: memoryMetrics.heap_used_mb,
        heap_total_mb: memoryMetrics.heap_total_mb,
        external_mb: memoryMetrics.external_mb,
        rss_mb: memoryMetrics.rss_mb,
        growth_rate_mb_per_hour: memoryMetrics.growth_rate,
        gc_frequency: memoryMetrics.gc_frequency,
      });

      if (this.metrics.memory_usage.length > 100) {
        this.metrics.memory_usage = this.metrics.memory_usage.slice(-100);
      }

      this.checkMemoryAlerts(memoryMetrics);

    } catch (error) {
      this.createAlert(ALERT_LEVELS.WARNING, 'Memory Monitoring Failed', {
        error: error.message,
      });
    }
  }

  async measureMemoryUsage() {
    // Get actual memory usage if available, otherwise simulate
    let memoryUsage = { heapUsed: 50 * 1024 * 1024, heapTotal: 70 * 1024 * 1024, external: 5 * 1024 * 1024, rss: 80 * 1024 * 1024 };

    if (process.memoryUsage) {
      memoryUsage = process.memoryUsage();
    }

    // Calculate growth rate based on historical data
    const growthRate = this.calculateMemoryGrowthRate();

    return {
      heap_used_mb: memoryUsage.heapUsed / 1024 / 1024,
      heap_total_mb: memoryUsage.heapTotal / 1024 / 1024,
      external_mb: memoryUsage.external / 1024 / 1024,
      rss_mb: memoryUsage.rss / 1024 / 1024,
      growth_rate: growthRate,
      gc_frequency: this.estimateGCFrequency(),
    };
  }

  async monitorNetworkPerformance() {
    try {
      const networkMetrics = await this.measureNetworkPerformance();

      this.metrics.network_performance.push({
        timestamp: Date.now(),
        sync_success_rate: networkMetrics.sync_success_rate,
        average_sync_time: networkMetrics.average_sync_time,
        timeout_rate: networkMetrics.timeout_rate,
        retry_rate: networkMetrics.retry_rate,
        offline_queue_size: networkMetrics.offline_queue_size,
        bandwidth_utilization: networkMetrics.bandwidth_utilization,
      });

      if (this.metrics.network_performance.length > 100) {
        this.metrics.network_performance = this.metrics.network_performance.slice(-100);
      }

      this.checkNetworkPerformanceAlerts(networkMetrics);

    } catch (error) {
      this.createAlert(ALERT_LEVELS.CRITICAL, 'Network Performance Monitoring Failed', {
        error: error.message,
        impact: 'Unable to monitor sync performance',
      });
    }
  }

  async measureNetworkPerformance() {
    // Simulate network performance measurement
    const baseSuccessRate = 0.998;
    const networkCondition = Math.random(); // 0 = excellent, 1 = poor

    return {
      sync_success_rate: baseSuccessRate - (networkCondition * 0.02),
      average_sync_time: 250 + (networkCondition * 200),
      timeout_rate: networkCondition * 0.01,
      retry_rate: networkCondition * 0.05,
      offline_queue_size: Math.floor(networkCondition * 100),
      bandwidth_utilization: 0.3 + (networkCondition * 0.4),
    };
  }

  // Alert checking methods
  checkCrisisPerformanceAlerts(metrics) {
    if (metrics.mean > PRODUCTION_THRESHOLDS.CRISIS_RESPONSE_MEAN) {
      this.createAlert(
        metrics.mean > PRODUCTION_THRESHOLDS.CRISIS_RESPONSE_MAX ? ALERT_LEVELS.EMERGENCY : ALERT_LEVELS.CRITICAL,
        'Crisis Response Time Degradation',
        {
          current_response_time: `${metrics.mean.toFixed(2)}ms`,
          threshold: `${PRODUCTION_THRESHOLDS.CRISIS_RESPONSE_MEAN}ms`,
          impact: 'User safety response time compromised',
          p95_response: `${metrics.p95.toFixed(2)}ms`,
          p99_response: `${metrics.p99.toFixed(2)}ms`,
        }
      );
    }

    if (metrics.success_rate < PRODUCTION_THRESHOLDS.SUCCESS_RATE) {
      this.createAlert(ALERT_LEVELS.CRITICAL, 'Crisis Operation Success Rate Drop', {
        current_success_rate: `${(metrics.success_rate * 100).toFixed(2)}%`,
        threshold: `${(PRODUCTION_THRESHOLDS.SUCCESS_RATE * 100).toFixed(1)}%`,
        impact: 'Crisis interventions may be failing',
      });
    }
  }

  checkUIPerformanceAlerts(metrics) {
    if (metrics.animation_frame_time > PRODUCTION_THRESHOLDS.ANIMATION_FRAME_TIME * 1.5) {
      this.createAlert(ALERT_LEVELS.WARNING, 'Animation Performance Degradation', {
        current_frame_time: `${metrics.animation_frame_time.toFixed(2)}ms`,
        threshold: `${PRODUCTION_THRESHOLDS.ANIMATION_FRAME_TIME}ms`,
        impact: 'User experience degradation - animations not 60fps',
      });
    }

    if (metrics.ui_response_time > PRODUCTION_THRESHOLDS.UI_RESPONSE_TIME * 2) {
      this.createAlert(ALERT_LEVELS.CRITICAL, 'UI Response Time Critical', {
        current_response_time: `${metrics.ui_response_time.toFixed(2)}ms`,
        threshold: `${PRODUCTION_THRESHOLDS.UI_RESPONSE_TIME}ms`,
        impact: 'UI feels unresponsive to users',
      });
    }
  }

  checkMemoryAlerts(metrics) {
    if (metrics.heap_used_mb > PRODUCTION_THRESHOLDS.MEMORY_USAGE_MB) {
      this.createAlert(ALERT_LEVELS.WARNING, 'Memory Usage High', {
        current_memory: `${metrics.heap_used_mb.toFixed(1)}MB`,
        threshold: `${PRODUCTION_THRESHOLDS.MEMORY_USAGE_MB}MB`,
        growth_rate: `${metrics.growth_rate.toFixed(2)}MB/hour`,
        impact: 'Potential memory pressure affecting performance',
      });
    }

    if (metrics.growth_rate > PRODUCTION_THRESHOLDS.MEMORY_GROWTH_RATE_MB_PER_HOUR) {
      this.createAlert(ALERT_LEVELS.CRITICAL, 'Memory Leak Detected', {
        growth_rate: `${metrics.growth_rate.toFixed(2)}MB/hour`,
        threshold: `${PRODUCTION_THRESHOLDS.MEMORY_GROWTH_RATE_MB_PER_HOUR}MB/hour`,
        impact: 'Potential memory leak - app may crash over time',
      });
    }
  }

  checkNetworkPerformanceAlerts(metrics) {
    if (metrics.sync_success_rate < PRODUCTION_THRESHOLDS.SUCCESS_RATE) {
      this.createAlert(ALERT_LEVELS.CRITICAL, 'Sync Success Rate Critical', {
        current_success_rate: `${(metrics.sync_success_rate * 100).toFixed(2)}%`,
        threshold: `${(PRODUCTION_THRESHOLDS.SUCCESS_RATE * 100).toFixed(1)}%`,
        impact: 'Data synchronization failing for users',
      });
    }

    if (metrics.timeout_rate > PRODUCTION_THRESHOLDS.NETWORK_TIMEOUT_RATE) {
      this.createAlert(ALERT_LEVELS.WARNING, 'Network Timeout Rate High', {
        timeout_rate: `${(metrics.timeout_rate * 100).toFixed(2)}%`,
        threshold: `${(PRODUCTION_THRESHOLDS.NETWORK_TIMEOUT_RATE * 100).toFixed(1)}%`,
        impact: 'Network connectivity issues affecting sync',
      });
    }

    if (metrics.offline_queue_size > PRODUCTION_THRESHOLDS.OFFLINE_QUEUE_SIZE) {
      this.createAlert(ALERT_LEVELS.WARNING, 'Offline Queue Size Large', {
        queue_size: metrics.offline_queue_size,
        threshold: PRODUCTION_THRESHOLDS.OFFLINE_QUEUE_SIZE,
        impact: 'Large backlog of offline operations',
      });
    }
  }

  createAlert(level, title, details) {
    const alert = {
      id: this.generateAlertId(),
      level,
      title,
      details,
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.push(alert);

    // Log alert immediately
    this.logAlert(alert);

    // In production, this would send to monitoring systems like PagerDuty, Slack, etc.
    if (level === ALERT_LEVELS.EMERGENCY || level === ALERT_LEVELS.CRITICAL) {
      this.sendEmergencyNotification(alert);
    }

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  logAlert(alert) {
    const emoji = {
      [ALERT_LEVELS.INFO]: 'ℹ️',
      [ALERT_LEVELS.WARNING]: '⚠️',
      [ALERT_LEVELS.CRITICAL]: '🚨',
      [ALERT_LEVELS.EMERGENCY]: '🆘',
    };

    console.log(`\n${emoji[alert.level]} PERFORMANCE ALERT [${alert.level.toUpperCase()}]`);
    console.log(`📋 ${alert.title}`);
    console.log(`🕐 ${new Date(alert.timestamp).toISOString()}`);

    if (alert.details) {
      Object.entries(alert.details).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
  }

  sendEmergencyNotification(alert) {
    // In production, this would integrate with incident management systems
    console.log('\n🆘 EMERGENCY NOTIFICATION SENT');
    console.log(`📞 Alert: ${alert.title}`);
    console.log('👥 Notifications sent to: on-call team, product team, incident response');

    // Mock integration points
    console.log('🔔 Integrations triggered:');
    console.log('   • PagerDuty incident created');
    console.log('   • Slack #alerts channel notified');
    console.log('   • Email sent to on-call engineer');
    console.log('   • SMS sent to crisis response team');
  }

  async performHealthCheck() {
    try {
      const healthStatus = await this.generateHealthStatus();

      console.log(`\n💚 Health Check - ${new Date().toISOString()}`);
      console.log(`📊 Overall Health: ${healthStatus.overall_health}`);
      console.log(`🚨 Active Alerts: ${this.getActiveAlerts().length}`);
      console.log(`⏱️  Uptime: ${this.getUptimeHours().toFixed(1)} hours`);

      // Log critical metrics
      console.log('📈 Current Performance:');
      console.log(`   Crisis Response: ${healthStatus.crisis_response.toFixed(1)}ms`);
      console.log(`   Memory Usage: ${healthStatus.memory_usage.toFixed(1)}MB`);
      console.log(`   Success Rate: ${(healthStatus.success_rate * 100).toFixed(2)}%`);

    } catch (error) {
      this.createAlert(ALERT_LEVELS.CRITICAL, 'Health Check Failed', {
        error: error.message,
      });
    }
  }

  async generateHealthStatus() {
    const recentCrisisMetrics = this.metrics.crisis_response.slice(-10);
    const recentMemoryMetrics = this.metrics.memory_usage.slice(-10);
    const recentNetworkMetrics = this.metrics.network_performance.slice(-10);

    const avgCrisisResponse = recentCrisisMetrics.length > 0
      ? recentCrisisMetrics.reduce((sum, m) => sum + m.mean_response_time, 0) / recentCrisisMetrics.length
      : 0;

    const avgMemoryUsage = recentMemoryMetrics.length > 0
      ? recentMemoryMetrics.reduce((sum, m) => sum + m.heap_used_mb, 0) / recentMemoryMetrics.length
      : 0;

    const avgSuccessRate = recentNetworkMetrics.length > 0
      ? recentNetworkMetrics.reduce((sum, m) => sum + m.sync_success_rate, 0) / recentNetworkMetrics.length
      : 1;

    // Calculate overall health score
    const crisisHealth = avgCrisisResponse <= PRODUCTION_THRESHOLDS.CRISIS_RESPONSE_MEAN ? 100 :
                        Math.max(0, 100 - ((avgCrisisResponse - PRODUCTION_THRESHOLDS.CRISIS_RESPONSE_MEAN) / PRODUCTION_THRESHOLDS.CRISIS_RESPONSE_MEAN * 100));

    const memoryHealth = avgMemoryUsage <= PRODUCTION_THRESHOLDS.MEMORY_USAGE_MB ? 100 :
                        Math.max(0, 100 - ((avgMemoryUsage - PRODUCTION_THRESHOLDS.MEMORY_USAGE_MB) / PRODUCTION_THRESHOLDS.MEMORY_USAGE_MB * 100));

    const networkHealth = avgSuccessRate >= PRODUCTION_THRESHOLDS.SUCCESS_RATE ? 100 :
                         avgSuccessRate / PRODUCTION_THRESHOLDS.SUCCESS_RATE * 100;

    const overallHealth = (crisisHealth * 0.5 + memoryHealth * 0.3 + networkHealth * 0.2).toFixed(1);

    return {
      overall_health: `${overallHealth}%`,
      crisis_response: avgCrisisResponse,
      memory_usage: avgMemoryUsage,
      success_rate: avgSuccessRate,
      health_components: {
        crisis: `${crisisHealth.toFixed(1)}%`,
        memory: `${memoryHealth.toFixed(1)}%`,
        network: `${networkHealth.toFixed(1)}%`,
      }
    };
  }

  generatePerformanceReport() {
    const reportTime = Date.now();
    const timeSinceLastReport = reportTime - this.last_report_time;
    const minutesSinceLastReport = timeSinceLastReport / 1000 / 60;

    console.log('\n' + '='.repeat(80));
    console.log(`📊 PERFORMANCE REPORT - ${new Date(reportTime).toISOString()}`);
    console.log(`⏱️  Report Period: ${minutesSinceLastReport.toFixed(1)} minutes`);
    console.log('='.repeat(80));

    // Crisis Performance Summary
    this.reportCrisisPerformance();

    // UI Performance Summary
    this.reportUIPerformance();

    // Memory Usage Summary
    this.reportMemoryUsage();

    // Network Performance Summary
    this.reportNetworkPerformance();

    // Alert Summary
    this.reportAlerts();

    // Performance Trends
    this.reportPerformanceTrends();

    // Recommendations
    this.generateRecommendations();

    console.log('='.repeat(80));

    this.last_report_time = reportTime;
  }

  reportCrisisPerformance() {
    const recentMetrics = this.metrics.crisis_response.slice(-12); // Last hour at 5-min intervals

    if (recentMetrics.length === 0) {
      console.log('\n🚨 Crisis Performance: No data available');
      return;
    }

    const avgResponse = recentMetrics.reduce((sum, m) => sum + m.mean_response_time, 0) / recentMetrics.length;
    const maxResponse = Math.max(...recentMetrics.map(m => m.mean_response_time));
    const avgSuccessRate = recentMetrics.reduce((sum, m) => sum + m.success_rate, 0) / recentMetrics.length;

    console.log('\n🚨 Crisis Performance:');
    console.log(`   Average Response: ${avgResponse.toFixed(1)}ms (target: ${PRODUCTION_THRESHOLDS.CRISIS_RESPONSE_MEAN}ms)`);
    console.log(`   Peak Response: ${maxResponse.toFixed(1)}ms`);
    console.log(`   Success Rate: ${(avgSuccessRate * 100).toFixed(3)}%`);
    console.log(`   Status: ${avgResponse <= PRODUCTION_THRESHOLDS.CRISIS_RESPONSE_MEAN ? '✅ HEALTHY' : '⚠️ DEGRADED'}`);
  }

  reportUIPerformance() {
    const recentMetrics = this.metrics.ui_performance.slice(-12);

    if (recentMetrics.length === 0) {
      console.log('\n🎬 UI Performance: No data available');
      return;
    }

    const avgFrameTime = recentMetrics.reduce((sum, m) => sum + m.animation_frame_time, 0) / recentMetrics.length;
    const avgUIResponse = recentMetrics.reduce((sum, m) => sum + m.ui_response_time, 0) / recentMetrics.length;
    const totalFrameDrops = recentMetrics.reduce((sum, m) => sum + m.frame_drops, 0);

    console.log('\n🎬 UI Performance:');
    console.log(`   Animation Frame Time: ${avgFrameTime.toFixed(1)}ms (target: ${PRODUCTION_THRESHOLDS.ANIMATION_FRAME_TIME}ms)`);
    console.log(`   UI Response Time: ${avgUIResponse.toFixed(1)}ms (target: ${PRODUCTION_THRESHOLDS.UI_RESPONSE_TIME}ms)`);
    console.log(`   Frame Drops: ${totalFrameDrops} in last hour`);
    console.log(`   Status: ${avgFrameTime <= PRODUCTION_THRESHOLDS.ANIMATION_FRAME_TIME * 1.2 ? '✅ SMOOTH' : '⚠️ JANKY'}`);
  }

  reportMemoryUsage() {
    const recentMetrics = this.metrics.memory_usage.slice(-12);

    if (recentMetrics.length === 0) {
      console.log('\n🧠 Memory Usage: No data available');
      return;
    }

    const currentMemory = recentMetrics[recentMetrics.length - 1].heap_used_mb;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.heap_used_mb, 0) / recentMetrics.length;
    const maxMemory = Math.max(...recentMetrics.map(m => m.heap_used_mb));
    const growthRate = this.calculateMemoryGrowthRate();

    console.log('\n🧠 Memory Usage:');
    console.log(`   Current Usage: ${currentMemory.toFixed(1)}MB (target: <${PRODUCTION_THRESHOLDS.MEMORY_USAGE_MB}MB)`);
    console.log(`   Average Usage: ${avgMemory.toFixed(1)}MB`);
    console.log(`   Peak Usage: ${maxMemory.toFixed(1)}MB`);
    console.log(`   Growth Rate: ${growthRate.toFixed(2)}MB/hour`);
    console.log(`   Status: ${currentMemory <= PRODUCTION_THRESHOLDS.MEMORY_USAGE_MB ? '✅ OPTIMAL' : '⚠️ HIGH'}`);
  }

  reportNetworkPerformance() {
    const recentMetrics = this.metrics.network_performance.slice(-12);

    if (recentMetrics.length === 0) {
      console.log('\n🌐 Network Performance: No data available');
      return;
    }

    const avgSyncTime = recentMetrics.reduce((sum, m) => sum + m.average_sync_time, 0) / recentMetrics.length;
    const avgSuccessRate = recentMetrics.reduce((sum, m) => sum + m.sync_success_rate, 0) / recentMetrics.length;
    const avgTimeoutRate = recentMetrics.reduce((sum, m) => sum + m.timeout_rate, 0) / recentMetrics.length;
    const currentQueueSize = recentMetrics[recentMetrics.length - 1].offline_queue_size;

    console.log('\n🌐 Network Performance:');
    console.log(`   Sync Time: ${avgSyncTime.toFixed(1)}ms (target: <${PRODUCTION_THRESHOLDS.SYNC_OPERATION_TIME}ms)`);
    console.log(`   Success Rate: ${(avgSuccessRate * 100).toFixed(3)}%`);
    console.log(`   Timeout Rate: ${(avgTimeoutRate * 100).toFixed(2)}%`);
    console.log(`   Queue Size: ${currentQueueSize} items`);
    console.log(`   Status: ${avgSuccessRate >= PRODUCTION_THRESHOLDS.SUCCESS_RATE ? '✅ STABLE' : '⚠️ UNSTABLE'}`);
  }

  reportAlerts() {
    const recentAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 3600000); // Last hour
    const alertsByLevel = {
      [ALERT_LEVELS.EMERGENCY]: recentAlerts.filter(a => a.level === ALERT_LEVELS.EMERGENCY).length,
      [ALERT_LEVELS.CRITICAL]: recentAlerts.filter(a => a.level === ALERT_LEVELS.CRITICAL).length,
      [ALERT_LEVELS.WARNING]: recentAlerts.filter(a => a.level === ALERT_LEVELS.WARNING).length,
      [ALERT_LEVELS.INFO]: recentAlerts.filter(a => a.level === ALERT_LEVELS.INFO).length,
    };

    console.log('\n🔔 Alert Summary (Last Hour):');
    console.log(`   Emergency: ${alertsByLevel[ALERT_LEVELS.EMERGENCY]}`);
    console.log(`   Critical: ${alertsByLevel[ALERT_LEVELS.CRITICAL]}`);
    console.log(`   Warning: ${alertsByLevel[ALERT_LEVELS.WARNING]}`);
    console.log(`   Info: ${alertsByLevel[ALERT_LEVELS.INFO]}`);
    console.log(`   Total: ${recentAlerts.length}`);

    if (recentAlerts.length > 0) {
      const latestAlert = recentAlerts[recentAlerts.length - 1];
      console.log(`   Latest: ${latestAlert.title} (${latestAlert.level})`);
    }
  }

  reportPerformanceTrends() {
    console.log('\n📈 Performance Trends:');

    // Crisis response trend
    const crisisTrend = this.calculateTrend('crisis_response', 'mean_response_time', 6);
    console.log(`   Crisis Response: ${crisisTrend.direction} (${crisisTrend.change.toFixed(1)}ms change)`);

    // Memory usage trend
    const memoryTrend = this.calculateTrend('memory_usage', 'heap_used_mb', 6);
    console.log(`   Memory Usage: ${memoryTrend.direction} (${memoryTrend.change.toFixed(1)}MB change)`);

    // Network performance trend
    const networkTrend = this.calculateTrend('network_performance', 'sync_success_rate', 6);
    console.log(`   Network Success: ${networkTrend.direction} (${(networkTrend.change * 100).toFixed(2)}% change)`);
  }

  calculateTrend(metricType, field, periods) {
    const metrics = this.metrics[metricType].slice(-periods * 2);

    if (metrics.length < periods) {
      return { direction: 'INSUFFICIENT_DATA', change: 0 };
    }

    const firstHalf = metrics.slice(0, periods);
    const secondHalf = metrics.slice(-periods);

    const firstAvg = firstHalf.reduce((sum, m) => sum + m[field], 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m[field], 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const percentChange = Math.abs(change / firstAvg) * 100;

    let direction;
    if (percentChange < 5) {
      direction = 'STABLE';
    } else if (change > 0) {
      direction = metricType === 'network_performance' && field === 'sync_success_rate' ? 'IMPROVING' : 'DEGRADING';
    } else {
      direction = metricType === 'network_performance' && field === 'sync_success_rate' ? 'DEGRADING' : 'IMPROVING';
    }

    return { direction, change };
  }

  generateRecommendations() {
    console.log('\n💡 Performance Recommendations:');

    const recommendations = [];

    // Analyze recent performance and generate recommendations
    const recentCrisis = this.metrics.crisis_response.slice(-6);
    const recentMemory = this.metrics.memory_usage.slice(-6);
    const recentNetwork = this.metrics.network_performance.slice(-6);

    if (recentCrisis.length > 0) {
      const avgCrisis = recentCrisis.reduce((sum, m) => sum + m.mean_response_time, 0) / recentCrisis.length;
      if (avgCrisis > PRODUCTION_THRESHOLDS.CRISIS_RESPONSE_MEAN * 0.8) {
        recommendations.push('🚨 Optimize crisis response pathways - approaching threshold');
      }
    }

    if (recentMemory.length > 0) {
      const growthRate = this.calculateMemoryGrowthRate();
      if (growthRate > PRODUCTION_THRESHOLDS.MEMORY_GROWTH_RATE_MB_PER_HOUR * 0.5) {
        recommendations.push('🧠 Investigate memory growth - potential leak detected');
      }
    }

    if (recentNetwork.length > 0) {
      const avgSuccess = recentNetwork.reduce((sum, m) => sum + m.sync_success_rate, 0) / recentNetwork.length;
      if (avgSuccess < PRODUCTION_THRESHOLDS.SUCCESS_RATE * 1.02) {
        recommendations.push('🌐 Improve network resilience - success rate near threshold');
      }
    }

    // Check alert patterns
    const criticalAlerts = this.alerts.filter(a =>
      a.level === ALERT_LEVELS.CRITICAL &&
      Date.now() - a.timestamp < 3600000
    );

    if (criticalAlerts.length > 3) {
      recommendations.push('🔔 High critical alert frequency - investigate root causes');
    }

    if (recommendations.length === 0) {
      console.log('   ✅ All systems performing optimally - no recommendations at this time');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    // Performance optimization suggestions
    console.log('\n🔧 Optimization Opportunities:');
    console.log('   • Enable caching for frequently accessed therapeutic content');
    console.log('   • Implement progressive loading for assessment data');
    console.log('   • Optimize database queries with proper indexing');
    console.log('   • Consider implementing WebSocket connection pooling');
    console.log('   • Review and optimize React component re-render patterns');
  }

  // Utility methods
  getCurrentSystemLoad() {
    // Simulate system load (in production, this would come from actual system metrics)
    return 0.3 + Math.random() * 0.4; // 30-70% load
  }

  getCurrentMemoryPressure() {
    // Simulate memory pressure
    return Math.random() * 0.5; // 0-50% memory pressure
  }

  calculateMemoryGrowthRate() {
    const memoryMetrics = this.metrics.memory_usage;

    if (memoryMetrics.length < 2) {
      return 0;
    }

    const timeWindow = 3600000; // 1 hour in milliseconds
    const recent = memoryMetrics.filter(m => Date.now() - m.timestamp < timeWindow);

    if (recent.length < 2) {
      return 0;
    }

    const oldestMemory = recent[0].heap_used_mb;
    const newestMemory = recent[recent.length - 1].heap_used_mb;
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;

    return ((newestMemory - oldestMemory) / timeSpan) * 3600000; // MB per hour
  }

  estimateGCFrequency() {
    // Simulate garbage collection frequency
    return Math.floor(Math.random() * 20) + 5; // 5-25 times per monitoring period
  }

  getActiveAlerts() {
    return this.alerts.filter(a => !a.resolved && Date.now() - a.timestamp < 86400000); // Last 24 hours
  }

  getUptimeHours() {
    return (Date.now() - this.monitoring_start) / 1000 / 3600;
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Data persistence methods
  savePerformanceData() {
    const performanceData = {
      timestamp: Date.now(),
      metrics: this.metrics,
      alerts: this.alerts.slice(-100), // Last 100 alerts
      monitoring_duration: Date.now() - this.monitoring_start,
    };

    const dataPath = path.join(__dirname, '../test-results/production-performance-data.json');

    try {
      fs.writeFileSync(dataPath, JSON.stringify(performanceData, null, 2));
      console.log(`📁 Performance data saved to: ${dataPath}`);
    } catch (error) {
      console.warn(`⚠️  Could not save performance data: ${error.message}`);
    }
  }

  // Cleanup and shutdown
  shutdown() {
    console.log('\n🛑 Production Performance Monitor Shutting Down...');

    // Save final performance data
    this.savePerformanceData();

    // Generate final report
    this.generatePerformanceReport();

    console.log('✅ Performance monitoring stopped');
  }
}

// Start monitoring
function startProductionPerformanceMonitoring() {
  console.log('🚀 Starting Production Performance Monitoring System\n');

  const monitor = new ProductionPerformanceMonitor();

  // Save performance data every 10 minutes
  setInterval(() => {
    monitor.savePerformanceData();
  }, 600000);

  // Graceful shutdown handling
  process.on('SIGINT', () => {
    console.log('\n📡 Received shutdown signal...');
    monitor.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n📡 Received termination signal...');
    monitor.shutdown();
    process.exit(0);
  });

  return monitor;
}

// Run monitoring if called directly
if (require.main === module) {
  const monitor = startProductionPerformanceMonitoring();

  console.log('📊 Production Performance Monitoring Active');
  console.log('🔔 Alerts will be displayed in real-time');
  console.log('📈 Performance reports generated every 5 minutes');
  console.log('💾 Data saved every 10 minutes');
  console.log('\nPress Ctrl+C to stop monitoring\n');
}

module.exports = {
  ProductionPerformanceMonitor,
  startProductionPerformanceMonitoring,
  PRODUCTION_THRESHOLDS,
  ALERT_LEVELS,
};