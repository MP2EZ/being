# MBCT → Stoic Mindfulness Migration Strategy
*Design Sprint Week 1, Day 5 | Status: Draft | FEAT-45*

---

## Document Purpose

This document defines the migration strategy for converting existing MBCT user data to the new Stoic Mindfulness data structures. It covers two scenarios: (1) no existing users (clean deployment), and (2) beta users exist (data migration required).

**Related Documents**:
- `MBCT-Architecture-Analysis.md` - Current MBCT data structures (source)
- `Stoic-Data-Models.md` - StoicPracticeStore target structure
- `Stoic-Checkin-Structures.md` - Flow data target structures

---

## Scenario Assessment

### Scenario 1: No Existing Users (Most Likely)

**Assumption**: Being is pre-launch, no production users exist.

**Migration Strategy**:
- ✅ **Clean deployment** - No migration needed
- ✅ Deploy new Stoic data models directly
- ✅ Remove MBCT-specific code in Phase 2 (86-file refactor)
- ✅ No data preservation required

**Validation**:
```typescript
// Check production database
const userCount = await db.users.count();
const checkInCount = await db.checkIns.count();

if (userCount === 0 && checkInCount === 0) {
  console.log('✅ Clean slate - deploy Stoic models directly');
  return 'SCENARIO_1_CLEAN_DEPLOY';
}
```

**Next Steps**: Skip to Phase 2 (86-file refactor) immediately after Week 1-2 design sprint.

---

### Scenario 2: Beta Users Exist (Unlikely But Possible)

**Assumption**: Limited beta testing created 1-100 users with MBCT check-in history.

**Migration Strategy**:
- ⚠️ **Data migration required** - Preserve historical data
- ⚠️ Map MBCT fields → Stoic equivalents where overlap exists
- ⚠️ Mark historical data as "MBCT era" (non-breaking for analytics)
- ⚠️ New check-ins use Stoic structure going forward
- ⚠️ User sees seamless transition (no data loss message)

**Decision Point**: Preserve or archive?
- **Option A (Preserve)**: Map MBCT data to Stoic fields (lossy but continuous UX)
- **Option B (Archive)**: Keep MBCT data separate, start fresh with Stoic (clean but discontinuous)

**Recommendation**: **Option A (Preserve)** - Better UX, maintains user trust

---

## Field Mapping: MBCT → Stoic

### Morning Flow Mapping

| MBCT Field | Type | Stoic Equivalent | Migration Strategy | Lossy? |
|------------|------|------------------|-------------------|--------|
| `bodyScan` | BodyAreaData[] | `physicalMetrics` | Aggregate 10 areas → 3 metrics (energy, comfort, tension) | YES |
| `emotions` | EmotionData[] | `embodiment.body_state_before` | Map emotional intensity → body state | YES |
| `thoughts` | ThoughtData[] | `learning.reactive_moments` | Categorize by helpful/unhelpful → reactive/responsive | YES |
| `physicalMetrics` | PhysicalMetricsData | `physicalMetrics` | **Direct transfer** (unchanged) | NO |
| `values` | ValuesData[] | `intention` | Map to closest cardinal virtue + context | YES |
| `dream` | DreamData | ❌ Not migrated | Stoic focus doesn't include dream tracking | LOST |

**Notes**:
- **bodyScan lossy mapping**: MBCT tracks 10 body areas with specific sensations. Stoic `physicalMetrics` uses 3 simple 1-10 scales. Migration averages areas into overall scores.
- **values → intention lossy**: MBCT values are general ("family", "health"). Stoic intentions require specific virtue + action. Migration uses heuristic mapping.
- **dream data lost**: Stoic Mindfulness doesn't include dream analysis. Archive separately if preservation desired.

---

### Midday Flow Mapping

| MBCT Field | Type | Stoic Equivalent | Migration Strategy | Lossy? |
|------------|------|------------------|-------------------|--------|
| `awareness` | AwarenessData | `control_check` | Map present-moment awareness → control classification | YES |
| `gathering` | GatheringData | `embodiment` | Direct transfer (breathing practice unchanged) | NO |
| `expanding` | ExpandingData | `reappraisal` | Map perspective/gratitude → virtue opportunity | YES |

**Notes**:
- **awareness → control_check conceptual shift**: MBCT asks "What are you aware of?" Stoic asks "What's in your control?" Migration uses linguistic analysis to classify.
- **gathering → embodiment unchanged**: Both use 60-second breathing practice. Direct transfer.
- **expanding → reappraisal**: MBCT's "expanding perspective" maps to Stoic "obstacle as virtue opportunity."

---

### Evening Flow Mapping

| MBCT Field | Type | Stoic Equivalent | Migration Strategy | Lossy? |
|------------|------|------------------|-------------------|--------|
| `dayReview` | DayReviewData | `review` | Add virtue framing to highlights/challenges/learnings | PARTIAL |
| `pleasantUnpleasant` | PleasantUnpleasantData | `learning.reactive_moments/responsive_moments` | Shift from event quality → response quality | YES |
| `thoughtPatterns` | ThoughtPatternsData | `learning.triggers_identified` | Direct transfer with Stoic language | PARTIAL |
| `tomorrowPrep` | TomorrowPrepData | `tomorrow_intention` | Add virtue specificity to intentions | PARTIAL |

**Notes**:
- **pleasantUnpleasant → learning**: MBCT categorizes events as pleasant/unpleasant (emotional valence). Stoic categorizes responses as reactive/responsive (virtue quality). Migration analyzes user's response description.
- **Partial losses acceptable**: Some MBCT nuance lost, but Stoic framework provides equivalent (different) depth.

---

## Data Structure Migration

### MBCT Data Model (Source)

```typescript
// Existing MBCT structures (from /src/types/flows.ts)
interface MorningFlowData {
  bodyScan?: BodyAreaData[];              // 10 body areas
  emotions?: EmotionData[];               // Emotional states
  thoughts?: ThoughtData[];               // Thought patterns
  physicalMetrics?: PhysicalMetricsData;  // Energy, sleep, comfort
  values?: ValuesData[];                  // Personal values
  dream?: DreamData;                      // Dream content
}

interface MiddayFlowData {
  awareness?: AwarenessData;      // Present moment awareness
  gathering?: GatheringData;      // Breathing space
  expanding?: ExpandingData;      // Perspective expansion
}

interface EveningFlowData {
  dayReview?: DayReviewData;
  pleasantUnpleasant?: PleasantUnpleasantData;
  thoughtPatterns?: ThoughtPatternsData;
  tomorrowPrep?: TomorrowPrepData;
}
```

### Stoic Data Model (Target)

```typescript
// New Stoic structures (from Stoic-Checkin-Structures.md)
interface StoicMorningFlowData {
  intention?: IntentionData;           // Virtue-based intention
  gratitude?: GratitudeData;           // 3 items with impermanence
  preparation?: PreparationData;       // Premeditatio malorum
  physicalMetrics?: PhysicalMetricsData;  // Unchanged
  principle_focus?: PrincipleFocusData;
}

interface StoicMiddayFlowData {
  control_check?: ControlCheckData;
  embodiment?: EmbodimentData;         // Breathing practice
  reappraisal?: ReappraisalData;
  intention_progress?: IntentionProgressData;
}

interface StoicEveningFlowData {
  review?: ReviewData;
  virtue_instances?: VirtueInstance[];
  virtue_challenges?: VirtueChallenge[];
  learning?: LearningData;
  gratitude?: GratitudeData;
  tomorrow_intention?: IntentionData;
}
```

---

## Migration Pseudocode

### Step 1: Pre-Migration Validation

```typescript
async function validatePreMigration() {
  // 1. Check user count
  const users = await db.users.findAll();
  console.log(`Found ${users.length} users to migrate`);

  // 2. Check check-in count
  const checkIns = await db.checkIns.count();
  console.log(`Found ${checkIns} check-ins to migrate`);

  // 3. Validate data integrity
  const corruptedCheckIns = await db.checkIns.findAll({
    where: { data: null }
  });

  if (corruptedCheckIns.length > 0) {
    throw new Error(`${corruptedCheckIns.length} corrupted check-ins found`);
  }

  // 4. Create backup
  await createDatabaseBackup('pre-stoic-migration');
  console.log('✅ Backup created');

  // 5. Dry run
  const dryRunResults = await migrationDryRun(users);
  console.log('Dry run results:', dryRunResults);

  return {
    userCount: users.length,
    checkInCount: checkIns,
    readyToMigrate: true,
  };
}
```

---

### Step 2: User Data Migration

```typescript
async function migrateUsers() {
  const users = await db.users.findAll();

  for (const user of users) {
    // Add Stoic practice store (new fields)
    const stoicPracticeStore: StoicPracticeStore = {
      developmental_stage: 'fragmented', // All users start at fragmented
      stage_started_at: new Date(),
      stage_assessment_history: [],

      principles_completed: [],
      current_principle: null,
      principle_progress: {},

      virtue_tracking: {
        wisdom: [],
        courage: [],
        justice: [],
        temperance: [],
      },
      virtue_summary: {
        wisdom_instances: 0,
        courage_instances: 0,
        justice_instances: 0,
        temperance_instances: 0,
        virtue_distribution: {
          primary_context: 'work',
          domain_virtue_patterns: {
            work: [],
            relationships: [],
            adversity: [],
          },
        },
        avg_effectiveness: {
          wisdom: 0,
          courage: 0,
          justice: 0,
          temperance: 0,
        },
        areas_for_development: [],
        last_30_days: {
          wisdom: 0,
          courage: 0,
          justice: 0,
          temperance: 0,
        },
        instances_this_week: 0,
        calculated_at: new Date(),
      },

      domain_applications: {
        work: { practice_instances: 0, principles_applied: [], effectiveness_rating: 0 },
        relationships: { practice_instances: 0, principles_applied: [], effectiveness_rating: 0 },
        adversity: { practice_instances: 0, principles_applied: [], effectiveness_rating: 0 },
      },

      negative_visualization_practice: {
        last_practiced: null,
        frequency_per_week: 0,
        contemplations: [],
      },

      daily_streak: 0,
      longest_streak: 0,
      practice_consistency: 0,
      last_practice_date: null,
      total_practice_days: 0,
    };

    await db.users.update(user.id, {
      stoicPracticeStore,
      migrated_from_mbct: true,
      migration_date: new Date(),
    });
  }

  console.log(`✅ Migrated ${users.length} users`);
}
```

---

### Step 3: Check-In Data Migration

```typescript
async function migrateCheckIns() {
  const checkIns = await db.checkIns.findAll({
    where: { type: { $in: ['morning', 'midday', 'evening'] } },
    order: [['created_at', 'ASC']],
  });

  let migratedCount = 0;
  let failedCount = 0;
  const failedCheckIns = [];

  for (const checkIn of checkIns) {
    try {
      const migratedData = await migrateCheckInData(checkIn);

      await db.checkIns.update(checkIn.id, {
        data: migratedData,
        data_version: 'stoic_v1',
        migrated_from_mbct: true,
        original_mbct_data: checkIn.data, // Archive original
      });

      migratedCount++;
    } catch (error) {
      console.error(`Failed to migrate check-in ${checkIn.id}:`, error);
      failedCount++;
      failedCheckIns.push({ id: checkIn.id, error: error.message });
    }
  }

  console.log(`✅ Migrated ${migratedCount} check-ins`);
  console.log(`❌ Failed ${failedCount} check-ins`);

  if (failedCount > 0) {
    await db.migrationLogs.create({
      type: 'check_in_migration_failures',
      failed_check_ins: failedCheckIns,
      timestamp: new Date(),
    });
  }

  return {
    migratedCount,
    failedCount,
    failedCheckIns,
  };
}
```

---

### Step 4: Morning Check-In Migration Logic

```typescript
function migrateMorningCheckIn(mbctData: MorningFlowData): StoicMorningFlowData {
  const stoicData: StoicMorningFlowData = {
    completed_at: new Date(),
    time_spent_seconds: 0, // Unknown from MBCT
    flow_version: 'stoic_v1_migrated',
  };

  // 1. physicalMetrics: Direct transfer (unchanged)
  if (mbctData.physicalMetrics) {
    stoicData.physicalMetrics = mbctData.physicalMetrics;
  }

  // 2. bodyScan → physicalMetrics (if physicalMetrics not present)
  if (!mbctData.physicalMetrics && mbctData.bodyScan) {
    stoicData.physicalMetrics = aggregateBodyScanToMetrics(mbctData.bodyScan);
  }

  // 3. values → intention (lossy mapping)
  if (mbctData.values && mbctData.values.length > 0) {
    const primaryValue = mbctData.values[0]; // Take first value
    stoicData.intention = mapValueToIntention(primaryValue);
  }

  // 4. emotions + thoughts → Skip for morning (no direct equivalent)
  // These will be inferred in evening review if patterns exist

  // 5. dream → Not migrated (Stoic doesn't track dreams)

  // 6. gratitude: Not present in MBCT morning flow (skip)

  // 7. preparation: Not present in MBCT (skip)

  return stoicData;
}

function aggregateBodyScanToMetrics(bodyScan: BodyAreaData[]): PhysicalMetricsData {
  // Average body scan sensations into 3 metrics
  const tensionAreas = bodyScan.filter(area =>
    area.sensation === 'tension' || area.sensation === 'tightness'
  );
  const energyAreas = bodyScan.filter(area =>
    area.sensation === 'energy' || area.sensation === 'warmth'
  );

  const avgTension = tensionAreas.reduce((sum, area) => sum + area.intensity, 0) / tensionAreas.length || 5;
  const avgEnergy = energyAreas.reduce((sum, area) => sum + area.intensity, 0) / energyAreas.length || 5;

  return {
    energy_level: Math.round(avgEnergy),
    sleep_quality: 5, // Default (not tracked in body scan)
    physical_comfort: Math.round(10 - avgTension), // Inverse of tension
    notes: `Migrated from MBCT body scan (${bodyScan.length} areas)`,
    timestamp: new Date(),
  };
}

function mapValueToIntention(value: ValuesData): IntentionData {
  // Heuristic mapping: MBCT value → Stoic virtue
  const virtueMapping: Record<string, CardinalVirtue> = {
    'family': 'justice',          // Relationships/duty
    'health': 'temperance',       // Self-care/moderation
    'connection': 'justice',      // Social good
    'creativity': 'wisdom',       // Understanding/growth
    'learning': 'wisdom',         // Knowledge pursuit
    'courage': 'courage',         // Direct match
    'kindness': 'justice',        // Compassion/fairness
    'patience': 'temperance',     // Self-control
    'honesty': 'justice',         // Integrity
    'growth': 'wisdom',           // Development
  };

  const virtue = virtueMapping[value.value.toLowerCase()] || 'wisdom'; // Default to wisdom

  return {
    virtue,
    context: 'work', // Default (MBCT doesn't specify domain)
    intention_statement: value.intention || `Practice ${virtue} in daily life`,
    what_i_control: 'My effort and attitude',
    what_i_dont_control: 'Outcomes and others\' reactions',
    reserve_clause: '...if circumstances allow', // Stoic addition
    timestamp: new Date(),
  };
}
```

---

### Step 5: Midday Check-In Migration Logic

```typescript
function migrateMiddayCheckIn(mbctData: MiddayFlowData): StoicMiddayFlowData {
  const stoicData: StoicMiddayFlowData = {
    completed_at: new Date(),
    time_spent_seconds: 180, // MBCT 3-Minute Breathing Space
    flow_version: 'stoic_v1_migrated',
  };

  // 1. gathering → embodiment (direct transfer - breathing practice)
  if (mbctData.gathering) {
    stoicData.embodiment = {
      duration_seconds: 60,
      body_state_before: {
        tension_level: mbctData.gathering.focus ? 10 - mbctData.gathering.focus : 5,
        energy_level: mbctData.gathering.clarity || 5,
        emotional_intensity: 5, // Not tracked in MBCT gathering
      },
      body_state_after: {
        tension_level: 5, // Assume improvement
        energy_level: mbctData.gathering.clarity || 6,
        emotional_intensity: 4,
      },
      noticed_sensations: [], // Not captured in MBCT
      did_practice_help: true, // Assume yes
      timestamp: new Date(),
    };
  }

  // 2. awareness → control_check (conceptual mapping)
  if (mbctData.awareness) {
    stoicData.control_check = mapAwarenessToControlCheck(mbctData.awareness);
  }

  // 3. expanding → reappraisal (perspective mapping)
  if (mbctData.expanding) {
    stoicData.reappraisal = mapExpandingToReappraisal(mbctData.expanding);
  }

  return stoicData;
}

function mapAwarenessToControlCheck(awareness: AwarenessData): ControlCheckData {
  // MBCT awareness describes current experience
  // Stoic control_check classifies what's controllable

  return {
    current_situation: awareness.present_moment || 'Migrated from MBCT awareness',
    control_assessment: [
      {
        aspect: 'My response to this situation',
        control_type: 'fully_in_control',
        what_i_control: 'My attention and reactions',
        what_i_cannot_control: 'External circumstances',
      },
    ],
    am_i_confusing_control: false, // Default assumption
    reorientation: 'Focus on what I can control: my response',
    timestamp: new Date(),
  };
}

function mapExpandingToReappraisal(expanding: ExpandingData): ReappraisalData {
  return {
    obstacle: 'Situation from midday check-in',
    initial_reaction: 'Initial emotional response (MBCT data)',
    virtue_opportunity: {
      virtue: 'wisdom', // Default
      virtue_response: expanding.gratitude ?
        'Practice gratitude and perspective' :
        'Approach with wisdom and calm',
      recognized_as_indifferent: false,
    },
    emotional_shift: expanding.connection ? 2 : 0, // Positive if connection felt
    timestamp: new Date(),
  };
}
```

---

### Step 6: Evening Check-In Migration Logic

```typescript
function migrateEveningCheckIn(mbctData: EveningFlowData): StoicEveningFlowData {
  const stoicData: StoicEveningFlowData = {
    completed_at: new Date(),
    time_spent_seconds: 0, // Unknown
    flow_version: 'stoic_v1_migrated',
  };

  // 1. dayReview → review (add virtue framing)
  if (mbctData.dayReview) {
    stoicData.review = {
      morning_intention_practiced: false, // Unknown (no morning intention in MBCT)
      day_quality_rating: 5, // Default
      virtue_moments: mbctData.dayReview.highlights || [],
      struggle_moments: mbctData.dayReview.challenges || [],
      how_am_i_better_today: mbctData.dayReview.learnings?.[0] || '',
      self_compassion: 'I did my best today given the circumstances',
      timestamp: new Date(),
    };
  }

  // 2. pleasantUnpleasant → learning (shift from event quality to response quality)
  if (mbctData.pleasantUnpleasant) {
    stoicData.learning = mapPleasantUnpleasantToLearning(mbctData.pleasantUnpleasant);
  }

  // 3. thoughtPatterns → learning.triggers_identified
  if (mbctData.thoughtPatterns && stoicData.learning) {
    stoicData.learning.triggers_identified = mbctData.thoughtPatterns.patterns?.map(
      p => p.pattern
    ) || [];
  }

  // 4. tomorrowPrep → tomorrow_intention (add virtue specificity)
  if (mbctData.tomorrowPrep) {
    stoicData.tomorrow_intention = {
      virtue: 'wisdom', // Default
      context: 'work',
      intention_statement: mbctData.tomorrowPrep.intentions?.[0] || 'Practice virtue tomorrow',
      what_i_control: 'My effort and responses',
      what_i_dont_control: 'Outcomes and circumstances',
      timestamp: new Date(),
    };
  }

  return stoicData;
}

function mapPleasantUnpleasantToLearning(data: PleasantUnpleasantData): LearningData {
  // MBCT: Pleasant vs. unpleasant events (external quality)
  // Stoic: Reactive vs. responsive moments (internal quality of response)

  const reactive_moments: ReactiveMoment[] = [];
  const responsive_moments: ResponsiveMoment[] = [];

  // Map unpleasant events as potential reactive moments
  if (data.unpleasant) {
    for (const event of data.unpleasant) {
      reactive_moments.push({
        trigger: event.event,
        automatic_reaction: event.coping || 'Reacted emotionally',
        outcome: 'Outcome unknown (MBCT data)',
        better_response_would_be: 'Pause and respond with virtue',
      });
    }
  }

  // Map pleasant events as potential responsive moments
  if (data.pleasant) {
    for (const event of data.pleasant) {
      responsive_moments.push({
        trigger: event.event,
        noticed_pause: false, // Unknown
        virtue_used: 'wisdom', // Default
        response: 'Responded positively',
        outcome: 'Positive outcome',
        what_made_this_possible: 'Awareness and intention',
      });
    }
  }

  return {
    reactive_moments,
    responsive_moments,
    triggers_identified: [],
    what_will_i_practice: 'Pause before responding',
    timestamp: new Date(),
  };
}
```

---

## Migration Execution Plan

### Phase 1: Pre-Migration (1 hour)

1. **Validate production environment**
   ```bash
   npm run validate:production-db
   ```

2. **Create full database backup**
   ```bash
   npm run db:backup -- --name="pre-stoic-migration-$(date +%Y%m%d)"
   ```

3. **Run dry migration on staging**
   ```bash
   NODE_ENV=staging npm run migration:dry-run
   ```

4. **Review dry run results**
   - Check migration success rate (target: >95%)
   - Identify problematic check-ins
   - Validate data integrity

### Phase 2: Migration Execution (2-4 hours depending on data volume)

1. **Put app in maintenance mode**
   ```bash
   npm run app:maintenance-mode -- --reason="Upgrading to Stoic Mindfulness"
   ```

2. **Run user migration**
   ```bash
   npm run migration:users
   ```

3. **Run check-in migration (batched)**
   ```bash
   npm run migration:check-ins -- --batch-size=100
   ```

4. **Validate migrated data**
   ```bash
   npm run migration:validate
   ```

### Phase 3: Post-Migration (1 hour)

1. **Smoke tests**
   ```bash
   npm run test:migration-smoke
   ```

2. **Verify user experience**
   - Login as test user
   - Check historical data visibility
   - Verify new check-ins use Stoic structure

3. **Take app out of maintenance mode**
   ```bash
   npm run app:resume
   ```

4. **Monitor for 24 hours**
   - Error rates
   - User feedback
   - Data integrity issues

### Phase 4: Rollback Plan (If Needed)

**Rollback Triggers**:
- Migration success rate <90%
- Critical bugs in migrated data
- User experience degradation
- Performance issues

**Rollback Steps**:
1. Put app back in maintenance mode
2. Restore database from backup
3. Deploy previous version (MBCT code)
4. Resume app
5. Post-mortem analysis

**Rollback Command**:
```bash
npm run migration:rollback -- --backup="pre-stoic-migration-YYYYMMDD"
```

---

## Edge Cases & Handling

### Edge Case 1: Corrupted MBCT Data

**Issue**: Some check-ins have null or malformed data.

**Detection**:
```typescript
const corruptedCheckIns = await db.checkIns.findAll({
  where: {
    $or: [
      { data: null },
      { data: {} },
      { type: { $notIn: ['morning', 'midday', 'evening'] } },
    ],
  },
});
```

**Handling**:
- Skip corrupted check-ins (don't migrate)
- Log for manual review
- Notify affected users (if identifiable)

---

### Edge Case 2: Incomplete Check-Ins

**Issue**: User started check-in but didn't complete all fields.

**Handling**:
- Migrate partial data (optional fields remain null)
- Mark as `incomplete: true`
- Don't fail migration due to missing optional fields

---

### Edge Case 3: Very Old Check-Ins (>6 months)

**Issue**: User has 200+ old MBCT check-ins.

**Handling**:
- **Option A**: Migrate all (preserves full history, slower)
- **Option B**: Migrate last 90 days only (faster, summary stats for older)
- **Recommendation**: Option A if user count <100, Option B if >100

---

### Edge Case 4: User Mid-Check-In During Migration

**Issue**: User is actively filling out check-in when migration starts.

**Prevention**:
- Put app in maintenance mode (prevents new check-ins)
- Schedule migration during low-traffic hours (3-5 AM user timezone)
- Send advance notice ("App updating tonight 3-5 AM")

**If it happens anyway**:
- Discard in-progress check-in
- Show message: "Check-in couldn't be saved due to app update. Please start fresh."

---

## Data Preservation Strategy

### Historical Data Archival

```typescript
interface MigratedCheckIn {
  id: string;
  user_id: string;
  type: 'morning' | 'midday' | 'evening';

  // New Stoic data (migrated)
  data: StoicMorningFlowData | StoicMiddayFlowData | StoicEveningFlowData;
  data_version: 'stoic_v1';

  // Original MBCT data (archived)
  original_mbct_data: MorningFlowData | MiddayFlowData | EveningFlowData;
  migrated_from_mbct: true;
  migration_date: Date;

  created_at: Date;
  updated_at: Date;
}
```

**Why preserve original?**
- Allows rollback if Stoic migration fails
- Supports future data analysis (MBCT vs. Stoic outcomes)
- User data sovereignty (can export original)

**Storage cost**: ~2x data size (acceptable for <1000 users)

---

## Analytics Continuity

### MBCT Era vs. Stoic Era

```typescript
interface UserAnalytics {
  user_id: string;

  // Separate stats for each era
  mbct_era: {
    total_check_ins: number;
    date_range: { start: Date; end: Date };
    avg_completion_rate: number;
  } | null;

  stoic_era: {
    total_check_ins: number;
    date_range: { start: Date };
    avg_completion_rate: number;
    developmental_stage: DevelopmentalStage;
  };

  // Continuous metrics (span both eras)
  total_practice_days: number;
  longest_streak: number;
  current_streak: number;
}
```

**Visualization**: Timeline showing transition point
```
Check-ins per week:
[MBCT era: 12 weeks]  |  [Stoic era: ongoing]
████████████████████  |  ███████████
                      ↑
                Migration point
                2025-11-01
```

---

## Success Criteria

### Migration Considered Successful If:

1. ✅ **>95% check-ins migrated** without errors
2. ✅ **Zero data loss** (original MBCT data preserved)
3. ✅ **User experience seamless** (no visible disruption)
4. ✅ **Analytics continuous** (can compare MBCT vs. Stoic periods)
5. ✅ **No performance degradation** after migration
6. ✅ **Rollback available** for 30 days post-migration

### Validation Queries

```typescript
// 1. Check migration coverage
const totalCheckIns = await db.checkIns.count();
const migratedCheckIns = await db.checkIns.count({
  where: { migrated_from_mbct: true }
});
const migrationRate = (migratedCheckIns / totalCheckIns) * 100;
console.log(`Migration rate: ${migrationRate}%`); // Target: >95%

// 2. Validate data integrity
const checkInsWithoutOriginal = await db.checkIns.count({
  where: {
    migrated_from_mbct: true,
    original_mbct_data: null,
  },
});
console.log(`Missing original data: ${checkInsWithoutOriginal}`); // Target: 0

// 3. Check for data corruption
const corruptedMigrations = await db.checkIns.findAll({
  where: {
    migrated_from_mbct: true,
    data: null,
  },
});
console.log(`Corrupted migrations: ${corruptedMigrations.length}`); // Target: 0
```

---

## Timeline Estimate

| Scenario | Pre-Migration | Migration | Post-Migration | Total |
|----------|--------------|-----------|----------------|-------|
| **No users** (Scenario 1) | 0 hours | 0 hours | 0 hours | **0 hours** |
| **1-10 beta users** | 1 hour | 1 hour | 1 hour | **3 hours** |
| **10-50 beta users** | 1 hour | 2 hours | 1 hour | **4 hours** |
| **50-100 beta users** | 2 hours | 4 hours | 2 hours | **8 hours** |

**Most Likely**: Scenario 1 (no users) = **0 hours migration time**

---

## Post-Migration User Communication

### User-Facing Message (If Migration Occurred)

**In-App Notification**:
```
🎉 Being has been upgraded!

We've enhanced your practice with Stoic Mindfulness - a powerful
blend of classical philosophy, mindfulness, and neuroscience.

Your historical data has been preserved and adapted to the new
framework. You can continue your practice seamlessly.

What's new:
✨ 12 Stoic Mindfulness principles
✨ Four cardinal virtues (wisdom, courage, justice, temperance)
✨ Enhanced daily check-ins with virtue tracking
✨ Philosophical guidance from Marcus Aurelius, Epictetus, Seneca

Questions? Contact support@being.app
```

**Email Follow-Up**:
- Explain MBCT → Stoic Mindfulness transition
- Reassure data preservation
- Highlight new features
- Offer migration FAQ

---

## Conclusion

**Scenario 1 (Most Likely)**: Clean deployment, no migration needed. Proceed directly to Phase 2 (86-file refactor) after design sprint.

**Scenario 2 (Unlikely)**: If beta users exist, migration is feasible with 3-8 hour execution window. Data preservation ensures user trust, lossy mappings are acceptable (equivalent philosophical depth in Stoic framework), and rollback capability provides safety net.

**Next Steps**:
- Determine actual scenario (check production database)
- If Scenario 1: Skip migration, proceed to Day 6
- If Scenario 2: Schedule migration window, execute plan

---

**Status**: Validated - Scenario 1 Confirmed
**Validation Date**: 2025-10-19
**Production User Count**: 0 users, 0 check-ins
**Migration Required**: NO - Clean deployment
**Next Action**: Proceed to Phase 2 (86-file refactor) after design sprint complete

---

## Scenario 1 Confirmed: Clean Deployment

✅ **No existing users** - Being is pre-launch
✅ **No migration needed** - Deploy Stoic models directly
✅ **No data preservation required** - Clean slate
✅ **Migration time**: 0 hours

**This document serves as**:
- Reference architecture for future migrations
- Template if Being pivots therapeutic approach again
- Validation that Stoic structures can hold MBCT-equivalent data where needed
