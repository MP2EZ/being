# Product Prioritization Framework v2.0

## Table of Contents

- [Overview](#overview)
- [What's New in v2.0](#whats-new-in-v20)
- [Metrics](#metrics)
  - [Impact (1-5): User Breadth](#impact-1-5-user-breadth)
  - [Value (1-5): Effect Depth](#value-1-5-effect-depth)
  - [Strategic Fit (1-5): Business Alignment](#strategic-fit-1-5-business-alignment)
  - [Urgency (1-5): Time Criticality](#urgency-1-5-time-criticality)
  - [Effort (T-Shirt Sizing): Development Complexity](#effort-t-shirt-sizing-development-complexity)
  - [Risk (1-5): Technical/Domain/Operational Risk](#risk-1-5-technicaldomain-operational-risk)
- [Priority Score Formula](#priority-score-formula)
- [Example Calculations](#example-calculations)
- [Usage Guidelines](#usage-guidelines)
- [Migration from v1.0](#migration-from-v10)

---

## Overview

Being uses an Enhanced Prioritization Framework that balances **user reach** (Impact), **user benefit** (Value), and **strategic alignment** (Strategic Fit) against **urgency**, **complexity**, and **risk**. This framework is specifically tuned for a pre-launch mental health application where safety and therapeutic value are paramount.

**Formula**:
```
Priority = (Impact × Value^1.5 × Strategic Fit × Urgency) / (Effort × Risk)
```

**Key Characteristics**:
- **Orthogonal Dimensions**: Impact (who) and Value (how much) are independent and objective
- **User Value Weighted**: Value^1.5 amplifies safety-critical features (11.2× multiplier for Value=5 vs Value=1)
- **Business Outcomes Emerge**: High I×V×SF naturally indicates high business value
- **Risk-Aware**: High-risk work is penalized, encouraging de-risking strategies
- **Context-Appropriate**: Tuned for pre-revenue, pre-launch therapeutic application

---

## What's New in v2.0

### Philosophy Shift: Orthogonal Dimensions

**v1.0 Problem**: Impact mixed business outcomes, user reach, and strategic importance into one subjective score. This made scoring inconsistent.

**v2.0 Solution**: Clear separation of concerns:
- **Impact** = Objective measure of **who** is affected (user breadth)
- **Value** = Objective measure of **how much** they're affected (effect depth)
- **Strategic Fit** = Business/mission alignment (revenue, competitive positioning, vision)

**Result**: More consistent, defensible scoring. Business importance naturally emerges from I×V×SF multiplication rather than being baked into Impact alone.

### Concrete Changes

| Dimension | v1.0 | v2.0 |
|-----------|------|------|
| **Impact** | "Business outcome magnitude" (subjective) | "User breadth" (objective: all/most/few) |
| **Value** | "User benefit" (mixed with reach) | "Effect depth" (objective: transformative/high/low) |
| **Strategic Fit** | Roadmap alignment | **Business alignment** (revenue, competitive, mission) |

### Example: Account System

**v1.0 Scoring** (ambiguous):
- Impact = 5 (because "enables subscriptions"? or "all users"?)
- Value = 4 (significant need)

**v2.0 Scoring** (clear):
- Impact = 5 (ALL users would have accounts) ← who
- Value = 4 (enables multi-device, data recovery) ← how much
- Strategic Fit = 4 (enables subscription revenue, competitive parity) ← why strategically important

**Business value is clear**: 5×4×4 = high I×V×SF = strategically important

---

## Metrics

### Impact (1-5): User Breadth

**What it measures**: How many users are affected by this feature or change?

**Philosophy**: Impact is an **objective measure of reach**, independent of how beneficial or strategic the feature is. Think "who uses this?" not "how important is this?"

#### Levels

**5 - All Users**
- Every user encounters this feature in normal usage
- Universal reach across user base
- *Example*: Authentication system, home screen, crisis button, core check-in flow

**4 - Most Users (75%+)**
- Large majority of users interact with this
- Core workflow or frequently-used feature
- *Example*: Breathing exercises, mood tracking, PHQ-9/GAD-7 assessments

**3 - Significant Subset (25-75%)**
- Meaningful portion of users, but not universal
- Important but not core to all journeys
- *Example*: Profile customization, values matrix, progress dashboard

**2 - Small Subset (<25%)**
- Niche feature used by minority of users
- Optional or specialized functionality
- *Example*: Data export, advanced settings, web-only features

**1 - Edge Case (<5%)**
- Very few users encounter this
- Rare usage or admin-only
- *Example*: Account deletion, support admin tools, edge case bug fixes

**Scoring Tip**: Ask "If we launched with 1,000 users, how many would use this in their first month?"

---

### Value (1-5): Effect Depth

**What it measures**: For users who ARE affected (Impact), how significant is the effect?

**Philosophy**: Value measures the **magnitude of benefit or harm**, independent of how many users experience it. Think "how much does this matter to those who use it?" not "how many people use it?"

#### Levels

**5 - Transformative**
- Life-changing or life-saving impact
- Fundamentally alters user outcomes
- Safety-critical functionality with zero tolerance for failure
- *Example*: Crisis button (life-saving), PHQ-9/GAD-7 scoring accuracy (diagnostic), data encryption (privacy protection)

**4 - High Effect**
- Major improvement to user experience or outcomes
- Addresses significant pain point or need
- Meaningfully advances therapeutic goals
- *Example*: Multi-device sync (prevents data loss), guided meditation audio (enhances practice), progress tracking (motivates engagement)

**3 - Moderate Effect**
- Noticeable improvement, but not transformative
- Reduces friction or adds convenience
- Clear benefit when used
- *Example*: Breathing circle visual polish (smoother experience), notification customization (better control)

**2 - Low Effect**
- Small convenience or minor improvement
- Reduces minor friction
- Nice-to-have but not necessary
- *Example*: Remember last sound selection, auto-save preferences, UI animation polish

**1 - Minimal Effect**
- Cosmetic or negligible functional change
- Purely aesthetic with no measurable benefit
- *Example*: Icon color adjustments, minor spacing tweaks, non-functional polish

**Scoring Tip**: Ask "For users who use this, would they notice if we removed it? How much would they care?"

---

### Strategic Fit (1-5): Business Alignment

**What it measures**: How well does this align with Being's business goals, competitive positioning, revenue model, and product vision?

**Philosophy**: Strategic Fit captures the **business case**. High I×V with low SF = important to users but not strategically prioritized. High SF with low I×V = strategically important but low user reach/benefit.

#### Levels

**5 - Business Critical**
- Defines what Being fundamentally is
- Mission-essential or revenue-critical
- Competitive differentiator or regulatory requirement
- *Example*: MBCT therapeutic accuracy, HIPAA compliance, crisis intervention system, subscription infrastructure (revenue)

**4 - Core Strategy**
- Directly advances business objectives
- Key competitive feature or revenue driver
- Essential for market positioning
- *Example*: Account system (enables monetization), assessment workflows (therapeutic credibility), cross-device sync (competitive parity)

**3 - Strategically Aligned**
- Supports business goals
- Enhances competitive position
- Moves key business metrics
- *Example*: Progress dashboard (retention), notification system (engagement), onboarding optimization (conversion)

**2 - Peripheral**
- Indirectly supports strategy
- Secondary business value
- Nice-to-have for positioning
- *Example*: Additional customization options, UI themes, social sharing features

**1 - Tangential**
- Minimal strategic value
- Could apply to any wellness app
- No competitive or revenue impact
- *Example*: Generic UI polish, cosmetic features, non-differentiated functionality

**Scoring Tip**: Ask "Does this advance our business goals (revenue, competitive position, mission)? Would investors/stakeholders care?"

#### Strategic Fit Hierarchy

When multiple strategic concerns conflict, use this hierarchy to determine Strategic Fit scoring:

**1. Safety (Highest Priority)**
- Crisis intervention, user harm prevention, clinical accuracy
- Examples: 988 access, PHQ-9/GAD-7 scoring, data protection
- Rationale: Zero tolerance for user harm in mental health context

**2. Mission / Therapeutic Integrity**
- MBCT fidelity, therapeutic effectiveness, clinical validation
- Examples: MBCT exercises, assessment workflows, therapeutic content
- Rationale: Defines what Being fundamentally is

**3. Compliance / Legal**
- HIPAA requirements, privacy regulations, app store compliance
- Examples: Data encryption, user consent, PHI handling
- Rationale: Non-negotiable requirements that block launch/operation

**4. Revenue / Business Model**
- Monetization enablers, subscription infrastructure, payment processing
- Examples: Account system, in-app purchases, subscription management
- Rationale: Required for business sustainability

**5. Competitive Positioning**
- Market differentiation, feature parity, user expectations
- Examples: Multi-device sync, social features, customization
- Rationale: Improves market position but not mission-critical

**Application Example**:
```
Feature: Values Matrix (MBCT therapeutic tool)
- Safety angle: None (informational, non-crisis)
- Mission angle: HIGH (core MBCT principle - values-based living)
- Compliance angle: None (no PHI)
- Revenue angle: None (doesn't enable monetization)
- Competitive angle: Medium (some competitors have values features)

Strategic Fit = 5 (mission-essential MBCT principle takes precedence)
```

**Conflict Resolution**:
- Safety always overrides other concerns (SF=5 if safety-critical)
- Mission > Revenue (therapeutic integrity over monetization)
- Compliance = Blocker (if non-compliant, fix before considering other angles)
- If equal on hierarchy, use combination (e.g., Mission+Revenue = SF=5)

---

### Urgency (1-5): Time Criticality

**What it measures**: When does this need to be done? Based on external deadlines, dependencies, market windows, or blocking relationships.

**Philosophy**: Urgency is **context-dependent**. Pre-launch focuses on launch blockers. Post-launch focuses on competitive windows and user-validated needs.

#### Levels

**5 - Critical Blocker**
- Blocks production launch or creates immediate safety/compliance risk
- Must be resolved now or face severe consequences
- *Example*: Crisis button bug at launch, security vulnerability in production, HIPAA violation

**4 - Hard Deadline**
- Regulatory requirement, funding milestone, or contractual obligation
- Missing deadline has real consequences (revenue loss, legal risk, investor relations)
- *Example*: App store compliance before launch, investor demo requirements, regulatory filing deadline

**3 - Target Window**
- Planned for specific phase/quarter with some flexibility
- Soft deadline with business rationale
- Missing window delays but doesn't block
- *Example*: V1.1 features planned for Q2, post-launch improvements, competitive response features

**2 - Opportunistic**
- Would be nice to include soon but no time pressure
- Flexible timing, can slip without consequence
- *Example*: Post-launch enhancements, additional features after validation, quality-of-life improvements

**1 - No Deadline**
- Can be done anytime or never
- No external pressure or dependencies
- Speculative or unvalidated features
- *Example*: Future feature exploration, unvalidated ideas, polish without user feedback

**Context-Specific Guidance**:

**Pre-Launch** (current phase):
- U=5: Blocks launch (safety, compliance, core features)
- U=4: Needed for launch credibility (onboarding, assessments)
- U=3: Post-launch target window
- U=1-2: Validate need with users first before building

**Post-Launch** (future phase):
- U=5: User-validated pain point causing churn
- U=4: Competitive threat or market window
- U=3: Planned for current quarter
- U=1-2: Backlog for later validation

**Scoring Tip**: Ask "When does this NEED to be done? What happens if we delay 3 months? 6 months?"

---

### Effort (T-Shirt Sizing): Development Complexity

**What it measures**: Total work required across engineering, design, testing, clinical validation, compliance review, and documentation.

**Quantification**: T-shirt sizes map to Fibonacci story points for calculation.

#### Levels

**XS → 1 point** (~1 week)
- Trivial fix, configuration change, copy update
- Minimal testing required
- No cross-functional dependencies
- *Example*: Fix typo, adjust padding constant, update help text

**S → 2 points** (1-2 weeks)
- Small feature or straightforward bug fix
- Single component or isolated change
- Basic testing and review
- *Example*: Add single UI component, simple API integration, minor refactor

**M → 3 points** (2-3 weeks)
- Moderate feature with some complexity
- Multiple components or moderate state changes
- Requires testing across scenarios
- *Example*: New screen with state management, moderate refactor, multi-step flow

**L → 5 points** (3-5 weeks)
- Large feature or complex system change
- Cross-cutting concerns or architectural impact
- Significant testing and validation
- *Example*: Account system (without compliance overhead), payment integration, major state refactor

**XL → 8 points** (5-8 weeks)
- Major feature or architectural change
- Significant design, engineering, and validation effort
- Clinical or compliance review required
- *Example*: Complete assessment flow redesign, new core therapeutic system, HIPAA-compliant infrastructure

**XXL → 13 points** (8+ weeks)
- Epic-level work that should be broken down
- Signals need for decomposition into smaller items
- *Example*: Full B2B platform, comprehensive AI integration, multi-month initiatives

**Estimation Guidelines**:

**Include in estimate**:
- Engineering implementation time
- Design and UX work
- Testing (unit, integration, E2E)
- Clinical validation (if therapeutic feature)
- Compliance review (if safety/privacy)
- Documentation
- Code review and iteration

**Estimation mistakes to avoid**:
- Forgetting compliance overhead for HIPAA features
- Underestimating testing for safety-critical features
- Ignoring clinical validation time for therapeutic content
- Not accounting for cross-platform testing (iOS + Android)

#### Effort Aggregation for Cross-Functional Work

For features requiring multiple disciplines, aggregate effort using this approach:

**Step 1: Break down by discipline**
```
Engineering: X weeks
Design/UX: Y weeks
Testing/QA: Z weeks
Clinical Validation: W weeks (if therapeutic)
Compliance Review: V weeks (if safety/privacy)
Documentation: U weeks
```

**Step 2: Identify parallelization**
- Which work can happen simultaneously? (e.g., design + compliance review)
- Which work is sequential? (e.g., engineering → testing → clinical validation)

**Step 3: Calculate critical path**
```
Total Effort = Sequential work + MAX(parallel work streams)
```

**Example: Account System with HIPAA Compliance**
```
Engineering (auth implementation): 5 weeks
Security audit: 2 weeks (after engineering)
Compliance review: 1 week (parallel with engineering)
BAA procurement: 2-4 weeks (parallel, but blocks launch)
User rights implementation (deletion, export): 2 weeks (after engineering)
Testing (security + functional): 2 weeks (after all implementation)
Documentation: 1 week (parallel with testing)

Sequential path:
  Engineering (5w) → User rights (2w) → Security audit (2w) → Testing (2w) = 11 weeks
Parallel overhead:
  BAA procurement (2-4 weeks, critical path blocker)

Total Effort: 11 + 4 (BAA worst case) = 15 weeks → XXL (13 points)
Risk: 5 (HIPAA compliance unknown: Does Supabase Auth have BAA? Need verification)
```

**Aggregation Formula**:
```
Effort (weeks) = Critical Path + Compliance Overhead + Uncertainty Buffer

Where:
  Critical Path = Longest sequential dependency chain
  Compliance Overhead = Regulatory/legal work (HIPAA, privacy)
  Uncertainty Buffer = 20-30% for R≥4, 10-15% for R=3, 0% for R≤2
```

**T-Shirt Size Mapping** (including aggregation):
- XS (1): ≤1 week total
- S (2): 1-2 weeks total
- M (3): 2-3 weeks total
- L (5): 3-5 weeks total
- XL (8): 5-8 weeks total
- XXL (13): 8+ weeks total (consider breaking down)

**Scoring Tip**: Ask "How many person-weeks of total work across all disciplines?" Use past similar items as reference.

---

### Risk (1-5): Technical/Domain/Operational Risk

**What it measures**: Uncertainty, dependencies, safety implications, compliance complexity, and implementation unknowns.

**Philosophy**: Risk penalizes Priority. High-risk work needs strong justification (high I×V×SF×TC) to be prioritized. Use Risk scoring to identify items needing de-risking before implementation.

#### Levels

**5 - Critical Risk**
- Safety-critical functionality with zero tolerance for errors
- Major technical unknowns AND regulatory requirements
- Errors could harm users or violate compliance
- Requires extensive testing and validation
- *Example*: Crisis intervention logic, PHQ-9/GAD-7 scoring algorithms, encryption key management, HIPAA-compliant data storage

**4 - High Risk**
- Significant technical complexity OR compliance/domain concerns
- Major unknowns or critical dependencies
- Requires security/clinical review
- *Example*: Authentication system, payment processing, encryption implementation, therapeutic content validation

**3 - Moderate Complexity**
- Multiple dependencies OR moderate technical challenge
- Some unknowns but manageable with research
- Standard testing sufficient
- *Example*: State management refactor, analytics platform setup, third-party integration, multi-step flows

**2 - Some Unknowns**
- Minor technical uncertainty OR single dependency
- Low stakes if issues arise
- Proven patterns available
- *Example*: New library integration (proven library), simple state changes, straightforward features

**1 - Low Risk**
- Well-understood with proven patterns
- No dependencies or safety implications
- Non-critical, easily reversible
- *Example*: UI polish, cosmetic changes, copy updates, configuration changes

**Risk Mitigation Strategies**:

For R=4-5 items:
- Require proof-of-concept before full implementation
- Add technical spike to de-risk unknowns
- Involve domain experts (clinical, security, compliance)
- Increase testing requirements (penetration testing, clinical validation)
- Plan for extra iteration/review cycles

**Scoring Tip**: Ask "What could go wrong? How confident are we in our approach? What are the consequences of failure?"

---

## Priority Score Formula

### Mathematical Notation

```
Priority = (I × V^1.5 × SF × U) / (E × R)

Where:
  I  = Impact (1-5): User breadth
  V  = Value (1-5): Effect depth
  SF = Strategic Fit (1-5): Business alignment
  U  = Urgency (1-5): Time criticality
  E  = Effort (1, 2, 3, 5, 8, 13 Fibonacci points)
  R  = Risk (1-5): Uncertainty and complexity
```

### Components

**Numerator** (higher is better):
- **I × V^1.5 × SF × U** measures total benefit
- **V^1.5** weights user benefit 1.5× (safety-first for mental health app)
- **I × V** combination captures total user value (reach × depth)
- **SF** modulates by business/strategic importance
- **U** prioritizes time-sensitive work

**Denominator** (lower is better):
- **E × R** measures total cost
- Effort (complexity) and Risk (uncertainty) both penalize priority

**Result**: Higher scores indicate higher priority

### Why Value^1.5?

The 1.5 exponent on Value amplifies high-value features while de-prioritizing low-value polish:

| Value | V^1.0 | V^1.5 | Multiplier Effect |
|-------|-------|-------|-------------------|
| 5 (Transformative) | 5 | 11.18 | **11.2× baseline** |
| 4 (High Effect) | 4 | 8.00 | **8.0× baseline** |
| 3 (Moderate) | 3 | 5.20 | **5.2× baseline** |
| 2 (Low Effect) | 2 | 2.83 | **2.8× baseline** |
| 1 (Minimal) | 1 | 1.00 | **1.0× baseline** |

This creates strong preference for safety-critical and high-impact features over cosmetic improvements.

### Score Ranges

- **Theoretical Maximum**: (5 × 5^1.5 × 5 × 5) / (1 × 1) ≈ 1,398
- **Theoretical Minimum**: (1 × 1^1.5 × 1 × 1) / (13 × 5) ≈ 0.015
- **Typical Range**: 1 to 500
- **High Priority Threshold**: >100 typically indicates Must-Have work
- **Low Priority Threshold**: <10 typically indicates Won't-Have work

### Priority Tiers

| Score | Tier | Action |
|-------|------|--------|
| **>150** | Must-Have | Work immediately, blocks launch or critical for success |
| **50-150** | Should-Have | Plan for current/next sprint, high business value |
| **10-50** | Could-Have | Backlog for later, validate need before building |
| **<10** | Won't-Have | Defer or delete, low priority for current phase |

---

## Example Calculations

### Example 1: Crisis Button Rendering Bug (Safety-Critical)

**Context**: Crisis button not rendering above modals during navigation transitions. Users in crisis cannot access 988.

```
Impact: 5 (potentially ALL users in crisis need this)
Value: 5 (life-saving when needed - transformative effect)
Strategic Fit: 5 (mission-essential safety feature)
Urgency: 5 (blocks launch - safety-critical bug)
Effort: S = 2 points (Portal-based fix, comprehensive tests)
Risk: 5 (safety-critical UI, zero tolerance for errors)

Priority = (5 × 5^1.5 × 5 × 5) / (2 × 5)
         = (5 × 11.18 × 5 × 5) / 10
         = 1,398 / 10
         = 139.8

Interpretation: MUST-HAVE (tier >100) - immediate work required for launch
Rationale: High I×V (all users, life-saving) + U=5 (blocks launch) overrides moderate effort and high risk
```

### Example 2: Account System (Infrastructure)

**Context**: Email/password authentication to enable multi-device sync and subscription revenue.

```
Impact: 5 (ALL users would need accounts if implemented)
Value: 4 (multi-device sync, data recovery - high effect)
Strategic Fit: 4 (enables subscription revenue, competitive parity)
Urgency: 1 (unvalidated need - should validate anonymous-first works first)
Effort: XXL = 13 points (auth + compliance + user rights + BAA procurement)
Risk: 5 (security-critical + HIPAA compliance + 6-9 months overhead)

Priority = (5 × 4^1.5 × 4 × 1) / (13 × 5)
         = (5 × 8 × 4 × 1) / 65
         = 160 / 65
         = 2.46

Interpretation: WON'T-HAVE (tier <10) - defer to post-launch
Rationale: High I×V×SF (important feature strategically), but U=1 (no urgency, needs validation) + massive E×R (13 weeks × risk 5) = wrong timing
Recommendation: Launch with anonymous-first, validate need with real users, then reconsider
```

### Example 3: Profile Tab with Values Matrix

**Context**: Complete profile tab implementation including MBCT values-based living matrix.

```
Impact: 5 (ALL users access profile)
Value: 4 (values matrix is core MBCT therapeutic tool - high effect)
Strategic Fit: 5 (values-based living is mission-essential MBCT principle)
Urgency: 3 (pre-launch target window, enhances therapeutic completeness)
Effort: M = 3 points (3 sections: values matrix, account settings, privacy/data)
Risk: 2 (values matrix needs clinical validation, otherwise straightforward)

Priority = (5 × 4^1.5 × 5 × 3) / (3 × 2)
         = (5 × 8 × 5 × 3) / 6
         = 600 / 6
         = 100

Interpretation: SHOULD-HAVE (tier 50-150) - plan for current sprint
Rationale: High I×V×SF (all users, core MBCT, mission-essential) + moderate U + manageable E×R
```

### Example 4: Breathing Bell Sound (Therapeutic Audio)

**Context**: Add optional bell chime to guide breathing rhythm (4 seconds in, 6 seconds out).

```
Impact: 4 (most users do breathing exercises - 75%+ reach)
Value: 3 (helps maintain rhythm, improves completion - moderate effect)
Strategic Fit: 3 (supports core MBCT feature, therapeutic enhancement)
Urgency: 1 (nice-to-have, should validate: do users want audio guidance?)
Effort: S = 2 points (audio file, playback integration, user toggle)
Risk: 1 (simple audio playback, proven patterns)

Priority = (4 × 3^1.5 × 3 × 1) / (2 × 1)
         = (4 × 5.2 × 3 × 1) / 2
         = 62.4 / 2
         = 31.2

Interpretation: COULD-HAVE (tier 10-50) - backlog for later
Rationale: Good I×V×SF (most users, moderate benefit, aligned), but U=1 (unvalidated - some users prefer silence in MBCT)
Recommendation: Launch without audio, survey users on audio preferences, then build if validated
```

### Example 5: UI Button Color Adjustment

**Context**: Adjust secondary button color from gray-200 to gray-300 for slightly better contrast.

```
Impact: 3 (affects users who use secondary buttons - significant subset)
Value: 1 (purely aesthetic, no functional change - minimal effect)
Strategic Fit: 1 (no business or strategic value)
Urgency: 1 (no urgency, cosmetic polish)
Effort: XS = 1 point (change one constant)
Risk: 1 (no risk, easily reversible)

Priority = (3 × 1^1.5 × 1 × 1) / (1 × 1)
         = (3 × 1 × 1 × 1) / 1
         = 3

Interpretation: WON'T-HAVE (tier <10) - deprioritize
Rationale: Even with minimal effort, V=1 (minimal effect) means this is pure polish with no user benefit
```

### Example 6: Web Subscriptions via Stripe

**Context**: Add Stripe payment processing for web-based subscriptions (in addition to mobile IAP).

```
Impact: 2 (only users who subscribe via web - small subset <25%)
Value: 3 (convenient payment option for web users - moderate effect)
Strategic Fit: 4 (enables additional revenue channel, reduces platform fees)
Urgency: 1 (no users yet, validate mobile-first monetization works first)
Effort: XL = 8 points (Stripe integration + dual payment architecture + webhook handling)
Risk: 5 (CRITICAL BLOCKER: Stripe has NO HIPAA BAA - subscription metadata = PHI)

Priority = (2 × 3^1.5 × 4 × 1) / (8 × 5)
         = (2 × 5.2 × 4 × 1) / 40
         = 41.6 / 40
         = 1.04

Interpretation: WON'T-HAVE (tier <10) - defer indefinitely
Rationale: Low I (small subset) + U=1 (no urgency) + R=5 BLOCKER (HIPAA compliance violation)
Critical Issue: Stripe explicitly does NOT offer HIPAA BAAs. Cannot be used for mental health app subscriptions.
```

---

## Usage Guidelines

### When to Score

- **New work items**: Score immediately upon creation to establish baseline priority
- **Quarterly reviews**: Re-score all active backlog items to reflect changing context
- **Phase transitions**: Re-score when moving between phases (pre-launch → post-launch → growth)
- **Significant changes**: Re-score if scope, strategy, or context changes materially

### Scoring Process

**1. Gather Context**
- Understand business goals, user needs, technical constraints
- Review any user research or validation data
- Identify dependencies and deadlines

**2. Score Collaboratively**
- **Required participants**: PM + Engineering Lead
- **When needed**: Clinical Lead (therapeutic features), Security Lead (PHI/compliance), Design Lead (UX-heavy)
- Avoid solo scoring - multiple perspectives improve accuracy

**3. Score in Order**
- **Start with Value**: "How much does this matter to users who use it?" (effect depth)
- **Then Impact**: "How many users will use this?" (user breadth)
- **Then Strategic Fit**: "How does this advance business goals?" (business alignment)
- **Then Urgency**: "When does this need to be done?" (time criticality)
- **Then Effort**: "How much work across all disciplines?" (complexity)
- **Finally Risk**: "What could go wrong?" (uncertainty)

**4. Use Reference Items**
- Compare to previously scored items for consistency
- "Is this more or less impactful than X feature we scored last week?"
- Build institutional memory of scoring patterns

**5. Document Rationale**
- Write 1-2 sentences justifying each score, especially for contentious items
- Note any disagreements and how they were resolved
- Record key assumptions (e.g., "assumes Supabase BAA available")

### Scoring Calibration

**Avoid Common Mistakes**:

❌ **Conflating Impact and Value**
- Wrong: "Crisis button is I=5 because it's important" (importance = I×V×SF)
- Right: "Crisis button is I=5 because ALL users might need it, V=5 because it's life-saving"

❌ **Inflating Strategic Fit for features you like**
- Wrong: "This cool feature is SF=5 because I'm excited about it"
- Right: "Does this advance revenue, competitive position, or mission? How directly?"

❌ **Scoring Urgency based on desire, not deadline**
- Wrong: "I want this soon, so U=5"
- Right: "Is there a real deadline or consequence? What happens if we delay 6 months?"

❌ **Underestimating Effort for HIPAA features**
- Wrong: "Account system is 5 weeks of coding"
- Right: "Account system is 13+ weeks including compliance review, BAA procurement, user rights, security audit"

❌ **Ignoring Risk for safety-critical features**
- Wrong: "Crisis button is just UI, R=1"
- Right: "Crisis button errors could cost lives, R=5"

### Interpreting Priority Scores

**Context Matters**:

**Pre-Launch Phase** (current):
- Emphasize: U (launch blockers), V (core features), SF (mission-essential)
- De-emphasize: I (for features needing validation - set U=1 to defer)
- Strategy: Build minimum viable therapeutic product, validate with users

**Post-Launch Phase** (future):
- Emphasize: I×V (proven user value), SF (competitive/revenue)
- De-emphasize: U (less urgency, more validation-driven)
- Strategy: Optimize features users actually use, expand validated value props

**Growth Phase** (future):
- Emphasize: I (scale features), SF (revenue/market share)
- Consider: Reducing Value exponent to 1.3 or 1.25 (balance user/business)
- Strategy: Efficiency and scale, business model optimization

### Pre-Launch Scoring Protocol

**Context**: Being is pre-launch with ZERO users. All feature requests are **unvalidated hypotheses** about user needs.

**Mandatory Scoring Rules for Pre-Launch**:

#### Rule 1: Impact & Value Are Intrinsic Properties
**Impact and Value measure the feature's POTENTIAL, not current usage.**

```
✅ CORRECT:
Account System → I=5 (ALL users would need accounts IF implemented)
Account System → V=4 (multi-device sync has HIGH effect for those users)

❌ WRONG:
Account System → I=1 (zero users today)
Account System → V=1 (nobody using it yet)
```

**Rationale**: Impact and Value answer "who would use this?" and "how much would they benefit?" These are properties of the feature design, not the current user base.

#### Rule 2: Urgency Reflects Validation Status
**U=1 for unvalidated features. U increases ONLY with evidence or launch necessity.**

```
Urgency Scoring Pre-Launch:

U=5: Blocks launch (safety bugs, compliance issues, core flows)
U=4: Needed for launch credibility (assessments, onboarding, crisis access)
U=3: Post-launch target window (nice-to-have for V1.0, planned for V1.1)
U=2: Validate with early users (wait for qualitative feedback)
U=1: No evidence of need (assumption, nice-to-have, speculative feature)
```

**Examples**:
```
Crisis Button: U=5 (blocks launch - safety-critical)
PHQ-9/GAD-7: U=4 (needed for therapeutic credibility)
Profile Tab: U=3 (enhances V1.0, not blocking)
Account System: U=1 (assumption users want accounts - validate anonymous-first works)
Nature Sounds: U=1 (assumption users want audio - no evidence yet)
```

#### Rule 3: Validation-Driven Prioritization
**For unvalidated features (U=1), priority should be LOW even with high I×V×SF.**

This is BY DESIGN - the formula correctly deprioritizes unvalidated work:
```
High I×V×SF Feature (unvalidated):
I=5, V=4, SF=4, U=1, E=5, R=3
Priority = (5 × 4^1.5 × 4 × 1) / (5 × 3) = 160 / 15 = 10.7

Same Feature (validated):
I=5, V=4, SF=4, U=3, E=5, R=3
Priority = (5 × 4^1.5 × 4 × 3) / (5 × 3) = 480 / 15 = 32

3× priority increase with validation
```

**Decision Framework**:
- **Priority <10 + U=1**: Defer until evidence emerges (user requests, competitor pressure, strategic pivot)
- **Priority 10-30 + U=1**: Consider small validation experiment (prototype, survey, competitor analysis)
- **Priority >30 + U=1**: Likely scored U incorrectly - is there hidden urgency or validation you're missing?

#### Rule 4: Launch-Blocking Work Gets U=4-5
**Only these categories justify U≥4 pre-launch:**

**U=5 (Critical Blocker)**:
- Safety bugs (crisis button not working, PHQ-9 scoring errors)
- Compliance violations (HIPAA breach, app store rejection risk)
- Core flow blockers (onboarding crash, assessment data loss)

**U=4 (Launch Credibility)**:
- Therapeutic completeness (PHQ-9/GAD-7, core MBCT exercises)
- Professional requirements (privacy policy, data security)
- User onboarding (assessment flow, initial setup)

**U≤3**: Everything else (enhancements, nice-to-haves, optimizations)

#### Rule 5: Document Validation Status
**For every feature scored U=1, document what would increase urgency:**

```
Feature: Account System
Current U: 1 (unvalidated)
Evidence needed to increase U:
  → U=2: 3+ users request multi-device sync in first 30 days
  → U=3: 25%+ users express frustration with device-locked data
  → U=4: Competitor launches with accounts as differentiator
  → U=5: Investor requires accounts for funding milestone
```

This creates clear criteria for re-prioritization as evidence emerges.

---

**Summary: Pre-Launch Scoring**
1. **I×V = intrinsic potential** (not current usage)
2. **U = validation + urgency** (U=1 for unvalidated features)
3. **Low priority for U=1 is correct** (wait for evidence)
4. **U≥4 only for launch blockers** (safety, compliance, credibility)
5. **Document what evidence would change U** (validation criteria)

### Decision Framework

**Priority Score → Action Mapping**:

```
>150  Must-Have   → Work immediately (next sprint)
50-150 Should-Have → Plan for current phase (this quarter)
10-50  Could-Have  → Backlog for validation (defer until evidence supports)
<10    Won't-Have  → Defer to future phase or delete

Special Cases:
- High I×V, Low U: Important feature, wrong timing → Validate need first
- High SF, Low I×V: Strategic but limited user value → Question if worth building
- High R (4-5): Any priority → Require de-risking spike before commitment
```

### Adjusting the Formula

The Value^1.5 weighting is appropriate for pre-launch mental health app context. Consider adjusting for different phases:

| Phase | Value Exponent | Rationale |
|-------|----------------|-----------|
| **Pre-Launch** (current) | V^1.5 | Safety-first, user-centric, therapeutic quality paramount |
| **Post-Launch** | V^1.3 to V^1.5 | Balance user value with business growth |
| **Growth Phase** | V^1.0 to V^1.3 | Business model optimization, scale features |
| **Mature Product** | V^1.0 | Pure multiplicative, efficiency-driven |

**Process for formula changes**:
1. Propose change in PM review with data-driven rationale
2. Validate with engineering, clinical, and business stakeholders
3. Update this document with version history
4. Re-score affected backlog items
5. Communicate changes to team with examples

---

## Migration from v1.0

### Mapping v1.0 → v2.0

| v1.0 Dimension | v2.0 Dimension | Migration Guide |
|----------------|----------------|-----------------|
| **Impact** (business outcome) | Split: **Impact** (user breadth) + **Strategic Fit** (business) | Ask: "How many users?" (I) and "Why business important?" (SF) |
| **Value** (user benefit) | **Value** (effect depth) | Unchanged concept, but clarify it's independent of reach |
| **Strategic Fit** (roadmap) | **Strategic Fit** (business alignment) | Expand to include revenue, competitive, mission angles |
| **Time Criticality** | **Urgency** (time criticality) | Renamed for clarity: U instead of TC |
| **Effort** | **Effort** | Unchanged |
| **Risk** | **Risk** | Unchanged |

### Re-Scoring Existing Items

For items scored with v1.0:

1. **Review Impact score**: Did you score based on "business importance" or "user reach"?
   - If business importance: Split into I (reach) + SF (strategic value)
   - If user reach: Keep Impact, adjust Strategic Fit if needed

2. **Review Value score**: Is it truly effect depth, or mixed with reach?
   - If mixed: Clarify I (who) vs V (how much) distinction

3. **Review Strategic Fit**: Does it capture business/revenue/competitive angles?
   - If only roadmap alignment: Expand to business alignment

**Example: Account System v1.0 → v2.0**

v1.0 Scores:
- I=5 (because "enables subscriptions" - business angle)
- V=4 (significant user need)
- SF=4 (core strategy)

v2.0 Re-Score:
- I=5 (ALL users → unchanged, but reasoning clarified)
- V=4 (high effect for users → unchanged)
- SF=4 (enables subscription revenue, competitive parity → reasoning expanded)

Priority largely unchanged, but scoring rationale is clearer and more defensible.

### Timeline for Migration

- **Immediate**: Use v2.0 framework for all NEW work items
- **Within 2 weeks**: Re-score top 20 backlog items (Priority >10) with v2.0
- **Within 1 month**: Complete re-scoring of entire active backlog
- **Ongoing**: Use v2.0 for all quarterly reviews

---

## Maintenance

**Document Owner**: Product Manager
**Review Cadence**: Quarterly or at major phase transitions
**Change Process**:
1. Propose changes in PM review with data-driven rationale
2. Validate with engineering, clinical, and business stakeholders
3. Update this document with version history
4. Re-score affected backlog items (track before/after)
5. Communicate changes to team with examples and migration guide

**Version History**:
- **v2.1 (2025-10-07)**: Critical modifications and terminology refinement
  - Renamed: "Time Criticality" → "Urgency" (TC → U for clarity and consistency)
  - Added: Pre-Launch Scoring Protocol (5 mandatory rules for validation-driven prioritization)
  - Added: Strategic Fit Hierarchy (Safety > Mission > Compliance > Revenue > Competitive)
  - Added: Effort Aggregation Guidance (cross-functional work estimation with critical path)
  - Rationale: Simpler terminology, formalized implicit rules, improved operational consistency
- **v2.0 (2025-10-06)**: Orthogonal dimensions framework
  - Impact = User breadth (objective: all/most/few)
  - Value = Effect depth (objective: transformative/high/low)
  - Strategic Fit = Business alignment (revenue, competitive, mission)
  - Rationale: v1.0 mixed business importance into Impact, causing subjective/inconsistent scoring
- **v1.0 (2025-10-05)**: Initial framework definition
  - Enhanced Framework with Value^1.5 weighting
  - Impact = Business outcome magnitude (mixed reach + business value)

---

## Questions or Feedback?

- **Scoring disagreements?** Bring to PM review with specific examples
- **Formula not working?** Collect data on mis-prioritized items and propose adjustments
- **Need calibration?** Request scoring workshop to align team on dimension definitions

Framework is a tool, not a rule. Use judgment. Adjust as we learn.
