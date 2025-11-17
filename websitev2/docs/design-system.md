# Being Website Design System

**Version**: 2.0
**Last Updated**: 2025-11-16
**Philosophy**: Minimal, professional, clean — inspired by Cerebral, Notion, and Claude.ai

---

## Core Principles

1. **Restraint Over Decoration** — Use borders sparingly (≤20% of components)
2. **Whitespace is Content** — 10-15% of page should be empty space
3. **Clear Hierarchy** — 2-3x size jumps, not 1.25x
4. **Subtle by Default** — Shadows over borders, opacity over color
5. **Intentional Interaction** — Hover states only on clickable elements

---

## Spacing Scale

### Grid System
All spacing uses **8px grid** for mathematical precision:

```
space-y-4  = 16px   (tight list items)
space-y-6  = 24px   (relaxed list items)
space-y-7  = 28px   (medium list items)
space-y-8  = 32px   (component internal spacing)
space-y-12 = 48px   (section internal spacing)
space-y-14 = 56px   (medium section gaps)
space-y-16 = 64px   (section header to content)
space-y-18 = 72px   (large section gaps)
space-y-20 = 80px   (large section header to content)
space-y-28 = 112px  (extra-large section spacing)

gap-8      = 32px   (minimum card gap)
gap-10     = 40px   (comfortable card gap)
gap-12     = 48px   (generous card gap)
gap-14     = 56px   (medium-large card gap)
gap-16     = 64px   (large card gap)
gap-18     = 72px   (extra-large card gap)
gap-20     = 80px   (extra-large card gap - desktop only)
```

### Section Padding
Professional sites use generous vertical padding:

```tsx
// Standard section (80px mobile / 128px desktop)
className="py-20 sm:py-32"

// Horizontal padding (24px mobile / same desktop)
className="px-6"

// Container max-widths
max-w-3xl  = 768px   (hero content, centered text)
max-w-4xl  = 896px   (2-column grids)
max-w-6xl  = 1152px  (3-column grids)
```

### Card Padding
Padding must scale with content density:

```tsx
// Light content (icon + title + 1 line)
className="p-8"   // 32px

// Medium content (icon + title + paragraph)
className="p-10"  // 40px

// Dense content (icon + title + paragraph + list)
className="p-12"  // 48px

// Very dense content (multiple sections)
className="p-16"  // 64px
```

### Whitespace Ratio Calculation
```
Target: 10-15% of page should be empty space

Example (3-column grid):
- Card heights: ~400px
- Row height with gap-12: 400 + 48 = 448px
- Whitespace: 48 / 448 = 10.7% ✓

Anti-pattern (gap-8):
- Row height with gap-8: 400 + 32 = 432px
- Whitespace: 32 / 432 = 7.4% ✗ (too cramped)
```

---

## Typography

### Hierarchy Scale
Use **2-3x size jumps** for clear visual hierarchy:

```css
/* Hero (72px) */
text-6xl sm:text-7xl → 60px / 72px

/* Page Heading (48px) */
text-4xl sm:text-5xl → 36px / 48px

/* Section Heading (24px) */
text-2xl sm:text-3xl → 24px / 30px

/* Card Heading (20px) */
text-lg sm:text-xl → 18px / 20px

/* Body (16px) */
text-base → 16px

/* Small (14px) */
text-sm → 14px
```

### Font Weights
```
font-semibold → 600  (headings only)
font-medium   → 500  (links, labels)
[default]     → 400  (body text)
```

### Per-Page Limit
**Rule**: Maximum 3 heading sizes per page

**Example (Homepage)**:
- H1: `text-6xl sm:text-7xl` (72px)
- H2: `text-4xl sm:text-5xl` (48px)
- H3: `text-xl` (20px)

**Anti-pattern**: Using text-3xl, text-2xl, text-xl, text-lg all on same page

---

## Colors

### Palette
95% of the site uses **gray scale only**:

```css
--gray-0: #FFFFFF     (backgrounds)
--gray-50: #FAFAFA    (alternate backgrounds)
--gray-100: #F5F5F5   (hover states)
--gray-200: #E5E5E5   (borders)
--gray-300: #D4D4D4   (active borders)
--gray-600: #525252   (body text)
--gray-700: #404040   (icons)
--gray-900: #171717   (headings)
```

5% uses **accent color** (sage green):

```css
--accent-500: #4A9B8E  (primary buttons)
--accent-600: #3E8276  (links, hover)
--accent-700: #32695E  (active states)
```

### Brand Color Aliases
For navigation and footer components:

```css
--brand-midnight: #171717    (same as gray-900 - dark backgrounds)
--brand-off-white: #FAFAFA   (same as gray-50 - light backgrounds)
--brand-blue-gray: #525252   (same as gray-600 - muted text)
--brand-sage: #4A9B8E        (same as accent-500 - brand accent)
```

**Note**: These are aliases to existing colors for component consistency. Prefer using standard `gray-*` and `accent-*` classes in new components.

### Functional Colors (crisis/info only)
```css
--info: #2563EB       (crisis support section)
--warning: #F59E0B    (price verification notes)
```

### Usage Guidelines
- **Text**: gray-900 (headings), gray-600 (body), gray-500 (captions)
- **Backgrounds**: white (default), gray-50 (alternate sections)
- **Borders**: gray-200 (default), gray-300 (hover)
- **Accents**: accent-600 (links), accent-500 (buttons)

---

## Components

### Buttons

**Primary** (filled):
```tsx
className="
  bg-accent-500 text-white
  hover:bg-accent-600 active:bg-accent-700
  px-6 py-3 rounded-lg
  font-medium text-base
  transition-colors duration-150
  min-h-[48px]
"
```

**Secondary** (outline):
```tsx
className="
  bg-white border-2 border-gray-300 text-gray-900
  hover:bg-gray-50 hover:border-gray-400
  px-6 py-3 rounded-lg
  font-medium text-base
  transition-all duration-150
  min-h-[48px]
"
```

**Sizing**:
- Small: `min-h-[36px] px-3 py-1.5 text-sm`
- Medium: `min-h-[44px] px-4 py-2.5 text-base`
- Large: `min-h-[48px] px-6 py-3 text-base`

---

### Cards

**Default Card** (no border, subtle shadow):
```tsx
className="
  bg-white rounded-xl shadow-sm
  p-12
"
```

**Emphasized Card** (border for pricing, forms):
```tsx
className="
  bg-white rounded-xl border-2 border-gray-200
  p-12
"
```

**Anti-pattern** (too many borders):
```tsx
// ✗ Don't create visual grids
<div className="grid grid-cols-3 gap-8">
  <div className="border-2">...</div>
  <div className="border-2">...</div>
  <div className="border-2">...</div>
</div>

// ✓ Do use open layouts
<div className="grid grid-cols-3 gap-12">
  <div className="space-y-6">...</div>
  <div className="space-y-6">...</div>
  <div className="space-y-6">...</div>
</div>
```

---

### Icons & Emojis

**Icon Sizing**:
```tsx
// Hero icons
size={48} className="text-gray-700"

// Section icons (in open layouts)
size={40} className="text-gray-600"

// Card icons (when using cards)
size={32} className="text-gray-700"
```

**Emoji Sizing**:
```tsx
// ✗ Anti-pattern (competes with headings)
<div className="text-4xl">🌅</div>
<h3 className="text-2xl">Morning</h3>

// ✓ Correct (smaller, subdued)
<div className="text-2xl opacity-60">🌅</div>
<h3 className="text-2xl font-semibold">Morning</h3>
```

---

### Lists

**Spacing Based on Content Density**:

```tsx
// Simple single-line items
className="space-y-3"  // 12px

// Multi-line items or items with descriptions
className="space-y-4"  // 16px

// Rich items with headings and descriptions
className="space-y-6"  // 24px
```

**List Item Structure**:
```tsx
// ✓ Clean, readable
<li className="flex items-start">
  <span className="text-accent-600 mr-2">•</span>
  <span>Body awareness check-in</span>
</li>

// ✗ Too tight, hard to scan
<li className="flex items-center gap-1 text-sm">
  <span>•</span>
  <span>Body awareness check-in</span>
</li>
```

---

### Hover States

**Rule**: Only interactive elements get hover states

```tsx
// ✓ Button (clickable)
className="hover:bg-gray-50 hover:border-gray-400"

// ✓ Link (clickable)
className="hover:text-accent-700"

// ✗ Anti-pattern (informational card, not clickable)
className="hover:border-gray-300 hover:shadow-lg"
```

---

## Layout Patterns

### Hero Section
```tsx
<section className="
  px-6 py-20 sm:py-32
  bg-white
  flex items-center justify-center
  min-h-[600px] sm:min-h-[700px]
">
  <div className="max-w-3xl mx-auto text-center space-y-8">
    <div className="flex justify-center">
      <BrainIcon size={48} className="text-gray-700" />
    </div>
    <h1 className="text-6xl sm:text-7xl font-semibold text-gray-900">
      Mindfulness with meaning
    </h1>
    <p className="text-xl sm:text-2xl text-gray-600 leading-relaxed">
      Ancient Stoic wisdom meets modern mental health practice...
    </p>
    <div className="flex gap-3 justify-center pt-4">
      <Button>Primary CTA</Button>
      <Button variant="secondary">Secondary</Button>
    </div>
  </div>
</section>
```

### Three-Column Open Layout
```tsx
<section className="px-6 py-20 sm:py-32 bg-gray-50">
  <div className="max-w-6xl mx-auto space-y-16 sm:space-y-20">
    <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 text-center">
      Section Heading
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <Icon size={40} className="text-gray-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Title</h3>
        <p className="text-gray-600 leading-relaxed">Description...</p>
        <a href="/link" className="text-accent-600 hover:text-accent-700 font-medium">
          Learn more →
        </a>
      </div>
    </div>
  </div>
</section>
```

### Two-Column Horizontal Layout
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 max-w-4xl mx-auto">
  <div className="space-y-4">
    <div className="flex items-start space-x-4">
      <div className="text-3xl opacity-60">🧘</div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Heading
        </h3>
        <p className="text-gray-600 leading-relaxed">
          Description...
        </p>
      </div>
    </div>
  </div>
</div>
```

---

## Anti-Patterns to Avoid

### 1. Border Overuse
```tsx
// ✗ Creates visual fragmentation
<div className="grid grid-cols-3 gap-8">
  <div className="border-2 border-gray-200 p-10 rounded-xl">...</div>
  <div className="border-2 border-gray-200 p-10 rounded-xl">...</div>
  <div className="border-2 border-gray-200 p-10 rounded-xl">...</div>
</div>

// ✓ Use borders only for emphasis (pricing, forms)
<div className="grid grid-cols-3 gap-12">
  <div className="space-y-6">...</div>
  <div className="space-y-6">...</div>
  <div className="space-y-6">...</div>
</div>
```

### 2. Insufficient Whitespace
```tsx
// ✗ Cramped (6% whitespace)
gap-8  // 32px between 400px cards

// ✓ Spacious (10-15% whitespace)
gap-12 lg:gap-20  // 48-80px between cards
```

### 3. Flat Typography Hierarchy
```tsx
// ✗ All similar sizes
<h2 className="text-3xl">Section</h2>
<h3 className="text-2xl">Subsection</h3>
<h4 className="text-xl">Card</h4>

// ✓ Clear hierarchy (2-3x jumps)
<h2 className="text-5xl">Section</h2>
<h3 className="text-xl">Card</h3>
```

### 4. Fake Interactivity
```tsx
// ✗ Hover on non-clickable card
<div className="p-10 rounded-xl border-2 hover:shadow-lg">
  <h3>Title</h3>
  <p>Description</p>
</div>

// ✓ No hover, or make entire card clickable
<div className="p-10 rounded-xl shadow-sm">
  <h3>Title</h3>
  <p>Description</p>
</div>
```

### 5. Competing Visual Elements
```tsx
// ✗ Emoji same size as heading
<div className="text-4xl">🌅</div>
<h3 className="text-2xl">Morning</h3>

// ✓ Emoji smaller and subdued
<div className="text-2xl opacity-60">🌅</div>
<h3 className="text-2xl font-semibold">Morning</h3>
```

---

## Before/After Examples

### Homepage Three Pillars

**Before** (cramped, noisy):
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <div className="
    bg-white border-2 border-gray-200
    hover:border-gray-300 hover:shadow-lg
    rounded-xl p-10
  ">
    <div className="text-gray-700 mb-6">
      <PhilosophyIcon size={48} />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-4">
      Philosophy
    </h3>
    <p className="text-base text-gray-600 leading-relaxed mb-6">
      2,000 years of Stoic wisdom...
    </p>
  </div>
</div>
```

**After** (spacious, professional):
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
  <div className="text-center space-y-6">
    <div className="flex justify-center">
      <PhilosophyIcon size={40} className="text-gray-600" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900">
      Philosophy
    </h3>
    <p className="text-gray-600 leading-relaxed">
      2,000 years of Stoic wisdom...
    </p>
    <a href="/philosophy" className="text-accent-600 hover:text-accent-700 font-medium">
      Learn about Stoic Mindfulness →
    </a>
  </div>
</div>
```

**Key Changes**:
- Removed borders (open layout)
- Removed hover states (not clickable)
- Increased gaps: gap-8 → gap-12 lg:gap-20 (32px → 48-80px)
- Reduced icon size: 48px → 40px
- Centered alignment for cleaner look
- Link extracted as separate element

---

## Border Usage Guidelines

**Use borders for** (≤20% of components):
- Pricing cards (differentiation)
- Form inputs (affordance)
- Primary CTAs (secondary variant)
- Navigation elements
- Emphasized content (testimonials, callouts)

**Don't use borders for**:
- Regular content cards
- Feature descriptions
- List items
- Icon + text blocks
- General layouts

**Default approach**: `shadow-sm` instead of `border-2`

---

## Responsive Breakpoints

```css
sm: 640px   (tablets)
md: 768px   (small desktops)
lg: 1024px  (large desktops)
xl: 1280px  (extra-large)
```

### Mobile-First Strategy
```tsx
// Start with mobile (stack vertically)
className="flex flex-col gap-6"

// Add tablet/desktop (horizontal)
className="flex flex-col sm:flex-row gap-6"

// Increase spacing on desktop only
className="gap-6 lg:gap-12"
```

---

## Tailwind CSS v4 Configuration

### Important Notes

This project uses **Tailwind CSS v4** with CSS-first configuration via `@theme inline` directive in `globals.css`.

**Critical Configuration Issues to Avoid:**

1. **Never Override Utility Classes with Global CSS**
   ```css
   /* ✗ WRONG - This breaks ALL margin utilities */
   * {
     margin: 0;
     padding: 0;
   }

   /* ✓ CORRECT - Let Tailwind's Preflight handle resets */
   /* Tailwind v4 includes proper resets by default */
   ```

2. **CSS Order Matters**
   ```css
   /* globals.css - CORRECT order */
   @import "tailwindcss";        /* Tailwind utilities loaded first */

   @theme inline {
     /* Your theme customizations */
   }

   /* Custom CSS goes AFTER Tailwind */
   body {
     font-family: var(--font-sans);
   }
   ```

3. **Theme Variable Naming**
   - `--color-*` generates color utilities (`bg-*`, `text-*`, `border-*`)
   - `--spacing-*` generates spacing utilities (`p-*`, `m-*`, `gap-*`)
   - `--shadow-*` generates shadow utilities (`shadow-*`)
   - `--radius-*` generates border radius utilities (`rounded-*`)

### Common Mistakes

**Issue**: Margin/padding utilities not working
**Cause**: Global CSS reset overriding Tailwind utilities
**Fix**: Remove `* { margin: 0; padding: 0; }` - Tailwind's Preflight handles this

**Issue**: Custom spacing values not generating utilities
**Cause**: Missing `--spacing-*` prefix in `@theme` block
**Fix**: Use `--spacing-7: 1.75rem` format, not `--space-7` or `--size-7`

**Issue**: Colors not applying
**Cause**: Missing `--color-*` prefix in `@theme` block
**Fix**: Use `--color-brand-midnight` format in `@theme inline`

---

## Accessibility

### Color Contrast
All text must meet WCAG AA standards:
- `text-gray-900` on white: 16.1:1 ✓
- `text-gray-600` on white: 5.9:1 ✓
- `text-accent-600` on white: 4.5:1 ✓

### Focus States
All interactive elements must have visible focus:
```tsx
className="focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
```

### Touch Targets
Minimum 44px height for all clickable elements:
```tsx
className="min-h-[44px]"
```

---

## Performance

### Image Optimization
- Use Next.js `<Image>` component
- Provide width/height to prevent layout shift
- Use `loading="lazy"` for below-fold images

### CSS Bundle Size
- Avoid unused Tailwind classes
- Purge in production build
- Use `@apply` sparingly (increases bundle size)

---

## Summary Checklist

When designing a new page, verify:

- [ ] Hero section has 72px headline and min-h-[600px]
- [ ] Section padding is py-20 sm:py-32 (80px/128px)
- [ ] Header-to-content gap is space-y-16 sm:space-y-20 (64px/80px)
- [ ] Card gaps are gap-12 lg:gap-20 (48px/80px)
- [ ] Only ≤20% of components have borders
- [ ] No hover states on non-clickable elements
- [ ] Typography uses ≤3 heading sizes
- [ ] Icons are 40-48px, emojis are text-2xl with opacity-60
- [ ] List spacing is space-y-4 or space-y-6 for multi-line items
- [ ] All interactive elements are min-h-[44px]
- [ ] Whitespace ratio is 10-15% of page

---

**Maintained by**: Being Design Team
**Questions**: Refer to UX agent for clarification
