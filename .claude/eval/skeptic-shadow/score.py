#!/usr/bin/env python3
"""Score the INFRA-724 Skeptic shadow: does an `Explore` Skeptic catch what `general-purpose` does?

PRE-REGISTERED — fixed before any shadow data existed (2026-10-04). Do not edit the rule after
reading results; a changed rule is a new eval.

Data. One record per item in shadowlog.LOG: both arms' raw replies to a byte-identical prompt,
usage, malformed flags computed by shadowlog.parse_verdict, and two Step 2.1 classifications —
the actual one, and one recomputed with Explore's verdict in the Skeptic seat. "Asks" means the
item went to (or would have gone to) the Step 2.3 decision round; that is what "AMBER" means below.

Concerns. An arm's concerns are the `ambiguities` + `blocking_constraints` of its FINAL reply
(after the one re-ask). A dead or still-malformed arm contributes none.

Clustering (`cluster`). Per item, a blind model judge (JUDGE_MODEL, no tools) receives both arms'
concerns under shuffled neutral ids, with no arm attribution, and partitions them into clusters
of the same underlying issue. A cluster is SHARED if it holds concerns from both arms, else
UNIQUE to one arm.

Labels (`sheet`). Every unique cluster becomes one row of a blind sheet. Per item the arms are
shown as lens A / B, orientation drawn from random.Random(f"{SEED}|{slug}|{item}"); the key is
written to a separate file. The founder labels each row `real`, `not real` or `unsure`. Shared
clusters are not labeled and count as real.

Metrics (`report`), over n items:
  misses           GP-unique clusters labeled real OR unsure (unsure counts against Explore).
  recall[arm]      (shared + arm-unique labeled real) / (shared + all unique labeled real).
  spurious_ambers  Explore: items where actual does not ask, Explore's counterfactual does, and
                   none of Explore's unique clusters on the item is labeled real (unsure and an
                   empty set both count as spurious). GP: items where actual asks, the
                   counterfactual does not, and every GP-unique cluster there is labeled
                   `not real` (unsure counts as real). Both conventions lean against Explore.
  malformed[arm]   items whose FIRST reply was malformed, or the arm never returned.
  median_tokens    median subagent tokens per arm, over items where usage was read.
  rescope signals  reported only: batch outcome (deferred / parked / scoped) per shadowed item.

DECISION — adopt `Explore` as the b-batch Skeptic iff ALL hold, with n >= 15 and every unique
cluster labeled:
  1. misses <= 1
  2. spurious_ambers[Explore] <= spurious_ambers[general-purpose]
  3. malformed[Explore] <= malformed[general-purpose] + 1
  4. median_tokens[Explore] <= 0.70 * median_tokens[general-purpose]
Otherwise keep `general-purpose`. Either way: record the outcome on INFRA-724 and remove the
shadow block from b-batch Phase 1.

  score.py cluster   # judge calls; cached per item in OUT/clusters.json
  score.py sheet     # writes OUT/sheet.csv (to label) and OUT/key.json (do not open)
  score.py report    # reads the labeled sheet; writes OUT/report.md
"""
import csv
import json
import random
import statistics
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shadowlog import ARMS, LOG, OUTCOMES, TARGET, parse_verdict, read  # noqa: E402

OUT = Path("/Users/max/dev/being/.config/skeptic-shadow")
SEED = "INFRA-724"
JUDGE_MODEL, JUDGE_EFFORT = "claude-opus-5-5", "high"
SHORT = {"general-purpose": "gp", "Explore": "ex"}
LONG = {v: k for k, v in SHORT.items()}
LABELS = {"real": "real", "not real": "not real", "not_real": "not real", "unsure": "unsure"}

JUDGE_PROMPT = """You are clustering review concerns raised about one software work item.
Each line below is one concern with an id. Group concerns that describe the SAME underlying
issue — the same gap, risk or misreading, even if worded differently or at different depth.
Concerns about different issues go in different clusters, even if they touch the same file.
Every id must appear in exactly one cluster; a concern with no match is its own cluster.
Give each cluster a one-sentence gist.

Concerns:
{concerns}
"""
JUDGE_SCHEMA = {
    "type": "object", "required": ["clusters"],
    "properties": {"clusters": {"type": "array", "items": {
        "type": "object", "required": ["ids", "gist"],
        "properties": {"ids": {"type": "array", "items": {"type": "string"}},
                       "gist": {"type": "string"}}}}},
}


def key_of(r):
    return f"{r['slug']}|{r['item']}"


# ---------- pure scoring ----------

def _label(labels, cid):
    if cid not in labels:
        raise ValueError(f"unique cluster {cid} has no label — finish the sheet first")
    return labels[cid]


def metrics(items, clusters, labels):
    shared, misses = 0, 0
    unique_real = {"gp": 0, "ex": 0}
    by_item = {}
    for key, cls in clusters.items():
        for c in cls:
            arms = set(c["arms"])
            if arms == {"gp", "ex"}:
                shared += 1
                continue
            (arm,) = arms
            lab = _label(labels, c["id"])
            by_item.setdefault(key, {"gp": [], "ex": []})[arm].append(lab)
            if lab == "real":
                unique_real[arm] += 1
            if arm == "gp" and lab in ("real", "unsure"):
                misses += 1

    denom = shared + unique_real["gp"] + unique_real["ex"]
    recall = {LONG[a]: (shared + unique_real[a]) / denom if denom else None for a in ("gp", "ex")}

    spurious = {"general-purpose": 0, "Explore": 0}
    flips = {"general-purpose": 0, "Explore": 0}
    for r in items:
        actual, cf = r["classification"]["actual"]["asks"], r["classification"]["with_explore"]["asks"]
        labs = by_item.get(key_of(r), {"gp": [], "ex": []})
        if cf and not actual:
            flips["Explore"] += 1
            if all(lab != "real" for lab in labs["ex"]):
                spurious["Explore"] += 1
        if actual and not cf:
            flips["general-purpose"] += 1
            if all(lab == "not real" for lab in labs["gp"]):
                spurious["general-purpose"] += 1

    def arm_stat(arm, f):
        return [f(r["arms"][arm]) for r in items]

    malformed = {a: sum(arm_stat(a, lambda x: bool(x["first_malformed"] or x["dead"]))) for a in ARMS}
    final_malformed = {a: sum(arm_stat(a, lambda x: bool(x.get("final_malformed") or x["dead"])))
                       for a in ARMS}
    median_tokens = {}
    for a in ARMS:
        toks = [t for t in arm_stat(a, lambda x: x.get("tokens")) if t is not None]
        median_tokens[a] = statistics.median(toks) if toks else None

    return {"n": len(items), "shared": shared, "unique_real": {LONG[a]: v for a, v in unique_real.items()},
            "misses": misses, "recall": recall, "amber_flips": flips, "spurious_ambers": spurious,
            "malformed": malformed, "final_malformed": final_malformed, "median_tokens": median_tokens}


def decide(m):
    if m["n"] < TARGET:
        raise ValueError(f"only {m['n']} items; the rule needs {TARGET}")
    gp_tok, ex_tok = m["median_tokens"]["general-purpose"], m["median_tokens"]["Explore"]
    if gp_tok is None or ex_tok is None:
        raise ValueError("token usage missing for an arm; cannot apply rule 4")
    checks = [
        (m["misses"] <= 1, f"1. misses {m['misses']} <= 1"),
        (m["spurious_ambers"]["Explore"] <= m["spurious_ambers"]["general-purpose"],
         f"2. spurious AMBERs Explore {m['spurious_ambers']['Explore']} <= "
         f"general-purpose {m['spurious_ambers']['general-purpose']}"),
        (m["malformed"]["Explore"] <= m["malformed"]["general-purpose"] + 1,
         f"3. malformed Explore {m['malformed']['Explore']} <= "
         f"general-purpose {m['malformed']['general-purpose']} + 1"),
        (ex_tok <= 0.70 * gp_tok, f"4. median tokens Explore {ex_tok:.0f} <= 0.70 x {gp_tok:.0f}"),
    ]
    return all(ok for ok, _ in checks), [("PASS " if ok else "FAIL ") + why for ok, why in checks]


def sheet_rows(clusters, concerns):
    rows, key = [], {}
    for k in sorted(clusters):
        slug, item = k.split("|", 1)
        rng = random.Random(f"{SEED}|{k}")
        gp_is_a = rng.random() < 0.5
        unique = [c for c in clusters[k] if len(set(c["arms"])) == 1]
        rng.shuffle(unique)
        for c in unique:
            arm = c["arms"][0]
            text = " // ".join(concerns[k][m]["text"] for m in c["members"])
            rows.append({"row": c["id"], "batch": slug, "item": item,
                         "lens": "A" if (arm == "gp") == gp_is_a else "B",
                         "concern": text, "label": ""})
            key[c["id"]] = LONG[arm]
    return rows, key


# ---------- I/O ----------

def final_concerns(rec):
    """Neutral-id concerns for one item, shuffled so ids carry no arm order."""
    found = []
    for arm in ARMS:
        a = rec["arms"][arm]
        v = None if a["dead"] else parse_verdict(a["replies"][-1])
        if v:
            for field in ("ambiguities", "blocking_constraints"):
                found += [{"arm": SHORT[arm], "field": field, "text": t} for t in v[field]]
    random.Random(f"{SEED}|ids|{key_of(rec)}").shuffle(found)
    return {f"c{i + 1}": c for i, c in enumerate(found)}


def call_judge(concerns):
    prompt = JUDGE_PROMPT.format(concerns="\n".join(f"{cid}: {c['text']}" for cid, c in concerns.items()))
    p = subprocess.run(
        ["claude", "-p", prompt, "--model", JUDGE_MODEL, "--effort", JUDGE_EFFORT,
         "--json-schema", json.dumps(JUDGE_SCHEMA), "--output-format", "json",
         "--no-session-persistence", "--strict-mcp-config", "--disable-slash-commands", "--tools", ""],
        cwd=OUT, capture_output=True, text=True, timeout=1800, stdin=subprocess.DEVNULL)
    try:
        return json.loads(p.stdout).get("structured_output")
    except json.JSONDecodeError:
        return None


def cmd_cluster():
    OUT.mkdir(parents=True, exist_ok=True)
    store_path = OUT / "clusters.json"
    store = json.loads(store_path.read_text()) if store_path.exists() else {}
    for rec in read(LOG):
        k = key_of(rec)
        if k in store:
            continue
        concerns = final_concerns(rec)
        if not concerns:
            store[k] = {"concerns": {}, "clusters": []}
        else:
            for attempt in (1, 2):
                out = call_judge(concerns)
                ids = [i for c in (out or {}).get("clusters", []) for i in c["ids"]]
                if out and sorted(ids) == sorted(concerns):
                    break
                print(f"{k}: judge returned a non-partition (attempt {attempt})", file=sys.stderr)
            else:
                sys.exit(f"{k}: judge failed twice — rerun `cluster` to retry this item")
            cls = []
            for n, c in enumerate(out["clusters"]):
                cls.append({"id": f"{k}#{n}", "members": c["ids"], "gist": c["gist"],
                            "arms": sorted({concerns[i]["arm"] for i in c["ids"]})})
            store[k] = {"concerns": concerns, "clusters": cls}
        store_path.write_text(json.dumps(store, indent=1))
        print(f"clustered {k}")
    print(f"{len(store)} item(s) clustered -> {store_path}")


def load_store():
    store = json.loads((OUT / "clusters.json").read_text())
    return ({k: v["clusters"] for k, v in store.items()}, {k: v["concerns"] for k, v in store.items()})


def cmd_sheet():
    clusters, concerns = load_store()
    rows, key = sheet_rows(clusters, concerns)
    with (OUT / "sheet.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["row", "batch", "item", "lens", "concern", "label"])
        w.writeheader(); w.writerows(rows)
    (OUT / "key.json").write_text(json.dumps(key, indent=1))
    print(f"{len(rows)} row(s) to label in {OUT / 'sheet.csv'} — fill `label` with real / not real / unsure")


def cmd_report():
    clusters, _ = load_store()
    labels = {}
    with (OUT / "sheet.csv").open() as f:
        for r in csv.DictReader(f):
            lab = LABELS.get(r["label"].strip().lower())
            if lab:
                labels[r["row"]] = lab
    items = read(LOG)
    m = metrics(items, {key_of(r): clusters.get(key_of(r), []) for r in items}, labels)
    adopt, reasons = decide(m)
    latest = {}
    for o in read(OUTCOMES):
        latest[f"{o['slug']}|{o['item']}"] = o
    lines = ["# INFRA-724 Skeptic shadow — report", "",
             f"**Decision: {'ADOPT Explore' if adopt else 'KEEP general-purpose'}**", ""]
    lines += [f"- {r}" for r in reasons]
    lines += ["", "## Metrics", "```", json.dumps(m, indent=1), "```", "", "## Rescope signals", "",
              "| batch | item | outcome | scoped | asks (actual / Explore) |", "|---|---|---|---|---|"]
    for r in items:
        o = latest.get(key_of(r), {})
        c = r["classification"]
        lines.append(f"| {r['slug']} | {r['item']} | {o.get('state', '—')} | {o.get('scoped', '—')} | "
                     f"{int(c['actual']['asks'])} / {int(c['with_explore']['asks'])} |")
    (OUT / "report.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    cmds = {"cluster": cmd_cluster, "sheet": cmd_sheet, "report": cmd_report}
    if len(sys.argv) != 2 or sys.argv[1] not in cmds:
        sys.exit("usage: score.py cluster | sheet | report")
    cmds[sys.argv[1]]()
