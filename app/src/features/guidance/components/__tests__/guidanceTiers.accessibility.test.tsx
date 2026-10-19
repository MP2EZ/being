/**
 * Tier 2 / Tier 3 — accessibility contract (MAINT-745, TEST-67).
 *
 * Rendered against the authored conflict content, the only shipped domain.
 * Tier 3's rows are TEST-ONLY pins on current behaviour: its framing line is
 * hardcoded to Marcus Aurelius, a known pre-existing defect not fixed here, so
 * the frame is asserted only against the conflict fixture whose author matches.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import Tier2 from '../Tier2';
import Tier3 from '../Tier3';
import { DOMAIN_BINDINGS } from '../../constants/domainBindings';
import type { GuidanceContent } from '../../types/guidance';

const conflict = require('../../../../../assets/guidance/guidance-conflict.json') as GuidanceContent;

const hostTexts = (root: ReactTestInstance) =>
  root
    .findAll((n) => n.type === 'Text')
    .flatMap((n) => [n.props.children].flat().filter((c): c is string => typeof c === 'string'));

const hostRoles = (root: ReactTestInstance) =>
  root
    .findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole !== undefined)
    .map((n) => ({ role: n.props.accessibilityRole as string, testID: n.props.testID as string | undefined }));

const renderTier2 = () =>
  render(
    <Tier2
      protocol={conflict.protocol}
      obstacles={conflict.obstacles}
      principles={DOMAIN_BINDINGS.conflict.principles}
    />,
  );

describe('Tier2 — accessibility', () => {
  it('announces every concept title, every obstacle question and the section heading as headers', () => {
    const { getByText } = renderTier2();
    const headings = [
      ...conflict.protocol.map((c) => c.title),
      ...conflict.obstacles.map((o) => o.question),
      'Questions that come up',
    ];
    for (const heading of headings) {
      expect(getByText(heading).props.accessibilityRole).toBe('header');
    }
  });

  it('speaks the principles label from the binding table', () => {
    const { getByTestId } = renderTier2();
    expect(getByTestId('guidance-tier2-principles-value').props.accessibilityLabel).toBe(
      `Principles: ${DOMAIN_BINDINGS.conflict.principles.join(', ')}`,
    );
  });

  it('keeps the principles row, and the whole tier, non-interactive', () => {
    const { getByTestId, UNSAFE_root } = renderTier2();
    const row = getByTestId('guidance-tier2-principles');
    const interactive = [row, ...row.findAll(() => true)].filter((n) =>
      ['button', 'link'].includes(n.props.accessibilityRole),
    );
    expect(interactive).toEqual([]);
    // Non-vacuous: the same walk does see the tier's header roles.
    const roles = hostRoles(UNSAFE_root);
    expect(roles.length).toBeGreaterThan(0);
    expect(roles.filter((r) => r.role !== 'header')).toEqual([]);
  });

  it("never renders 'Obstacles' or 'Learn more'", () => {
    const { queryByText } = renderTier2();
    expect(queryByText(/Obstacles/i)).toBeNull();
    expect(queryByText(/Learn more/i)).toBeNull();
  });
});

describe('Tier3 — accessibility (pins current behaviour)', () => {
  const quote = conflict.classicalAnchor;

  it('announces no header', () => {
    const { UNSAFE_root } = render(<Tier3 quote={quote} />);
    expect(hostRoles(UNSAFE_root).filter((r) => r.role === 'header')).toEqual([]);
  });

  it('shows none of the ladder vocabulary', () => {
    const { UNSAFE_root } = render(<Tier3 quote={quote} />);
    const texts = hostTexts(UNSAFE_root);
    expect(texts).toContain(quote.text);
    for (const text of texts) {
      expect(text).not.toMatch(/tier|classical anchor|ladder/i);
    }
  });

  it('renders author and source verbatim in the attribution', () => {
    const { getByTestId } = render(<Tier3 quote={quote} />);
    expect(getByTestId('guidance-tier3-attribution').props.children).toBe(
      `— ${quote.author}, ${quote.source}`,
    );
  });

  it('frames the conflict anchor as a note its author wrote to himself', () => {
    expect(quote.author).toBe('Marcus Aurelius');
    const { getByText } = render(<Tier3 quote={quote} />);
    expect(getByText('Eighteen centuries ago, Marcus Aurelius wrote this to himself.')).toBeTruthy();
  });
});
