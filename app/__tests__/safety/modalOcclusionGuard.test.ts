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
  PRESENTER_ALLOWLIST,
  THIRD_PARTY_PRESENTERS,
  findAliasedModalImports,
  findModalJsx,
  findPresenterCalls,
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

describe('INFRA-571 · third-party full-screen presenter call sites', () => {
  /**
   * Rule 4 is a different SHAPE from rules 1-3. Those match a component we
   * render; this matches a CALL that hands presentation to a third party whose
   * component never appears in our tree. DEBUG-533 found the first instance and
   * no detector could see it: the guard scans `app/src` for JSX `<Modal>`, so
   * Sentry's `<Modal>` in node_modules is invisible, and INFRA-531's
   * crisis-constant-import rule matches nothing because nothing on the path
   * imports from `features/crisis/`. The call site is the right anchor because
   * it is the only part of the mechanism that is ours.
   */

  describe('the matcher fires for every denylisted name', () => {
    it.each(THIRD_PARTY_PRESENTERS)('matches a literal known-bad call to %s', (name) => {
      const found = findPresenterCalls(`const go = () => ${name}();`);
      expect(found).toEqual([{ name, line: 1 }]);
    });

    it('matches the member form the real defect takes', () => {
      // ExternalErrorReporter reaches Sentry through a dynamically-assigned
      // module handle, so the live call is a member expression on an instance
      // field — not the `Sentry.showFeedbackWidget()` an import-aware matcher
      // would look for.
      expect(findPresenterCalls('this.sentryModule.showFeedbackWidget();')).toEqual([
        { name: 'showFeedbackWidget', line: 1 },
      ]);
    });

    it('reports the real line number of the match', () => {
      expect(findPresenterCalls('a\nb\nawait Sharing.shareAsync(uri);')).toEqual([
        { name: 'Sharing.shareAsync', line: 3 },
      ]);
    });

    it('tolerates whitespace around the member access and the call parens', () => {
      expect(findPresenterCalls('RNIap . requestPurchase ({});')).toEqual([
        { name: 'RNIap.requestPurchase', line: 1 },
      ]);
    });
  });

  describe('the matcher stays silent on everything that is not a call', () => {
    it('ignores a comment naming a presenter', () => {
      const src = '/**\n * Never call showFeedbackWidget() here.\n */\nconst a = 1;';
      expect(findPresenterCalls(src)).toHaveLength(0);
    });

    it('ignores a line comment naming a presenter', () => {
      expect(findPresenterCalls('// do not use Sharing.shareAsync(...)\nconst a = 1;')).toHaveLength(0);
    });

    it('ignores the capability probe, which is not a call', () => {
      // ExternalErrorReporter.ts:619 — `typeof x.showFeedbackWidget === 'function'`.
      const src = "if (typeof this.sentryModule.showFeedbackWidget === 'function') { noop(); }";
      expect(findPresenterCalls(src)).toHaveLength(0);
    });

    it('ignores the identifier inside a log-message string literal', () => {
      // ExternalErrorReporter.ts:623 sits three lines from the real call.
      // stripComments() blanks comments but NOT string literals, so a
      // bare-identifier matcher would report a log message as a defect site.
      const src = "logger.warn(LogCategory.SYSTEM, 'showFeedbackWidget failed');";
      expect(findPresenterCalls(src)).toHaveLength(0);
    });

    it('ignores a lookalike identifier that merely starts with a denylisted name', () => {
      expect(findPresenterCalls('showFeedbackWidgetLater();')).toHaveLength(0);
    });

    it('still finds a real call sitting beneath a warning comment', () => {
      const src = '// never call showFeedbackWidget()\nshowFeedbackWidget();';
      expect(findPresenterCalls(src)).toEqual([{ name: 'showFeedbackWidget', line: 2 }]);
    });
  });

  describe('comment-stripping cannot silently reduce this to a matcher that matches nothing', () => {
    it('leaves a real source file substantially intact after stripping', () => {
      // The DEBUG-390 failure mode is comment-stripping plus a narrow regex
      // producing a guard that can never fire. Assert the input the matcher
      // actually sees is still real code, not blanks.
      const fs = require('fs');
      const path = require('path');
      const abs = path.join(
        __dirname,
        '../../src/core/services/logging/ExternalErrorReporter.ts',
      );
      const stripped = stripComments(fs.readFileSync(abs, 'utf8'));
      expect(stripped.replace(/\s/g, '').length).toBeGreaterThan(5000);
      expect(stripped).toMatch(/showFeedbackWidget\s*\(/);
    });
  });

  describe('the real tree', () => {
    const result = runGuard();

    it('has no denylisted presenter call outside PRESENTER_ALLOWLIST', () => {
      expect(result.unallowedPresenters).toEqual([]);
    });

    it('has no presenter ruling that outlived the call it examined', () => {
      // Keyed per FILE+SYMBOL, not per file: a ruling that examined one call
      // must go stale when THAT call is removed, even if a different
      // denylisted call survives in the same file. A file-level key would
      // silently transfer a recorded ruling onto a call it never examined,
      // which is DEBUG-403's failure mode reproduced inside the fix for it.
      expect(result.stalePresenters).toEqual([]);
    });

    it('does not disturb the <Modal> rules it shares a script with', () => {
      // A merged allowlist would cross-fire: a <Modal>-allowlisted file would
      // report as a stale presenter and vice versa.
      expect(result.unallowed).toEqual([]);
      expect(result.stale).toEqual([]);
      expect(result.aliased).toEqual([]);
    });

    it('allowlists ONLY the presenter call sites with a recorded ruling', () => {
      expect(Object.keys(PRESENTER_ALLOWLIST).sort()).toEqual([
        'src/core/services/logging/ExternalErrorReporter.ts::showFeedbackWidget',
        'src/core/services/subscription/IAPService.ts::RNIap.requestPurchase',
        'src/features/profile/screens/ExportDataScreen.tsx::Sharing.shareAsync',
      ]);
    });

    it('records a substantive reason for every allowlisted presenter call', () => {
      for (const [key, reason] of Object.entries(PRESENTER_ALLOWLIST)) {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(120);
        expect(reason).toMatch(/DEBUG-533|INFRA-571/);
        expect(key).toMatch(/^src\/.+::.+$/);
      }
    });

    it('carries its own removal instruction in every ruling', () => {
      // Whoever deletes a presenter call owns the allowlist edit. Putting the
      // instruction in the ruling itself is what makes that mechanical rather
      // than remembered — the CLI failure message repeats it.
      for (const reason of Object.values(PRESENTER_ALLOWLIST)) {
        expect(reason).toMatch(/DELETE this entry in the same commit/);
      }
    });

    it('marks the two inferred rulings as NOT MEASURED', () => {
      // DEBUG-533's Sentry finding was measured on device (zero
      // `crisis-button-root` nodes in the hierarchy). These two are reasoned
      // from the presentation mechanism only. Recording an unmeasured ruling
      // as though measured is the failure DEBUG-533's own "MEASURED, NOT
      // INFERRED" section was written to stop.
      const inferred = [
        'src/features/profile/screens/ExportDataScreen.tsx::Sharing.shareAsync',
        'src/core/services/subscription/IAPService.ts::RNIap.requestPurchase',
      ];
      for (const key of inferred) {
        expect(PRESENTER_ALLOWLIST[key]).toMatch(/NOT MEASURED/);
      }
      expect(
        PRESENTER_ALLOWLIST['src/core/services/logging/ExternalErrorReporter.ts::showFeedbackWidget'],
      ).toMatch(/MEASURED/);
    });

    it('documents the denylist as non-exhaustive rather than as the set', () => {
      const fs = require('fs');
      const path = require('path');
      const guard = fs.readFileSync(
        path.join(__dirname, '../../scripts/check-modal-occlusion-guard.js'),
        'utf8',
      );
      expect(guard).toMatch(/NON-EXHAUSTIVE/);
      // `showScreenshotButton` is not a root export of @sentry/react-native
      // 7.11.0, so it can never fire against the import shape this repo uses.
      // It is forward-looking, and the header must not present the three
      // Sentry names as a complete account of that SDK's presenters.
      expect(THIRD_PARTY_PRESENTERS).toContain('showScreenshotButton');
    });
  });
});
