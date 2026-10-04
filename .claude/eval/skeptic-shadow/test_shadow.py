"""Tests for the INFRA-724 Skeptic shadow: log validation and the pre-registered decision rule.

Run: python3 -m unittest discover -s .claude/eval/skeptic-shadow
"""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import shadowlog  # noqa: E402
import score  # noqa: E402

VALID = {
    "approach": "a", "confidence": "high", "blocking_constraints": [], "ambiguities": ["x"],
    "files_touched": ["f.ts"], "declared_deps": [],
}


class ValidateVerdict(unittest.TestCase):
    def test_pure_json_is_valid(self):
        self.assertIsNotNone(shadowlog.parse_verdict(json.dumps(VALID)))

    def test_fenced_json_is_valid(self):
        self.assertIsNotNone(shadowlog.parse_verdict("```json\n" + json.dumps(VALID) + "\n```"))

    def test_prose_around_json_is_malformed(self):
        self.assertIsNone(shadowlog.parse_verdict("Here is my verdict:\n" + json.dumps(VALID)))

    def test_missing_key_is_malformed(self):
        v = dict(VALID); del v["ambiguities"]
        self.assertIsNone(shadowlog.parse_verdict(json.dumps(v)))

    def test_bad_confidence_is_malformed(self):
        self.assertIsNone(shadowlog.parse_verdict(json.dumps(dict(VALID, confidence="very"))))

    def test_non_string_list_member_is_malformed(self):
        self.assertIsNone(shadowlog.parse_verdict(json.dumps(dict(VALID, ambiguities=[{"a": 1}]))))


class Append(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.log = self.tmp / "log.jsonl"
        self.prompt = self.tmp / "prompt.txt"; self.prompt.write_text("PROMPT")
        self.good = self.tmp / "good.txt"; self.good.write_text(json.dumps(VALID))
        self.bad = self.tmp / "bad.txt"; self.bad.write_text("not json")

    def arm(self, replies, dead=False):
        return {"replies": [p.read_text() for p in replies], "usage": "100,3,2000", "dead": dead}

    def test_flags_are_computed_from_replies(self):
        rec = shadowlog.build_record(
            "s", "INFRA-1", "abc", self.prompt.read_text(),
            self.arm([self.bad, self.good]), self.arm([], dead=True), "GREEN:0", "AMBER:1")
        gp, ex = rec["arms"]["general-purpose"], rec["arms"]["Explore"]
        self.assertEqual((gp["first_malformed"], gp["final_malformed"], gp["dead"]), (True, False, False))
        self.assertEqual((ex["first_malformed"], ex["final_malformed"], ex["dead"]), (True, True, True))
        self.assertEqual(gp["tokens"], 100)
        self.assertEqual(rec["classification"]["with_explore"], {"tier": "AMBER", "asks": True})
        self.assertEqual(len(rec["prompt_sha256"]), 64)

    def test_duplicate_item_in_same_batch_is_refused(self):
        rec = shadowlog.build_record("s", "INFRA-1", "abc", "P", self.arm([self.good]),
                                     self.arm([self.good]), "GREEN:0", "GREEN:0")
        shadowlog.append(self.log, rec)
        with self.assertRaises(SystemExit):
            shadowlog.append(self.log, rec)
        self.assertEqual(shadowlog.count(self.log), 1)

    def test_count_of_missing_log_is_zero(self):
        self.assertEqual(shadowlog.count(self.tmp / "absent.jsonl"), 0)


def item(i, actual_asks=False, ex_asks=False, gp_tok=1000, ex_tok=500, gp_mal=False, ex_mal=False):
    return {
        "slug": "s", "item": f"INFRA-{i}",
        "arms": {
            "general-purpose": {"tokens": gp_tok, "first_malformed": gp_mal, "dead": False},
            "Explore": {"tokens": ex_tok, "first_malformed": ex_mal, "dead": False},
        },
        "classification": {"actual": {"tier": "AMBER" if actual_asks else "GREEN", "asks": actual_asks},
                            "with_explore": {"tier": "AMBER" if ex_asks else "GREEN", "asks": ex_asks}},
    }


def clusters(*rows):
    """rows: (key, arms, label) → per-item cluster list in score's shape, plus labels map."""
    out, labels = {}, {}
    for n, (key, arms, label) in enumerate(rows):
        cid = f"k{n}"
        out.setdefault(key, []).append({"id": cid, "arms": sorted(arms)})
        if label is not None:
            labels[cid] = label
    return out, labels


class Metrics(unittest.TestCase):
    def base(self, n=15, **kw):
        return [item(i, **kw) for i in range(n)]

    def test_misses_count_gp_only_real_and_unsure(self):
        cl, lab = clusters(("s|INFRA-0", ["gp"], "real"), ("s|INFRA-1", ["gp"], "unsure"),
                           ("s|INFRA-2", ["gp"], "not real"), ("s|INFRA-3", ["gp", "ex"], None))
        m = score.metrics(self.base(), cl, lab)
        self.assertEqual(m["misses"], 2)
        self.assertEqual(m["shared"], 1)

    def test_recall_counts_shared_as_real(self):
        cl, lab = clusters(("s|INFRA-0", ["gp", "ex"], None), ("s|INFRA-1", ["gp"], "real"),
                           ("s|INFRA-2", ["ex"], "real"), ("s|INFRA-3", ["ex"], "not real"))
        m = score.metrics(self.base(), cl, lab)
        self.assertAlmostEqual(m["recall"]["general-purpose"], 2 / 3)
        self.assertAlmostEqual(m["recall"]["Explore"], 2 / 3)

    def test_explore_amber_with_no_real_unique_concern_is_spurious(self):
        items = self.base()
        items[0] = item(0, ex_asks=True)   # flip into AMBER, unique concern labeled unsure
        items[1] = item(1, ex_asks=True)   # flip into AMBER, unique concern real → not spurious
        items[2] = item(2, ex_asks=True)   # flip with no unique concern at all → spurious
        cl, lab = clusters(("s|INFRA-0", ["ex"], "unsure"), ("s|INFRA-1", ["ex"], "real"))
        self.assertEqual(score.metrics(items, cl, lab)["spurious_ambers"]["Explore"], 2)

    def test_gp_amber_spurious_treats_unsure_as_real(self):
        items = self.base()
        items[0] = item(0, actual_asks=True)  # GP asked, Explore would not; GP-unique unsure
        items[1] = item(1, actual_asks=True)  # GP-unique not real → spurious
        cl, lab = clusters(("s|INFRA-0", ["gp"], "unsure"), ("s|INFRA-1", ["gp"], "not real"))
        self.assertEqual(score.metrics(items, cl, lab)["spurious_ambers"]["general-purpose"], 1)

    def test_unlabeled_unique_cluster_blocks_metrics(self):
        cl, lab = clusters(("s|INFRA-0", ["gp"], None))
        with self.assertRaises(ValueError):
            score.metrics(self.base(), cl, lab)

    def test_dead_counts_as_malformed(self):
        items = self.base()
        items[0]["arms"]["Explore"]["dead"] = True
        items[1]["arms"]["Explore"]["first_malformed"] = True
        m = score.metrics(items, {}, {})
        self.assertEqual(m["malformed"]["Explore"], 2)


class Decide(unittest.TestCase):
    def m(self, **over):
        base = {"n": 15, "misses": 1, "spurious_ambers": {"general-purpose": 0, "Explore": 0},
                "malformed": {"general-purpose": 0, "Explore": 1},
                "median_tokens": {"general-purpose": 1000, "Explore": 700}}
        base.update(over)
        return base

    def test_boundaries_adopt(self):
        adopt, reasons = score.decide(self.m())
        self.assertTrue(adopt, reasons)

    def test_two_misses_reject(self):
        self.assertFalse(score.decide(self.m(misses=2))[0])

    def test_more_spurious_ambers_reject(self):
        self.assertFalse(score.decide(self.m(spurious_ambers={"general-purpose": 0, "Explore": 1}))[0])

    def test_malformed_beyond_plus_one_reject(self):
        self.assertFalse(score.decide(self.m(malformed={"general-purpose": 0, "Explore": 2}))[0])

    def test_token_saving_under_30_percent_reject(self):
        self.assertFalse(score.decide(self.m(median_tokens={"general-purpose": 1000, "Explore": 701}))[0])

    def test_fewer_than_15_items_refuses(self):
        with self.assertRaises(ValueError):
            score.decide(self.m(n=14))


class Sheet(unittest.TestCase):
    def test_sheet_hides_arms_and_randomises_orientation(self):
        concerns = {}
        cl = {}
        for i in range(40):
            key = f"s|INFRA-{i}"
            concerns[key] = {"c0": {"arm": "gp", "text": "g"}, "c1": {"arm": "ex", "text": "e"}}
            cl[key] = [{"id": f"{key}#0", "arms": ["gp"], "members": ["c0"]},
                       {"id": f"{key}#1", "arms": ["ex"], "members": ["c1"]}]
        rows, key = score.sheet_rows(cl, concerns)
        self.assertEqual(len(rows), 80)
        flat = json.dumps(rows)
        self.assertNotIn("general-purpose", flat); self.assertNotIn("Explore", flat)
        self.assertNotIn('"gp"', flat); self.assertNotIn('"ex"', flat)
        gp_is_a = {r["item"] for r in rows if r["lens"] == "A" and key[r["row"]] == "general-purpose"}
        self.assertTrue(0 < len(gp_is_a) < 40)
        self.assertEqual(score.sheet_rows(cl, concerns), (rows, key))  # deterministic


if __name__ == "__main__":
    unittest.main()
