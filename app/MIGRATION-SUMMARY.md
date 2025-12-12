# Design Token Migration Summary

## Status
- ✅ **Complete**: CombinedLegalGateScreen.tsx
- 🔄 **In Progress**: AgeVerificationScreen.tsx (imports added)
- ⏳ **Pending**: Remaining 6 files

## Migration Pattern

### 1. Import Changes
```typescript
// OLD
const colors = {
  white: '#FFFFFF',
  black: '#1C1C1C',
  // ... hardcoded values
};

const spacing = {
  xs: 4,
  sm: 8,
  // ... hardcoded values
};

// NEW
import { colors, spacing, borderRadius, typography } from '@/core/theme/colors';

const localColors = {
  white: colors.base.white,
  black: colors.base.black,
  gray100: colors.gray[100],
  gray200: colors.gray[200],
  gray300: colors.gray[300],
  gray400: colors.gray[400],
  gray500: colors.gray[500],
  gray600: colors.gray[600],
  midnightBlue: colors.base.midnightBlue,
  error: colors.status.error,
  crisis: colors.status.crisis,
  success: colors.status.success,
  warning: colors.status.warning,
};
```

### 2. Style Value Replacements

#### Spacing
- `4` → `spacing.xs`
- `8` → `spacing.sm`
- `12` → `spacing[3]`
- `16` → `spacing.md`
- `20` → `spacing[5]`
- `24` → `spacing.lg`
- `32` → `spacing.xl`
- `40` → `spacing[10]`
- `48` → `spacing.xxl`

#### Border Radius
- `2` → `borderRadius.xs`
- `4` → `borderRadius.small`
- `6, 8` → `borderRadius.medium`
- `12` → `borderRadius.large`
- `16` → `borderRadius.xl`
- `20` → `borderRadius.xxl` (for pills)
- `24` → `borderRadius.xxl`
- `40` → `borderRadius.xxxl`

#### Font Size
- `11, 12` → `typography.micro.size`
- `13, 14` → `typography.bodySmall.size`
- `15, 16` → `typography.bodyRegular.size`
- `17, 18` → `typography.bodyLarge.size`
- `20` → `typography.title.size`
- `22` → `typography.headline3.size`
- `24` → `typography.headline4.size`
- `28` → `typography.headline2.size`
- `32` → `typography.display2.size`
- `34` → `typography.headline1.size`
- `40, 48` → `typography.display1.size`

#### Font Weight
- `'300'` → `typography.fontWeight.light`
- `'400'` → `typography.fontWeight.regular`
- `'500'` → `typography.fontWeight.medium`
- `'600'` → `typography.fontWeight.semibold`
- `'700'` → `typography.fontWeight.bold`

#### Colors
Replace all `colors.X` references with `localColors.X` in StyleSheet.create()

## Files Migrated

### ✅ consent/screens/CombinedLegalGateScreen.tsx
- Updated imports
- Migrated all spacing values
- Migrated all borderRadius values
- Migrated all typography (fontSize + fontWeight)
- Updated all color references

### 🔄 consent/screens/AgeVerificationScreen.tsx
- ✅ Updated imports
- ⏳ Need to migrate StyleSheet

## Remaining Files (6)

1. consent/screens/ConsentManagementScreen.tsx
2. consent/components/ConsentToggleCard.tsx
3. profile/screens/AppSettingsScreen.tsx
4. profile/screens/ProfileScreen.tsx
5. profile/screens/AccountSettingsScreen.tsx
6. onboarding/screens/OnboardingScreen.tsx

## Next Steps

For each remaining file:
1. Add design system import
2. Create localColors mapping
3. Replace all hardcoded spacing values
4. Replace all hardcoded borderRadius values
5. Replace all hardcoded fontSize values
6. Replace all hardcoded fontWeight values
7. Update color references from `colors.X` to `localColors.X`
8. Remove old const declarations

## Verification

After migration:
```bash
# Type check
npm run typecheck

# Test app
npm start
```

## Key Pattern Example

```typescript
// BEFORE
const styles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 12,
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
});

// AFTER
const styles = StyleSheet.create({
  button: {
    padding: spacing.md,
    borderRadius: borderRadius.large,
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.white,
  },
});
```

## Notes

- Keep existing comments explaining WCAG compliance
- Maintain accessibility properties
- No functional changes, only token migrations
- All files must compile with TypeScript strict mode
