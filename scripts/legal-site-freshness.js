#!/usr/bin/env node
/**
 * Verify that being.fyi is serving the current legal documents.
 *
 * `scripts/legal-registry.js` checks the three surfaces INSIDE this repo
 * (docs/legal/*.md -> the codegen bridge -> the app's consumer). This script
 * checks the fourth, which lives outside it: the public website.
 *
 * ## Why this exists
 *
 * being.fyi does not read docs/legal/ at request time. Its deploy workflow
 * (`being-website/.github/workflows/deploy.yml`) sparse-checkouts this repo at
 * build time and copies docs/legal/ into `content/legal/`, and the Next.js
 * pages `import` that markdown as a raw module. The text is therefore baked
 * into the deployed bundle: the ONLY way stale text leaves the site is a
 * rebuild.
 *
 * That workflow triggers on pushes to being-website's own main/preview, and on
 * workflow_dispatch. Nothing in THIS repo triggers it. On 2026-08-07 the live
 * site was found serving privacy-policy v1.5 from 2026-05-31 — 68 days and four
 * versions stale — including a crisis-data claim DEBUG-333 had removed as
 * false. Nothing detected it for ten weeks. (INFRA-348.)
 *
 * ## Why SCHEDULED and not a build-time assertion
 *
 * The failure mode is "no deploy ran." A build-time check only executes when a
 * build executes, so it would have stayed green — by never running — for the
 * entire window it was supposed to catch. Only an out-of-band probe can observe
 * that a pipeline did not fire. Hence a cron, not a CI step.
 *
 * ## What it asserts
 *
 * Two tiers, both hard failures:
 *
 *   1. VERSION — the live `Version:` and `Last Updated:` headers equal the
 *      source file's. This is what catches a stale deploy, unambiguously.
 *
 *   2. CONTENT — a fingerprint of the live rendered prose equals a fingerprint
 *      derived from the source markdown. Tier 1 alone is insufficient: nothing
 *      in this repo enforces that a content edit bumps the `Version:` header —
 *      it is author discipline — so an unbumped edit would sail past a
 *      version-only check. (Compliance requirement, INFRA-348.)
 *
 * ## Which ref
 *
 * `development`, because that is the ref being-website's deploy.yml actually
 * sparse-checkouts. If that pin changes, change DEPLOYED_REF to match or this
 * check reports drift that is really a ref mismatch. Whether `main` would be
 * the better pin is a live question tracked in INFRA-363; this script follows
 * reality rather than asserting a preference.
 *
 * Usage:
 *   node scripts/legal-site-freshness.js            # check live site
 *   node scripts/legal-site-freshness.js --verbose  # print per-route detail
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SITE_ORIGIN = 'https://being.fyi';

/**
 * The ref being-website/.github/workflows/deploy.yml sparse-checkouts.
 * Keep in sync with that file. See INFRA-363.
 */
const DEPLOYED_REF = 'origin/development';

/**
 * Public website routes and the docs/legal source each one renders.
 *
 * This is deliberately NOT derived from docs/legal/*.md: the website publishes
 * a SUBSET. `medical-disclaimer.md` is bundled into the app but has no website
 * route, and the four internal/regulator-facing docs (regulatory-applicability,
 * dpia-sensitive-wellness-data, breach-notification-runbook, lia-crisis-
 * telemetry) are published nowhere. Enumerating explicitly keeps a new internal
 * doc from being silently expected on the public site.
 *
 * /cookies is intentionally absent: it is a hardcoded page in being-website
 * with no docs/legal source.
 */
const ROUTES = [
  { route: '/privacy', file: 'privacy-policy.md' },
  { route: '/terms', file: 'terms-of-service.md' },
  { route: '/support', file: 'support.md' },
  { route: '/privacy/multi-state', file: 'multi-state-privacy.md' },
  { route: '/privacy/california', file: 'california-privacy.md' },
];

const VERBOSE = process.argv.includes('--verbose');

function get(url, redirectsLeft = 3) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'being-legal-freshness-check' } }, (res) => {
        const { statusCode, headers } = res;
        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          res.resume();
          if (redirectsLeft === 0) {
            reject(new Error(`too many redirects for ${url}`));
            return;
          }
          resolve(get(new URL(headers.location, url).toString(), redirectsLeft - 1));
          return;
        }
        if (statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${statusCode} for ${url}`));
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(body));
      })
      .on('error', reject);
  });
}

/**
 * Isolate the rendered legal prose from a Next.js page.
 *
 * Two things make a naive grep wrong here, both verified against the live site:
 *
 *   1. Every string appears TWICE — once in the server-rendered markup and
 *      again, HTML-escaped, inside the RSC flight payload in <script> tags.
 *      Stripping <script> blocks removes the duplicate at the source, which is
 *      sturdier than "take the first match" (that only works while the markup
 *      happens to precede the payload).
 *   2. Site chrome (nav, footer, cookie banner) would otherwise pollute the
 *      fingerprint and make it drift on unrelated website changes. The legal
 *      prose is scoped to <article class="legal-content">.
 */
function extractRenderedArticle(html) {
  const withoutScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

  const article = withoutScripts.match(
    /<article\b[^>]*class="[^"]*legal-content[^"]*"[^>]*>([\s\S]*?)<\/article>/i
  );
  if (!article) {
    throw new Error(
      'could not locate <article class="legal-content"> — the website markup changed; ' +
        'update extractRenderedArticle()'
    );
  }
  return article[1];
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—',
  ndash: '–', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“',
  rdquo: '”',
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => {
      const v = ENTITIES[name.toLowerCase()];
      return v === undefined ? m : v;
    });
}

/**
 * Reduce text to a comparable word stream: alphanumeric runs, lowercased.
 *
 * Everything punctuation-shaped is dropped, which is what lets rendered HTML
 * and its markdown source collapse to the same thing — markdown's `**`, `#`,
 * `|`, `-` and the HTML's tags all vanish on their respective sides.
 */
function normalizeWords(text) {
  return text
    .replace(/[^0-9A-Za-z]+/g, ' ')
    .trim()
    .toLowerCase();
}

function liveProseFingerprint(html) {
  const article = extractRenderedArticle(html);
  const text = decodeEntities(article.replace(/<[^>]+>/g, ' '));
  return normalizeWords(text);
}

/**
 * Derive the same word stream from the markdown source.
 *
 * Only two markdown constructs need explicit handling; the rest are punctuation
 * and fall out in normalizeWords():
 *
 *   - Inline links `[text](url)` keep their text and drop the URL, matching
 *     <a href="url">text</a> where the URL lives in an attribute and is
 *     stripped with the tag.
 *   - ORDERED LIST markers. `1.` in `1. Introduction` is a marker, and the
 *     renderer emits <ol><li>Introduction</li></ol> where the numeral comes
 *     from a CSS counter and is absent from the text. Left in, every ordered
 *     list would report false drift. The negative lookahead spares ATX
 *     headings, where a leading numeral IS literal text ("## 1. Introduction"
 *     renders the "1."), so heading numbers still take part in the comparison.
 */
function sourceProseFingerprint(markdown) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^(?![ \t]*#)[ \t]*\d+\.[ \t]+/gm, ' ');
  return normalizeWords(text);
}

function hash(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
}

/** First match only — see extractRenderedArticle() on why duplicates exist. */
function headerValue(text, label) {
  const m = text.match(new RegExp(`${label}\\s*:?\\s*([^\\n]{1,40})`, 'i'));
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}

function liveHeaders(html) {
  const article = extractRenderedArticle(html);
  const text = decodeEntities(article.replace(/<[^>]+>/g, '\n'))
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
  return {
    version: headerValue(text, 'Version'),
    lastUpdated: headerValue(text, 'Last Updated'),
  };
}

function sourceHeaders(markdown) {
  const plain = markdown.replace(/\*\*/g, '');
  return {
    version: headerValue(plain, 'Version'),
    lastUpdated: headerValue(plain, 'Last Updated'),
  };
}

function readSourceAtRef(file) {
  try {
    return execFileSync('git', ['show', `${DEPLOYED_REF}:docs/legal/${file}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (e) {
    throw new Error(
      `could not read docs/legal/${file} at ${DEPLOYED_REF}: ${e.message.trim()}`
    );
  }
}

async function checkRoute({ route, file }) {
  const problems = [];
  const source = readSourceAtRef(file);
  const html = await get(`${SITE_ORIGIN}${route}`);

  const live = liveHeaders(html);
  const src = sourceHeaders(source);

  if (live.version !== src.version) {
    problems.push(`Version: live "${live.version}" != ${DEPLOYED_REF} "${src.version}"`);
  }
  if (live.lastUpdated !== src.lastUpdated) {
    problems.push(
      `Last Updated: live "${live.lastUpdated}" != ${DEPLOYED_REF} "${src.lastUpdated}"`
    );
  }

  const liveWords = liveProseFingerprint(html);
  const srcWords = sourceProseFingerprint(source);
  if (liveWords !== srcWords) {
    problems.push(
      `content fingerprint: live ${hash(liveWords)} (${liveWords.split(' ').length} words) ` +
        `!= ${DEPLOYED_REF} ${hash(srcWords)} (${srcWords.split(' ').length} words)` +
        `\n    first divergence: ${firstDivergence(liveWords, srcWords)}`
    );
  }

  if (VERBOSE) {
    console.log(
      `  ${route} -> docs/legal/${file}\n` +
        `    version ${live.version} · updated ${live.lastUpdated} · ` +
        `prose ${hash(liveWords)} (${liveWords.split(' ').length} words)`
    );
  }

  return { route, file, problems };
}

/** Point at the first differing word so a failure is actionable, not just red. */
function firstDivergence(a, b) {
  const aw = a.split(' ');
  const bw = b.split(' ');
  const n = Math.min(aw.length, bw.length);
  let i = 0;
  while (i < n && aw[i] === bw[i]) i += 1;
  const window = (w) => w.slice(Math.max(0, i - 6), i + 12).join(' ');
  if (i === n && aw.length === bw.length) return '(none — lengths differ only at end)';
  return `\n      live: …${window(aw)}…\n      src:  …${window(bw)}…`;
}

async function main() {
  console.log(
    `Checking ${SITE_ORIGIN} legal routes against ${DEPLOYED_REF} ` +
      `(${ROUTES.length} routes)\n`
  );

  const results = [];
  for (const r of ROUTES) {
    try {
      results.push(await checkRoute(r));
    } catch (e) {
      results.push({ route: r.route, file: r.file, problems: [e.message] });
    }
  }

  const failed = results.filter((r) => r.problems.length > 0);

  if (failed.length === 0) {
    console.log(`\n✅ being.fyi legal content matches ${DEPLOYED_REF} on all ${ROUTES.length} routes.`);
    return;
  }

  console.error('\n❌ being.fyi is serving stale or divergent legal content:\n');
  for (const r of failed) {
    console.error(`  ${SITE_ORIGIN}${r.route}  (source: docs/legal/${r.file})`);
    for (const p of r.problems) console.error(`    - ${p}`);
    console.error('');
  }
  console.error(
    'A published privacy policy is a legal commitment. Remediate by re-running the\n' +
      'website deploy, which rebuilds from this repo:\n\n' +
      '    gh workflow run deploy.yml -R mp2ez/being-website\n\n' +
      'If the drift is a ref mismatch rather than a stale build, check that\n' +
      "being-website's deploy.yml still sparse-checkouts " +
      `${DEPLOYED_REF.replace('origin/', '')} and update DEPLOYED_REF here to match.\n` +
      'See docs/legal/README.md and INFRA-363.'
  );
  process.exitCode = 1;
}

main().catch((e) => {
  console.error(`\n❌ legal-site-freshness check errored: ${e.stack || e.message}`);
  process.exitCode = 1;
});
