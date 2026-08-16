/**
 * RN `<Modal>` occlusion guard — no zero-988-affordance render states (DEBUG-406)
 *
 * WHAT THIS PINS
 * ==============
 * React Native's `<Modal>` renders in a separate native window above the JS view
 * hierarchy. `RootCrisisButton` mounts inside `NavigationContainer`, so while any
 * RN `<Modal>` is open the crisis button is not faded or covered — it is not on
 * screen. The invariant, stated at `RootCrisisButton.tsx` and enforced by
 * `crisis-zero-988-windows.test.tsx`, is that no reachable render state may have
 * zero 988 affordance. A `<Modal>` is exactly such a state for as long as it is up.
 *
 * WHY A TEST AND NOT REVIEW
 * =========================
 * Three passes found this defect class by hand and the tooling found it zero
 * times. DEBUG-403 scoped four sites out BY ANALOGY without verifying any of
 * them; DEBUG-406 audited those four and found three of the four rulings wrong.
 * A Protected Paths row would not have helped — `src/core/components/` and
 * `src/features/insights/` are not on that list and should not be, because the
 * risk is a component SHAPE that can land in any directory.
 *
 * This test is the PRIMARY pin: it rides `npm run test:safety`, which
 * `npm run precommit` runs on every commit on every machine.
 * `npm run check:modal-occlusion` runs the same logic in CI, because
 * `test:safety` is not itself a CI job and `--no-verify` is permitted on
 * `hotfix/*` branches — the branch class most likely to touch crisis code under
 * pressure. Detection logic lives in `scripts/check-modal-occlusion-guard.js` so
 * both surfaces share one implementation.
 *
 * The synthetic fixtures below are not padding. A comment-stripping matcher is
 * exactly the shape that can silently stop matching anything (DEBUG-390), so the
 * matcher is asserted to FIRE against known-bad strings and to stay silent on the
 * prose this repo deliberately writes to warn readers off the pattern.
 */

const {
  ALLOWLIST,
  findAliasedModalImports,
  findModalJsx,
  runGuard,
  stripComments,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('../../scripts/check-modal-occlusion-guard');

describe('DEBUG-406 · RN <Modal> occlusion guard', () => {
  describe('the matcher fires (a guard never observed failing is not a guard)', () => {
    it('matches a plain JSX <Modal>', () => {
      expect(findModalJsx('const x = () => <Modal visible={v}>hi</Modal>;')).toEqual([1]);
    });

    it('matches a self-closing and a multiline <Modal>', () => {
      expect(findModalJsx('<Modal/>')).toHaveLength(1);
      expect(findModalJsx('<Modal\n  visible={v}\n>')).toHaveLength(1);
    });

    it('reports the real line number of the match', () => {
      expect(findModalJsx('a\nb\n<Modal visible />')).toEqual([3]);
    });

    it('does NOT match a component whose name merely starts with Modal', () => {
      expect(findModalJsx('<ModalHeader />')).toHaveLength(0);
    });
  });

  describe('prose is not code — this repo names anti-patterns deliberately', () => {
    it('ignores a block comment warning against <Modal>', () => {
      const src = '/**\n * Never convert this to <Modal>.\n */\nexport const A = 1;';
      expect(findModalJsx(src)).toHaveLength(0);
    });

    it('ignores a line comment mentioning <Modal>', () => {
      expect(findModalJsx('// replaces <Modal onRequestClose={x}>\nconst a = 1;')).toHaveLength(0);
    });

    it('still finds real code sitting beneath such a comment', () => {
      const src = '// Never convert this to <Modal>\nreturn <Modal visible={v} />;';
      expect(findModalJsx(src)).toEqual([2]);
    });

    it('preserves line structure when stripping, so line numbers stay truthful', () => {
      const src = '/* a\nb\nc */\n<Modal />';
      expect(stripComments(src).split('\n')).toHaveLength(4);
      expect(findModalJsx(src)).toEqual([4]);
    });
  });

  describe('aliased imports cannot be used to slip past the JSX matcher', () => {
    it('detects `Modal as Something`', () => {
      expect(findAliasedModalImports("import { Modal as Sheet } from 'react-native';")).toEqual([
        'Sheet',
      ]);
    });

    it('does not fire on a normal import', () => {
      expect(findAliasedModalImports("import { Modal, View } from 'react-native';")).toHaveLength(0);
    });
  });

  describe('the real tree', () => {
    const result = runGuard();

    it('has no RN <Modal> outside the allowlist', () => {
      expect(result.unallowed).toEqual([]);
    });

    it('has no allowlist entry that outlived its <Modal> (stale ruling)', () => {
      // A recorded ruling whose subject no longer exists is how DEBUG-403's
      // four-site analogy survived review. Failing here forces the record to be
      // updated rather than quietly preserved.
      expect(result.stale).toEqual([]);
    });

    it('has no aliased `Modal` import', () => {
      expect(result.aliased).toEqual([]);
    });

    it('allowlists ONLY sites with a recorded DEBUG-406 ruling', () => {
      // Pinning the exact set, not just its size: a new entry must be a
      // deliberate, reviewable edit to this expectation.
      expect(Object.keys(ALLOWLIST).sort()).toEqual([
        'src/core/components/CelebrationToast.tsx',
        'src/core/components/NotificationTimePicker.tsx',
      ]);
    });

    it('records a substantive reason for every allowlisted site', () => {
      for (const [file, reason] of Object.entries(ALLOWLIST)) {
        expect(typeof reason).toBe('string');
        // The allowlist doubles as the audit trail; a one-word reason is not one.
        expect(reason.length).toBeGreaterThan(120);
        expect(reason).toMatch(/DEBUG-40[36]/);
        expect(file).toMatch(/^src\//);
      }
    });

    it("pins NotificationTimePicker's ruling as CONDITIONAL on benign content", () => {
      // The one STANDS ruling in DEBUG-406 rests on the surface carrying no
      // wellness or distress semantics — NOT on its route class, and NOT on the
      // open being user-initiated. If the reason text ever loses that condition,
      // the ruling has been silently widened into the class-level pass that
      // DEBUG-406 existed to undo.
      const reason = ALLOWLIST['src/core/components/NotificationTimePicker.tsx'];
      expect(reason).toMatch(/CONDITIONAL/);
      expect(reason).toMatch(/benign/);
    });
  });
});
