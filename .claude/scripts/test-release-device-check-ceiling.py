#!/usr/bin/env python3
"""Fixture cases for release-device-check-ceiling.py (crisis ruling 2026-10-09).

Run: python3 /Users/max/dev/being/.claude/scripts/test-release-device-check-ceiling.py
"""
import io
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "release-device-check-ceiling.py")
OID = "abcdef1234567890abcdef1234567890abcdef12"
OLDER = {"number": 499, "mergedAt": "2026-10-01T00:00:00Z", "mergeCommit": {"oid": "1111111"},
         "body": "Result: PASS\nTrigger: /b-release Phase 2.9", "comments": []}


def latest(body, comment=""):
    return [{"number": 500, "mergedAt": "2026-10-10T00:00:00Z", "mergeCommit": {"oid": OID},
             "body": body, "comments": [{"body": comment}] if comment else []}, OLDER]


def run(stdin_text):
    p = subprocess.run([sys.executable, SCRIPT], input=stdin_text, capture_output=True, text=True)
    return p.returncode, p.stdout.strip()


CASES = [
    ("pass bound to the merge commit", 0,
     latest("Result: PENDING", "Result: PASS\nBinding: ok\nMerge commit: abcdef12")),
    ("template alternatives line is not a PASS", 1,
     latest("Result: PASS | FAIL | EXEMPT | VOID\nBinding: ok\nMerge commit: abcdef12")),
    ("pass with another merge commit", 1,
     latest("Result: PENDING", "Result: PASS\nBinding: ok\nMerge commit: 9999999")),
    ("pass without Binding: ok", 1,
     latest("Result: PENDING", "Result: PASS\nBinding: MISMATCH\nMerge commit: abcdef12")),
    ("fail is terminal", 0, latest("Result: PENDING", "Result: FAIL")),
    ("void without a cited reason", 1, latest("Result: PENDING", "Result: VOID")),
    ("void citing an ITMS code", 0, latest("Result: PENDING", "Result: VOID\nApple rejected: ITMS-90683")),
    ("void citing the TestFlight expiry", 0,
     latest("Result: PENDING", "Result: VOID\nVoid: TestFlight expiry 2026-12-08")),
    ("void with the unfilled template line", 1,
     latest("Result: PENDING", "Result: VOID\nVoid: <VOID only: the ITMS code or the TestFlight expiry date>")),
    ("pending only", 1, latest("Result: PENDING")),
    ("legacy waived is not terminal", 1, latest("Result: WAIVED\nTrigger: /b-release Phase 2.9")),
    ("legacy pre-bump pass in the body", 0, latest("Result: PASS\nTrigger: /b-release Phase 2.9")),
    ("legacy pass form only counts in the body", 1,
     latest("Result: PENDING", "Result: PASS\nTrigger: /b-release Phase 2.9")),
    ("latest by mergedAt, not list order", 1,
     [{"number": 499, "mergedAt": "2026-10-01T00:00:00Z", "mergeCommit": {"oid": "1111111"},
       "body": "Result: FAIL", "comments": []},
      {"number": 500, "mergedAt": "2026-10-10T00:00:00Z", "mergeCommit": {"oid": OID},
       "body": "", "comments": []}]),
    ("empty list fails closed", 1, []),
]

fails = 0
for name, want, payload in CASES:
    got, out = run(json.dumps(payload))
    # Non-vacuity: every case must reach a verdict about PR #500 (or the empty-list refusal),
    # so a broken fixture cannot pass by being refused for the wrong reason.
    reached = ("#500" in out) or (payload == [] and "no merged PR" in out)
    ok = got == want and reached
    print(("ok   " if ok else "FAIL ") + name + ("" if ok else f" (want {want}, got {got}: {out})"))
    fails += not ok

got, out = run("not json")
ok = got == 1 and "could not parse" in out
print(("ok   " if ok else "FAIL ") + "unparseable input fails closed")
fails += not ok

print("all cases pass" if not fails else f"{fails} case(s) failed")
sys.exit(1 if fails else 0)
