## Complete FullMind Roadmap - Prioritized by Value/Effort

### CURRENT (Enhance v1.7)

| ID | Order | Feature | Type | Effort | Value | Rationale |
|----|-------|---------|------|--------|-------|-----------|
| CURR-AI-001 | 1 | Crisis risk prediction | AI | M | Critical | Prevents self-harm, highest ROI |
| CURR-FUNC-001 | 2 | Resume interrupted sessions | Functional | L | High | Quick win, major UX improvement |
| CURR-TECH-001 | 3 | Widget (iOS/Android) | Technical | M | High | 3x engagement boost |
| CURR-TECH-002 | 4 | Offline mode | Technical | M | High | Essential for reliability |
| CURR-FUNC-002 | 5 | Export PDF/CSV | Functional | L | High | 40% need for therapy |
| CURR-AI-002 | 6 | Conversational check-ins | AI | H | Medium | Complex but differentiating |
| CURR-AI-003 | 7 | CBT thought alternatives | AI | M | Medium | Active intervention tool |
| CURR-DES-001 | 8 | Haptic feedback | Design | L | Low | Polish, easy to add |
| CURR-AI-004 | 9 | Assessment insights | AI | L | Low | Simple trend analysis |

### P1 (Next 3 Months)

| ID | Order | Feature | Type | Effort | Value | Rationale |
|----|-------|---------|------|--------|-------|-----------|
| P1-FUNC-001 | 1 | 3-Minute Breathing Timer | Functional | L | Critical | Core MBCT, easy win |
| P1-AI-001 | 2 | Therapy summary generator | AI | L | High | Immediate therapist value |
| P1-DES-001 | 3 | Dark mode | Design | L | High | User request, accessibility |
| P1-TECH-001 | 4 | SQLite migration | Technical | M | High | Enables all analytics |
| P1-FUNC-002 | 5 | Calendar integration | Functional | M | High | Habit formation |
| P1-AI-002 | 6 | Pattern detection ML | AI | H | High | Unique insight value |
| P1-FUNC-003 | 7 | Thought Records (CBT) | Functional | M | Medium | Clinical best practice |
| P1-AI-003 | 8 | Smart reminders | AI | M | Medium | Better engagement |
| P1-TECH-002 | 9 | Data sync/backup | Technical | H | Medium | User peace of mind |
| P1-FUNC-004 | 10 | Weekly MBCT exercises | Functional | H | Medium | Depth practice |
| P1-FUNC-005 | 11 | Therapist portal (basic) | Functional | H | Medium | B2B revenue |
| P1-AI-004 | 12 | Micro-interventions | AI | L | Low | Nice enhancement |

### P2 (3-6 Months)

| ID | Order | Feature | Type | Effort | Value | Rationale |
|----|-------|---------|------|--------|-------|-----------|
| P2-TECH-001 | 1 | Wearable integration | Technical | M | High | Objective data correlation |
| P2-AI-001 | 2 | Peer matching/circles | AI | H | High | Community = retention |
| P2-TECH-002 | 3 | Notification actions | Technical | L | High | Frictionless engagement |
| P2-DES-001 | 4 | Progress badges | Design | L | Medium | Gamification works |
| P2-DES-002 | 5 | iPad/Tablet UI | Design | M | Medium | 30% use tablets |
| P2-AI-002 | 6 | Values alignment scoring | AI | L | Medium | Meaning tracking |
| P2-AI-003 | 7 | Educational content | AI | H | Medium | Psychoeducation value |
| P2-FUNC-001 | 8 | Video library | Functional | M | Medium | Visual learners |
| P2-FUNC-002 | 9 | Family accounts | Functional | M | Low | Niche but requested |
| P2-AI-004 | 10 | Personalized interventions | AI | M | Low | Incremental improvement |
| P2-FUNC-003 | 11 | Group challenges | Functional | M | Low | Engagement feature |

### P3 (6-12 Months)

| ID | Order | Feature | Type | Effort | Value | Rationale |
|----|-------|---------|------|--------|-------|-----------|
| P3-FUNC-001 | 1 | 8-Week MBCT Course | Functional | H | High | Full program value |
| P3-TECH-001 | 2 | Apple Watch app | Technical | H | High | Always-on access |
| P3-FUNC-002 | 3 | Workplace program (B2B) | Functional | H | High | Revenue stream |
| P3-FUNC-003 | 4 | Multiple languages | Functional | M | High | Market expansion |
| P3-AI-001 | 5 | Voice-first interface | AI | H | Medium | Future-proofing |
| P3-TECH-002 | 6 | HIPAA compliance | Technical | H | Medium | Enterprise requirement |
| P3-AI-002 | 7 | Predictive wellness | AI | M | Medium | Advanced insights |
| P3-FUNC-004 | 8 | Advanced analytics | Functional | M | Medium | Power users |
| P3-FUNC-005 | 9 | Teletherapy integration | Functional | H | Low | Complex partnerships |
| P3-FUNC-006 | 10 | Community forums | Functional | M | Low | Moderation burden |
| P3-AI-003 | 11 | Research mode | AI | L | Low | Limited audience |
| P3-TECH-003 | 12 | Microservices arch | Technical | H | Low | Over-engineering risk |

---

## Feature Implementation Dictionary

### CURRENT Enhancements

**CURR-AI-001: Crisis risk prediction**
- API: Claude Opus 4.1 weekly
- Inputs: 7d check-ins + assessments
- Output: Risk score 0-1, trigger at >0.7

**CURR-FUNC-001: Resume interrupted sessions**
- Store: Partial state in AsyncStorage
- Key: `current_checkin_{type}_{timestamp}`
- Clear: After completion or 24h

**CURR-TECH-001: Widget**
- iOS: WidgetKit/SwiftUI
- Android: App Widget/RemoteViews
- Action: Deep link to check-in

**CURR-TECH-002: Offline mode**
- Cache: All assets locally
- Queue: API calls in AsyncStorage
- Sync: Process when connected

**CURR-FUNC-002: Export PDF/CSV**
- Library: react-native-html-to-pdf
- Share: expo-sharing

**CURR-AI-002: Conversational check-ins**
- API: Claude Sonnet 4 streaming
- Voice: expo-av + Whisper STT
- Fallback: Traditional form

**CURR-AI-003: CBT thought alternatives**
- API: GPT-4 Turbo functions
- Validation: Claude Haiku safety
- Cache: Store successful reframes

**CURR-DES-001: Haptic feedback**
- Library: expo-haptics
- Platform: iOS only

**CURR-AI-004: Assessment insights**
- API: Claude Haiku trends
- Chart: Victory Native

### P1 Features

**P1-FUNC-001: 3-Minute Breathing Timer**
- Timer: RN Background Timer
- Animation: Reanimated 3 circle
- Audio: Optional bells

**P1-AI-001: Therapy summary generator**
- API: Claude Sonnet 4
- Template: Clinical format
- Output: Markdown → PDF

**P1-DES-001: Dark mode**
- Context: React Context
- Storage: AsyncStorage pref
- System: Follow device option

**P1-TECH-001: SQLite migration**
- Library: expo-sqlite
- Schema: Normalized tables
- Indexes: date, type, completion

**P1-FUNC-002: Calendar integration**
- iOS: EventKit
- Android: Calendar Provider
- Sync: Two-way reminders

**P1-AI-002: Pattern detection ML**
- Local: TensorFlow Lite
- Remote: Opus 4.1 monthly
- Features: Sleep/mood correlations

**P1-FUNC-003: Thought Records**
- Form: Situation→Thought→Feeling
- Analysis: Pattern identification

**P1-AI-003: Smart reminders**
- ML: On-device behavior learning
- Adjustment: ±2h from set time

**P1-TECH-002: Data sync/backup**
- Service: AWS Amplify/Supabase
- Encryption: End-to-end
- Trigger: Daily on WiFi

**P1-FUNC-004: Weekly MBCT exercises**
- Content: Bundled audio
- Player: expo-av
- Schedule: Suggest free times

**P1-FUNC-005: Therapist portal**
- Web: Separate React app
- Auth: Magic link email
- Data: Read-only summaries

**P1-AI-004: Micro-interventions**
- Triggers: Stress/time-based
- Content: 30-sec exercises
- Delivery: Push actions

### P2 Features

**P2-TECH-001: Wearable integration**
- iOS: HealthKit
- Android: Google Fit
- Data: HRV, sleep, steps

**P2-AI-001: Peer matching/circles**
- Algorithm: Sonnet 4 compatibility
- Chat: Text only
- Moderation: Haiku real-time

**P2-TECH-002: Notification actions**
- iOS: UNNotificationAction
- Android: RemoteInput
- Options: Quick mood/check-in

**P2-DES-001: Progress badges**
- System: Achievement unlocks
- Animation: Lottie celebrations

**P2-DES-002: iPad/Tablet UI**
- Layout: Master-detail split
- Navigation: Side panel

**P2-AI-002: Values alignment scoring**
- Daily: Haiku analysis
- Score: Percentage calc
- Trends: Weekly/monthly

**P2-AI-003: Educational content**
- Generation: GPT-4 lessons
- Format: Interactive modules
- Quiz: Knowledge checks

**P2-FUNC-001: Video library**
- Storage: CDN streaming
- Player: react-native-video

**P2-FUNC-002: Family accounts**
- Structure: Primary + linked
- Privacy: Opt-in sharing

**P2-AI-004: Personalized interventions**
- API: Sonnet 4 recommendations
- A/B: Test effectiveness

**P2-FUNC-003: Group challenges**
- Duration: 7-day cycles
- Leaderboard: Anonymous

### P3 Features

**P3-FUNC-001: 8-Week MBCT Course**
- Structure: Weekly unlocks
- Tracking: Detailed metrics
- Certificate: Completion

**P3-TECH-001: Apple Watch app**
- Framework: SwiftUI standalone
- Sync: CloudKit
- Complications: Mood

**P3-FUNC-002: Workplace program**
- Dashboard: Aggregate metrics
- SSO: SAML
- Reports: ROI

**P3-FUNC-003: Multiple languages**
- i18n: react-native-localize
- RTL: Arabic/Hebrew

**P3-AI-001: Voice-first interface**
- STT: Whisper
- NLU: Opus 4.1
- TTS: ElevenLabs

**P3-TECH-002: HIPAA compliance**
- Encryption: Rest/transit
- Audit: Access logs
- BAA: Agreements

**P3-AI-002: Predictive wellness**
- Model: Time-series
- Output: 3-7d forecasts

**P3-FUNC-004: Advanced analytics**
- Export: Excel/PowerBI
- Visualizations: D3.js

**P3-FUNC-005: Teletherapy integration**
- Providers: Zoom/Twilio SDK
- Schedule: In-app booking

**P3-FUNC-006: Community forums**
- Platform: Discourse/custom
- Moderation: AI+human

**P3-AI-003: Research mode**
- Consent: IRB forms
- Data: Anonymized

**P3-TECH-003: Microservices arch**
- Services: User/clinical/analytics
- Gateway: GraphQL Apollo