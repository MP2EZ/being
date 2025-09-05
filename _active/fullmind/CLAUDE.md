# FullMind MBCT App Configuration

## Project Context
Mobile app delivering clinical-grade MBCT practices
- Version: v1.7 prototype complete
- Target: App stores in 8 weeks
- Stack: React Native, Expo, TypeScript, Zustand

## Critical Requirements
⚠️ NEVER MODIFY WITHOUT APPROVAL:
- PHQ-9/GAD-7 exact clinical wording
- Scoring algorithms (100% accuracy required)
- Crisis hotline: 988
- 3-minute breathing timing (exactly 60s per step)

## Component Themes
morning: { primary: '#FF9F43', success: '#E8863A' }
midday: { primary: '#40B5AD', success: '#2C8A82' }
evening: { primary: '#4A7C59', success: '#2D5016' }

## Current Sprint Focus
- [ ] Port remaining components from Design Library v1.1
- [ ] Implement offline mode with AsyncStorage
- [ ] Widget for quick morning check-in

## File References
- Prototype: FullMind Design Prototype v1.7.html
- Design: FullMind Design Library v1.1.tsx, FullMind DRD v1.3.md
- Requirements: FullMind PRD v1.2.md
- Technical: FullMind TRD v2.0.md
- User Journeys: FullMind User Journey Flows & Persona Analysis.md
- Feature Roadmap: FullMind Product Roadmap - Prioritized - Based on v1.7.md