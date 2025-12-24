# Data Privacy Architecture

**Being's Core Data Philosophy**

---

## Principle: Local-First, No PHI Transmission

Being is designed so that **mental health data never leaves the user's device**. This is not just a compliance strategy—it's a fundamental architectural decision that shapes how we build features.

### What This Means

1. **All health data stays local**
   - Assessment scores (PHQ-9, GAD-7)
   - Mood check-ins and notes
   - Crisis contacts and safety plans
   - Practice history and progress

2. **No cloud sync of health data**
   - No backend database storing user mental health information
   - No "sync to cloud" for assessments or mood data
   - Backup/restore is user-initiated export, not cloud sync

3. **Encryption at rest**
   - Sensitive data encrypted with AES-256-GCM on device
   - Keys derived from user authentication
   - Data unreadable without user presence

### Why This Matters

**No BAAs Required**: Because we never transmit Protected Health Information (PHI) to third parties, we don't need Business Associate Agreements under HIPAA (45 CFR §164.502(e)). This dramatically simplifies our compliance posture.

**User Trust**: Mental health data is deeply personal. Users can trust that their darkest moments, captured in mood logs or crisis notes, never leave their phone.

**Simplicity**: No HIPAA-compliant backend infrastructure, no PHI breach notification requirements, no complex vendor agreements.

### Implications for Feature Development

| Feature Type | Approach |
|-------------|----------|
| Analytics | Track feature usage, not health outcomes. Don't send assessment scores or mood data to analytics. |
| Cloud backup | Export encrypted local backup to user's cloud (iCloud/Google Drive), not our servers. |
| Sharing | User explicitly exports/shares, never automatic sync. |
| Crash reports | Sanitize to remove any health context before transmission. |

### Non-Negotiables

- **Never send**: Assessment scores, mood values, journal content, crisis contact details
- **Safe to send**: App opens, screen views, feature usage counts, crash stack traces (sanitized), performance metrics

---

## Related Documents

- `docs/development/BAA-Free-Analytics-Design.md` - Detailed analytics-specific reference (if implementing analytics)
- `docs/security/` - Encryption implementation details

---

*This principle is foundational. Any feature that would require transmitting health data to external services needs explicit architectural review and likely a different approach.*
