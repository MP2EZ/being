# Data Privacy Architecture

**Being's Core Data Philosophy**

---

## Principle: Local-First Wellness Data

Being is designed so that **wellness data stays on the user's device**: screening responses and scores, mood check-ins, journal entries and practice history. This is not just a compliance strategy—it's a fundamental architectural decision that shapes how we build features.

What does leave the device is narrow and enumerated in `docs/legal/dpia-sensitive-wellness-data.md` §2. On the wellness-data side it is the crisis-detection event (a trigger category and severity bucket, never a raw score, recorded to Being's own Supabase project under vital interests; see `docs/legal/lia-crisis-telemetry.md`) and, only if the user opts in, the settings-only backup below.

### What This Means

1. **Wellness data stays local**
   - Assessment scores (PHQ-9, GAD-7)
   - Mood check-ins and notes
   - Practice history and progress

2. **No cloud sync of wellness data**
   - No backend storage of screening responses, scores, mood entries or journal content
   - No "sync to cloud" for assessments or mood data
   - The optional cloud backup carries app settings only (an autosave preference and a last-sync timestamp), never wellness data

3. **Encryption at rest**
   - Sensitive data encrypted with AES-256-GCM on device
   - Keys generated on device and held in OS-protected storage (iOS Keychain, Android Keystore)
   - Keys never leave the device

### Why This Matters

**Regulatory scope**: Being is a consumer wellness app, not a HIPAA covered entity or business associate, so HIPAA and Business Associate Agreements do not apply. That follows from what Being is, not from this architecture. The laws that do apply (FTC Act §5, the FTC Health Breach Notification Rule, state consumer privacy laws, GDPR where relevant) are set out in `docs/legal/regulatory-applicability.md`.

**User Trust**: Mental health data is deeply personal. Users can trust that their darkest moments, captured in mood logs or journal entries, stay on their phone.

**Smaller exposure**: Keeping wellness data local minimizes what a breach could expose. Breach notification still applies under the FTC Health Breach Notification Rule (16 CFR Part 318); the procedure is `docs/legal/breach-notification-runbook.md`.

### Implications for Feature Development

| Feature Type | Approach |
|-------------|----------|
| Analytics | Track feature usage, not health outcomes. Don't send assessment scores or mood data to analytics. |
| Cloud backup | Opt-in under cloud-sync consent. Runs automatically once enabled, encrypts on device, and uploads to Being's Supabase. Settings allowlist only (`CloudBackupService`); wellness data is never included. |
| Sharing | User explicitly exports/shares, never automatic sync. |
| Crash reports | Sanitize to remove any health context before transmission. |

### Non-Negotiables

- **Never send**: Assessment scores, mood values, journal content
- **Safe to send**: App opens, screen views, feature usage counts, crash stack traces (sanitized), performance metrics

---

## Related Documents

- `docs/architecture/analytics-architecture.md` - Analytics routing and data minimization
- `docs/legal/regulatory-applicability.md` - Which regulations apply
- `docs/security/` - Encryption implementation details

---

*This principle is foundational. Any feature that would require transmitting wellness data off the device needs explicit architectural review and a DPIA update.*
