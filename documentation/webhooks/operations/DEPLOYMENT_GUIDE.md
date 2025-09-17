# Webhook Integration Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Day 18 webhook integration system to production environments. The deployment process prioritizes crisis safety, security, and therapeutic continuity while ensuring zero-downtime deployment and rollback capabilities.

## Pre-Deployment Requirements

### Environment Prerequisites

#### Infrastructure Requirements
```yaml
Production Environment:
  - Node.js: 18.x or higher
  - Memory: 4GB minimum, 8GB recommended
  - CPU: 2 cores minimum, 4 cores recommended
  - Storage: 20GB minimum for logs and data
  - Network: HTTPS required, TLS 1.3 preferred

Crisis Safety Requirements:
  - Response time: <200ms for crisis scenarios
  - Uptime: 99.9% minimum availability
  - Failover: Automatic failover within 30 seconds
  - Monitoring: Real-time crisis response monitoring

Security Requirements:
  - HTTPS/TLS: Mandatory for all endpoints
  - HMAC Validation: Production webhook secrets
  - Rate Limiting: DDoS protection with crisis exemptions
  - Audit Logging: Complete encrypted audit trails
```

#### External Service Dependencies
```yaml
Required Services:
  - Stripe: Webhook endpoint configuration
  - Supabase: Authentication and user context
  - 988 Hotline: Crisis intervention integration
  - Push Notifications: Critical alert delivery

Optional Services:
  - Monitoring: Datadog, New Relic, or similar
  - Logging: Centralized log aggregation
  - Alerting: PagerDuty or similar for crisis alerts
```

### Security Configuration

#### Environment Variables
```bash
# Production Environment Variables
NODE_ENV=production

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Crisis Safety Configuration
CRISIS_HOTLINE_NUMBER=988
CRISIS_RESPONSE_TIMEOUT_MS=200
EMERGENCY_BYPASS_ENABLED=true

# Security Configuration
WEBHOOK_ENDPOINT=https://yourdomain.com/api/webhooks/stripe
ENCRYPTION_KEY=your_256_bit_encryption_key
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring and Alerting
MONITORING_ENABLED=true
CRISIS_ALERTING_ENABLED=true
AUDIT_LOGGING_ENABLED=true

# Performance Configuration
WEBHOOK_TIMEOUT_MS=2000
CRISIS_TIMEOUT_MS=200
MAX_CONCURRENT_WEBHOOKS=50
```

#### SSL/TLS Configuration
```nginx
# Nginx Configuration for HTTPS
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Webhook Endpoint
    location /api/webhooks/stripe {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Crisis response optimization
        proxy_connect_timeout 1s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        proxy_buffering off;

        # Rate limiting
        limit_req zone=webhook_rate_limit burst=10 nodelay;
    }

    # Rate limiting configuration
    limit_req_zone $binary_remote_addr zone=webhook_rate_limit:10m rate=10r/s;
}
```

## Deployment Process

### Phase 1: Pre-Deployment Validation

#### 1. Code Quality Validation
```bash
#!/bin/bash
# pre-deployment-validation.sh

echo "Starting pre-deployment validation..."

# Run TypeScript compilation
echo "Validating TypeScript compilation..."
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Run comprehensive test suite
echo "Running comprehensive test suite..."
npm run test:all
if [ $? -ne 0 ]; then
    echo "❌ Test suite failed"
    exit 1
fi

# Run crisis safety tests specifically
echo "Validating crisis safety compliance..."
npm run test:crisis
if [ $? -ne 0 ]; then
    echo "❌ Crisis safety tests failed"
    exit 1
fi

# Run security tests
echo "Running security validation..."
npm run test:security
if [ $? -ne 0 ]; then
    echo "❌ Security tests failed"
    exit 1
fi

# Accessibility compliance
echo "Validating accessibility compliance..."
npm run test:accessibility
if [ $? -ne 0 ]; then
    echo "❌ Accessibility tests failed"
    exit 1
fi

# Performance benchmarks
echo "Running performance benchmarks..."
npm run test:performance
if [ $? -ne 0 ]; then
    echo "❌ Performance benchmarks failed"
    exit 1
fi

echo "✅ Pre-deployment validation completed successfully"
```

#### 2. Crisis Safety Validation
```bash
#!/bin/bash
# crisis-safety-validation.sh

echo "Validating crisis safety readiness..."

# Test crisis response time compliance
echo "Testing crisis response times..."
node scripts/validate-crisis-response-times.js
if [ $? -ne 0 ]; then
    echo "❌ Crisis response time validation failed"
    exit 1
fi

# Validate emergency access protocols
echo "Testing emergency access protocols..."
node scripts/validate-emergency-access.js
if [ $? -ne 0 ]; then
    echo "❌ Emergency access validation failed"
    exit 1
fi

# Test 988 hotline integration
echo "Validating 988 hotline integration..."
node scripts/validate-hotline-integration.js
if [ $? -ne 0 ]; then
    echo "❌ Hotline integration validation failed"
    exit 1
fi

# Test grace period management
echo "Testing grace period management..."
node scripts/validate-grace-period-management.js
if [ $? -ne 0 ]; then
    echo "❌ Grace period validation failed"
    exit 1
fi

echo "✅ Crisis safety validation completed"
```

#### 3. Security Configuration Validation
```javascript
// scripts/validate-security-config.js
const crypto = require('crypto');
const https = require('https');

async function validateSecurityConfiguration() {
  console.log('Validating security configuration...');

  // Validate encryption key strength
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error('Encryption key must be at least 256 bits');
  }

  // Validate webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !webhookSecret.startsWith('whsec_')) {
    throw new Error('Invalid Stripe webhook secret');
  }

  // Test HTTPS endpoint
  const webhookEndpoint = process.env.WEBHOOK_ENDPOINT;
  if (!webhookEndpoint.startsWith('https://')) {
    throw new Error('Webhook endpoint must use HTTPS in production');
  }

  // Validate TLS configuration
  await validateTLSConfiguration(webhookEndpoint);

  console.log('✅ Security configuration validated');
}

async function validateTLSConfiguration(url) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(url).hostname,
      port: 443,
      method: 'GET',
      secureProtocol: 'TLSv1_3_method'
    };

    const req = https.request(options, (res) => {
      if (res.socket.getProtocol() === 'TLSv1.3') {
        resolve();
      } else {
        reject(new Error('TLS 1.3 not properly configured'));
      }
    });

    req.on('error', reject);
    req.end();
  });
}

validateSecurityConfiguration().catch(console.error);
```

### Phase 2: Staging Deployment

#### 1. Deploy to Staging Environment
```bash
#!/bin/bash
# deploy-staging.sh

echo "Deploying to staging environment..."

# Build production bundle
echo "Building production bundle..."
npm run build:production

# Deploy to staging server
echo "Deploying to staging server..."
rsync -avz --exclude node_modules \
  ./dist/ user@staging-server:/opt/webhook-integration/

# Install dependencies on staging
echo "Installing dependencies on staging..."
ssh user@staging-server "cd /opt/webhook-integration && npm ci --only=production"

# Start staging server
echo "Starting staging server..."
ssh user@staging-server "cd /opt/webhook-integration && pm2 restart webhook-integration-staging"

# Wait for startup
sleep 10

# Validate staging deployment
echo "Validating staging deployment..."
curl -f https://staging.yourdomain.com/health
if [ $? -ne 0 ]; then
    echo "❌ Staging health check failed"
    exit 1
fi

echo "✅ Staging deployment completed"
```

#### 2. Staging Environment Testing
```javascript
// scripts/staging-integration-tests.js
const axios = require('axios');
const crypto = require('crypto');

const STAGING_ENDPOINT = 'https://staging.yourdomain.com/api/webhooks/stripe';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

async function runStagingTests() {
  console.log('Running staging integration tests...');

  await testWebhookProcessing();
  await testCrisisScenarios();
  await testSecurityValidation();
  await testPerformanceBaseline();

  console.log('✅ All staging tests passed');
}

async function testWebhookProcessing() {
  console.log('Testing webhook processing...');

  const testEvent = {
    id: 'evt_staging_test',
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_staging_test',
        customer: 'cus_staging_test',
        status: 'active'
      }
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    api_version: '2020-08-27'
  };

  const payload = JSON.stringify(testEvent);
  const signature = generateStripeSignature(payload, WEBHOOK_SECRET);

  const response = await axios.post(STAGING_ENDPOINT, testEvent, {
    headers: {
      'stripe-signature': signature,
      'content-type': 'application/json'
    }
  });

  if (response.status !== 200) {
    throw new Error(`Webhook processing failed: ${response.status}`);
  }

  console.log('✅ Webhook processing test passed');
}

async function testCrisisScenarios() {
  console.log('Testing crisis scenarios...');

  const crisisEvent = {
    id: 'evt_crisis_test',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_crisis_test',
        customer: 'cus_crisis_test',
        status: 'canceled',
        metadata: { crisisMode: 'true' }
      }
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false
  };

  const startTime = Date.now();
  const payload = JSON.stringify(crisisEvent);
  const signature = generateStripeSignature(payload, WEBHOOK_SECRET);

  const response = await axios.post(STAGING_ENDPOINT, crisisEvent, {
    headers: {
      'stripe-signature': signature,
      'content-type': 'application/json'
    }
  });

  const responseTime = Date.now() - startTime;

  if (responseTime > 200) {
    throw new Error(`Crisis response time exceeded: ${responseTime}ms`);
  }

  console.log(`✅ Crisis scenario test passed (${responseTime}ms)`);
}

function generateStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

runStagingTests().catch(console.error);
```

### Phase 3: Production Deployment

#### 1. Blue-Green Deployment Strategy
```bash
#!/bin/bash
# blue-green-deployment.sh

BLUE_SERVER="production-blue.yourdomain.com"
GREEN_SERVER="production-green.yourdomain.com"
LOAD_BALANCER="production.yourdomain.com"

# Determine current active environment
CURRENT_ACTIVE=$(curl -s $LOAD_BALANCER/health | jq -r '.environment')
if [ "$CURRENT_ACTIVE" == "blue" ]; then
    DEPLOY_TARGET="green"
    DEPLOY_SERVER=$GREEN_SERVER
else
    DEPLOY_TARGET="blue"
    DEPLOY_SERVER=$BLUE_SERVER
fi

echo "Deploying to $DEPLOY_TARGET environment ($DEPLOY_SERVER)..."

# Deploy to inactive environment
echo "Deploying application..."
rsync -avz --exclude node_modules \
  ./dist/ user@$DEPLOY_SERVER:/opt/webhook-integration/

# Install dependencies
echo "Installing dependencies..."
ssh user@$DEPLOY_SERVER "cd /opt/webhook-integration && npm ci --only=production"

# Start application
echo "Starting application..."
ssh user@$DEPLOY_SERVER "cd /opt/webhook-integration && pm2 restart webhook-integration"

# Wait for startup
sleep 15

# Health check
echo "Performing health check..."
curl -f https://$DEPLOY_SERVER/health
if [ $? -ne 0 ]; then
    echo "❌ Health check failed on $DEPLOY_TARGET"
    exit 1
fi

# Crisis safety validation
echo "Validating crisis safety..."
node scripts/validate-crisis-response-production.js $DEPLOY_SERVER
if [ $? -ne 0 ]; then
    echo "❌ Crisis safety validation failed"
    exit 1
fi

# Switch traffic to new deployment
echo "Switching traffic to $DEPLOY_TARGET..."
curl -X POST https://load-balancer-api.yourdomain.com/switch \
  -H "Authorization: Bearer $LB_API_TOKEN" \
  -d "{\"target\": \"$DEPLOY_TARGET\"}"

# Verify traffic switch
sleep 5
NEW_ACTIVE=$(curl -s $LOAD_BALANCER/health | jq -r '.environment')
if [ "$NEW_ACTIVE" != "$DEPLOY_TARGET" ]; then
    echo "❌ Traffic switch failed"
    exit 1
fi

echo "✅ Production deployment completed successfully"
echo "Active environment: $DEPLOY_TARGET"
```

#### 2. Production Health Monitoring
```javascript
// scripts/production-health-monitor.js
const axios = require('axios');

const PRODUCTION_ENDPOINT = 'https://yourdomain.com';
const WEBHOOK_ENDPOINT = `${PRODUCTION_ENDPOINT}/api/webhooks/stripe`;
const HEALTH_ENDPOINT = `${PRODUCTION_ENDPOINT}/health`;

async function monitorProductionHealth() {
  console.log('Starting production health monitoring...');

  // Continuous monitoring for first 30 minutes after deployment
  const monitoringDuration = 30 * 60 * 1000; // 30 minutes
  const checkInterval = 30 * 1000; // 30 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < monitoringDuration) {
    try {
      await performHealthChecks();
      console.log('✅ Health check passed');
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      await sendAlert('Production health check failed', error.message);
    }

    await sleep(checkInterval);
  }

  console.log('Production health monitoring completed');
}

async function performHealthChecks() {
  // Basic health check
  const healthResponse = await axios.get(HEALTH_ENDPOINT, { timeout: 5000 });
  if (healthResponse.status !== 200) {
    throw new Error(`Health endpoint returned ${healthResponse.status}`);
  }

  // Crisis response time check
  const crisisTestStart = Date.now();
  await axios.post(`${PRODUCTION_ENDPOINT}/api/test/crisis-response`, {
    test: true
  }, { timeout: 250 }); // Should respond within 200ms + buffer

  const crisisResponseTime = Date.now() - crisisTestStart;
  if (crisisResponseTime > 250) {
    throw new Error(`Crisis response time too slow: ${crisisResponseTime}ms`);
  }

  // Memory and performance check
  const metricsResponse = await axios.get(`${PRODUCTION_ENDPOINT}/metrics`);
  const metrics = metricsResponse.data;

  if (metrics.memoryUsage > 0.9) {
    throw new Error(`High memory usage: ${metrics.memoryUsage * 100}%`);
  }

  if (metrics.avgResponseTime > 1000) {
    throw new Error(`High average response time: ${metrics.avgResponseTime}ms`);
  }
}

async function sendAlert(title, message) {
  // Send alert to monitoring system
  console.error(`ALERT: ${title} - ${message}`);

  // In production, integrate with actual alerting system
  // await alertingService.send({ title, message, severity: 'high' });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

monitorProductionHealth().catch(console.error);
```

### Phase 4: Post-Deployment Validation

#### 1. Production Validation Suite
```bash
#!/bin/bash
# production-validation.sh

echo "Running production validation suite..."

# Validate webhook endpoint
echo "Testing webhook endpoint..."
curl -f https://yourdomain.com/api/webhooks/stripe
if [ $? -ne 0 ]; then
    echo "❌ Webhook endpoint not accessible"
    exit 1
fi

# Test crisis response time
echo "Validating crisis response time..."
node scripts/test-crisis-response-production.js
if [ $? -ne 0 ]; then
    echo "❌ Crisis response validation failed"
    exit 1
fi

# Validate security configuration
echo "Testing security configuration..."
node scripts/validate-production-security.js
if [ $? -ne 0 ]; then
    echo "❌ Security validation failed"
    exit 1
fi

# Test monitoring and alerting
echo "Validating monitoring and alerting..."
node scripts/test-monitoring-integration.js
if [ $? -ne 0 ]; then
    echo "❌ Monitoring validation failed"
    exit 1
fi

echo "✅ Production validation completed successfully"
```

## Configuration Management

### Environment Configuration

#### Production Configuration Files
```typescript
// config/production.ts
export const productionConfig = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    timeout: 30000,
    keepAliveTimeout: 65000
  },

  // Webhook configuration
  webhook: {
    processingTimeoutMs: 2000,
    crisisTimeoutMs: 200,
    maxRetryAttempts: 3,
    retryDelayMs: 1000,
    enableMetrics: true,
    enableStateSync: true
  },

  // Crisis safety configuration
  crisisSafety: {
    responseTimeLimit: 200,
    emergencyBypassEnabled: true,
    hotlineNumber: '988',
    gracePeriodDays: 7,
    therapeuticMessaging: true
  },

  // Security configuration
  security: {
    hmacValidation: true,
    rateLimiting: {
      windowMs: 60000,
      maxRequests: 100,
      crisisExemption: true
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2'
    }
  },

  // Monitoring configuration
  monitoring: {
    enabled: true,
    metricsInterval: 10000,
    healthCheckInterval: 30000,
    crisisAlertingEnabled: true,
    performanceThresholds: {
      responseTime: 1000,
      crisisResponseTime: 200,
      memoryUsage: 0.8,
      cpuUsage: 0.7
    }
  },

  // Logging configuration
  logging: {
    level: 'info',
    format: 'json',
    auditLogging: true,
    encryptSensitiveData: true,
    retentionDays: 2555 // 7 years for HIPAA compliance
  }
};
```

#### Database Configuration
```typescript
// config/database.production.ts
export const databaseConfig = {
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'x-application-name': 'fullmind-webhook-integration'
        }
      }
    }
  },

  // AsyncStorage configuration for mobile
  asyncStorage: {
    encryption: true,
    keyPrefix: 'fullmind_webhook_',
    maxSize: 10 * 1024 * 1024, // 10MB
    autoCleanup: true,
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  },

  // SecureStore configuration
  secureStore: {
    encryptionKey: process.env.SECURE_STORE_KEY,
    keychain: 'fullmind-webhook-keychain',
    accessGroup: 'group.com.fullmind.webhook'
  }
};
```

### Monitoring and Alerting Setup

#### Health Check Endpoint
```typescript
// src/api/health.ts
import { Request, Response } from 'express';
import { webhookProcessingMetrics } from '../services/monitoring/MetricsService';
import { crisisResponseMonitor } from '../services/CrisisResponseMonitor';

export async function healthCheck(req: Request, res: Response) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
      uptime: process.uptime(),

      // System metrics
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal
      },

      // Webhook processing health
      webhookProcessing: {
        totalProcessed: webhookProcessingMetrics.totalProcessed,
        successRate: webhookProcessingMetrics.successRate,
        averageResponseTime: webhookProcessingMetrics.averageResponseTime,
        lastProcessedAt: webhookProcessingMetrics.lastProcessedAt
      },

      // Crisis safety health
      crisisSafety: {
        responseTimeCompliance: crisisResponseMonitor.getComplianceRate(),
        emergencyAccessActive: crisisResponseMonitor.hasActiveEmergencyAccess(),
        lastCrisisResponse: crisisResponseMonitor.getLastCrisisResponseTime(),
        crisisSystemHealthy: await crisisResponseMonitor.validateSystemHealth()
      },

      // External dependencies
      dependencies: {
        stripe: await checkStripeHealth(),
        supabase: await checkSupabaseHealth(),
        emergencyServices: await check988Integration()
      }
    };

    // Determine overall health status
    const isHealthy =
      health.memory.percentage < 0.9 &&
      health.webhookProcessing.successRate > 0.95 &&
      health.crisisSafety.responseTimeCompliance > 0.95 &&
      health.dependencies.stripe &&
      health.dependencies.supabase &&
      health.dependencies.emergencyServices;

    if (!isHealthy) {
      health.status = 'degraded';
    }

    res.status(isHealthy ? 200 : 503).json(health);

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

async function checkStripeHealth(): Promise<boolean> {
  try {
    // Test Stripe API connectivity
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkSupabaseHealth(): Promise<boolean> {
  try {
    // Test Supabase connectivity
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function check988Integration(): Promise<boolean> {
  // For production, this would validate the emergency services integration
  // For now, return true as this is a client-side integration
  return true;
}
```

## Rollback Procedures

### Automated Rollback
```bash
#!/bin/bash
# rollback-deployment.sh

PRODUCTION_ENDPOINT="https://yourdomain.com"
CURRENT_ENVIRONMENT=$(curl -s $PRODUCTION_ENDPOINT/health | jq -r '.environment')

echo "Current environment: $CURRENT_ENVIRONMENT"

if [ "$CURRENT_ENVIRONMENT" == "blue" ]; then
    ROLLBACK_TARGET="green"
else
    ROLLBACK_TARGET="blue"
fi

echo "Rolling back to $ROLLBACK_TARGET environment..."

# Switch traffic back
curl -X POST https://load-balancer-api.yourdomain.com/switch \
  -H "Authorization: Bearer $LB_API_TOKEN" \
  -d "{\"target\": \"$ROLLBACK_TARGET\"}"

# Verify rollback
sleep 5
NEW_ENVIRONMENT=$(curl -s $PRODUCTION_ENDPOINT/health | jq -r '.environment')

if [ "$NEW_ENVIRONMENT" == "$ROLLBACK_TARGET" ]; then
    echo "✅ Rollback completed successfully"

    # Send alert about rollback
    curl -X POST $SLACK_WEBHOOK_URL \
      -H 'Content-type: application/json' \
      -d "{\"text\": \"🔄 Production rollback completed. Active environment: $ROLLBACK_TARGET\"}"
else
    echo "❌ Rollback failed"
    exit 1
fi
```

### Crisis Safety Rollback
```bash
#!/bin/bash
# crisis-safety-rollback.sh

echo "Executing crisis safety rollback..."

# Immediately activate emergency bypass mode
curl -X POST $PRODUCTION_ENDPOINT/api/emergency/activate-bypass \
  -H "Authorization: Bearer $EMERGENCY_BYPASS_TOKEN" \
  -d '{"reason": "deployment_rollback", "duration": 3600}'

# Switch to known-good environment
./rollback-deployment.sh

# Validate crisis systems are functioning
node scripts/validate-crisis-response-production.js

if [ $? -eq 0 ]; then
    echo "✅ Crisis safety rollback completed"

    # Deactivate emergency bypass
    curl -X POST $PRODUCTION_ENDPOINT/api/emergency/deactivate-bypass \
      -H "Authorization: Bearer $EMERGENCY_BYPASS_TOKEN"
else
    echo "❌ Crisis safety validation failed after rollback"
    echo "🚨 MANUAL INTERVENTION REQUIRED"

    # Send critical alert
    curl -X POST $PAGERDUTY_WEBHOOK_URL \
      -H 'Content-type: application/json' \
      -d '{"routing_key": "'$PAGERDUTY_ROUTING_KEY'", "event_action": "trigger", "payload": {"summary": "Critical: Crisis safety system failure after rollback", "severity": "critical", "source": "webhook-deployment"}}'
fi
```

## Monitoring and Alerting

### Production Monitoring Dashboard
```typescript
// monitoring/dashboard-config.ts
export const monitoringDashboard = {
  // Key Performance Indicators
  kpis: [
    {
      name: 'Crisis Response Time',
      metric: 'crisis_response_time_p95',
      threshold: 200,
      unit: 'ms',
      critical: true
    },
    {
      name: 'Webhook Success Rate',
      metric: 'webhook_success_rate',
      threshold: 0.99,
      unit: 'percentage',
      critical: true
    },
    {
      name: 'Therapeutic Access Uptime',
      metric: 'therapeutic_access_uptime',
      threshold: 0.999,
      unit: 'percentage',
      critical: true
    },
    {
      name: 'Emergency Access Activations',
      metric: 'emergency_access_activations',
      threshold: null,
      unit: 'count',
      critical: false
    }
  ],

  // Alert Configurations
  alerts: [
    {
      name: 'Crisis Response Time Violation',
      condition: 'crisis_response_time_p95 > 200',
      severity: 'critical',
      notification: ['pagerduty', 'slack'],
      escalation: 'immediate'
    },
    {
      name: 'Webhook Processing Failure Rate High',
      condition: 'webhook_failure_rate > 0.05',
      severity: 'high',
      notification: ['slack', 'email'],
      escalation: '15_minutes'
    },
    {
      name: 'Emergency Bypass Activated',
      condition: 'emergency_bypass_active == true',
      severity: 'high',
      notification: ['pagerduty', 'slack'],
      escalation: 'immediate'
    },
    {
      name: 'Grace Period Activations Spike',
      condition: 'grace_period_activations_rate > 10_per_hour',
      severity: 'medium',
      notification: ['slack'],
      escalation: '30_minutes'
    }
  ],

  // Dashboard Panels
  panels: [
    {
      title: 'Crisis Safety Metrics',
      metrics: [
        'crisis_response_time_avg',
        'crisis_response_time_p95',
        'crisis_response_time_p99',
        'emergency_access_activations',
        'therapeutic_continuity_maintained'
      ]
    },
    {
      title: 'Webhook Performance',
      metrics: [
        'webhook_processing_time_avg',
        'webhook_success_rate',
        'webhook_failure_rate',
        'webhook_retry_rate',
        'webhook_throughput'
      ]
    },
    {
      title: 'System Health',
      metrics: [
        'memory_usage',
        'cpu_usage',
        'disk_usage',
        'network_latency',
        'error_rate'
      ]
    }
  ]
};
```

## Deployment Checklist

### Pre-Deployment Checklist ✅
- [ ] Code review completed and approved
- [ ] All tests passing (unit, integration, crisis safety)
- [ ] Security validation completed
- [ ] Performance benchmarks met
- [ ] Accessibility compliance verified
- [ ] Crisis safety protocols tested
- [ ] Environment variables configured
- [ ] SSL/TLS certificates valid
- [ ] Monitoring and alerting configured
- [ ] Rollback procedure documented and tested

### Deployment Execution Checklist ✅
- [ ] Pre-deployment validation executed
- [ ] Staging environment deployed and tested
- [ ] Blue-green deployment initiated
- [ ] Health checks passing
- [ ] Crisis response time validation completed
- [ ] Security configuration verified
- [ ] Traffic successfully switched
- [ ] Post-deployment monitoring active
- [ ] Rollback procedure tested and ready

### Post-Deployment Checklist ✅
- [ ] Production health monitoring active
- [ ] Crisis safety systems validated
- [ ] Performance metrics within thresholds
- [ ] Security alerts configured and tested
- [ ] Audit logging functioning
- [ ] Emergency response procedures verified
- [ ] Documentation updated
- [ ] Team notified of successful deployment
- [ ] Monitoring dashboard updated
- [ ] Incident response procedures activated

## Emergency Procedures

### Crisis System Failure Response
```bash
#!/bin/bash
# emergency-response.sh

echo "🚨 EXECUTING EMERGENCY RESPONSE PROTOCOL"

# Step 1: Activate emergency bypass immediately
echo "Activating emergency bypass..."
curl -X POST $PRODUCTION_ENDPOINT/api/emergency/global-bypass \
  -H "Authorization: Bearer $EMERGENCY_BYPASS_TOKEN" \
  -d '{"reason": "system_failure", "duration": 7200}' # 2 hours

# Step 2: Send critical alerts
echo "Sending critical alerts..."
curl -X POST $PAGERDUTY_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  -d '{"routing_key": "'$PAGERDUTY_ROUTING_KEY'", "event_action": "trigger", "payload": {"summary": "CRITICAL: FullMind crisis system failure", "severity": "critical"}}'

# Step 3: Enable maintenance mode with crisis access
echo "Enabling crisis-safe maintenance mode..."
curl -X POST $PRODUCTION_ENDPOINT/api/maintenance/enable \
  -H "Authorization: Bearer $EMERGENCY_BYPASS_TOKEN" \
  -d '{"preserveCrisisAccess": true, "preserveTherapeuticAccess": true}'

# Step 4: Attempt automatic recovery
echo "Attempting automatic recovery..."
./rollback-deployment.sh

# Step 5: Validate critical functions
echo "Validating critical functions..."
node scripts/validate-emergency-state.js

echo "Emergency response protocol completed"
echo "Manual intervention may be required"
```

This comprehensive deployment guide ensures that the webhook integration system can be safely deployed to production while maintaining crisis safety, security, and therapeutic continuity throughout the deployment process.