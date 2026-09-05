/**
 * DEBUG-406 conversion guards — the three overlays that must never re-acquire
 * the occlusion shape.
 *
 * These are STRUCTURAL guards, not behaviour coverage. Whether one native layer
 * occludes another is not observable from jest at all — that is pinned on-device
 * by a Maestro flow that taps THROUGH to `crisis-resources-screen`, because
 * under this defect class a hierarchy dump can list a view another native window
 * is covering, so `assertVisible` alone is not proof of reachability.
 *
 * What jest CAN do is fail the moment a component reacquires the shape that
 * caused the defect. That is what follows.
 *
 * Guard shape borrowed from DEBUG-403's `ResumeSessionModal.test.tsx`: query the
 * RENDERED TREE for the `Modal` type rather than matching source text. A
 * source-string assertion would be defeated by this repo's convention of naming
 * anti-patterns in prose — each of these files now explains at length why it is
 * NOT a `<Modal>` (DEBUG-390's lesson).
 */

import React from 'react';
import { Modal } from 'react-native';
import { render } from '@testing-library/react-native';

import ThresholdEducationModal from '@/core/components/ThresholdEducationModal';
import SessionNoteComposer from '@/features/insights/components/SessionNoteComposer';
import WeeklyReflectionComposer from '@/features/insights/components/WeeklyReflectionComposer';
import {
  CRISIS_BUTTON_EXCLUSION_RECT,
  OVERLAY_ACTION_ROW_PADDING_RIGHT,
} from '@/features/crisis/constants/crisisButtonGeometry';
import { colorSystem } from '@/core/theme';

/** Flatten an RN style prop (object | array | nested) into one object. */
const flatten = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return (style ?? {}) as Record<string, unknown>;
};

const noop = (): void => undefined;

const CASES = [
  {
    name: 'ThresholdEducationModal',
    mount: 'inline' as const,
    overlayTestId: 'threshold-education-overlay',
    element: (visible: boolean) => (
      <ThresholdEducationModal visible={visible} onDismiss={noop} />
    ),
  },
  {
    name: 'SessionNoteComposer',
    mount: 'root-slot' as const,
    overlayTestId: 'session-note-overlay',
    element: (visible: boolean) => (
      <SessionNoteComposer
        visible={visible}
        initialText=""
        onSave={noop}
        onDelete={noop}
        onCancel={noop}
      />
    ),
  },
  {
    name: 'WeeklyReflectionComposer',
    mount: 'root-slot' as const,
    overlayTestId: 'weekly-reflection-overlay',
    element: (visible: boolean) => (
      <WeeklyReflectionComposer
        visible={visible}
        initialText=""
        onSave={noop}
        onCancel={noop}
      />
    ),
  },
] as const;

describe.each(CASES)('DEBUG-406 · $name occlusion guards', ({ overlayTestId, element, mount }) => {
  it('renders no RN <Modal> — the occlusion shape must not return', () => {
    const { UNSAFE_queryAllByType } = render(element(true));
    expect(UNSAFE_queryAllByType(Modal)).toHaveLength(0);
  });

  it('renders nothing at all when not visible', () => {
    // A <Modal visible={false}> still mounted its children; a plain overlay must
    // not leave an invisible full-screen responder over the host.
    const { queryByTestId } = render(element(false));
    expect(queryByTestId(overlayTestId)).toBeNull();
  });

  // DEBUG-575 — SPLIT BY MOUNT SITE. This used to assert `toBe(true)` for all
  // three, which PINNED A DEFECT: `accessibilityViewIsModal` prunes the
  // RECEIVER'S SIBLINGS, and the two root-slot overlays are direct native
  // siblings of RootCrisisButton and CrisisKeyboardAccessory (RootOverlaySlot
  // renders a bare fragment). So on those two the prop deleted both crisis
  // affordances from the accessibility tree — measured on device as zero
  // `crisis-button-root` nodes with the sheet open, the button still painted.
  // ThresholdEducationModal mounts INLINE in ProfileScreen, where the crisis
  // button is an ancestor's sibling and out of prune scope, so it keeps the prop.
  //
  // Asserted on the RENDERED TREE, never on source text: both composers now
  // carry prose naming this anti-pattern, which is exactly the DEBUG-390
  // collision a source-string matcher would trip over.
  it('supplies its focus trap in the way its mount site allows', () => {
    const { getByTestId } = render(element(true));
    const isModal = getByTestId(overlayTestId).props.accessibilityViewIsModal;

    if (mount === 'inline') {
      expect(isModal).toBe(true);
    } else {
      // Root-slot: the trap is CleanRootNavigator's host instead, pinned by
      // __tests__/safety/rootOverlayFocusTrap.test.tsx.
      expect(isModal).not.toBe(true);
    }
  });

  it('is a full-bleed absolute layer, so its box is its host', () => {
    const { getByTestId } = render(element(true));
    const style = flatten(getByTestId(overlayTestId).props.style);
    expect(style.position).toBe('absolute');
    expect(style.top).toBe(0);
    expect(style.left).toBe(0);
    expect(style.right).toBe(0);
    expect(style.bottom).toBe(0);
  });

  it('claims the touch responder, so a pan cannot scroll the host beneath', () => {
    // <Modal>'s separate window blocked touches outright. An inline overlay only
    // blocks where its own views cover, and a pan STARTING on the backdrop would
    // otherwise drive the host's ScrollView.
    const { getByTestId } = render(element(true));
    const overlay = getByTestId(overlayTestId);
    expect(overlay.props.onStartShouldSetResponder()).toBe(true);
    expect(overlay.props.onMoveShouldSetResponder()).toBe(true);
  });
});

describe('DEBUG-406 · backdrops must be opaque and light', () => {
  // The crisis button (#991B1B) composites over these once they are no longer
  // native windows. It is a mid-dark red, so contrast against it is NON-MONOTONIC
  // in backdrop luminance — darkening bottoms out near 2.10:1 at #808080 and
  // recovers only to 2.53:1 at black. No dark backdrop passes 3:1 at any alpha.
  //
  // Opacity matters independently: an alpha scrim's composite depends on whatever
  // the host draws behind it, so a passing measurement would describe today's
  // screen rather than the overlay.
  const OPAQUE_ALLOWED = [colorSystem.base.white, colorSystem.gray[200]];

  it.each(CASES)('$name backdrop is an opaque light token', ({ element }) => {
    const { UNSAFE_root } = render(element(true));
    const backdrops = UNSAFE_root
      .findAll((n) => {
        const style = flatten((n.props as { style?: unknown }).style);
        return style.position === 'absolute' && typeof style.backgroundColor === 'string';
      })
      .map((n) => flatten((n.props as { style?: unknown }).style).backgroundColor as string);

    expect(backdrops.length).toBeGreaterThan(0);
    for (const color of backdrops) {
      expect(color).not.toMatch(/rgba?\(/); // no alpha scrim
      expect(OPAQUE_ALLOWED).toContain(color);
    }
  });

  it('the matcher would reject the pre-DEBUG-406 values (it can still go red)', () => {
    // Proves the assertion above is not vacuous — these are the literal values
    // the three files carried before the conversion.
    for (const old of ['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.4)']) {
      expect(old).toMatch(/rgba?\(/);
      expect(OPAQUE_ALLOWED).not.toContain(old);
    }
  });
});

describe('DEBUG-406 · action rows clear the crisis button exclusion rect', () => {
  it('the composers pad their action row by the rect width', () => {
    for (const element of [
      <SessionNoteComposer
        key="s"
        visible
        initialText="x"
        onSave={noop}
        onDelete={noop}
        onCancel={noop}
      />,
      <WeeklyReflectionComposer key="w" visible initialText="x" onSave={noop} onCancel={noop} />,
    ]) {
      const { UNSAFE_root } = render(element);
      const padded = UNSAFE_root.findAll((n) => {
        const style = flatten((n.props as { style?: unknown }).style);
        return style.paddingRight === OVERLAY_ACTION_ROW_PADDING_RIGHT;
      });
      expect(padded.length).toBeGreaterThan(0);
    }
  });

  it('the padding is the derived rect, never a re-typed literal', () => {
    expect(OVERLAY_ACTION_ROW_PADDING_RIGHT).toBe(CRISIS_BUTTON_EXCLUSION_RECT.left);
  });
});

describe('DEBUG-406 · the composers do not steal focus with autoFocus', () => {
  // autoFocus raised the keyboard immediately. The iOS keyboard renders in
  // UIRemoteKeyboardWindow — above the app window — so it occludes the crisis
  // button regardless of zIndex, which would have left these conversions
  // cosmetic for most of each sheet's life. It also stole VoiceOver focus from
  // the title, so the sheet never announced what it was asking.
  it.each([
    ['session-note-input', <SessionNoteComposer key="s" visible initialText="" onSave={noop} onDelete={noop} onCancel={noop} />],
    ['weekly-reflection-input', <WeeklyReflectionComposer key="w" visible initialText="" onSave={noop} onCancel={noop} />],
  ] as const)('%s does not autoFocus', (testId, element) => {
    const { getByTestId } = render(element);
    expect(getByTestId(testId).props.autoFocus).toBeFalsy();
  });
});
