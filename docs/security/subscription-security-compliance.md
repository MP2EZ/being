# Subscription Security & Compliance

## Overview

This document details the security and compliance requirements for the Being subscription system, which handles In-App Purchases (IAP) and subscription metadata classified as Protected Health Information (PHI).

## Security Architecture

### Data Classification

**Subscription Metadata → PHI**

All subscription-related data is treated as PHI under HIPAA because it reveals:
- User engagement with mental health treatment
- Payment history for therapeutic services
- Usage patterns of clinical features

```typescript
// PHI Examples:
- subscription.userId           // Links to health records
- subscription.status           // Treatment engagement status
- subscription.lastPaymentDate  // Financial health information
- subscription.receiptData      // Purchase of mental health services
```

### Threat Model

**Primary Threats**:
1. Receipt Forgery → Unauthorized feature access
2. PHI Exposure → Privacy violations, HIPAA breaches
3. Payment Fraud → Financial loss, user trust damage
4. Crisis Access Denial → Life-threatening safety issue

**Attack Vectors**:
- Man-in-the-middle (MITM) attacks on receipt verification
- Client-side tampering with subscription status
- Replay attacks with old receipts
- Database access via SQL injection or auth bypass
- PHI logging in error messages
- Network failures blocking crisis access

---

## Security Controls

### 1. Receipt Verification (Server-Side Only)

**Requirement**: All receipt verification MUST occur server-side to prevent client-side tampering.

**Implementation**:

```typescript
// ❌ INSECURE: Client-side verification
async function verifyReceiptLocally(receiptData: string): Promise<boolean> {
  // This can be manipulated by attackers
  return true;
}

// ✅ SECURE: Server-side verification
async function verifyReceipt(receiptData: string, platform: 'apple' | 'google'): Promise<VerificationResult> {
  const endpoint = platform === 'apple'
    ? '/functions/v1/verify-apple-receipt'
    : '/functions/v1/verify-google-receipt';

  const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ receiptData }),
  });

  return response.json();
}
```

**Apple StoreKit 2 Verification**:
```typescript
// Supabase Edge Function: verify-apple-receipt
const response = await fetch('https://api.storekit.itunes.apple.com/inApps/v1/transactions/{transactionId}', {
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
  },
});

// Validate JWT signature
const decoded = await jwtVerify(response.signedTransactionInfo, APPLE_ROOT_CERTIFICATE);
```

**Google Play Billing Verification**:
```typescript
// Supabase Edge Function: verify-google-receipt
const auth = new google.auth.GoogleAuth({
  credentials: SERVICE_ACCOUNT_KEY,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

const androidPublisher = google.androidpublisher({ version: 'v3', auth });

const result = await androidPublisher.purchases.subscriptions.get({
  packageName: 'com.being.app',
  subscriptionId: productId,
  token: purchaseToken,
});
```

**Security Measures**:
- TLS 1.3 for all API calls
- JWT signature validation (Apple)
- OAuth 2.0 service accounts (Google)
- Receipt validation within 5 minutes of purchase
- No caching of verification results

### 2. PHI Protection

**Storage Security**:

```typescript
// Client-side (React Native)
import * as SecureStore from 'expo-secure-store';

// ✅ Encrypted storage
await SecureStore.setItemAsync('subscription', JSON.stringify(subscription), {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
});

// ❌ NEVER use AsyncStorage for PHI
await AsyncStorage.setItem('subscription', JSON.stringify(subscription)); // Unencrypted!
```

**Database Security** (Supabase):

```sql
-- Row Level Security (RLS) policies
CREATE POLICY "Users can only access their own subscriptions"
ON subscriptions
FOR ALL
USING (auth.uid() = user_id);

-- No public read access
REVOKE ALL ON subscriptions FROM anon;
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;

-- Encryption at rest
-- (Handled automatically by Supabase with AES-256)
```

**Transmission Security**:

```typescript
// ✅ HTTPS enforced
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL.startsWith('https://')) {
  throw new Error('SUPABASE_URL must use HTTPS');
}

// ✅ Certificate pinning (optional, for high-security environments)
const response = await fetch(SUPABASE_URL, {
  // React Native doesn't support built-in cert pinning
  // Use react-native-ssl-pinning if required
});
```

**Logging Security**:

```typescript
// ❌ NEVER log PHI
console.log('Subscription:', subscription);
console.log('User ID:', userId, 'Receipt:', receiptData);

// ✅ Log generic events only
console.log('Subscription status updated');
console.log('Receipt verification completed');

// ✅ Use structured logging with PHI filtering
logger.info('subscription.status.updated', {
  // No userId, no receiptData, no PHI
  status: subscription.status,
  timestamp: Date.now(),
});
```

### 3. Crisis Access Guarantee

**🚨 CRITICAL SECURITY REQUIREMENT**: Crisis access MUST be hardcoded to prevent any scenario where it could be blocked.

**Implementation**:

```typescript
// ✅ Hardcoded to literal true
getCrisisAccessStatus: (): true => {
  return true;  // NEVER conditional
}

// ✅ Crisis features bypass ALL checks
checkFeatureAccess: (feature: keyof FeatureAccess) => {
  const crisisFeatures = ['crisisButton', 'crisisContacts', 'safetyPlan', 'nineEightEightAccess'];

  if (crisisFeatures.includes(feature)) {
    return true;  // No subscription check, no network call, no dependencies
  }

  // Non-crisis features check subscription
  return featureAccess?.[feature] ?? false;
}
```

**Database Constraint**:

```sql
-- Enforce at database level
CREATE TABLE subscriptions (
  crisis_access_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (crisis_access_enabled = TRUE)  -- Prevents any row from having false
);
```

**Attack Mitigation**:
- No network dependencies (instant check)
- No database queries (no latency, no failures)
- No conditional logic (no bypass vulnerabilities)
- Type-safe enforcement (TypeScript literal `true`)
- Database constraint (cannot be disabled server-side)

### 4. Authentication & Authorization

**User Authentication**:

```typescript
// Supabase Auth required for all subscription operations
const { data: { user }, error } = await supabase.auth.getUser();

if (!user) {
  throw new Error('Authentication required');
}

// User ID from auth token (not client-provided)
const userId = user.id;  // Cryptographically verified
```

**Authorization Checks**:

```typescript
// Edge Function: verify-apple-receipt
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

const { data: { user }, error } = await supabase.auth.getUser(token);

if (!user) {
  return new Response('Unauthorized', { status: 401 });
}

// User can only verify their own receipts
// Enforced by RLS policies on subscriptions table
```

**Row Level Security (RLS)**:

```sql
-- Subscription isolation
CREATE POLICY "Users can only access own subscription"
ON subscriptions
FOR ALL
USING (user_id = auth.uid());

-- Subscription events isolation
CREATE POLICY "Users can only access own events"
ON subscription_events
FOR ALL
USING (user_id = auth.uid());
```

---

## Compliance Requirements

### HIPAA Compliance

**Business Associate Agreement (BAA)**:
- Supabase: Signed BAA required (available on Pro plan)
- Apple/Google: BAA not required (payment processors exempt under HIPAA)

**Minimum Necessary Rule**:
```typescript
// ✅ Only collect necessary data
interface Subscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  // ... only fields required for feature access
}

// ❌ Don't collect unnecessary data
interface Subscription {
  creditCardLast4: string;  // Not needed
  billingAddress: string;   // Not needed
  purchaseHistory: [];      // Not needed (use events table)
}
```

**Audit Logging**:

```sql
-- All subscription changes logged
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable audit log (no updates or deletes)
REVOKE UPDATE, DELETE ON subscription_events FROM ALL;
```

**Breach Notification**:
- Detection: Monitor failed authentication attempts, unauthorized access
- Response: Immediate investigation, user notification within 60 days
- Documentation: Maintain breach log as per `/docs/brand-legal/legal/HIPAA/breach-notification-procedure.md`

### PCI DSS Compliance

**Scope Reduction**:
- Apple/Google handle all payment processing (PCI DSS compliant)
- Being app NEVER handles credit card data
- Receipt verification uses tokens, not payment details

**Out of Scope**:
```typescript
// ✅ We only handle receipt tokens
const receiptData = 'base64-encoded-receipt';  // No PCI data

// ❌ NEVER handle these (handled by Apple/Google)
const creditCardNumber = '4111-1111-1111-1111';  // PCI DSS scope!
const cvv = '123';                                // PCI DSS scope!
```

### App Store Review Guidelines

**Subscription Requirements**:
- Clear pricing display
- Free trial terms disclosed
- Auto-renewal terms disclosed
- Cancellation instructions provided
- Restore purchases functionality
- No false advertising

**Crisis Access Compliance**:
- Crisis features accessible without subscription (guideline 3.1.1)
- No paywall for safety-critical features

---

## Incident Response

### Severity Levels

**P0 (Critical)**: Crisis access blocked
- **Response Time**: Immediate (<15 minutes)
- **Escalation**: All engineers, clinical team
- **Action**: Emergency hotfix deployment

**P1 (High)**: Receipt verification failure, widespread subscription issues
- **Response Time**: <1 hour
- **Escalation**: Engineering lead, security team
- **Action**: Investigate and patch within 4 hours

**P2 (Medium)**: Individual subscription sync issues
- **Response Time**: <4 hours
- **Escalation**: On-call engineer
- **Action**: Investigate and resolve within 24 hours

**P3 (Low)**: UI bugs, minor feature issues
- **Response Time**: <24 hours
- **Escalation**: Regular sprint planning
- **Action**: Schedule for next release

### Incident Procedures

**Receipt Verification Failure**:

```bash
# 1. Check Supabase Edge Function logs
supabase functions logs verify-apple-receipt --project-ref your-project

# 2. Check Apple/Google API status
curl https://developer.apple.com/system-status/
curl https://status.play.google.com/

# 3. Verify API keys
supabase secrets list --project-ref your-project

# 4. Check database RLS policies
supabase db remote inspect --project-ref your-project

# 5. Test with sandbox account
npm run test:iap:sandbox
```

**PHI Breach**:

```bash
# 1. Identify scope
SELECT COUNT(*) FROM subscriptions WHERE updated_at > '2025-01-01';

# 2. Notify users (if required)
# See /docs/brand-legal/legal/HIPAA/breach-notification-procedure.md

# 3. Document breach
echo "Breach incident report" >> /docs/security/incidents/$(date +%Y-%m-%d).md

# 4. Implement fix
git checkout -b hotfix/subscription-phi-leak
# ... fix code ...
git commit -m "fix: Prevent PHI logging in subscription service"
```

**Crisis Access Blocked** (P0):

```bash
# IMMEDIATE ACTION:
# 1. Hotfix deployment
git checkout -b hotfix/crisis-access-p0
# ... revert blocking changes ...
npm run build:production
npm run deploy:emergency

# 2. Verify fix
npm run test:crisis:access
curl https://api.being.com/health/crisis-access

# 3. Post-incident review
# Schedule within 24 hours with full engineering team
```

---

## Security Testing

### Penetration Testing

**Annual Requirements**:
- [ ] Receipt forgery attempts
- [ ] PHI exposure via logs/errors
- [ ] SQL injection in subscription queries
- [ ] Authentication bypass attempts
- [ ] Crisis access denial scenarios

**Automated Security Scans**:

```bash
# Dependency vulnerabilities
npm audit
npm audit fix

# Code security analysis
npm run lint:security

# PHI detection in code
npm run detect:phi

# Secret detection
git secrets --scan
```

### Security Test Cases

```typescript
// Test: Receipt forgery
it('SECURITY: Rejects forged receipts', async () => {
  const forgedReceipt = 'fake-receipt-data';
  const result = await IAPService.verifyReceipt(forgedReceipt, 'apple');
  expect(result.valid).toBe(false);
});

// Test: PHI not logged
it('SECURITY: No PHI in logs', async () => {
  const consoleSpy = jest.spyOn(console, 'log');
  await subscriptionStore.updateSubscription(mockSubscription);

  const logs = consoleSpy.mock.calls.flat().join(' ');
  expect(logs).not.toContain(mockSubscription.userId);
  expect(logs).not.toContain(mockSubscription.receiptData);
});

// Test: Crisis access always true
it('SECURITY: Crisis access never blocked', async () => {
  // Network failure
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
  expect(subscriptionStore.getCrisisAccessStatus()).toBe(true);

  // Database failure
  supabase.from = jest.fn().mockRejectedValue(new Error('DB error'));
  expect(subscriptionStore.getCrisisAccessStatus()).toBe(true);

  // Expired subscription
  subscriptionStore.setState({ subscription: expiredSubscription });
  expect(subscriptionStore.getCrisisAccessStatus()).toBe(true);
});
```

---

## Monitoring & Alerting

### Key Metrics

**Security Metrics**:
- Failed receipt verifications per hour (alert if >10)
- Authentication failures per hour (alert if >100)
- PHI access attempts (audit all)
- Crisis access check latency (alert if >10ms)

**Compliance Metrics**:
- Subscription data encryption status (must be 100%)
- RLS policy violations (must be 0)
- Audit log completeness (must be 100%)
- User consent tracking (must be 100%)

### Alerting Rules

```yaml
# Supabase Dashboard → Alerts
- name: High receipt verification failures
  condition: verify_receipt_failures > 10 per hour
  severity: P1
  action: Page on-call engineer

- name: PHI access without auth
  condition: phi_access_attempts WHERE auth_user_id IS NULL
  severity: P0
  action: Page security team

- name: Crisis access check slow
  condition: crisis_access_check_latency > 10ms
  severity: P1
  action: Page engineering lead
```

---

## Compliance Checklist

### Pre-Launch

- [ ] Supabase BAA signed and active
- [ ] Receipt verification server-side only
- [ ] PHI stored in SecureStore (encrypted)
- [ ] Database RLS policies active
- [ ] Audit logging implemented
- [ ] Crisis access hardcoded to true
- [ ] Security testing completed
- [ ] Penetration testing passed
- [ ] App Store/Play Store review approved

### Ongoing

- [ ] Monthly security scans
- [ ] Quarterly penetration testing
- [ ] Annual HIPAA audit
- [ ] Dependency updates within 30 days of CVE
- [ ] Incident response drills (quarterly)
- [ ] Employee security training (annual)

---

## Additional Resources

- **HIPAA Compliance Framework**: `/docs/brand-legal/legal/HIPAA/HIPAA_COMPLIANCE_FRAMEWORK.md`
- **Security Architecture**: `/docs/security/security-architecture.md`
- **Encryption Standards**: `/docs/security/encryption-standards.md`
- **Breach Notification**: `/docs/brand-legal/legal/HIPAA/breach-notification-procedure.md`

## Contact

**Security Issues**: security@being.app
**HIPAA Compliance**: compliance@being.app
**Incident Response**: oncall@being.app
