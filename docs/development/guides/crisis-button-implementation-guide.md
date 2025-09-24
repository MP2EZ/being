# Crisis Button Implementation Guide

## Quick Reference for React Native Widget Crisis Button Integration

### Key Concepts

**🚨 CRITICAL**: Crisis button is now **ALWAYS VISIBLE** with variable prominence instead of conditional visibility.

### New Data Structure

```typescript
// OLD WAY (deprecated but maintained for compatibility)
if (widgetData.hasActiveCrisis) {
  // Show crisis button
}

// NEW WAY (recommended)
const { crisisButton } = widgetData;
// Crisis button is always present, check prominence for styling
const isUrgent = crisisButton.prominence === 'enhanced';
```

### Type Definitions

```typescript
interface WidgetCrisisButton {
  readonly alwaysVisible: true; // Always true
  readonly prominence: 'standard' | 'enhanced';
  readonly text: string; // "Crisis Support" | "CRISIS SUPPORT NEEDED"
  readonly style: 'standard' | 'urgent';
  readonly responseTimeMs?: number; // Performance tracking
}
```

### Implementation Examples

#### 1. **Widget Data Generation**
```typescript
// Automatically handled by WidgetDataService
const widgetData = await widgetDataService.generateWidgetData();

// Crisis button is always included:
widgetData.crisisButton.alwaysVisible; // Always true
widgetData.crisisButton.prominence;    // 'standard' or 'enhanced'
widgetData.crisisButton.text;          // Button text
```

#### 2. **UI Component Implementation**
```tsx
function CrisisButton({ crisisButton }: { crisisButton: WidgetCrisisButton }) {
  const isEnhanced = crisisButton.prominence === 'enhanced';
  const isUrgent = crisisButton.style === 'urgent';
  
  return (
    <TouchableOpacity
      style={[
        styles.crisisButton,
        isEnhanced && styles.enhancedButton,
        isUrgent && styles.urgentButton
      ]}
      onPress={handleCrisisPress}
      accessibilityLabel={crisisButton.text}
    >
      <Text style={[
        styles.buttonText,
        isUrgent && styles.urgentText
      ]}>
        {crisisButton.text}
      </Text>
    </TouchableOpacity>
  );
}
```

#### 3. **Testing Crisis Button**
```typescript
// Test utilities
const mockCrisisButton = widgetTestUtils.createMockCrisisButton(true, 150);
expect(mockCrisisButton.alwaysVisible).toBe(true);

// Validation
const isValid = widgetDataService.isValidCrisisButton(crisisButton);
expect(isValid).toBe(true);

// Integration test
const widgetData = await widgetDataService.generateWidgetData();
WidgetTestAssertions.assertValidCrisisButton(widgetData.crisisButton);
```

### Migration Checklist

#### ✅ **For Existing Code**
- [ ] No immediate changes required (backward compatibility maintained)
- [ ] `hasActiveCrisis` still works as before
- [ ] Consider migrating to `crisisButton.prominence` when convenient

#### ✅ **For New Features**
- [ ] Use `WidgetCrisisButton` interface
- [ ] Always assume crisis button is present
- [ ] Style based on `prominence` and `style` properties
- [ ] Include crisis button in all widget tests

### Performance Requirements

- **Crisis Response Time**: <200ms from generation to display
- **Type Validation**: <5ms for crisis button validation
- **Memory Usage**: <100 bytes for crisis button data structure

### Error Handling

```typescript
try {
  const widgetData = await widgetDataService.generateWidgetData();
  // Crisis button is guaranteed to be present
  renderCrisisButton(widgetData.crisisButton);
} catch (error) {
  // Even on error, provide emergency fallback
  renderFallbackCrisisButton();
}
```

### Best Practices

#### ✅ **DO**
- Always check `crisisButton.prominence` for styling decisions
- Use `crisisButton.text` for button labels
- Include performance tracking when available
- Test crisis button in all widget scenarios
- Maintain accessibility compliance

#### ❌ **DON'T**  
- Don't conditionally render crisis button (it's always visible)
- Don't modify `alwaysVisible` property (should always be `true`)
- Don't expose clinical data in crisis button implementation
- Don't skip crisis button validation in tests

### Troubleshooting

#### **Crisis Button Missing**
```typescript
if (!widgetData.crisisButton) {
  console.error('Crisis button missing - check WidgetDataService implementation');
}
```

#### **Invalid Prominence**
```typescript
if (!['standard', 'enhanced'].includes(crisisButton.prominence)) {
  console.error('Invalid crisis button prominence');
}
```

#### **Performance Issues**
```typescript
if (crisisButton.responseTimeMs > 200) {
  console.warn('Crisis button response time exceeds 200ms threshold');
}
```

### Integration Testing

```bash
# Run crisis button specific tests
npm run test:widget

# Performance validation
npm run test:widget-performance

# Comprehensive widget validation
npm run validate:widget-complete
```

### Support

For questions or issues with crisis button integration:

1. **Check Documentation**: `Widget-Crisis-Button-Integration-Summary.md`
2. **Run Verification**: `scripts/verify-crisis-button-integration.ts`
3. **Review Tests**: `__tests__/integration/widget-crisis-button.test.ts`
4. **Performance Monitoring**: Check response times in production

---

**Remember**: Crisis button integration is a safety-critical feature. Always validate changes thoroughly and maintain the unconditional visibility requirement.