# FEAT-80: Accessibility Improvements Required

## Status: ⚠️ APPROVED WITH MANDATORY IMPROVEMENTS

**Current Accessibility Rating**: 4/10  
**Target Rating**: 8/10 (Phase 1+2 complete)

---

## Summary

FEAT-80 implementation has strong foundational accessibility (touch targets, visual hierarchy) but **critical WCAG AA compliance gaps** exist around screen reader support, keyboard navigation, and semantic HTML. These are **blocking issues** for users with visual impairments in a life-safety mental health application.

---

## Critical Fixes Required (Phase 1) - BLOCKING

### 1. Screen Reader Labels for Tabs
**File**: `app/src/screens/learn/ModuleDetailScreen.tsx:159-186`

**Current** (MISSING accessibility props):
```tsx
<TouchableOpacity
  style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
  onPress={() => setActiveTab('overview')}
>
```

**Required**:
```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="tab"
  accessibilityLabel="Overview"
  accessibilityState={{ selected: activeTab === 'overview' }}
  accessibilityHint="Shows module overview and foundational content"
  style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
  onPress={() => setActiveTab('overview')}
>
  <Text
    style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}
    importantForAccessibility="no"
  >
    Overview
  </Text>
</TouchableOpacity>
```

**Apply to BOTH tabs** (Overview + Practice)

---

### 2. ARIA Semantics for Expandable Obstacles
**File**: `app/src/screens/learn/tabs/OverviewTab.tsx:176-187`

**Current** (MISSING accessibility props):
```tsx
<TouchableOpacity
  style={styles.obstacleHeader}
  onPress={() => toggleObstacle(index)}
  activeOpacity={0.7}
>
```

**Required**:
```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel={`${obstacle.question}. ${isExpanded ? 'Expanded' : 'Collapsed'}`}
  accessibilityState={{ expanded: isExpanded }}
  accessibilityHint="Double tap to toggle answer"
  style={styles.obstacleHeader}
  onPress={() => toggleObstacle(index)}
  activeOpacity={0.7}
>
```

**Apply to ALL obstacle cards** (map iteration)

---

### 3. Semantic Heading Hierarchy
**File**: `app/src/screens/learn/tabs/OverviewTab.tsx`

**Current** (lines 90, 134, 163, 211):
```tsx
<Text style={styles.sectionTitle}>What It Is</Text>
<Text style={styles.sectionTitle}>Why It Matters</Text>
<Text style={styles.sectionTitle}>Common Questions & Challenges</Text>
<Text style={styles.sectionTitle}>Developmental Stages</Text>
```

**Required**:
```tsx
<Text 
  style={styles.sectionTitle}
  accessibilityRole="header"
  accessibilityLevel={2}
>
  What It Is
</Text>
```

**Apply to ALL section titles**

---

### 4. Focus Indicators for Keyboard Navigation
**File**: `app/src/screens/learn/ModuleDetailScreen.tsx`

**Add to StyleSheet** (after line 327):
```tsx
tabFocused: {
  borderWidth: 2,
  borderColor: colorSystem.accessibility?.focus?.primary || colorSystem.navigation.learn,
  borderRadius: 4,
},
```

**Add focus state management** (after line 51):
```tsx
const [focusedTab, setFocusedTab] = useState<TabType | null>(null);
```

**Update tab TouchableOpacity** (lines 159-171):
```tsx
<TouchableOpacity
  accessible={true}
  accessibilityRole="tab"
  accessibilityLabel="Overview"
  accessibilityState={{ selected: activeTab === 'overview' }}
  accessibilityHint="Shows module overview and foundational content"
  onFocus={() => setFocusedTab('overview')}
  onBlur={() => setFocusedTab(null)}
  style={[
    styles.tab,
    activeTab === 'overview' && styles.tabActive,
    focusedTab === 'overview' && styles.tabFocused,  // NEW
  ]}
  onPress={() => setActiveTab('overview')}
>
```

---

## High Priority Fixes (Phase 2)

### 5. Color Contrast Verification
**Action**: Use WebAIM Contrast Checker to verify:
- Tab active state: `colorSystem.navigation.learn` (#9B7EBD?) on white
  - **Concern**: May be below 4.5:1 minimum (needs testing)
- Tip box background (#FFF9E6) with gray[700] text
- Example card backgrounds with gray[800] text

**If fails**: Darken colors to meet 4.5:1 ratio

---

### 6. Keyboard Navigation Testing
**Action**:
1. Tab through all interactive elements
2. Verify logical order: Back button → Tab 1 → Tab 2 → Scroll content → Expandables
3. Ensure Enter/Space keys work for expandables
4. Test on physical keyboard (iOS simulator + Android emulator)

---

### 7. Decorative Element Marking
**File**: `app/src/screens/learn/tabs/OverviewTab.tsx:159`

**Current**:
```tsx
<View style={styles.divider} />
```

**Required**:
```tsx
<View 
  style={styles.divider}
  accessible={false}
  importantForAccessibility="no"
/>
```

---

## Validation Checklist

Before marking FEAT-80 as complete:

- [ ] Tab navigation has `accessibilityRole="tab"` and `accessibilityState`
- [ ] Expandable sections announce expanded/collapsed state
- [ ] Section headings use `accessibilityRole="header"` + `accessibilityLevel`
- [ ] Focus indicators visible for keyboard navigation
- [ ] Color contrast verified with automated tool (WCAG AA 4.5:1)
- [ ] Decorative elements marked with `importantForAccessibility="no"`
- [ ] Keyboard navigation tested end-to-end
- [ ] Screen reader tested on iOS VoiceOver + Android TalkBack

---

## Testing Protocol

### iOS VoiceOver Testing:
1. Enable VoiceOver (Settings → Accessibility → VoiceOver)
2. Navigate to Learn tab → Select module
3. Test tab switching (swipe right/left, double-tap to activate)
4. Test expandable obstacles (should announce "button, collapsed/expanded")
5. Verify section headings are announced as headers

### Android TalkBack Testing:
1. Enable TalkBack (Settings → Accessibility → TalkBack)
2. Repeat iOS tests above
3. Verify focus indicators visible

---

## WCAG AA Compliance Target

| Criterion | Current | Target | Status |
|-----------|---------|--------|--------|
| 1.3.1 Info & Relationships | ❌ FAIL | ✅ PASS | Phase 1 |
| 1.4.3 Contrast Minimum | ⚠️ PARTIAL | ✅ PASS | Phase 2 |
| 2.1.1 Keyboard | ⚠️ UNTESTED | ✅ PASS | Phase 2 |
| 2.4.7 Focus Visible | ❌ FAIL | ✅ PASS | Phase 1 |
| 2.5.5 Target Size | ✅ PASS | ✅ PASS | N/A |
| 4.1.2 Name, Role, Value | ❌ FAIL | ✅ PASS | Phase 1 |

**Overall**: 40% → Target: 80%+

---

## Estimated Effort

- **Phase 1 (Critical)**: 2-4 hours
- **Phase 2 (High Priority)**: 1-2 hours
- **Testing**: 1 hour
- **Total**: 4-7 hours

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [iOS Accessibility](https://developer.apple.com/documentation/uikit/accessibility)
- [Android Accessibility](https://developer.android.com/guide/topics/ui/accessibility)

---

**Created**: FEAT-80 implementation  
**Source**: Accessibility agent validation report  
**Priority**: CRITICAL (Phase 1 blocking for production)
