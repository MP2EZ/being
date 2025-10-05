# Crisis Feature Workflow [LIFE-SAFETY CRITICAL]

**FEATURE**: $ARGUMENTS

**Template**: B-CRISIS

---

## Execution

Read `./.claude/templates/being-templates.md` → Section "B-CRISIS: Crisis/Safety Features"

Execute the B-CRISIS workflow exactly as documented in that template section.

---

## Non-Negotiable Checklist

**ALL must pass - FAILURE ON ANY = DO NOT DEPLOY**:

- ✓ Crisis detection <200ms (measured)
- ✓ All crisis data encrypted at rest
- ✓ Audit log created for all events
- ✓ 988 accessible in <3 taps
- ✓ Screen reader compatible (WCAG AA minimum)
- ✓ No false negatives on thresholds

**Validation**: crisis agent + compliance agent + accessibility agent (parallel)

---

## Deliverables

- Implementation code
- Performance metrics (<200ms verification)
- Safety validation report (crisis + compliance + accessibility)

---

*File location: ~/Development/active/fullmind/.claude/commands/b-crisis.md*
