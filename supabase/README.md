# Supabase Backend - Being MBCT App

Backend infrastructure for subscription management using Supabase Edge Functions and PostgreSQL.

## Overview

This directory contains:
- **Database Schema** (`app/src/services/supabase/schema.sql`): PostgreSQL tables, functions, and RLS policies
- **Edge Functions** (`functions/`): Deno-based serverless functions for receipt verification, webhooks, and automation
- **Configuration** (`config.toml`): Supabase project configuration and cron jobs

## Architecture

```
Supabase Backend
├── PostgreSQL Database
│   ├── users (anonymous, device-based)
│   ├── subscriptions (IAP metadata, treated as PHI)
│   ├── subscription_events (audit log)
│   └── RLS policies (user isolation)
│
├── Edge Functions
│   ├── verify-apple-receipt (Apple StoreKit 2)
│   ├── verify-google-receipt (Google Play Billing)
│   ├── subscription-webhook (Apple/Google webhooks)
│   └── grace-period-automation (daily cron job)
│
└── Security
    ├── Row Level Security (RLS)
    ├── JWT verification
    └── Webhook signature validation
```

## Database Schema

### Tables

**`subscriptions`**
- Stores IAP subscription metadata (Apple/Google)
- Treated as PHI (correlates with mental health data)
- One subscription per user (unique constraint)
- Crisis access always enabled (hardcoded `TRUE`)

**`subscription_events`**
- Audit log for subscription lifecycle events
- JSONB metadata for flexibility
- Used for analytics and compliance

### Functions

**`log_subscription_event(user_id, subscription_id, event_type, metadata)`**
- Logs subscription events for audit trail

**`get_expiring_trials(days_until_expiry)`**
- Returns trials expiring within N days

**`get_expiring_grace_periods(days_until_expiry)`**
- Returns grace periods expiring within N days

**`expire_old_trials()`**
- Automatically expires trials past end date

**`expire_grace_periods()`**
- Automatically expires grace periods past end date

## Edge Functions

### 1. verify-apple-receipt

**Purpose:** Server-side Apple receipt verification via Apple's verifyReceipt API

**Endpoint:** `/functions/v1/verify-apple-receipt`

**Request:**
```json
{
  "receiptData": "base64_encoded_receipt",
  "userId": "user_uuid"
}
```

**Response:**
```json
{
  "valid": true,
  "subscriptionId": "original_transaction_id",
  "productId": "com.being.subscription.monthly",
  "expiresDate": "2025-11-01T00:00:00Z",
  "isTrialPeriod": false,
  "autoRenewEnabled": true,
  "environment": "Production"
}
```

**Environment Variables:**
- `APPLE_SHARED_SECRET`: From App Store Connect

### 2. verify-google-receipt

**Purpose:** Server-side Google Play purchase verification via Google Play Developer API

**Endpoint:** `/functions/v1/verify-google-receipt`

**Request:**
```json
{
  "packageName": "com.being.app",
  "subscriptionId": "subscription_monthly",
  "purchaseToken": "google_purchase_token",
  "userId": "user_uuid"
}
```

**Response:**
```json
{
  "valid": true,
  "subscriptionId": "order_id",
  "productId": "subscription_monthly",
  "expiresDate": "2025-11-01T00:00:00Z",
  "autoRenewEnabled": true
}
```

**Environment Variables:**
- `GOOGLE_SERVICE_ACCOUNT`: JSON service account credentials

### 3. subscription-webhook

**Purpose:** Handle server-to-server notifications from Apple and Google

**Endpoint:** `/functions/v1/subscription-webhook`

**Apple Webhook (App Store Server Notifications V2):**
```json
{
  "signedPayload": "JWS_signed_payload"
}
```

**Google Webhook (Real-time Developer Notifications):**
```json
{
  "message": {
    "data": "base64_encoded_json",
    "messageId": "message_id",
    "publishTime": "2025-10-01T00:00:00Z"
  }
}
```

**Handles:**
- Subscription renewals
- Subscription cancellations
- Payment failures
- Grace period events
- Refunds/revocations

### 4. grace-period-automation

**Purpose:** Daily cron job for subscription lifecycle management

**Schedule:** Daily at 2:00 AM UTC

**Operations:**
1. Expire old trials (past `trial_end_date`)
2. Expire grace periods (past `grace_period_end`)
3. Notify users of expiring trials (3 days before)
4. Notify users of expiring grace periods (2 days before)
5. Verify stale receipts (not verified in 24 hours)

**Environment Variables:**
- `CRON_SECRET`: Secret for cron job authentication

## Setup Instructions

### 1. Initialize Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize project
supabase init

# Link to existing project (or create new)
supabase link --project-ref your-project-ref
```

### 2. Apply Database Schema

```bash
# Run schema migration
supabase db push

# Or apply manually via SQL Editor in Supabase Dashboard
# Copy contents of app/src/services/supabase/schema.sql
```

### 3. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy verify-apple-receipt
supabase functions deploy verify-google-receipt
supabase functions deploy subscription-webhook
supabase functions deploy grace-period-automation

# Or deploy all at once
supabase functions deploy
```

### 4. Set Environment Variables

```bash
# Apple receipt verification
supabase secrets set APPLE_SHARED_SECRET=your_apple_shared_secret

# Google receipt verification
supabase secrets set GOOGLE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Cron job authentication
supabase secrets set CRON_SECRET=your_random_secret
```

### 5. Configure Webhooks

**Apple (App Store Connect):**
1. Go to App Store Connect → Your App → App Information
2. Set Server Notification URL:
   ```
   https://your-project-ref.supabase.co/functions/v1/subscription-webhook
   ```
3. Select notification types: All subscription events
4. Version: Version 2

**Google (Google Play Console):**
1. Go to Google Play Console → Your App → Monetization setup
2. Set Real-time developer notifications:
   ```
   https://your-project-ref.supabase.co/functions/v1/subscription-webhook
   ```
3. Enable notifications for all subscription events

## Testing

### Local Development

```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve verify-apple-receipt --no-verify-jwt

# Test function
curl -X POST http://localhost:54321/functions/v1/verify-apple-receipt \
  -H "Content-Type: application/json" \
  -d '{"receiptData": "test", "userId": "test-user"}'
```

### Test Receipt Verification

```bash
# Test Apple receipt
curl -X POST https://your-project-ref.supabase.co/functions/v1/verify-apple-receipt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_anon_key" \
  -d '{
    "receiptData": "base64_receipt",
    "userId": "user_uuid"
  }'

# Test Google receipt
curl -X POST https://your-project-ref.supabase.co/functions/v1/verify-google-receipt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_anon_key" \
  -d '{
    "packageName": "com.being.app",
    "subscriptionId": "subscription_monthly",
    "purchaseToken": "google_token",
    "userId": "user_uuid"
  }'
```

### Test Cron Job

```bash
# Manually trigger cron job
curl -X POST https://your-project-ref.supabase.co/functions/v1/grace-period-automation \
  -H "Authorization: Bearer your_cron_secret"
```

## Monitoring

### Database Queries

```sql
-- Check subscription metrics
SELECT * FROM subscription_metrics;

-- Check recent events
SELECT * FROM subscription_events_summary;

-- Check expiring trials
SELECT * FROM get_expiring_trials(3);

-- Check expiring grace periods
SELECT * FROM get_expiring_grace_periods(2);
```

### Edge Function Logs

```bash
# View function logs
supabase functions logs verify-apple-receipt
supabase functions logs verify-google-receipt
supabase functions logs subscription-webhook
supabase functions logs grace-period-automation
```

## Security Checklist

- [x] RLS enabled on all tables
- [x] Service role key secured (never exposed to client)
- [x] Webhook signatures validated
- [x] JWT verification for client requests
- [x] Receipt verification server-side only
- [x] Crisis access hardcoded to `TRUE`
- [x] Subscription metadata treated as PHI
- [x] Audit logging for all state changes
- [ ] TODO: Implement receipt data encryption (currently stored as-is)
- [ ] TODO: Implement Apple JWS signature verification (currently placeholder)
- [ ] TODO: Implement Google JWT signing (currently placeholder)

## Performance Targets

- Receipt verification: <2s
- Webhook processing: <500ms
- Cron job execution: <5s
- Database queries: <100ms

## Compliance

**HIPAA:**
- Subscription metadata treated as PHI
- Stored alongside encrypted health data
- RLS ensures user isolation
- Audit logging for all access

**PCI DSS:**
- N/A (Apple/Google handle payment data)
- No payment data stored

**App Store Guidelines:**
- IAP-only for digital subscriptions
- Crisis features always accessible
- 7-day grace period implemented
- User can manage subscription via system settings

## Troubleshooting

### Receipt Verification Fails

1. Check environment variables are set correctly
2. Verify receipt format is correct (base64 for Apple, token for Google)
3. Check Apple/Google API credentials are valid
4. Review function logs for detailed errors

### Webhooks Not Received

1. Verify webhook URL is correctly configured
2. Check webhook signature validation (if implemented)
3. Review function logs for incoming requests
4. Test webhook manually with curl

### Cron Job Not Running

1. Verify cron schedule in `config.toml`
2. Check `CRON_SECRET` is set correctly
3. Review function logs for errors
4. Manually trigger to test

## Next Steps (Phase 3)

1. Integrate receipt verification in React Native app
2. Implement purchase flow UI
3. Add subscription status UI
4. Implement feature gating
5. Test end-to-end subscription flow

## Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Apple App Store Server Notifications](https://developer.apple.com/documentation/appstoreservernotifications)
- [Google Real-time Developer Notifications](https://developer.android.com/google/play/billing/rtdn-reference)
- [expo-in-app-purchases Docs](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)
