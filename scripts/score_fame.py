#!/usr/bin/env python3
"""
Score how well known each Tang poet and poem is, so the app can show
familiar work first.

Input:
- prisma/data/cleaned/tang/poems.json, poets.json  (from clean_tang_data.py)
- prisma/data/cleaned/tang/poet_wikidata.json      (from match_wikidata_poets.py)

Output:
- poets.json and poems.json, rewritten in place with a 0-100 `fame` field
  (and the poet's inputs in `fameSignals`)
- prisma/data/audit/tang/fame_top.json  the top poets and poems, to check
  the ranking by eye

Poets are scored first, then poems, using the poet's score as a prior:
a poem's own evidence (anthologies, star count) should decide where there
is some, and the poet's fame orders the poems that have none.

Safe to re-run: it reads its inputs fresh and overwrites `fame` each time.
"""

import math
import json
from collections import defaultdict
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "prisma" / "data"
CLEANED_DIR = DATA_DIR / "cleaned" / "tang"
AUDIT_DIR = DATA_DIR / "audit" / "tang"

UNKNOWN_POET_NAME = "佚名"
TOP_N = 100


def score_conversion(score: int, cap: int) -> float:
    """Log-scale a count to 0-1, saturating at `cap` (counts above it give 1.0)."""
    converted = math.log1p(score) / math.log1p(cap)
    return min(1.0, converted)


def poet_signals(poems: list[dict], wikidata: dict) -> dict[str, dict]:
    """Collect each poet's fame inputs from their poems and Wikidata match."""
    signals: dict[str, dict] = defaultdict(
        lambda: {"sitelinks": 0, "anthologyPoems": 0, "starsTotal": 0, "starsMax": 0}
    )
    for poem in poems:
        s = signals[poem["poetName"]]
        fs = poem["fameSignals"]
        s["anthologyPoems"] += fs["in_tang300"] or fs["in_qianjia"]
        s["starsTotal"] += fs["gushiwen_stars"]
        s["starsMax"] = max(s["starsMax"], fs["gushiwen_stars"])
    for name, match in wikidata.items():
        signals[name]["sitelinks"] = match["sitelinks"]
    return signals


def poet_fame(name: str, signals: dict) -> float:
    """
    Fame for a poet, a float from 0 to 100 (stored unrounded, for sorting).

    signals = {
        "sitelinks":      int,  # Wikipedia editions with an article on them
                                # (李白 199, 杜甫 139; 0 if unmatched). Fame
                                # as a person: 玄奘 77, 李渊 53, 空海 49
        "anthologyPoems": int,  # their poems in 唐诗三百首 or 千家诗
                                # (杜甫 ~60, 李白 ~55; most poets 0)
        "starsTotal":     int,  # sum of 古诗文网 stars over their poems
                                # (李白 227,760; 易静 0)
        "starsMax":       int,  # stars of their best-known poem
                                # (张若虚 21,548 from 3 poems)
    }
    """
    MAX_SITELINKS = 200
    MAX_ANTHOLOGY_POEMS = 60
    MAX_STARS_TOTAL = 230000
    MAX_STARS_MAX = 33000

    if name == UNKNOWN_POET_NAME:
        return 0

    score_sl = score_conversion(signals["sitelinks"], MAX_SITELINKS)
    score_ap = score_conversion(signals["anthologyPoems"], MAX_ANTHOLOGY_POEMS)
    score_st = score_conversion(signals["starsTotal"], MAX_STARS_TOTAL)
    score_sm = score_conversion(signals["starsMax"], MAX_STARS_MAX)

    score_poem = score_ap + (score_st + score_sm) / 2

    return (score_poem + (score_poem * score_sl) / 2) * 100 / 3


def poem_fame(signals: dict, poet_score: int) -> int:
    """
    0-100 fame for a poem, given its own signals and its poet's fame.

    signals = {
        "in_tang300":     bool,  # poem is in 唐诗三百首 (355 poems)
        "in_qianjia":     bool,  # poem is in 千家诗 (140 poems)
        "gushiwen_stars": int,   # 古诗文网 reader votes: 0 for ~15,000
                                 # unmatched poems, median 1, 173 poems
                                 # >= 1,000, max 32,615 (将进酒)
    }
    poet_score is poet_fame() for this poem's poet.
    """
    return 0


def main() -> None:
    poems = json.loads((CLEANED_DIR / "poems.json").read_text(encoding="utf-8"))
    poets = json.loads((CLEANED_DIR / "poets.json").read_text(encoding="utf-8"))
    wikidata = json.loads(
        (CLEANED_DIR / "poet_wikidata.json").read_text(encoding="utf-8")
    )

    signals = poet_signals(poems, wikidata)
    poet_scores = {}
    for poet in poets:
        name = poet["name"]
        poet_scores[name] = poet_fame(name, signals[name])
        poet["fame"] = poet_scores[name]
        poet["fameSignals"] = signals[name]

    for poem in poems:
        poem["fame"] = poem_fame(poem["fameSignals"], poet_scores[poem["poetName"]])

    for name, data in (("poets.json", poets), ("poems.json", poems)):
        write_json(CLEANED_DIR / name, data)

    top = {
        "poets": [
            {"name": p["name"], "fame": p["fame"], **p["fameSignals"]}
            for p in sorted(poets, key=lambda p: -p["fame"])[:TOP_N]
        ],
        "poems": [
            {
                "title": p["title"],
                "poet": p["poetName"],
                "fame": p["fame"],
                **p["fameSignals"],
            }
            for p in sorted(poems, key=lambda p: -p["fame"])[:TOP_N]
        ],
    }
    write_json(AUDIT_DIR / "fame_top.json", top)

    print(f"Scored {len(poets):,} poets and {len(poems):,} poems")
    for label, items in (("poets", poets), ("poems", poems)):
        scores = sorted((i["fame"] for i in items), reverse=True)
        distinct = len(set(scores))
        print(
            f"  {label}: max {scores[0]}, median {scores[len(scores) // 2]}, "
            f"{sum(s > 0 for s in scores):,} above 0, {distinct} distinct scores"
        )


def write_json(path: Path, data) -> None:
    # Atomic: poems.json is the seed input, so a crash mid-write must not
    # leave it truncated.
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


if __name__ == "__main__":
    main()
