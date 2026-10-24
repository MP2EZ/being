/**
 * FEAT-860 — one plain-language line per MATERIAL privacy-policy revision.
 *
 * One map, keyed by the version the policy's Section 10 marks `— material change.`. A jest
 * test asserts these keys equal the parsed material set in both directions, so adding a
 * material revision to the policy fails the build until it has a line here.
 *
 * Copy rules: say what the policy now says, factually. No reassurance, no "health data" /
 * "therapeutic" wording (userFacingTerminology.privacy.test.ts bans it), no "PHI".
 *
 * COPY STATUS: compliance ruling 2026-10-23 (FTC Act §5). Each line must hold against the
 * CURRENT policy, not just its own revision: a user with no acknowledgement sees all of them
 * together, and "Read the policy" opens today's text. 1.24 is past tense because v1.27
 * stopped the events it describes.
 */
export const POLICY_MATERIAL_CHANGE_SUMMARIES: Readonly<Record<string, string>> = {
  '1.24':
    'The policy no longer says analytics collects no mental health information: with Usage Analytics on, older versions recorded opening a screening or support resources and tapping to call or text a crisis line.',
  '1.25':
    'The policy now says your random account ID is not anonymous: it is stored with your IP address and device details, and with crisis-detection events, which are therefore linked to you.',
  '1.29':
    'The policy now says Usage Analytics events are kept for 1 year, not 90 days, and that we cannot delete your events on request, even if you delete your data in the app.',
};
