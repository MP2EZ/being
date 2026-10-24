/**
 * FEAT-860 — which revisions of the bundled privacy policy were MATERIAL.
 *
 * The app stores no policy-document version of its own: `LegalGateConsents.version` holds
 * `CONSENT_VERSION` (the consent schema), not the policy's. The policy text is the only
 * source for "what changed materially", so this reads the bundled document (generated from
 * `docs/legal/privacy-policy.md`) rather than a second list that could drift from it.
 *
 * Two things are read from the document:
 *   - `headerVersion`: the `**Version:**` line at the top.
 *   - the material revisions: the Section 10 "Recent revisions" bullets whose bold lead-in
 *     carries `— material change.`. Every other bullet is a non-material revision and
 *     shows the user nothing (AC3).
 *
 * Pure and dependency-free apart from the bundled string, so it is safe to import from the
 * consent store without widening that module's graph beyond one string constant.
 */
import { privacyPolicyContent } from '@/features/profile/content/legalContent.generated';

export interface PolicyRevisions {
  /** The document's own `**Version:**`, or null if the header is missing or unparseable. */
  headerVersion: string | null;
  /** Material revision versions, oldest first. */
  materialVersions: string[];
  /** Highest material version, or null when there is none. */
  latestMaterialVersion: string | null;
}

const VERSION_PART = /^\d+$/;

/**
 * Numeric, per dot-separated part: 1.9 < 1.24. A string compare orders '1.9' after '1.24'
 * and would hide every notice from a user acknowledged at 1.9. A missing part is zero.
 * Negative, zero or positive, like `Array.prototype.sort`.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((p) => (VERSION_PART.test(p) ? Number(p) : 0));
  const pb = b.split('.').map((p) => (VERSION_PART.test(p) ? Number(p) : 0));
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const HEADER_VERSION = /\*\*Version:\*\*[ \t]*(\d+(?:\.\d+)*)/;
const REVISIONS_MARKER = '**Recent revisions**';
/** `- **v1.29 (October 23, 2026) — material change.** body` → lead-in is the bold span. */
const REVISION_BULLET = /^-\s+\*\*v(\d+(?:\.\d+)*)\b([^*\n]*)\*\*/;
const MATERIAL_MARKER = /—\s*material change\./;

/** Versions of the revisions carrying the material marker, in document order, de-duplicated. */
function parseMaterialVersions(content: string): string[] {
  const start = content.indexOf(REVISIONS_MARKER);
  if (start === -1) return [];
  const versions: string[] = [];
  for (const line of content.slice(start + REVISIONS_MARKER.length).split('\n')) {
    // The list ends at the next heading or rule; prose between bullets does not end it.
    if (/^(#|---)/.test(line)) break;
    const bullet = REVISION_BULLET.exec(line);
    const version = bullet?.[1];
    if (version === undefined || !MATERIAL_MARKER.test(bullet?.[2] ?? '')) continue;
    if (!versions.includes(version)) versions.push(version);
  }
  return versions;
}

export function parsePolicyRevisions(content: string): PolicyRevisions {
  const materialVersions = parseMaterialVersions(content).sort(compareVersions);
  return {
    headerVersion: HEADER_VERSION.exec(content)?.[1] ?? null,
    materialVersions,
    latestMaterialVersion: materialVersions[materialVersions.length - 1] ?? null,
  };
}

let cached: PolicyRevisions | null = null;

/** The parse of the bundled policy. The document is a build-time constant, so it is parsed once. */
export function getPolicyRevisions(): PolicyRevisions {
  if (cached === null) cached = parsePolicyRevisions(privacyPolicyContent);
  return cached;
}

/**
 * Material versions the user has not acknowledged: every one strictly newer than their
 * acknowledgement (all of them when there is none). Non-material revisions never appear
 * here, so a header that moved only through non-material ones yields an empty list.
 */
export function pendingMaterialVersions(
  acknowledgedVersion: string | null,
  materialVersions: readonly string[],
): string[] {
  if (acknowledgedVersion === null) return [...materialVersions];
  return materialVersions.filter((v) => compareVersions(v, acknowledgedVersion) > 0);
}
