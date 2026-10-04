#!/usr/bin/env python3
"""Append-only log for the INFRA-724 Skeptic shadow, written by /b-batch Phase 1.

One line per shadowed item in LOG. Malformed flags are computed here from the raw replies, never
passed in, so the orchestrator cannot grade its own shadow. Both arms go through the same parser.

  shadowlog.py count
  shadowlog.py append --slug S --item ID --base-sha SHA --prompt-file P \
      --gp-reply F [--gp-reply F2] --gp-usage TOKENS,TOOL_USES,DURATION_MS [--gp-dead] \
      --ex-reply F [--ex-reply F2] --ex-usage ... [--ex-dead] \
      --actual TIER:ASKS --with-explore TIER:ASKS
  shadowlog.py outcomes --manifest /Users/max/dev/being/.config/.b-batch-state.<slug>.json

TIER is GREEN | AMBER | RED-GATED | RED-ATTENDED; ASKS is 1 when the item goes to the Step 2.3
decision round. A usage field you cannot read is "-".
"""
import argparse
import datetime
import hashlib
import json
import re
import sys
from pathlib import Path

LOG = Path("/Users/max/dev/being/.config/.skeptic-shadow.jsonl")
OUTCOMES = Path("/Users/max/dev/being/.config/.skeptic-shadow.outcomes.jsonl")
TARGET = 15
ARMS = ("general-purpose", "Explore")
REQUIRED_LISTS = ("blocking_constraints", "ambiguities", "files_touched", "declared_deps")
TIERS = ("GREEN", "AMBER", "RED-GATED", "RED-ATTENDED")


def parse_verdict(reply):
    """The panel verdict, or None if the reply is not that JSON object and nothing else.

    A single ```json fence is tolerated; prose around the object is not."""
    if reply is None:
        return None
    text = reply.strip()
    fence = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", text, re.S)
    if fence:
        text = fence.group(1)
    try:
        v = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(v, dict) or not isinstance(v.get("approach"), str):
        return None
    if v.get("confidence") not in ("high", "medium", "low"):
        return None
    for k in REQUIRED_LISTS:
        if not isinstance(v.get(k), list) or not all(isinstance(x, str) for x in v[k]):
            return None
    return v


def _usage(s):
    parts = (s or "-,-,-").split(",")
    if len(parts) != 3:
        sys.exit(f"usage must be TOKENS,TOOL_USES,DURATION_MS, got {s!r}")
    return [None if p.strip() in ("", "-") else int(p) for p in parts]


def _class(s):
    tier, _, asks = s.partition(":")
    if tier not in TIERS or asks not in ("0", "1"):
        sys.exit(f"classification must be TIER:0|1 with TIER in {TIERS}, got {s!r}")
    return {"tier": tier, "asks": asks == "1"}


def _arm(a):
    replies = a["replies"]
    if a["dead"] and replies:
        sys.exit("an arm cannot be both dead and have replies")
    if not a["dead"] and not replies:
        sys.exit("a live arm needs at least one reply (pass --*-dead if it never returned)")
    if len(replies) > 2:
        sys.exit("at most two replies per arm: the original and one re-ask")
    tokens, tool_uses, duration = _usage(a["usage"])
    return {
        "replies": replies,
        "tokens": tokens, "tool_uses": tool_uses, "duration_ms": duration,
        "dead": a["dead"],
        "first_malformed": a["dead"] or parse_verdict(replies[0]) is None,
        "final_malformed": a["dead"] or parse_verdict(replies[-1]) is None,
    }


def build_record(slug, item, base_sha, prompt, gp, ex, actual, with_explore):
    return {
        "v": 1, "slug": slug, "item": item,
        "date": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
        "base_sha": base_sha,
        "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
        "arms": {"general-purpose": _arm(gp), "Explore": _arm(ex)},
        "classification": {"actual": _class(actual), "with_explore": _class(with_explore)},
    }


def read(path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def count(path=LOG):
    return len({(r["slug"], r["item"]) for r in read(path)})


def append(path, rec):
    if any((r["slug"], r["item"]) == (rec["slug"], rec["item"]) for r in read(path)):
        sys.exit(f"{rec['item']} is already logged for batch {rec['slug']}")
    with path.open("a") as f:
        f.write(json.dumps(rec) + "\n")


def outcomes(manifest, log=LOG, out=OUTCOMES):
    m = json.loads(Path(manifest).read_text())
    shadowed = {r["item"] for r in read(log) if r["slug"] == m["slug"]}
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    n = 0
    with out.open("a") as f:
        for it in m.get("items", []):
            if it["id"] in shadowed:
                f.write(json.dumps({"slug": m["slug"], "item": it["id"], "at": now,
                                    "state": it.get("state"), "scoped": bool(it.get("scoped")),
                                    "defer_note": it.get("defer_note")}) + "\n")
                n += 1
    return n


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("count")
    a = sub.add_parser("append")
    for k in ("slug", "item", "base-sha", "prompt-file", "actual", "with-explore"):
        a.add_argument(f"--{k}", required=True)
    for arm in ("gp", "ex"):
        a.add_argument(f"--{arm}-reply", action="append", default=[])
        a.add_argument(f"--{arm}-usage", default="-,-,-")
        a.add_argument(f"--{arm}-dead", action="store_true")
    o = sub.add_parser("outcomes")
    o.add_argument("--manifest", required=True)
    args = ap.parse_args()

    if args.cmd == "count":
        print(count())
    elif args.cmd == "append":
        arm = lambda k: {"replies": [Path(p).read_text() for p in getattr(args, f"{k}_reply")],
                         "usage": getattr(args, f"{k}_usage"), "dead": getattr(args, f"{k}_dead")}
        rec = build_record(args.slug, args.item, args.base_sha, Path(args.prompt_file).read_text(),
                           arm("gp"), arm("ex"), args.actual, args.with_explore)
        append(LOG, rec)
        n = count()
        flags = {k: v["first_malformed"] for k, v in rec["arms"].items()}
        print(f"shadow logged {args.item}: {n}/{TARGET} items; first-reply malformed {flags}")
        if n >= TARGET:
            print("SCORING READY — tell the founder: python3 "
                  "/Users/max/dev/being/.claude/eval/skeptic-shadow/score.py cluster")
    else:
        print(f"{outcomes(args.manifest)} outcome record(s) appended to {OUTCOMES}")


if __name__ == "__main__":
    main()
