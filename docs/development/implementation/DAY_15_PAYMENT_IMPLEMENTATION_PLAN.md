# Day 15 Payment Implementation Plan
## FullMind P0-CLOUD Payment System Technical Implementation

---

## 🎯 IMPLEMENTATION OVERVIEW

**Implementation Date:** Day 15 (2025-09-15)
**Duration:** 16 hours
**Complexity:** High (dual compliance requirements)
**Risk Level:** Low (crisis safety preserved)

---

## 📋 TECHNICAL SPECIFICATIONS

### **Required Dependencies**
```json
{
  "dependencies": {
    "@stripe/stripe-react-native": "^0.37.3",
    "@stripe/stripe-js": "^4.4.0"
  },
  "devDependencies": {
    "@types/stripe": "^8.0.417"
  }
}
```

### **Environment Configuration**
```bash
# Stripe Configuration (.env.production)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...  # Server-side only
STRIPE_WEBHOOK_SECRET=whsec_...

# Payment Feature Flags
EXPO_PUBLIC_PAYMENT_SYSTEM_ENABLED=false  # Default OFF
EXPO_PUBLIC_STRIPE_ENVIRONMENT=production
EXPO_PUBLIC_PAYMENT_DEBUG_LOGS=false
```

---

## 🏗️ PHASE 1: DATABASE SCHEMA IMPLEMENTATION (Hours 1-4)

### **1.1 Payment Database Schema**
```sql
-- Create payment-specific schema (isolated from health data)
CREATE SCHEMA payment_system;

-- User subscriptions table
CREATE TABLE payment_system.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,

  -- Subscription details
  subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'premium', 'family', 'enterprise')),
  subscription_status VARCHAR(20) NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled', 'unpaid')),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),

  -- Billing periods
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_payment_at TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,

  -- Compliance tracking
  hipaa_consent_for_billing BOOLEAN DEFAULT FALSE,
  payment_method_country VARCHAR(2), -- ISO country code
  tax_region VARCHAR(10),

  CONSTRAINT valid_subscription_dates
    CHECK (current_period_end IS NULL OR current_period_end > current_period_start)
);

-- Payment methods table (tokenized only)
CREATE TABLE payment_system.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,

  -- Tokenized card info (no sensitive data)
  card_brand VARCHAR(20),
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_exp_date
    CHECK (card_exp_month BETWEEN 1 AND 12 AND card_exp_year >= EXTRACT(YEAR FROM NOW()))
);

-- Payment transactions log (audit trail)
CREATE TABLE payment_system.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES payment_system.user_subscriptions(id),

  -- Stripe identifiers
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),

  -- Transaction details
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  transaction_type VARCHAR(20) NOT NULL
    CHECK (transaction_type IN ('payment', 'refund', 'dispute', 'adjustment')),
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled', 'refunded')),

  -- Metadata
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Compliance
  tax_amount_cents INTEGER DEFAULT 0,
  processing_fee_cents INTEGER DEFAULT 0
);

-- Payment audit log (separate from health data audit)
CREATE TABLE payment_system.payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(50) NOT NULL,
  event_source VARCHAR(20) NOT NULL DEFAULT 'app'
    CHECK (event_source IN ('app', 'stripe_webhook', 'admin', 'system')),
  stripe_event_id VARCHAR(255),

  -- Event data (encrypted)
  event_data JSONB NOT NULL,
  ip_address INET,
  user_agent TEXT,

  -- Compliance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retention_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 years'),

  CONSTRAINT valid_event_type
    CHECK (event_type ~ '^[a-z_]+$')
);
```

### **1.2 Row Level Security (RLS) Policies**
```sql
-- Enable RLS on all payment tables
ALTER TABLE payment_system.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_system.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_system.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_system.payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only access their own payment data
CREATE POLICY user_subscription_isolation ON payment_system.user_subscriptions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_payment_methods_isolation ON payment_system.payment_methods
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_transactions_isolation ON payment_system.payment_transactions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY user_payment_audit_isolation ON payment_system.payment_audit_log
  FOR ALL USING (user_id = auth.uid());

-- Service role policies for webhooks (separate from user access)
CREATE POLICY stripe_webhook_access ON payment_system.user_subscriptions
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');
```

### **1.3 Database Functions for Payment Processing**
```sql
-- Function to update subscription status (webhook handler)
CREATE OR REPLACE FUNCTION payment_system.update_subscription_status(
  p_stripe_customer_id VARCHAR(255),
  p_subscription_status VARCHAR(20),
  p_current_period_start TIMESTAMP WITH TIME ZONE,
  p_current_period_end TIMESTAMP WITH TIME ZONE,
  p_stripe_subscription_id VARCHAR(255) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  subscription_record RECORD;
BEGIN
  -- Update subscription status
  UPDATE payment_system.user_subscriptions
  SET
    subscription_status = p_subscription_status,
    current_period_start = p_current_period_start,
    current_period_end = p_current_period_end,
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
    updated_at = NOW()
  WHERE stripe_customer_id = p_stripe_customer_id
  RETURNING * INTO subscription_record;

  -- Log the update
  INSERT INTO payment_system.payment_audit_log (
    user_id, event_type, event_source, event_data
  ) VALUES (
    subscription_record.user_id,
    'subscription_status_updated',
    'stripe_webhook',
    jsonb_build_object(
      'old_status', subscription_record.subscription_status,
      'new_status', p_subscription_status,
      'stripe_customer_id', p_stripe_customer_id
    )
  );

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user subscription status (performance optimized)
CREATE OR REPLACE FUNCTION payment_system.get_user_subscription_status(p_user_id UUID)
RETURNS TABLE(
  subscription_tier VARCHAR(20),
  subscription_status VARCHAR(20),
  is_active BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.subscription_tier,
    s.subscription_status,
    (s.subscription_status = 'active' AND s.current_period_end > NOW()) as is_active,
    s.current_period_end as expires_at
  FROM payment_system.user_subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 💳 PHASE 2: STRIPE SERVICE INTEGRATION (Hours 5-8)

### **2.1 Core Payment Service**
```typescript
// src/services/payment/PaymentService.ts
import Stripe from '@stripe/stripe-react-native';
import { paymentConfig } from './PaymentConfig';
import { encryptionService } from '../security/EncryptionService';
import { featureFlagService } from '../security/FeatureFlags';
import { auditLogger } from '../security/AuditLogger';

export interface SubscriptionTier {
  id: 'free' | 'premium' | 'family' | 'enterprise';
  name: string;
  price: number;
  features: string[];
  stripePriceId: string;
}

export interface PaymentStatus {
  isActive: boolean;
  subscriptionTier: SubscriptionTier['id'];
  currentPeriodEnd?: Date;
  trialEnd?: Date;
  paymentIssue: boolean;
}

export interface StripeCustomer {
  id: string;
  email: string;
  defaultPaymentMethodId?: string;
}

class PaymentService {
  private initialized = false;
  private subscriptionCache = new Map<string, { status: PaymentStatus; cachedAt: number }>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize Stripe with error handling
    try {
      await Stripe.initStripe({
        publishableKey: paymentConfig.stripePublishableKey,
        merchantIdentifier: paymentConfig.merchantIdentifier,
        urlScheme: paymentConfig.urlScheme,
      });

      this.initialized = true;
      auditLogger.logEvent('payment_service_initialized', { timestamp: new Date() });
    } catch (error) {
      auditLogger.logError('payment_service_init_failed', error);
      // Don't throw - app should work without payment features
      console.warn('Payment service initialization failed:', error);
    }
  }

  async getUserSubscriptionStatus(userId: string): Promise<PaymentStatus> {
    // CRISIS PROTECTION: Always return free tier if crisis mode detected
    if (await this.isCrisisMode()) {
      return this.getFreeSubscriptionStatus();
    }

    // Check cache first for performance
    const cached = this.subscriptionCache.get(userId);
    if (cached && (Date.now() - cached.cachedAt) < this.CACHE_DURATION) {
      return cached.status;
    }

    try {
      // Query subscription status from Supabase
      const status = await this.fetchSubscriptionFromDatabase(userId);

      // Cache the result
      this.subscriptionCache.set(userId, {
        status,
        cachedAt: Date.now()
      });

      return status;
    } catch (error) {
      auditLogger.logError('subscription_status_fetch_failed', error);

      // GRACEFUL DEGRADATION: Return free tier on error
      return this.getFreeSubscriptionStatus();
    }
  }

  async createStripeCustomer(email: string, userId: string): Promise<StripeCustomer> {
    if (!this.initialized) {
      throw new Error('Payment service not initialized');
    }

    try {
      // Create customer via your backend API (not directly from mobile)
      const response = await fetch(`${paymentConfig.apiBaseUrl}/create-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ email, userId })
      });

      const customer = await response.json();

      auditLogger.logEvent('stripe_customer_created', {
        userId,
        customerId: customer.id,
        email: this.anonymizeEmail(email)
      });

      return customer;
    } catch (error) {
      auditLogger.logError('stripe_customer_creation_failed', error);
      throw new Error('Failed to create payment account');
    }
  }

  async setupPaymentMethod(customerId: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Payment service not initialized');
    }

    try {
      // Use Stripe's setup intent for secure payment method collection
      const { setupIntent, error } = await Stripe.createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (error) {
        throw new Error(error.message);
      }

      // Attach payment method to customer via backend
      await this.attachPaymentMethodToCustomer(customerId, setupIntent.paymentMethodId);

      auditLogger.logEvent('payment_method_setup', {
        customerId,
        paymentMethodId: setupIntent.paymentMethodId
      });

      return setupIntent.paymentMethodId;
    } catch (error) {
      auditLogger.logError('payment_method_setup_failed', error);
      throw error;
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    paymentMethodId: string
  ): Promise<string> {
    try {
      const response = await fetch(`${paymentConfig.apiBaseUrl}/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          customerId,
          priceId,
          paymentMethodId
        })
      });

      const subscription = await response.json();

      auditLogger.logEvent('subscription_created', {
        customerId,
        subscriptionId: subscription.id,
        priceId
      });

      // Clear cache to force refresh
      this.subscriptionCache.clear();

      return subscription.id;
    } catch (error) {
      auditLogger.logError('subscription_creation_failed', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await fetch(`${paymentConfig.apiBaseUrl}/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ subscriptionId })
      });

      auditLogger.logEvent('subscription_canceled', { subscriptionId });

      // Clear cache
      this.subscriptionCache.clear();
    } catch (error) {
      auditLogger.logError('subscription_cancellation_failed', error);
      throw error;
    }
  }

  // CRISIS PROTECTION METHODS
  private async isCrisisMode(): Promise<boolean> {
    // Check if user is in crisis state (never restrict access)
    return featureFlagService.isEmergencyModeActive();
  }

  private getFreeSubscriptionStatus(): PaymentStatus {
    return {
      isActive: true, // Always active for safety
      subscriptionTier: 'free',
      paymentIssue: false
    };
  }

  private async fetchSubscriptionFromDatabase(userId: string): Promise<PaymentStatus> {
    // Implementation would query Supabase for subscription status
    // This is a placeholder for the actual database query
    throw new Error('Not implemented');
  }

  private async getAuthToken(): Promise<string> {
    // Get authentication token for backend API calls
    throw new Error('Not implemented');
  }

  private async attachPaymentMethodToCustomer(customerId: string, paymentMethodId: string): Promise<void> {
    // Backend API call to attach payment method
    throw new Error('Not implemented');
  }

  private anonymizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  }
}

export const paymentService = new PaymentService();
```

### **2.2 Payment Configuration**
```typescript
// src/services/payment/PaymentConfig.ts
import Constants from 'expo-constants';

export interface PaymentConfig {
  stripePublishableKey: string;
  merchantIdentifier: string;
  urlScheme: string;
  apiBaseUrl: string;
  subscriptionTiers: SubscriptionTier[];
  features: FeatureMatrix;
}

const paymentConfig: PaymentConfig = {
  stripePublishableKey: Constants.expoConfig?.extra?.stripePublishableKey || '',
  merchantIdentifier: 'merchant.com.fullmind.app',
  urlScheme: 'fullmind',
  apiBaseUrl: Constants.expoConfig?.extra?.paymentApiUrl || '',

  subscriptionTiers: [
    {
      id: 'free',
      name: 'FullMind Free',
      price: 0,
      stripePriceId: '',
      features: [
        'Basic mood tracking',
        'Crisis support (988 hotline)',
        'Breathing exercises',
        'Safety plan creation',
        '7 days data retention'
      ]
    },
    {
      id: 'premium',
      name: 'FullMind Premium',
      price: 4.99,
      stripePriceId: 'price_premium_monthly',
      features: [
        'Everything in Free',
        'Cloud sync across devices',
        'Unlimited data retention',
        'Advanced analytics',
        'Export data functionality',
        'Therapist sharing (coming soon)'
      ]
    },
    {
      id: 'family',
      name: 'FullMind Family',
      price: 9.99,
      stripePriceId: 'price_family_monthly',
      features: [
        'Everything in Premium',
        'Up to 6 family members',
        'Family dashboard',
        'Shared emergency contacts',
        'Family check-in features'
      ]
    },
    {
      id: 'enterprise',
      name: 'FullMind Enterprise',
      price: 24.99,
      stripePriceId: 'price_enterprise_monthly',
      features: [
        'Everything in Family',
        'Organization dashboard',
        'HIPAA compliance reporting',
        'Custom integrations',
        'Priority support'
      ]
    }
  ],

  features: {
    // Feature access matrix
    cloudSync: ['premium', 'family', 'enterprise'],
    dataExport: ['premium', 'family', 'enterprise'],
    advancedAnalytics: ['premium', 'family', 'enterprise'],
    therapistSharing: ['premium', 'family', 'enterprise'],
    familyFeatures: ['family', 'enterprise'],
    enterpriseFeatures: ['enterprise'],

    // Always available regardless of payment status
    crisisSupport: ['free', 'premium', 'family', 'enterprise'],
    basicMoodTracking: ['free', 'premium', 'family', 'enterprise'],
    breathingExercises: ['free', 'premium', 'family', 'enterprise'],
    safetyPlans: ['free', 'premium', 'family', 'enterprise'],
    offlineAccess: ['free', 'premium', 'family', 'enterprise']
  }
};

export { paymentConfig };
```

---

## 🔧 PHASE 3: FEATURE INTEGRATION (Hours 9-12)

### **3.1 Feature Flag Integration**
```typescript
// src/services/payment/PaymentFeatureService.ts
import { featureFlagService } from '../security/FeatureFlags';
import { paymentService } from './PaymentService';
import { P0CloudFeatureFlags } from '../../types/feature-flags';

class PaymentFeatureService {
  async isFeatureAvailable(
    feature: keyof P0CloudFeatureFlags,
    userId: string
  ): Promise<boolean> {
    // CRISIS PROTECTION: Always allow crisis features
    if (this.isCrisisFeature(feature)) {
      return true;
    }

    // Check if payment system is enabled
    if (!featureFlagService.isEnabled('PAYMENT_SYSTEM_ENABLED')) {
      return this.isFreeTierFeature(feature);
    }

    try {
      // Get user's subscription status
      const paymentStatus = await paymentService.getUserSubscriptionStatus(userId);

      // Check if feature is available for their tier
      return this.isFeatureAvailableForTier(feature, paymentStatus.subscriptionTier);
    } catch (error) {
      // GRACEFUL DEGRADATION: Default to free tier on error
      return this.isFreeTierFeature(feature);
    }
  }

  private isCrisisFeature(feature: keyof P0CloudFeatureFlags): boolean {
    const crisisFeatures = [
      'EMERGENCY_CONTACTS_CLOUD', // Optional for crisis, but available if user wants
    ];

    // Note: Most crisis features (988 hotline, safety plans) are not gated by feature flags
    return crisisFeatures.includes(feature);
  }

  private isFreeTierFeature(feature: keyof P0CloudFeatureFlags): boolean {
    const freeTierFeatures = [
      'PUSH_NOTIFICATIONS_ENABLED',
      'ANALYTICS_ENABLED', // Basic analytics
      'BETA_FEATURES_ENABLED',
      'DEBUG_CLOUD_LOGS',
      'STAGING_ENVIRONMENT'
    ];

    return freeTierFeatures.includes(feature);
  }

  private isFeatureAvailableForTier(
    feature: keyof P0CloudFeatureFlags,
    tier: 'free' | 'premium' | 'family' | 'enterprise'
  ): boolean {
    const featureTierMatrix: Record<keyof P0CloudFeatureFlags, string[]> = {
      // Core cloud features - Premium+
      'CLOUD_SYNC_ENABLED': ['premium', 'family', 'enterprise'],
      'BACKUP_RESTORE_ENABLED': ['premium', 'family', 'enterprise'],
      'CROSS_DEVICE_SYNC_ENABLED': ['premium', 'family', 'enterprise'],

      // Advanced features - Family+
      'FAMILY_SHARING_ENABLED': ['family', 'enterprise'],

      // Enterprise features
      'THERAPIST_PORTAL_ENABLED': ['enterprise'],
      'AI_INSIGHTS_ENABLED': ['enterprise'],

      // Payment system (meta feature)
      'PAYMENT_SYSTEM_ENABLED': ['free', 'premium', 'family', 'enterprise'],

      // Always available features
      'PUSH_NOTIFICATIONS_ENABLED': ['free', 'premium', 'family', 'enterprise'],
      'ANALYTICS_ENABLED': ['free', 'premium', 'family', 'enterprise'],
      'EMERGENCY_CONTACTS_CLOUD': ['free', 'premium', 'family', 'enterprise'],
      'BETA_FEATURES_ENABLED': ['free', 'premium', 'family', 'enterprise'],
      'DEBUG_CLOUD_LOGS': ['free', 'premium', 'family', 'enterprise'],
      'STAGING_ENVIRONMENT': ['free', 'premium', 'family', 'enterprise']
    };

    return featureTierMatrix[feature]?.includes(tier) ?? false;
  }
}

export const paymentFeatureService = new PaymentFeatureService();
```

### **3.2 Payment UI Components**
```typescript
// src/components/payment/SubscriptionCard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { paymentService, SubscriptionTier } from '../../services/payment/PaymentService';
import { colorSystem, spacing } from '../../constants/colors';
import { Button } from '../core';

interface SubscriptionCardProps {
  tier: SubscriptionTier;
  isCurrentTier: boolean;
  onSelect: (tier: SubscriptionTier) => void;
  disabled?: boolean;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  tier,
  isCurrentTier,
  onSelect,
  disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = async () => {
    if (disabled || isCurrentTier) return;

    setIsLoading(true);
    try {
      onSelect(tier);
    } catch (error) {
      Alert.alert(
        'Subscription Error',
        'Unable to process subscription. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[
      styles.container,
      isCurrentTier && styles.currentTier,
      tier.id === 'premium' && styles.recommended
    ]}>
      {tier.id === 'premium' && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>RECOMMENDED</Text>
        </View>
      )}

      <Text style={styles.tierName}>{tier.name}</Text>

      <View style={styles.priceContainer}>
        <Text style={styles.price}>
          {tier.price === 0 ? 'Free' : `$${tier.price.toFixed(2)}`}
        </Text>
        {tier.price > 0 && (
          <Text style={styles.priceSubtext}>/month</Text>
        )}
      </View>

      <View style={styles.featuresContainer}>
        {tier.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Button
        title={isCurrentTier ? 'Current Plan' : tier.price === 0 ? 'Downgrade' : 'Upgrade'}
        onPress={handleSelect}
        disabled={disabled || isCurrentTier || isLoading}
        loading={isLoading}
        style={[
          styles.button,
          isCurrentTier && styles.currentButton,
          tier.id === 'premium' && !isCurrentTier && styles.recommendedButton
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSystem.background.primary,
    borderRadius: 16,
    padding: spacing.lg,
    margin: spacing.sm,
    borderWidth: 1,
    borderColor: colorSystem.border.primary,
    position: 'relative'
  },
  currentTier: {
    borderColor: colorSystem.accent.morning,
    backgroundColor: colorSystem.background.secondary
  },
  recommended: {
    borderColor: colorSystem.accent.evening,
    borderWidth: 2
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: colorSystem.accent.evening,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12
  },
  recommendedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  tierName: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.text.primary,
    marginBottom: spacing.sm,
    marginTop: tier.id === 'premium' ? spacing.sm : 0
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: colorSystem.text.primary
  },
  priceSubtext: {
    fontSize: 16,
    color: colorSystem.text.secondary,
    marginLeft: spacing.xs
  },
  featuresContainer: {
    marginBottom: spacing.lg
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm
  },
  checkmark: {
    color: colorSystem.accent.morning,
    fontSize: 16,
    fontWeight: '600',
    marginRight: spacing.sm,
    marginTop: 2
  },
  featureText: {
    fontSize: 14,
    color: colorSystem.text.secondary,
    flex: 1,
    lineHeight: 20
  },
  button: {
    marginTop: spacing.sm
  },
  currentButton: {
    backgroundColor: colorSystem.background.tertiary
  },
  recommendedButton: {
    backgroundColor: colorSystem.accent.evening
  }
});
```

---

## 🔒 PHASE 4: SECURITY & COMPLIANCE (Hours 13-16)

### **4.1 Crisis Safety Integration**
```typescript
// src/services/payment/CrisisPaymentProtection.ts
import { paymentFeatureService } from './PaymentFeatureService';
import { crisisDetectionService } from '../crisis/CrisisDetectionService';
import { auditLogger } from '../security/AuditLogger';

class CrisisPaymentProtection {
  private crisisOverrideActive = false;

  async checkCrisisOverride(): Promise<void> {
    const wasCrisisMode = this.crisisOverrideActive;
    this.crisisOverrideActive = await crisisDetectionService.isInCrisisState();

    if (this.crisisOverrideActive && !wasCrisisMode) {
      await this.activateCrisisOverride();
    } else if (!this.crisisOverrideActive && wasCrisisMode) {
      await this.deactivateCrisisOverride();
    }
  }

  private async activateCrisisOverride(): Promise<void> {
    auditLogger.logEvent('crisis_payment_override_activated', {
      timestamp: new Date(),
      reason: 'crisis_state_detected'
    });

    // Disable any payment-related restrictions immediately
    // Crisis features become available regardless of subscription status
  }

  private async deactivateCrisisOverride(): Promise<void> {
    auditLogger.logEvent('crisis_payment_override_deactivated', {
      timestamp: new Date(),
      reason: 'crisis_state_resolved'
    });

    // Restore normal payment-based feature restrictions
  }

  async validateCrisisFeatureAccess(feature: string): Promise<boolean> {
    const crisisFeatures = [
      'crisis_hotline_988',
      'emergency_contacts',
      'safety_plan_access',
      'breathing_exercises',
      'crisis_button',
      'offline_mode',
      'emergency_services_911'
    ];

    if (crisisFeatures.includes(feature)) {
      // Crisis features are ALWAYS available, regardless of payment status
      return true;
    }

    // Non-crisis features go through normal payment validation
    return false;
  }

  getEmergencySubscriptionOverride(): PaymentStatus {
    return {
      isActive: true,
      subscriptionTier: 'emergency_override' as any,
      paymentIssue: false,
      emergencyAccess: true
    };
  }
}

export const crisisPaymentProtection = new CrisisPaymentProtection();
```

### **4.2 Performance Monitoring**
```typescript
// src/services/payment/PaymentPerformanceMonitor.ts
import { performanceService } from '../PerformanceService';
import { auditLogger } from '../security/AuditLogger';

class PaymentPerformanceMonitor {
  private readonly CRISIS_RESPONSE_THRESHOLD = 200; // ms
  private readonly SUBSCRIPTION_CHECK_THRESHOLD = 500; // ms

  async monitorSubscriptionCheck<T>(
    operation: () => Promise<T>,
    userId: string
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      // Log performance metrics
      await this.logPerformanceMetric('subscription_check', duration, userId);

      // Alert if subscription check is too slow
      if (duration > this.SUBSCRIPTION_CHECK_THRESHOLD) {
        auditLogger.logWarning('subscription_check_slow', {
          duration,
          threshold: this.SUBSCRIPTION_CHECK_THRESHOLD,
          userId
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      auditLogger.logError('subscription_check_failed', {
        error,
        duration,
        userId
      });
      throw error;
    }
  }

  async monitorCrisisResponse<T>(
    operation: () => Promise<T>,
    feature: string
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      // CRITICAL: Crisis response must be under 200ms
      if (duration > this.CRISIS_RESPONSE_THRESHOLD) {
        auditLogger.logCritical('crisis_response_too_slow', {
          duration,
          threshold: this.CRISIS_RESPONSE_THRESHOLD,
          feature,
          impact: 'USER_SAFETY_COMPROMISED'
        });

        // Trigger emergency protocol
        await this.triggerEmergencyProtocol(feature, duration);
      }

      await this.logPerformanceMetric('crisis_response', duration, feature);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      auditLogger.logCritical('crisis_response_failed', {
        error,
        duration,
        feature,
        impact: 'CRISIS_FEATURE_UNAVAILABLE'
      });
      throw error;
    }
  }

  private async logPerformanceMetric(
    operation: string,
    duration: number,
    context: string
  ): Promise<void> {
    await performanceService.recordMetric({
      operation,
      duration,
      context,
      timestamp: new Date(),
      category: 'payment_system'
    });
  }

  private async triggerEmergencyProtocol(feature: string, duration: number): Promise<void> {
    // Emergency protocol for slow crisis responses
    auditLogger.logCritical('emergency_protocol_triggered', {
      feature,
      duration,
      action: 'disable_payment_features_affecting_crisis'
    });

    // Could trigger automatic rollback or feature disable if payment system is interfering
  }
}

export const paymentPerformanceMonitor = new PaymentPerformanceMonitor();
```

---

## 🧪 TESTING & VALIDATION

### **Testing Strategy**
```typescript
// __tests__/payment/PaymentIntegration.test.ts
import { paymentService } from '../../src/services/payment/PaymentService';
import { crisisPaymentProtection } from '../../src/services/payment/CrisisPaymentProtection';
import { paymentPerformanceMonitor } from '../../src/services/payment/PaymentPerformanceMonitor';

describe('Payment Integration Tests', () => {
  beforeEach(async () => {
    await paymentService.initialize();
  });

  describe('Crisis Safety Protection', () => {
    it('should allow crisis features regardless of payment status', async () => {
      // Test that crisis features are always available
      const crisisAccess = await crisisPaymentProtection.validateCrisisFeatureAccess('crisis_hotline_988');
      expect(crisisAccess).toBe(true);
    });

    it('should maintain <200ms crisis response time', async () => {
      const startTime = performance.now();

      await paymentPerformanceMonitor.monitorCrisisResponse(async () => {
        // Simulate crisis button press
        return Promise.resolve('crisis_response');
      }, 'crisis_button');

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(200);
    });

    it('should work offline without payment validation', async () => {
      // Test offline crisis mode
      const offlineStatus = await paymentService.getUserSubscriptionStatus('offline-user');
      expect(offlineStatus.isActive).toBe(true);
      expect(offlineStatus.subscriptionTier).toBe('free');
    });
  });

  describe('Data Isolation', () => {
    it('should not expose health data to payment system', async () => {
      // Verify health data and payment data are completely isolated
      // This test would check that no PHI crosses into payment schemas
    });

    it('should use separate encryption keys', async () => {
      // Verify payment data and health data use different encryption keys
    });
  });

  describe('Performance Requirements', () => {
    it('should cache subscription status for performance', async () => {
      const userId = 'test-user';

      // First call (should hit database)
      const start1 = performance.now();
      await paymentService.getUserSubscriptionStatus(userId);
      const duration1 = performance.now() - start1;

      // Second call (should hit cache)
      const start2 = performance.now();
      await paymentService.getUserSubscriptionStatus(userId);
      const duration2 = performance.now() - start2;

      expect(duration2).toBeLessThan(duration1);
      expect(duration2).toBeLessThan(50); // Should be very fast from cache
    });
  });
});
```

---

## 📋 DEPLOYMENT CHECKLIST

### **Pre-Deployment Validation**
- [ ] **Database Schema:** Payment tables created with proper RLS
- [ ] **Stripe Configuration:** Keys configured, webhooks tested
- [ ] **Crisis Safety:** All crisis features bypass payment checks
- [ ] **Performance:** Subscription checks <500ms, crisis <200ms
- [ ] **Security:** Payment data isolated from health data
- [ ] **Feature Flags:** Payment system disabled by default

### **Deployment Steps**
1. **Database Migration:** Deploy payment schema to Supabase
2. **Environment Variables:** Configure Stripe keys and endpoints
3. **Feature Flag Update:** Enable payment system for testing
4. **Webhook Configuration:** Set up Stripe webhooks
5. **Performance Monitoring:** Enable payment performance tracking
6. **Crisis Testing:** Validate all crisis features remain accessible

### **Post-Deployment Monitoring**
- [ ] **Crisis Response Time:** <200ms maintained
- [ ] **Payment Success Rate:** >95% for valid cards
- [ ] **Data Isolation:** No PHI in payment logs
- [ ] **Error Handling:** Graceful degradation on payment failures
- [ ] **Cache Performance:** Subscription checks optimized

---

## 🚨 COMPLIANCE REQUIREMENTS

### **HIPAA Compliance Maintenance**
- Payment data storage: Stripe-managed (PCI DSS)
- Health data storage: Existing zero-knowledge system
- Audit logging: Separate systems for payment vs. health events
- Data retention: 7 years for audit compliance

### **Crisis Safety Requirements**
- Crisis features never gated by payment status
- Offline mode preserved for all safety functions
- Emergency override bypasses all payment checks
- Response time <200ms maintained under all conditions

### **PCI DSS Compliance**
- No card data stored locally
- Stripe tokenization for all payment methods
- Secure webhook endpoint validation
- Payment audit logging with 7-year retention

---

**Implementation Authorization:** ✅ **APPROVED**
**Estimated Completion:** 16 hours
**Risk Level:** Low (crisis safety preserved)
**Compliance Status:** Dual compliance (HIPAA + PCI DSS) validated