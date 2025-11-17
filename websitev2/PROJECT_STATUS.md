# Being Website v2 - Project Status

## Completed (Week 1 Foundation)

### ✅ Project Setup
- [x] Next.js 14+ with TypeScript and Tailwind v4
- [x] Project structure at `/Users/max/Development/active/being/development/websitev2`
- [x] Deployment target: `www.being.fyi`

### ✅ Design System
- [x] BrainIcon exported from app (SVG + React component)
- [x] Design tokens extracted from `/development/app/src/core/theme/colors.ts`
- [x] Tailwind CSS configured with Being brand colors
- [x] System fonts configured (0KB download, instant render)
- [x] WCAG AA color contrast validation
- [x] Reduced motion support implemented

### ✅ Component Library (Atoms)
- [x] BrainIcon component (32px, scalable, accessible)
- [x] Button component (3 variants: primary/secondary/text, 3 sizes)
- [x] Component directory structure (/components/shared, /navigation, /features)

## Next Steps (Week 1-2)

### 🔄 Navigation Components
- [ ] Desktop horizontal navigation (Home, Philosophy, Features, Download + 988 button)
- [ ] Mobile bottom tab navigation (Home, Phil, Feat, Crisis tabs)
- [ ] Responsive navigation logic (breakpoint: 640px)
- [ ] 988 Crisis button component (calm styling, not alarm)

### 🔄 Page Layouts
- [ ] Homepage (`/app/page.tsx`)
  - Hero section (BrainIcon + headline + CTA)
  - Three Pillars (Philosophy, Science, Privacy)
  - Download CTA section
- [ ] Philosophy page (`/app/philosophy/page.tsx`)
- [ ] Features page (`/app/features/page.tsx`)
- [ ] Download page (`/app/download/page.tsx`)
- [ ] Crisis Resources page (`/app/crisis/page.tsx`)

### 🔄 Legal Pages (Week 2-3)
- [ ] Privacy Policy (`/app/privacy/page.tsx`)
- [ ] Terms of Service (`/app/terms/page.tsx`)
- [ ] HIPAA Notice (`/app/hipaa/page.tsx`)
- [ ] Accessibility Statement (`/app/accessibility/page.tsx`)
- [ ] Cookie Policy (`/app/cookies/page.tsx`)
- [ ] Disclaimers (`/app/disclaimers/page.tsx`)

## Design Decisions Made

### ✅ Multi-Page Architecture (NOT Single-Page)
- **Rationale**: Better findability, SEO, mobile UX
- **Pages**: 5 core (Home, Philosophy, Features, Download, Crisis) + 7 legal

### ✅ System Fonts (NOT Custom Fonts)
- **Decision**: Use -apple-system, BlinkMacSystemFont, etc.
- **Rationale**: 0KB download, instant render, better for anxious users
- **Trade-off**: Less unique, but better UX (performance > uniqueness)

### ✅ Mobile Bottom Tab Navigation
- **Decision**: Bottom tab bar (unconventional for web)
- **Rationale**: Thumb-friendly, crisis-accessible (70% mobile traffic)
- **Implementation**: 4 tabs (Home, Phil, Feat, Crisis)

### ✅ Calm Conversion Strategy
- **CTAs**: 2 primary only (Hero + Download page)
- **Copy**: "Begin Your Practice" (not "Start Free Trial")
- **No FOMO**: No urgency, no "Join 10K users", no countdown timers

## Performance Targets

- **LCP**: <2.5s (Largest Contentful Paint)
- **FID**: <100ms (First Input Delay)
- **CLS**: <0.1 (Cumulative Layout Shift)
- **Bundle**: <100KB initial load

## Brand Colors (From App)

```
Midnight Blue:  #1B2951 (logo, headings)
Blue-Gray:      #2C3E50 (secondary headings)
Sage/Teal:      #4A9B8E (CTAs, accent)
Off-White:      #F8F9FA (backgrounds)
```

## Commands

```bash
# Development server
cd /Users/max/Development/active/being/development/websitev2
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

## Validation Checklist (Before Launch)

### Philosophy Content
- [ ] Philosopher agent approval of entry-level virtue definitions
- [ ] Classical quotes properly attributed (Marcus Aurelius, Epictetus, Seneca)
- [ ] No emotional suppression myths
- [ ] Four Cardinal Virtues only (no modern additions)

### Legal Compliance
- [ ] Healthcare privacy attorney review ($5K-10K)
- [ ] Digital health regulatory counsel review
- [ ] Crisis disclaimers: "Not emergency service" clear but not alarming
- [ ] Medical disclaimers: "Wellness tool, not medical treatment"

### UX Accessibility
- [ ] WCAG 2.1 AA compliance (4.5:1 contrast, keyboard nav, screen reader)
- [ ] 988 accessible in ≤2 taps on mobile
- [ ] Performance budget met (<2.5s LCP)
- [ ] Mobile bottom tabs functional
- [ ] Screen reader testing (VoiceOver, NVDA)

### Technical
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Mobile testing (iOS, Android)
- [ ] Lighthouse audit (Performance, Accessibility, SEO >90)
- [ ] Broken links check (zero tolerance)
- [ ] SSL certificate configured (www.being.fyi)

## Timeline

- **Week 1-2**: Foundation + Components ✅ IN PROGRESS
- **Week 3-4**: Content + Design
- **Week 5-6**: Development (5 pages + legal)
- **Week 7**: Testing + Attorney Review
- **Week 8**: Launch

## Resources

- **Domain**: www.being.fyi (owned)
- **Hosting**: Vercel (recommended)
- **Analytics**: Plausible or Fathom (privacy-first)
- **Budget**: $20K-35K one-time + $30/mo ongoing
