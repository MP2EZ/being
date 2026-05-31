# FEAT-16: Account & Web Subscription UX Specifications

**Version**: 1.0
**Date**: 2025-12-23
**Status**: Final Specification

---

## Executive Summary

Complete user experience design for Being's account and subscription system, integrating:
- **Dual subscription channels**: App Store (iOS/Android) and Web (Stripe)
- **Privacy-first account creation**: Email/password + social login (Apple, Google)
- **HIPAA-compliant data separation**: Mental health data stays local, only preferences sync
- **Security-validated flows**: Email verification, biometric unlock, 15-min token expiry
- **Business-optimized conversion**: Social login to minimize friction (15-25% conversion impact)

---

## 1. Subscription Choice Flow

### 1.1 Entry Points

**When**: User encounters premium feature gate

**Where**:
- During onboarding (optional upgrade)
- When accessing premium features (breathing exercises, advanced journal, etc.)
- From Profile tab "Upgrade to Premium" CTA

### 1.2 Platform-Specific Presentation

#### iOS/Android (In-App)
**Initial screen: App Store subscription ONLY**
- Title: "Unlock Full Being Experience"
- Features list:
  - Advanced breathing exercises
  - Unlimited journal entries
  - Progress tracking & insights
  - Offline access to all content
- Pricing cards:
  - Monthly: $12.99/month
  - Annual: $79.99/year (Save 50%)
- Primary CTA: "Subscribe" → App Store payment flow
- Secondary link: "Already subscribed? Sign in" → Account login

**Compliance requirement**: NO mention of web pricing per Apple App Store guidelines

#### Web Only
**Subscription choice screen**:
- Same feature list
- Same pricing ($12.99/mo, $79.99/yr)
- Primary CTA: "Subscribe with Stripe" → Account creation + Stripe Checkout
- Note: "Subscribe here or through our mobile app"

### 1.3 User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PREMIUM FEATURE GATE                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  "Unlock this feature with Being Premium"           │  │
│  │                                                      │  │
│  │  ✓ Advanced breathing exercises                     │  │
│  │  ✓ Unlimited journal entries                        │  │
│  │  ✓ Progress tracking & insights                     │  │
│  │  ✓ Offline access to all content                    │  │
│  │                                                      │  │
│  │  [Subscribe - $12.99/mo or $79.99/yr]               │  │
│  │  [Already have an account? Sign in]                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              │                              │
              │ (App Store)                  │ (Web/Account exists)
              ▼                              ▼
      ┌───────────────┐            ┌────────────────┐
      │ Native Store  │            │  Sign In Flow  │
      │   Purchase    │            │  (Section 3)   │
      └───────────────┘            └────────────────┘
```

---

## 2. Account Creation Flow (Web Subscribers Only)

### 2.1 Design Principles

Following Being's onboarding patterns (`OnboardingScreen.tsx`):
- Clean, centered layouts with ample whitespace
- Being's color system: `colorSystem.themes.morning.primary` for CTAs
- Typography: `typography.headline2` for titles, `typography.bodyRegular` for body text
- Accessibility: 44pt minimum touch targets, screen reader support
- Privacy-first messaging throughout

### 2.2 Screen 1: Sign Up Method Selection

**Layout**:
```
┌────────────────────────────────────────────────────┐
│                                                    │
│              🧠 (BrainIcon)                        │
│                                                    │
│          Create Your Being Account                 │
│                                                    │
│      Your mental health data stays on your device  │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [🍎 Sign in with Apple]                     │ │ ← Primary CTA
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [G Sign in with Google]                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│              ────── or ──────                      │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [Continue with Email]                       │ │ ← Secondary
│  └──────────────────────────────────────────────┘ │
│                                                    │
│      Already have an account? Sign in             │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Copy**:
- **Title**: "Create Your Being Account"
- **Subtitle**: "Your mental health data stays on your device"
- **Buttons**:
  - "Sign in with Apple" (recommended)
  - "Sign in with Google"
  - "Continue with Email"
- **Footer link**: "Already have an account? Sign in"

**Behavior**:
- Social login → Auto-creates account → Email verification → Subscription selection
- Email path → Screen 2 (Email/Password entry)

### 2.3 Screen 2: Email/Password Registration

**Layout**:
```
┌────────────────────────────────────────────────────┐
│  [← Back]                                          │
│                                                    │
│          Create Your Being Account                 │
│                                                    │
│  Email address                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  you@example.com                             │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Password                                          │
│  ┌──────────────────────────────────────────────┐ │
│  │  ••••••••••••                          [👁]  │ │
│  └──────────────────────────────────────────────┘ │
│  ✓ At least 8 characters                          │
│  ✓ Mix of letters and numbers                     │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │ ☐ I agree to Being's Terms of Service and │   │
│  │   Privacy Policy                           │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [Create Account]                            │ │ ← Disabled until valid
│  └──────────────────────────────────────────────┘ │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Validation**:
- Email: Valid format
- Password: Minimum 8 characters, mix of letters and numbers
- Checkbox: Must be checked (not pre-checked per compliance)
- CTA disabled until all valid

**Copy**:
- **Password requirements** (shown below field):
  - "✓ At least 8 characters" (✓ turns green when met)
  - "✓ Mix of letters and numbers"
- **Consent checkbox**: "I agree to Being's Terms of Service and Privacy Policy"
  - Links open in modal/new tab

**Behavior**:
- On submit → Create account → Screen 3 (Email Verification)
- Error states:
  - Email exists: "An account with this email already exists. Sign in instead?"
  - Network error: "Connection failed. Please try again."

### 2.4 Screen 3: Email Verification

**Layout**:
```
┌────────────────────────────────────────────────────┐
│                                                    │
│                  ✉️                                │
│                                                    │
│          Verify Your Email Address                 │
│                                                    │
│      We sent a verification email to:              │
│      user@example.com                              │
│                                                    │
│      Click the link in your email to verify        │
│      your account and activate your subscription.  │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [I've verified - Continue]                  │ │ ← Primary
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [Resend verification email]                 │ │ ← Secondary
│  └──────────────────────────────────────────────┘ │
│                                                    │
│      Didn't receive it? Check spam folder          │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Copy**:
- **Title**: "Verify Your Email Address"
- **Body**: "We sent a verification email to: [user@example.com]"
- **Instructions**: "Click the link in your email to verify your account and activate your subscription."
- **Note**: "Didn't receive it? Check spam folder"

**Behavior**:
- Email sent immediately on account creation
- "Resend" button:
  - Cooldown: 60 seconds
  - Shows countdown: "Resend in 45s..."
  - Success toast: "Email sent!"
- "I've verified - Continue" button:
  - Polls backend for verification status
  - If verified → Redirect to Subscription flow
  - If not verified → Error: "Please verify your email first. Check your inbox."

**Security requirement**: Subscription CANNOT activate until email verified

### 2.5 Screen 4: Privacy Disclosure (HIPAA Compliance)

**Appears**: After email verification, before payment

**Layout**:
```
┌────────────────────────────────────────────────────┐
│  [← Back]                                          │
│                                                    │
│          Your Privacy Protection                   │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  What is stored in your account:             │ │
│  │                                              │ │
│  │  ✓ Email address                             │ │
│  │  ✓ Subscription status                       │ │
│  │  ✓ App preferences (notifications, theme)    │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  What stays on your device only:             │ │
│  │                                              │ │
│  │  🔒 Mental health assessments (PHQ-9, GAD-7) │ │
│  │  🔒 Journal entries and mood data            │ │
│  │  🔒 Crisis contacts                          │ │
│  │  🔒 Progress tracking                        │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│      ⓘ Your mental health data is never backed up │
│      to the cloud. If you uninstall the app or    │
│      lose your device, this data cannot be        │
│      recovered.                                    │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ ☐ I understand my mental health data stays  │ │
│  │   on my device                               │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [Continue to Subscription]                  │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  [View full Privacy Policy]                        │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Copy**:
- **Title**: "Your Privacy Protection"
- **What is stored**:
  - Email address
  - Subscription status
  - App preferences (notifications, theme)
- **What stays local**:
  - Mental health assessments (PHQ-9, GAD-7)
  - Journal entries and mood data
  - Crisis contacts
  - Progress tracking
- **Warning**: "Your mental health data is never backed up to the cloud. If you uninstall the app or lose your device, this data cannot be recovered."
- **Checkbox** (required): "I understand my mental health data stays on my device"

**Compliance requirement**: Explicit disclosure of what IS and IS NOT synced (per compliance validation)

### 2.6 Screen 5: Subscription Selection (Stripe Checkout)

**Layout**:
```
┌────────────────────────────────────────────────────┐
│  [← Back]                                          │
│                                                    │
│          Choose Your Plan                          │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Monthly                                     │ │
│  │  $12.99/month                                │ │
│  │                                              │ │
│  │  Billed monthly, cancel anytime              │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  ⭐ Annual (BEST VALUE)                      │ │ ← Recommended
│  │  $79.99/year                                 │ │
│  │                                              │ │
│  │  Save $76/year • Cancel anytime              │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [Continue to Payment]                       │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│      Secure payment powered by Stripe              │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Behavior**:
- Annual plan highlighted by default (BEST VALUE badge)
- On "Continue to Payment" → Redirect to Stripe Checkout
- Stripe handles: Payment collection, PCI compliance, receipt
- After successful payment → Redirect back to app with success state

**Stripe Checkout Configuration**:
- Mode: `subscription`
- Customer email: Pre-filled from account
- Success URL: `being://subscription/success?session_id={CHECKOUT_SESSION_ID}`
- Cancel URL: `being://subscription/cancel`
- Allow promotion codes: Yes

---

## 3. Login Flow (Returning Users)

### 3.1 Screen 1: Sign In Method Selection

**Layout**:
```
┌────────────────────────────────────────────────────┐
│                                                    │
│              🧠 (BrainIcon)                        │
│                                                    │
│          Welcome Back to Being                     │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [🍎 Sign in with Apple]                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [G Sign in with Google]                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│              ────── or ──────                      │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [Sign in with Email]                        │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│      Don't have an account? Sign up               │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Biometric Unlock** (if previously enabled):
- On app launch → Biometric prompt: "Unlock Being with Face ID"
- Success → Auto-login
- Failure → Fall back to this screen

### 3.2 Screen 2: Email/Password Sign In

**Layout**:
```
┌────────────────────────────────────────────────────┐
│  [← Back]                                          │
│                                                    │
│          Sign In to Being                          │
│                                                    │
│  Email address                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  you@example.com                             │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Password                                          │
│  ┌──────────────────────────────────────────────┐ │
│  │  ••••••••••••                          [👁]  │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  [Forgot password?]                                │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [Sign In]                                   │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Error States**:
- Invalid credentials: "Email or password incorrect. Please try again."
- Account not verified: "Please verify your email before signing in. [Resend verification]"
- Rate limited: "Too many login attempts. Please try again in 15 minutes."
  - Shows countdown: "Try again in 14:32"
- Network error: "Connection failed. Please check your internet and try again."

**Performance**:
- Standard login: <500ms target
- Crisis access available: <200ms (direct 988 button, no auth required)

### 3.3 Session Management

**Token Handling** (per API validation):
- **Access token**: 15-minute expiry
- **Refresh token**: 7-day expiry
- **Auto-refresh**: Silent refresh 60s before expiry
- **Storage**: SecureStore (iOS Keychain/Android Keystore)

**Session Expiry Handling**:
```
User interacting with app
         │
         ▼
Access token expires (15 min)
         │
         ▼
Auto-refresh with refresh token
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Success    Refresh token expired (7 days)
    │         │
    │         ▼
    │    Logout + Redirect to Sign In
    │    Show toast: "Session expired. Please sign in again."
    │
    ▼
Continue working
```

**Offline Handling** (per API validation):
- Cached subscription status: 7-day grace period
- User can continue using premium features offline
- On reconnect → Validate subscription status

### 3.4 Biometric Setup Flow

**Trigger**: After first successful sign-in

**Modal**:
```
┌────────────────────────────────────────────────────┐
│                                                    │
│                  🔐                                │
│                                                    │
│          Enable Face ID for Being?                 │
│                                                    │
│      Sign in faster with Face ID instead of        │
│      entering your password each time.             │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [Enable Face ID]                            │ │ ← Primary
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  [Not now]                                         │ ← Secondary
│                                                    │
└────────────────────────────────────────────────────┘
```

**Copy** (dynamic by device):
- iOS with Face ID: "Enable Face ID for Being?"
- iOS with Touch ID: "Enable Touch ID for Being?"
- Android: "Enable Biometric Unlock for Being?"

**Behavior**:
- "Enable" → Trigger biometric enrollment → Save preference
- "Not now" → Dismiss, can enable later in Settings

---

## 4. Subscription Management

### 4.1 In-App Subscription Status Display

**Location**: Profile tab (existing Being pattern)

**Component**: `SubscriptionStatusCard.tsx` (already exists)

**Layout**:
```
┌────────────────────────────────────────────────────┐
│  Subscription                                      │
│                                                    │
│  ⭐ Premium Active                                 │
│  Annual plan • Renews Dec 23, 2026                 │
│                                                    │
│  [Manage Subscription]                             │
└────────────────────────────────────────────────────┘
```

**States**:

1. **Active (App Store)**:
   - Status: "⭐ Premium Active"
   - Details: "Annual plan • Renews Dec 23, 2026"
   - CTA: "Manage Subscription" → Opens App Store subscriptions

2. **Active (Web/Stripe)**:
   - Status: "⭐ Premium Active"
   - Details: "Annual plan • Renews Dec 23, 2026"
   - CTA: "Manage Subscription" → Opens Stripe Customer Portal

3. **Cancelled (grace period)**:
   - Status: "⚠️ Premium Expires Soon"
   - Details: "Access until Dec 23, 2025"
   - CTA: "Reactivate Subscription"

4. **Expired**:
   - Status: "Premium Inactive"
   - Details: "Expired Dec 23, 2025"
   - CTA: "Renew Premium"

5. **Free (no subscription)**:
   - Status: "Free Account"
   - CTA: "Upgrade to Premium"

### 4.2 Stripe Customer Portal (Web Subscribers Only)

**Entry point**: "Manage Subscription" button in Profile tab

**Flow**:
1. User taps "Manage Subscription"
2. App generates Stripe Customer Portal session
3. Opens in-app browser → Stripe-hosted portal
4. User can:
   - Update payment method
   - Change plan (monthly ↔ annual)
   - Cancel subscription
   - View invoices
5. On close → Refresh subscription status

**Portal URL**: `https://billing.stripe.com/p/session/[SESSION_ID]`

### 4.3 Cancellation Flow

**App Store** (handled by Apple):
- User → Settings app → Subscriptions → Being → Cancel
- Being app polls subscription status
- Shows grace period notice

**Web/Stripe** (via Customer Portal):
- User → Manage Subscription → Cancel Subscription
- Stripe confirms: "Are you sure? You'll lose access on [date]"
- On confirm → Cancellation scheduled
- User retains access until period end

**In-App Messaging** (both channels):
```
┌────────────────────────────────────────────────────┐
│                                                    │
│  Your premium access ends on Dec 23, 2025         │
│                                                    │
│  You'll lose access to:                            │
│  • Advanced breathing exercises                    │
│  • Unlimited journal entries                       │
│  • Progress insights                               │
│                                                    │
│  [Reactivate Premium]                              │
│  [Continue with Free]                              │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 4.4 Reactivation Flow

**Scenario**: User cancelled, still in grace period

**CTA**: "Reactivate Subscription" button

**Behavior**:
- **App Store**: Opens App Store subscriptions → User re-enables
- **Web/Stripe**: API call to cancel the cancellation → Immediate reactivation
- Success toast: "Welcome back! Premium reactivated."

---

## 5. Error States & Edge Cases

### 5.1 Email Verification Pending

**Trigger**: User tries to access premium features before verifying email

**Modal**:
```
┌────────────────────────────────────────────────────┐
│                                                    │
│                  ✉️                                │
│                                                    │
│          Verify Your Email First                   │
│                                                    │
│      Please verify your email to activate          │
│      your premium subscription.                    │
│                                                    │
│      Check your inbox for the verification email.  │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [Resend Verification Email]                 │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  [I've Verified - Check Status]                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 5.2 Payment Failed

**Trigger**: Stripe payment fails during subscription

**Screen**:
```
┌────────────────────────────────────────────────────┐
│                                                    │
│                  ⚠️                                │
│                                                    │
│          Payment Failed                            │
│                                                    │
│      Your payment could not be processed.          │
│                                                    │
│      Error: Card declined (insufficient funds)     │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [Try Again]                                 │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  [Use Different Payment Method]                    │
│  [Contact Support]                                 │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Error messages** (from Stripe):
- Card declined: "Your card was declined. Please use a different payment method."
- Insufficient funds: "Insufficient funds. Please use a different card."
- Expired card: "Your card has expired. Please update your payment method."
- Network error: "Connection failed. Please check your internet and try again."

### 5.3 Subscription Expired

**Trigger**: User's subscription lapses

**Feature Gate**:
```
┌────────────────────────────────────────────────────┐
│                                                    │
│          Premium Subscription Expired              │
│                                                    │
│      Your premium access ended on Dec 23, 2025.    │
│                                                    │
│      Renew to regain access to:                    │
│      ✓ Advanced breathing exercises                │
│      ✓ Unlimited journal entries                   │
│      ✓ Progress insights                           │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  [Renew Premium - $12.99/mo]                 │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  [Continue with Free Features]                     │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 5.4 Offline Mode

**Scenario**: User offline, subscription status unknown

**Behavior** (per API validation):
- **If cached status valid (< 7 days)**: Continue with cached status
- **If cache expired**: Show warning but allow access

**Banner** (shown when offline):
```
┌────────────────────────────────────────────────────┐
│  ⚠️ Offline - Using cached subscription status     │
│  Last verified: 2 days ago                         │
└────────────────────────────────────────────────────┘
```

**Grace period**: 7 days offline access with cached status

### 5.5 Rate Limiting (Login Attempts)

**Trigger**: 5 failed login attempts in 15 minutes (per security validation)

**Error Screen**:
```
┌────────────────────────────────────────────────────┐
│  [← Back]                                          │
│                                                    │
│                  ⏱️                                 │
│                                                    │
│          Too Many Login Attempts                   │
│                                                    │
│      For your account security, please wait        │
│      before trying again.                          │
│                                                    │
│      Time remaining: 14:32                         │
│                                                    │
│  [Forgot Password?]                                │
│  [Contact Support]                                 │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Countdown timer**: Live countdown from 15:00 to 00:00

---

## 6. Accessibility Considerations

### 6.1 Screen Reader Support

Following Being's `OnboardingScreen.tsx` patterns:

**All screens must include**:
- `accessibilityLabel` for all interactive elements
- `accessibilityHint` for CTAs ("Double tap to continue")
- `accessibilityRole` (button, link, textbox)
- Live region for status updates
- Minimum 44pt touch targets

**Example** (Sign In button):
```tsx
<Pressable
  style={styles.primaryButton}
  onPress={handleSignIn}
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Sign In"
  accessibilityHint="Double tap to sign in to your Being account"
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <Text style={styles.primaryButtonText}>Sign In</Text>
</Pressable>
```

**Announcements**:
- Success: "Account created successfully. Check your email to verify."
- Error: "Sign in failed. Email or password incorrect."
- Loading: "Signing in... please wait."

### 6.2 Keyboard Navigation

**Tab order** (logical flow):
1. Email field
2. Password field
3. Forgot password link (if present)
4. Primary CTA
5. Secondary links

**Focus indicators**:
- 2px blue border (`colorSystem.accessibility.focus.primary`)
- 3:1 contrast ratio minimum (WCAG 2.1 AA)

### 6.3 Dynamic Type Support

**Font scaling**:
- Support up to 2.0× scale (`maxFontSizeMultiplier={2.0}`)
- Layouts reflow gracefully
- No horizontal scrolling required

### 6.4 High Contrast Mode

**System high contrast**:
- All text meets 4.5:1 contrast (WCAG AA)
- Focus indicators increase to 3px
- Error states use both color AND icon

---

## 7. Performance Requirements

Following Being's standards:

| Action | Target | Critical Path |
|--------|--------|---------------|
| Sign in (email/password) | <500ms | Auth API call + token storage |
| Sign in (biometric) | <300ms | Biometric prompt + token retrieval |
| Social login (Apple/Google) | <1000ms | OAuth flow + account creation |
| Session validation | <100ms | Token check (cached) |
| Subscription status check | <200ms | API call + cache update |
| Stripe Checkout redirect | <500ms | Session creation + URL generation |
| Emergency crisis access | <200ms | Direct access, no auth |

**Caching strategy** (per API validation):
- **Active subscriptions**: Cache 4 hours
- **Inactive subscriptions**: Cache 1 hour
- **Offline grace**: 7 days

**Loading states**:
- Skeleton screens for initial load
- Spinners for <2s operations
- Progress indicators for >2s operations

---

## 8. Copy & Messaging Recommendations

### 8.1 Tone & Voice

**Being's brand voice**: Calm, supportive, trustworthy, private-first

**Examples**:
- ✅ "Your mental health data stays on your device"
- ❌ "We don't upload your data to our servers"

- ✅ "Sign in faster with Face ID"
- ❌ "Use biometric authentication for quicker access"

### 8.2 Error Message Principles

1. **Be specific**: "Card declined" not "Payment failed"
2. **Provide action**: "Check your inbox" not "Email not verified"
3. **Stay calm**: "Please try again" not "ERROR: Invalid input"
4. **Be helpful**: Show next steps, offer alternatives

### 8.3 Privacy Messaging

**Always reinforce**:
- "Mental health data stays on your device"
- "Only your email and subscription info is stored"
- "End-to-end encryption for synced preferences"

**Locations**:
- Account creation screen
- Privacy disclosure screen
- Settings → Cloud Backup (existing)
- Onboarding privacy screen (existing)

---

## 9. Technical Integration Points

### 9.1 State Management (Zustand)

**New stores required**:

```typescript
// authStore.ts
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;

  // Biometric
  isBiometricEnabled: boolean;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

// subscriptionStore.ts
interface SubscriptionStore {
  status: 'free' | 'active' | 'cancelled' | 'expired';
  plan: 'monthly' | 'annual' | null;
  renewsAt: Date | null;
  cancelledAt: Date | null;
  source: 'app_store' | 'web' | null;

  checkStatus: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  reactivateSubscription: () => Promise<void>;

  // Caching
  lastChecked: Date | null;
  cacheExpiry: Date | null;
}
```

### 9.2 Navigation Integration

**New screens**:
- `SignUpScreen.tsx` (email/password registration)
- `SignInScreen.tsx` (login)
- `EmailVerificationScreen.tsx` (verify email)
- `PrivacyDisclosureScreen.tsx` (HIPAA disclosure)
- `SubscriptionSelectionScreen.tsx` (plan choice)
- `BiometricSetupModal.tsx` (Face ID/Touch ID setup)

**Navigation flows**:
```
Premium Feature Gate
  → SignUpScreen
    → EmailVerificationScreen
      → PrivacyDisclosureScreen
        → SubscriptionSelectionScreen (Stripe)
          → Success → Home with Premium
```

### 9.3 API Endpoints Required

**Authentication**:
- `POST /auth/signup` - Create account
- `POST /auth/signin` - Email/password login
- `POST /auth/social` - Apple/Google OAuth
- `POST /auth/verify-email` - Verify email
- `POST /auth/resend-verification` - Resend email
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/signout` - Logout

**Subscription**:
- `GET /subscription/status` - Check subscription
- `POST /subscription/create-checkout` - Stripe Checkout session
- `POST /subscription/create-portal` - Stripe Customer Portal
- `POST /subscription/cancel` - Cancel subscription
- `POST /subscription/reactivate` - Reactivate
- `POST /subscription/webhook` - Stripe webhook handler

### 9.4 Existing Component Reuse

**From Being codebase**:
- `BrainIcon` - Logo display
- `colorSystem`, `spacing`, `typography` - Design tokens
- `ConsentToggleCard` - Checkbox patterns (from onboarding)
- `SubscriptionStatusCard` - Status display (already exists)
- `CloudBackupSettings` - Privacy messaging patterns
- `CollapsibleCrisisButton` - Crisis access (always available)

---

## 10. Testing Requirements

### 10.1 User Acceptance Criteria

**Account Creation**:
- [ ] User can sign up with email/password
- [ ] User can sign up with Apple Sign-In
- [ ] User can sign up with Google
- [ ] Email verification required before subscription activation
- [ ] Privacy disclosure shown and acknowledged
- [ ] Invalid email shows error
- [ ] Weak password shows validation errors

**Login**:
- [ ] User can sign in with email/password
- [ ] User can sign in with Apple
- [ ] User can sign in with Google
- [ ] Biometric unlock works (iOS Face ID, Touch ID, Android)
- [ ] Rate limiting after 5 failed attempts
- [ ] Session persists across app restarts
- [ ] Token refresh happens automatically

**Subscription**:
- [ ] User can subscribe via Stripe (monthly)
- [ ] User can subscribe via Stripe (annual)
- [ ] Premium features unlock immediately after payment
- [ ] User can manage subscription via Stripe Portal
- [ ] User can cancel subscription
- [ ] User retains access during grace period
- [ ] User can reactivate cancelled subscription
- [ ] Offline access works for 7 days

**Privacy**:
- [ ] PHQ/GAD data never synced to cloud
- [ ] Only email, subscription, preferences synced
- [ ] Privacy disclosure shown during account creation
- [ ] Cloud backup settings show correct privacy notice

### 10.2 Platform Testing

**iOS**:
- [ ] Sign in with Apple works
- [ ] Face ID enrollment and unlock
- [ ] Touch ID enrollment and unlock (older devices)
- [ ] App Store subscription detection
- [ ] Deep link handling (`being://subscription/success`)

**Android**:
- [ ] Google Sign-In works
- [ ] Biometric unlock (fingerprint/face)
- [ ] Google Play subscription detection
- [ ] Deep link handling

**Web**:
- [ ] Stripe Checkout flow
- [ ] Stripe Customer Portal
- [ ] Deep link back to app after payment

### 10.3 Edge Case Testing

- [ ] Email already exists → Show "Sign in instead?"
- [ ] Email not verified → Block premium access
- [ ] Payment fails → Show clear error with retry
- [ ] Subscription expires → Show feature gate
- [ ] User offline for 7+ days → Grace period message
- [ ] Rate limited → Show countdown timer
- [ ] Token expires mid-session → Silent refresh
- [ ] Refresh token expires → Force re-login

---

## 11. Success Metrics

**Primary Metrics**:
- **Web subscription conversion rate**: Target 15% (per business validation)
- **Social login adoption**: Target 60%+ (reduces friction 15-25%)
- **Email verification completion**: Target 85%+
- **Subscription activation time**: <3 minutes from signup to premium access

**Performance Metrics**:
- **Login latency**: <500ms (p95)
- **Biometric unlock latency**: <300ms (p95)
- **Session validation**: <100ms (p95)
- **Crisis access**: <200ms (always, no auth)

**User Experience Metrics**:
- **Account creation drop-off**: <20% (each step)
- **Email verification drop-off**: <15%
- **Biometric adoption**: >50% of eligible devices
- **Support tickets (auth issues)**: <5% of users

**Business Metrics** (per business validation):
- **Stripe revenue** (target 15% of total subscription revenue)
- **Average revenue per user** (ARPU)
- **Churn rate** (<5% monthly target)
- **Reactivation rate** (>20% of cancelled users)

---

## 12. Implementation Phases

### Phase 1: Authentication Foundation (Week 1-2)
- Backend: Supabase setup, auth endpoints
- Frontend: Sign up/sign in screens
- Email verification flow
- Token management (15-min access, 7-day refresh)
- Session persistence

### Phase 2: Social Login & Biometric (Week 3)
- Apple Sign-In integration
- Google Sign-In integration
- Biometric enrollment and unlock
- Rate limiting implementation

### Phase 3: Subscription Integration (Week 4-5)
- Stripe Checkout integration
- Stripe Customer Portal
- Subscription status caching (4hr active, 1hr inactive)
- Offline grace period (7 days)
- Webhook handling

### Phase 4: UX Polish & Error Handling (Week 6)
- Privacy disclosure screens
- Error states and messaging
- Loading states and skeletons
- Accessibility audit (screen reader, keyboard nav)
- Performance optimization

### Phase 5: Testing & QA (Week 7)
- Multi-user isolation testing
- Cross-platform testing (iOS/Android/Web)
- Subscription flow end-to-end
- Edge case validation
- Security audit

---

## Appendix: Design Assets

### A. Screen Flow Diagram

```
┌─────────────┐
│  App Home   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│      Premium Feature Gate               │
│  [Subscribe] [Already have account?]    │
└──────┬───────────────────┬──────────────┘
       │                   │
       │(New)              │(Existing)
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ Sign Up      │    │  Sign In     │
│ Method       │    │  Method      │
│ Selection    │    │  Selection   │
└──────┬───────┘    └──────┬───────┘
       │                   │
       ├─Social────────────┤
       │                   │
       ├─Email/Password────┤
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ Email        │    │  Biometric   │
│ Verification │    │  or Password │
└──────┬───────┘    └──────┬───────┘
       │                   │
       ▼                   │
┌──────────────┐           │
│ Privacy      │           │
│ Disclosure   │           │
└──────┬───────┘           │
       │                   │
       ▼                   │
┌──────────────┐           │
│ Subscription │           │
│ Selection    │           │
└──────┬───────┘           │
       │                   │
       ▼                   │
┌──────────────┐           │
│ Stripe       │           │
│ Checkout     │           │
└──────┬───────┘           │
       │                   │
       └─────────┬─────────┘
                 │
                 ▼
       ┌──────────────────┐
       │  Premium Active  │
       │     App Home     │
       └──────────────────┘
```

### B. Being Design System Reference

**Colors**:
- Primary CTA: `colorSystem.themes.morning.primary` (#6B9BD1)
- Secondary CTA: `colorSystem.gray[200]` (#E5E7EB)
- Error: `colorSystem.status.error` (#DC2626)
- Success: `colorSystem.status.success` (#16A34A)
- Text Primary: `colorSystem.base.black` (#000000)
- Text Secondary: `colorSystem.gray[600]` (#6B7280)

**Typography**:
- Title: `typography.headline2` (28px, bold)
- Subtitle: `typography.bodyLarge` (18px, regular)
- Body: `typography.bodyRegular` (16px, regular)
- Caption: `typography.bodySmall` (14px, regular)

**Spacing**:
- Container padding: `spacing[24]` (24px)
- Section margin: `spacing[32]` (32px)
- Element gap: `spacing[16]` (16px)

**Border Radius**:
- Buttons: `borderRadius.large` (12px)
- Cards: `borderRadius.medium` (8px)
- Pills: `borderRadius.xxl` (24px)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-23 | Product Agent | Initial comprehensive specification incorporating all validation requirements |

---

**End of UX Specifications**
