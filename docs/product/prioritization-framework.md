# Product Prioritization Framework

## Table of Contents

- [Overview](#overview)
- [Metrics](#metrics)
  - [Impact (1-5): Business Outcome Magnitude](#impact-1-5-business-outcome-magnitude)
  - [Value (1-5): User Benefit](#value-1-5-user-benefit)
  - [Strategic Fit (1-5): Roadmap Alignment](#strategic-fit-1-5-roadmap-alignment)
  - [Time Criticality (1-5): Deadline Urgency](#time-criticality-1-5-deadline-urgency)
  - [Effort (T-Shirt Sizing): Development Complexity](#effort-t-shirt-sizing-development-complexity)
  - [Risk (1-5): Technical/Domain/Operational Risk](#risk-1-5-technicaldomain-operational-risk)
- [Priority Score Formula](#priority-score-formula)
- [Example Calculations](#example-calculations)
- [Usage Guidelines](#usage-guidelines)
- [Maintenance](#maintenance)

---

## Overview

Being uses an Enhanced Prioritization Framework that balances user value, business impact, strategic alignment, and urgency against complexity and risk. This framework is specifically tuned for a pre-launch mental health application where safety and therapeutic value are paramount.

**Formula**:
```
Priority = (Impact × Value^1.5 × Strategic Fit × Time Criticality) / (Effort × Risk)
```

**Key Characteristics**:
- **User Value Weighted**: Value^1.5 amplifies safety-critical features (11.2× multiplier for Value=5 vs Value=1)
- **Risk-Aware**: High-risk work is penalized, encouraging de-risking strategies
- **Multiplicative**: Weakness in any dimension significantly reduces priority
- **Context-Appropriate**: Tuned for pre-revenue, pre-launch therapeutic application

---

## Metrics

### Impact (1-5): Business Outcome Magnitude

**What it measures**: Effect on Being's business goals (retention, conversion, market position, revenue potential)

#### Levels

**1 - Negligible**
- No measurable business impact
- Affects edge cases or rarely-used features
- *Example*: UI polish on low-traffic screen, unused feature cleanup

**2 - Minor**  
- Small improvement in secondary metrics
- Marginal effect on user engagement
- *Example*: Onboarding copy improvements, help text additions

**3 - Moderate**
- Noticeable effect on key metrics (DAU, session length, completion rates)
- Measurable but not transformative
- *Example*: Nature sounds library expansion, notification improvements

**4 - Significant**
- Moves primary business metrics meaningfully
- Enables new revenue streams or major retention improvements
- *Example*: Account system (enables subscriptions), progress tracking (retention)

**5 - Transformative**
- Defines product success or market positioning
- Critical competitive differentiator
- *Example*: MBCT program completion flow, therapeutic assessment system

---

### Value (1-5): User Benefit

**What it measures**: How much users need or benefit from this (safety, functionality, therapeutic effectiveness, experience quality)

**Note**: This metric is weighted 1.5× in the priority formula to emphasize Being's user-first, safety-critical mission.

#### Levels

**1 - Cosmetic**
- Nice-to-have polish with no functional change
- Purely aesthetic improvements
- *Example*: Icon color adjustments, minor spacing tweaks

**2 - Quality of Life**
- Small convenience that reduces friction slightly
- Modest experience improvement
- *Example*: Remember last selected nature sound, auto-save preferences

**3 - Noticeable Benefit**
- Clear improvement to user experience
- Addresses minor pain points
- *Example*: Breathing circle visual polish, smoother animations

**4 - Significant Need**
- Addresses important user pain point
- Meaningful therapeutic or functional value
- *Example*: Progress tracking dashboard, mood trend analysis

**5 - Critical Need**
- Safety-critical functionality
- Core therapeutic features
- Fundamental product requirements
- *Example*: Crisis button, PHQ-9/GAD-7 assessments, data encryption, 988 hotline

---

### Strategic Fit (1-5): Roadmap Alignment

**What it measures**: How well this aligns with Being's product vision as an MBCT-based mental health application

#### Levels

**1 - Tangential**
- Loosely related to mission
- Could apply to any wellness app
- *Example*: Generic habit tracking, social features

**2 - Peripheral**
- Supports mission indirectly
- Secondary wellness features
- *Example*: Sleep tracking, general wellness tips

**3 - Aligned**
- Supports core MBCT/mental health goals
- Therapeutic but not essential
- *Example*: Mood journaling enhancements, mindfulness timer

**4 - Core Strategy**
- Directly advances therapeutic effectiveness
- Essential MBCT components
- *Example*: MBCT exercise library, guided meditation flows, assessment workflows

**5 - Mission Essential**
- Defines what Being fundamentally is
- Non-negotiable for product vision
- *Example*: Crisis intervention system, therapeutic check-ins, clinical privacy, PHQ-9/GAD-7 accuracy

---

### Time Criticality (1-5): Deadline Urgency

**What it measures**: How time-sensitive this work is based on external deadlines, dependencies, or market windows

#### Levels

**1 - No Deadline**
- Can be done anytime without consequence
- No external pressure or dependencies
- *Example*: Future feature exploration, nice-to-have enhancements

**2 - Opportunistic**
- Would be nice to include in next release
- Flexible timing
- *Example*: Additional customization options, feature polish

**3 - Target Window**
- Aimed at specific quarter/month but flexible
- Soft deadline with some wiggle room
- *Example*: V1.1 features planned for Q2, post-launch improvements

**4 - Hard Deadline**
- Regulatory requirement, funding milestone, or contractual obligation
- Missing deadline has real consequences
- *Example*: App store privacy compliance before launch, investor demo requirements

**5 - Critical Blocker**
- Blocks production launch or creates immediate safety risk
- Must be resolved now
- *Example*: Crisis button rendering bug at launch, security vulnerability in production

---

### Effort (T-Shirt Sizing): Development Complexity

**What it measures**: Total work required across engineering, design, testing, clinical validation, and documentation

**Quantification**: T-shirt sizes map to Fibonacci story points for calculation

#### Levels

**XS → 1 point** (~1 week)
- Trivial fix, configuration change, copy update
- Minimal testing required
- *Example*: Fix typo, adjust padding constant, update help text

**S → 2 points** (1-2 weeks)
- Small feature or straightforward bug fix
- Single component or isolated change
- *Example*: Add single UI component, simple API integration, minor refactor

**M → 3 points** (2-3 weeks)
- Moderate feature with some complexity
- Multiple components or moderate state changes
- *Example*: New screen with state management, moderate refactor, multi-step flow

**L → 5 points** (3-5 weeks)
- Large feature or complex system change
- Cross-cutting concerns or architectural impact
- *Example*: Account system, payment integration, major state refactor

**XL → 8 points** (5-8 weeks)
- Major feature or architectural change
- Significant design, engineering, and validation effort
- *Example*: Complete assessment flow redesign, new core therapeutic system

**XXL → 13 points** (8+ weeks)
- Epic-level work that should be broken down
- Signals need for decomposition
- *Example*: Full B2B platform, comprehensive AI integration system

---

### Risk (1-5): Technical/Domain/Operational Risk

**What it measures**: Uncertainty, dependencies, safety implications, compliance complexity, and implementation unknowns

#### Levels

**1 - Low Risk**
- Well-understood with proven patterns
- No dependencies or safety implications
- Non-critical, easily reversible
- *Example*: UI polish, cosmetic changes, copy updates

**2 - Some Unknowns**
- Minor technical uncertainty OR single dependency
- Low stakes if issues arise
- *Example*: New library integration (proven library), simple state changes

**3 - Moderate Complexity**
- Multiple dependencies OR moderate technical challenge
- Some unknowns but manageable
- *Example*: State management refactor, analytics platform setup, multi-step integration

**4 - High Risk**
- Significant technical complexity OR compliance/domain concerns
- Major unknowns or critical dependencies
- *Example*: Encryption implementation, payment processing, privacy compliance

**5 - Critical Risk**
- Safety-critical functionality with zero tolerance for errors
- Major technical unknowns AND regulatory requirements
- Errors could harm users or violate compliance
- *Example*: Crisis intervention logic, PHQ-9/GAD-7 scoring algorithms, HIPAA-compliant storage

---

## Priority Score Formula

### Mathematical Notation

```
Priority = (I × V^1.5 × SF × TC) / (E × R)

Where:
  I  = Impact (1-5)
  V  = Value (1-5)
  SF = Strategic Fit (1-5)
  TC = Time Criticality (1-5)
  E  = Effort (1, 2, 3, 5, 8, 13 Fibonacci points)
  R  = Risk (1-5)
```

### Components

**Numerator** (higher is better):
- Impact × Value^1.5 × Strategic Fit × Time Criticality
- Measures total benefit with user value weighted 1.5×

**Denominator** (lower is better):
- Effort × Risk
- Measures total cost including complexity and uncertainty

**Result**: Higher scores indicate higher priority

### Score Ranges

- **Theoretical Maximum**: (5 × 5^1.5 × 5 × 5) / (1 × 1) ≈ 1,398
- **Theoretical Minimum**: (1 × 1^1.5 × 1 × 1) / (13 × 5) ≈ 0.015
- **Typical Range**: 2 to 500
- **High Priority Threshold**: >100 typically indicates Must-Have work
- **Low Priority Threshold**: <10 typically indicates Could-Have or Won't-Have work

---

## Example Calculations

### Example 1: Crisis Button Rendering Bug (Safety-Critical)
```
Impact: 4 (significant retention/trust impact)
Value: 5 (safety-critical, core functionality)
Strategic Fit: 5 (mission essential)
Time Criticality: 5 (blocks launch)
Effort: XS = 1 point (simple CSS fix)
Risk: 5 (safety-critical UI)

Priority = (4 × 5^1.5 × 5 × 5) / (1 × 5)
         = (4 × 11.18 × 5 × 5) / 5
         = 1,118 / 5
         ≈ 224

Interpretation: Extremely high priority - immediate work required
```

### Example 2: Account System (Infrastructure)
```
Impact: 5 (enables subscriptions, revenue)
Value: 4 (significant user need for sync/backup)
Strategic Fit: 4 (core strategy, not mission-defining)
Time Criticality: 5 (blocks monetization)
Effort: L = 5 points (auth, storage, sync)
Risk: 3 (moderate complexity, proven patterns)

Priority = (5 × 4^1.5 × 4 × 5) / (5 × 3)
         = (5 × 8 × 4 × 5) / 15
         = 800 / 15
         ≈ 53

Interpretation: High priority - critical infrastructure
```

### Example 3: Nature Sounds Library Expansion
```
Impact: 3 (moderate engagement improvement)
Value: 3 (noticeable benefit, not essential)
Strategic Fit: 2 (peripheral wellness feature)
Time Criticality: 1 (no deadline)
Effort: S = 2 points (audio assets + UI)
Risk: 1 (low risk, simple feature)

Priority = (3 × 3^1.5 × 2 × 1) / (2 × 1)
         = (3 × 5.2 × 2 × 1) / 2
         = 31.2 / 2
         ≈ 16

Interpretation: Medium-low priority - nice-to-have enhancement
```

### Example 4: Analytics Platform Setup
```
Impact: 5 (enables data-driven decisions, blocks AI)
Value: 2 (primarily business value, minimal user value)
Strategic Fit: 4 (core strategy enabler)
Time Criticality: 3 (needed for Q2 features)
Effort: L = 5 points (infrastructure, privacy compliance)
Risk: 2 (proven tools, straightforward setup)

Priority = (5 × 2^1.5 × 4 × 3) / (5 × 2)
         = (5 × 2.83 × 4 × 3) / 10
         = 169.8 / 10
         ≈ 17

Interpretation: Medium priority - important infrastructure but low immediate user value
```

---

## Usage Guidelines

### When to Score

- **New work items**: Score immediately upon creation
- **Quarterly reviews**: Re-score all backlog items to reflect changing context
- **Major milestones**: Re-score when transitioning phases (pre-launch → post-launch → growth)

### Scoring Process

1. **Gather context**: Understand business goals, user needs, dependencies
2. **Score collaboratively**: PM + Engineering + Clinical lead (for therapeutic features)
3. **Start with extremes**: Identify clear 1s and 5s first
4. **Use references**: Compare to previously scored items for consistency
5. **Document rationale**: Note why scores were assigned (especially for contentious items)

### Interpreting Scores

**Priority Tiers**:
- **>150**: Must-Have, work immediately
- **50-150**: Should-Have, plan for current/next sprint
- **10-50**: Could-Have, backlog for later
- **<10**: Won't-Have (this phase), deprioritize or defer

**Context Matters**:
- Pre-launch: Emphasize Time Criticality (launch blockers) and Value (core features)
- Post-launch: Emphasize Impact (growth) and Strategic Fit (competitive positioning)
- Scale phase: Emphasize Impact and efficiency (optimize denominator)

### Adjusting Weights

The Value^1.5 weighting is appropriate for pre-launch mental health app context. Consider adjusting for different phases:

- **Pre-Launch** (current): Value^1.5 (safety-first, user-centric)
- **Growth Phase**: Value^1.3 or Value^1.25 (balance user/business)
- **Scale Phase**: Value^1.0 (pure multiplicative, business-driven)

Formula changes should be documented as product context evolves.

---

## Maintenance

**Document Owner**: Product Manager  
**Review Cadence**: Quarterly or at major phase transitions  
**Change Process**: 
1. Propose changes in PM review
2. Validate with engineering and clinical leads
3. Update this document
4. Re-score affected backlog items
5. Communicate changes to team

**Version History**:
- 2025-10-05: Initial framework definition (Enhanced Framework with Value^1.5 weighting)
