#!/usr/bin/env python3
"""Release device-check ceiling (crisis ruling 2026-10-09; /b-release Phase 2.9 and 6.6).

Reads `gh pr list --base main --state merged --json number,mergedAt,mergeCommit,body,comments`
on stdin. Exits 0 only when the latest PR merged into main (any head, picked by mergedAt) carries
a terminal device-check record; 1 otherwise. Fails closed on a parse error or an empty list.

Terminal: a line-anchored `Result: PASS|FAIL|EXEMPT|VOID`. PASS and EXEMPT also need
`Binding: ok` and a `Merge commit:` matching that PR's merge commit. VOID must cite an ITMS code
or an expiry with its date ("expiry 2026-12-08"). A legacy pre-bump PASS (`Trigger: /b-release Phase 2.9` in the PR BODY) also
counts. PENDING and WAIVED never count. Procedure: docs/testing/crisis-device-checklist.md §5.
"""
import json
import re
import sys

M = re.MULTILINE


def verdict(text, oid, is_body):
    r = re.search(r"^Result:\s+(PASS|FAIL|EXEMPT|VOID)\s*$", text, M)
    if not r:
        return None
    res = r.group(1)
    if is_body and res == "PASS" and re.search(r"^Trigger:\s+/b-release Phase 2\.9\b", text, M):
        return "PASS (legacy pre-bump)"
    if res in ("PASS", "EXEMPT"):
        if not re.search(r"^Binding:\s+ok\s*$", text, M):
            return None
        mc = re.search(r"^Merge commit:\s+([0-9a-f]{7,40})\b", text, M)
        if not mc or not oid.startswith(mc.group(1)):
            return None
    if res == "VOID" and not re.search(r"ITMS-\d{4,}|expir\w*\s+\d{4}-\d{2}-\d{2}", text, re.I):
        return None
    return res


def main():
    try:
        prs = json.load(sys.stdin)
    except Exception:
        print("REFUSE: could not parse gh output")
        return 1
    if not isinstance(prs, list) or not prs:
        print("REFUSE: no merged PR into main found")
        return 1
    pr = max(prs, key=lambda p: p.get("mergedAt") or "")
    num = pr.get("number")
    oid = (pr.get("mergeCommit") or {}).get("oid") or ""
    if not oid:
        print(f"REFUSE: PR #{num} has no merge commit")
        return 1
    texts = [(pr.get("body") or "", True)]
    texts += [((c or {}).get("body") or "", False) for c in pr.get("comments") or []]
    found = [v for t, is_body in texts if (v := verdict(t, oid, is_body))]
    if found:
        print(f"OK: PR #{num} ({oid[:8]}) has a terminal device-check record: {found[-1]}")
        return 0
    print(
        f"REFUSE: PR #{num} ({oid[:8]}), the latest merge into main, has no terminal device-check "
        f"record (PASS/FAIL/EXEMPT/VOID). Run docs/testing/crisis-device-checklist.md §5 against its "
        f"TestFlight build, post the §6 block on PR #{num}, then re-run /b-release."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
