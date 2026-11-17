#!/usr/bin/env python3
"""
Clean raw Tang poetry data (from github.com/chinese-poetry/chinese-poetry)
into the JSON shape the seed script expects.

- Strips the editorial apparatus (notes, variant readings, footnote
  markers) from titles and content; see scripts/tang_cleaning.py. Stripped
  notes are kept per poem in `notes` rather than discarded.
- Folds the many "author unknown" placeholders (不詳, 無名氏, 缺名, ...)
  into a single 佚名 poet.
- Dedupes poems by a hash of the *cleaned* Simplified content (same as
  prisma/seed.ts computes), so copies that differ only in notes collapse.
- Converts title/content/poet bios to Simplified Chinese for display.
- Records per-poem fame evidence in `fameSignals`: membership in curated
  anthologies (唐诗三百首, 千家诗) and 古诗文网 reader star counts (from the
  older dataset in prisma/data/raw/LCPoetry*.json). The scores themselves
  are computed later by score_fame.py, which also needs the Wikidata
  sitelinks from match_wikidata_poets.py. The rank/ search-hit counts are
  no longer used: they come from unquoted title+author searches, so generic
  titles like 句 or 又歌 score 10^8 while 登鸛雀樓 scores ~2000 on Baidu.
  `stars` stays a pure in-app favorite counter.

Input:  prisma/data/raw/tang/
Output: prisma/data/cleaned/tang/   seed input (poets, poems, dynasties, tags)
        prisma/data/audit/tang/     manual-review reports (review, author_list)
"""

import hashlib
import json
import re
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path

import opencc

from tang_cleaning import (
    MISSING_GLYPH,
    UNKNOWN_POET_NAME,
    clean_content,
    clean_title,
    first_line_key,
    normalize_author,
)

RAW_DIR = Path(__file__).parent.parent / "prisma" / "data" / "raw" / "tang"
# The older 古诗文网 scrape, used only for its star counts.
GUSHIWEN_DIR = RAW_DIR.parent
OUT_DIR = Path(__file__).parent.parent / "prisma" / "data" / "cleaned" / "tang"
AUDIT_DIR = Path(__file__).parent.parent / "prisma" / "data" / "audit" / "tang"

DYNASTY_NAME = "唐"

t2s = opencc.OpenCC("t2s")


def load_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_poets():
    """
    Returns (poets_by_simplified_name, known_authors, alternative_names).

    alternative_names maps each simplified poet name to the raw names that
    were merged into it; it's only written to the audit file, not poets.json.

    authors.tang.json has duplicate entries for the same poet under
    different script/variant spellings (e.g. both '韓愈' and '韩愈', one
    with a full bio and one blank). Converting to Simplified surfaces
    these as literal name collisions, so poets are deduped by simplified
    name here, keeping whichever duplicate has the fullest bio.
    Placeholder "poets" like 不詳 are folded into 佚名.
    """
    authors = load_json(RAW_DIR / "authors.tang.json")
    known_authors = {a["name"] for a in authors}

    groups: dict[str, list] = {}
    for a in authors:
        canonical = normalize_author(a["name"], known_authors)
        groups.setdefault(t2s.convert(canonical), []).append(a)

    poets = {}
    alternative_names: dict[str, list[str]] = {}
    for simplified_name, entries in groups.items():
        best = max(entries, key=lambda a: len(a.get("desc") or ""))
        poets[simplified_name] = {
            "name": simplified_name,
            "introduction": t2s.convert(best["desc"]) if best.get("desc") else None,
            "dynasty": DYNASTY_NAME,
        }
        alternative_names[simplified_name] = [e["name"] for e in entries]

    # Always present, even if no authors.tang.json entry normalizes to it,
    # since unattributed poems fall back to it. Overwrites the merged entry
    # so 佚名 never inherits a placeholder's (e.g. 不詳's) bio.
    alternative_names.setdefault(UNKNOWN_POET_NAME, [])
    poets[UNKNOWN_POET_NAME] = {
        "name": UNKNOWN_POET_NAME,
        "introduction": None,
        "dynasty": DYNASTY_NAME,
    }
    return poets, known_authors, alternative_names


def load_poems() -> list:
    poem_files = sorted(
        (RAW_DIR / "poems").glob("poet.tang.*.json"),
        key=lambda p: int(p.stem.split(".")[-1]),
    )
    poems = []
    for poem_file in poem_files:
        poems.extend(load_json(poem_file))
    return poems


def simplified_key(paragraphs: list[str]) -> str:
    content, _ = clean_content(paragraphs)
    return first_line_key(t2s.convert(content))


def load_anthologies(known_authors: set[str]) -> list[dict]:
    """
    Returns one dict per anthology poem: anthology, id, poet, first-line
    key, tags.
    """
    entries = []

    for item in load_json(RAW_DIR / "唐诗三百首.json"):
        entries.append(
            {
                "anthology": "唐诗三百首",
                "id": item.get("id"),
                "poet": t2s.convert(
                    normalize_author(item.get("author"), known_authors)
                ),
                "key": simplified_key(item.get("paragraphs", [])),
                "tags": item.get("tags", []),
            }
        )

    qjs_path = RAW_DIR / "千家诗.json"
    if qjs_path.exists():
        for section in load_json(qjs_path)["content"]:
            for item in section["content"]:
                author = item.get("author", "")
                if not author.startswith("（唐）"):
                    continue
                poet = t2s.convert(
                    normalize_author(author.removeprefix("（唐）"), known_authors)
                )
                paragraphs = item.get("paragraphs", [])
                # Multi-part poems nest each part (其一, 其二) as a dict;
                # 全唐诗 stores each part as its own poem, so key each one.
                parts = [
                    p["paragraphs"] for p in paragraphs if isinstance(p, dict)
                ] or [paragraphs]
                for part in parts:
                    entries.append(
                        {
                            "anthology": "千家诗",
                            "id": None,
                            "poet": poet,
                            "key": simplified_key(part),
                            "tags": [],
                        }
                    )
    else:
        print("  warning: 千家诗.json missing -- run scripts/fetch_tang_data.py")

    return entries


def load_gushiwen_stars(known_authors: set[str]) -> list[dict]:
    """
    Star counts from the older 古诗文网 dataset (prisma/data/raw/LCPoetry*.json),
    as entries in the same shape as load_anthologies(), plus `stars`.

    Stars are 古诗文网 readers' votes, so they measure modern familiarity
    (将进酒 32,615; median 1), unlike anthology membership. Only the star count
    is used; the site's translations and commentary are not carried over.
    """
    poet_files = sorted(GUSHIWEN_DIR.glob("LCPoetry*.json"))
    if not poet_files:
        print("  warning: no LCPoetry*.json in prisma/data/raw -- gushiwen_stars will be 0")
        return []
    poet_names = {
        p["objectId"]: p["name"] for p in load_json(GUSHIWEN_DIR / "LCPoet.json")
    }

    entries = []
    for path in poet_files:
        for item in load_json(path):
            # 全唐诗 includes Five Dynasties poets (李煜, 和凝), so 五代 counts too.
            if item.get("dynasty") not in ("唐代", "五代"):
                continue
            poet = poet_names.get((item.get("poet") or {}).get("objectId"))
            lines = item.get("content", "").split("\n")
            # Skip a leading prose preface (琵琶行's 元和十年，予左迁…): 全唐诗
            # moves it to the notes, so the verse starts on a later line. A
            # line of verse here is at most two 7-character couplets (32
            # characters with punctuation). Blank lines after it go too.
            while len(lines) > 1 and (
                not lines[0].strip() or len(lines[0].strip()) > 32
            ):
                lines = lines[1:]
            entries.append(
                {
                    "anthology": "古诗文网",
                    "id": None,
                    "poet": t2s.convert(normalize_author(poet, known_authors)),
                    "key": simplified_key(lines),
                    "tags": [],
                    "stars": item.get("star") or 0,
                }
            )
    return entries


class AnthologyMatcher:
    """
    Finds the anthology entries a 全唐诗 poem corresponds to.

    Matching is by first line, not title: 千家诗 titles 春曉 as "春眠" and
    files 渭城曲 as 送元二使安西. Exact first-line match first; failing
    that, a same-poet fuzzy match, because anthologies carry textual
    variants (异文) -- 全唐诗 has 李白's 静夜思 as 床前看月光, the
    anthologies have 床前明月光.
    """

    FUZZY_THRESHOLD = 0.75

    def __init__(self, entries: list[dict]):
        self.by_id = {e["id"]: e for e in entries if e["id"]}
        self.by_key: dict[str, list[dict]] = {}
        self.by_poet: dict[str, list[dict]] = {}
        for e in entries:
            self.by_key.setdefault(e["key"], []).append(e)
            self.by_poet.setdefault(e["poet"], []).append(e)

    def match(self, poem_id: str | None, key: str, poet: str) -> list[dict]:
        found = {id(e): e for e in self.by_key.get(key, [])}
        if poem_id in self.by_id:
            e = self.by_id[poem_id]
            found[id(e)] = e
        matched_anthologies = {e["anthology"] for e in found.values()}
        # SequenceMatcher caches its analysis of seq2, so the poem's key goes
        # there and each candidate in seq1. The cheap upper bounds
        # (real_quick_ratio, quick_ratio) skip most candidates before the
        # full ratio(), which matters for poets with ~1,000 古诗文网 entries.
        matcher = SequenceMatcher(None)
        matcher.set_seq2(key)
        threshold = self.FUZZY_THRESHOLD
        for e in self.by_poet.get(poet, []):
            if e["anthology"] in matched_anthologies or len(key) < 8:
                continue
            matcher.set_seq1(e["key"])
            if (
                matcher.real_quick_ratio() >= threshold
                and matcher.quick_ratio() >= threshold
                and matcher.ratio() >= threshold
            ):
                found[id(e)] = e
        return list(found.values())


def choose_attribution(copies: list[dict]) -> tuple[dict, str]:
    """
    Pick the copy to keep among identical poems (same contentHash).

    全唐诗 often prints one poem under two poets (互见诗): 登鹳雀楼 under
    王之涣 and, as 登楼, under 朱斌. Keeping the first copy in corpus order
    showed 登鹳雀楼 as 朱斌's. Each copy is scored by evidence for *its*
    attribution, strongest first:

    1. an anthology lists the poem under this copy's poet;
    2. 古诗文网 lists it under this poet (higher star count wins);
    3. a named poet beats 佚名.

    Ties keep the first copy, as before. Returns (copy, reason).
    """
    def evidence(copy: dict) -> tuple[bool, int, bool]:
        poet = copy["poet"]
        own_anthology = any(e["poet"] == poet for e in copy["matches"])
        own_stars = max(
            (e["stars"] for e in copy["star_matches"] if e["poet"] == poet), default=0
        )
        return own_anthology, own_stars, poet != UNKNOWN_POET_NAME

    scores = [evidence(c) for c in copies]
    best = max(range(len(copies)), key=lambda i: scores[i])  # first max wins ties
    if best == 0:
        return copies[0], "first copy"
    own_anthology, own_stars, _ = scores[best]
    if own_anthology:
        return copies[best], "anthology"
    return copies[best], "古诗文网" if own_stars else "named poet"


def main():
    print("Loading poets...")
    poets, known_authors, alternative_names = load_poets()
    print(f"  {len(poets)} poets (incl. fallback '{UNKNOWN_POET_NAME}')")

    print("Loading poems...")
    raw_poems = load_poems()
    print(f"  {len(raw_poems)} raw poem entries")

    print("Loading anthologies...")
    anthology_entries = load_anthologies(known_authors)
    matcher = AnthologyMatcher(anthology_entries)
    for name, count in Counter(e["anthology"] for e in anthology_entries).items():
        print(f"  {name}: {count} Tang poems")
    matched_entries = set()

    print("Loading 古诗文网 star counts...")
    star_entries = load_gushiwen_stars(known_authors)
    # A separate matcher: these aren't anthologies, so they must not feed
    # the anthology tags.
    star_matcher = AnthologyMatcher(star_entries)
    print(f"  {len(star_entries)} Tang and Five Dynasties poems")
    matched_star_entries = set()

    cleaned_poems = []
    stats = Counter()
    tag_set = set()
    review = []  # poems whose cleaned text still looks suspicious
    attributions = []  # duplicate groups credited to more than one poet

    # Pass 1: clean every copy and group identical poems by contentHash
    # (dicts keep insertion order, so groups stay in corpus order).
    groups: dict[str, list[dict]] = {}
    for poem in raw_poems:
        title, title_notes = clean_title(poem.get("title", ""))
        content, content_notes = clean_content(poem.get("paragraphs", []))
        if not content:
            stats["empty"] += 1
            continue

        title, content = t2s.convert(title), t2s.convert(content)
        poet_name = t2s.convert(normalize_author(poem.get("author"), known_authors))
        unrecognized = poet_name not in poets
        if unrecognized:
            poet_name = UNKNOWN_POET_NAME

        key = first_line_key(content)
        groups.setdefault(content_hash(content), []).append(
            {
                "raw_title": poem.get("title", ""),
                "title": title,
                "title_notes": title_notes,
                "content": content,
                "content_notes": content_notes,
                "poet": poet_name,
                "unrecognized": unrecognized,
                "matches": matcher.match(poem.get("id"), key, poet_name),
                "star_matches": star_matcher.match(None, key, poet_name),
            }
        )

    # Pass 2: one poem per group, from the copy whose attribution has the
    # most evidence (see choose_attribution).
    for c_hash, copies in groups.items():
        stats["duplicates"] += len(copies) - 1
        copy, reason = choose_attribution(copies)
        other_poets = sorted(
            {(c["poet"], c["title"]) for c in copies if c["poet"] != copy["poet"]}
        )
        if other_poets:
            attributions.append(
                {
                    "kept": {"poet": copy["poet"], "title": copy["title"]},
                    "reason": reason,
                    "others": [{"poet": p, "title": t} for p, t in other_poets],
                    "content": copy["content"][:60],
                }
            )
            stats["reattributed"] += reason != "first copy"

        title, content, poet_name = copy["title"], copy["content"], copy["poet"]
        title_notes, content_notes = copy["title_notes"], copy["content_notes"]
        stats["unrecognized_author"] += copy["unrecognized"]
        if poet_name == UNKNOWN_POET_NAME:
            stats["unknown_author"] += 1

        matches = copy["matches"]
        # A first line matched under another poet is usually 互见诗, one poem
        # credited to two poets (朱斌's 登楼 is 王之涣's 登鹳雀楼). The stars
        # belong to the attribution readers know, so they're kept only if the
        # entry's poet is this poet, or not a local poet at all (a spelling
        # variant such as 顾夐 for 顾敻). An entry with no poet on 古诗文网
        # (normalized to 佚名) says nothing about attribution, so it's kept.
        star_matches = [
            e
            for e in copy["star_matches"]
            if e["poet"] in (poet_name, UNKNOWN_POET_NAME) or e["poet"] not in poets
        ]
        matched_star_entries.update(id(e) for e in star_matches)
        matched_entries.update(id(e) for e in matches)
        in_anthology = {e["anthology"] for e in matches}
        anthology_tags = sorted({t for e in matches for t in e["tags"]})
        tag_set.update(anthology_tags)

        signals = {
            "in_tang300": "唐诗三百首" in in_anthology,
            "in_qianjia": "千家诗" in in_anthology,
            # The site sometimes lists a poem twice; take the higher count.
            "gushiwen_stars": max((e["stars"] for e in star_matches), default=0),
        }
        stats["with_stars"] += signals["gushiwen_stars"] > 0
        stats["in_tang300"] += signals["in_tang300"]
        stats["in_qianjia"] += signals["in_qianjia"]

        notes = [t2s.convert(n) for n in title_notes + content_notes]
        # Keep the other attributions rather than silently dropping them.
        notes += [f"互见{p}《{t}》" for p, t in other_poets]
        stats["title_cleaned"] += bool(title_notes) or title != t2s.convert(
            copy["raw_title"]
        )
        stats["content_notes_stripped"] += bool(content_notes)

        missing_ratio = content.count(MISSING_GLYPH) / len(content)
        # 《》 is legitimate in verse (童子解吟《长恨曲》), so not checked.
        leftover = re.findall(r"[〖〗\[\]{}（）]", title + content)
        if missing_ratio > 0.2 or leftover or len(re.sub(r"\W", "", content)) < 10:
            review.append(
                {
                    "title": title,
                    "poet": poet_name,
                    "missingRatio": round(missing_ratio, 2),
                    "leftoverMarkers": "".join(sorted(set(leftover))),
                    "content": content[:120],
                }
            )

        cleaned_poems.append(
            {
                "title": title,
                "content": content,
                "contentHash": c_hash,
                "poetName": poet_name,
                "dynasty": DYNASTY_NAME,
                "type": "shi",
                "tags": anthology_tags,
                "notes": notes,
                "fameSignals": signals,  # scored by score_fame.py
            }
        )

    poem_count = Counter(p["poetName"] for p in cleaned_poems)
    authors_list = [
        {
            "name": name,
            "alternativeNames": alternative_names[name],
            "poemCount": poem_count[name],
        }
        for name in poets
    ]
    authors_list.sort(key=lambda a: a["poemCount"], reverse=True)

    print(
        f"  {len(cleaned_poems)} unique poems "
        f"({stats['duplicates']} duplicates, {stats['empty']} empty after cleaning)"
    )
    print(
        f"  {len(attributions)} duplicates credited to more than one poet; "
        f"{stats['reattributed']} kept a later copy on evidence"
    )
    print(
        f"  {stats['title_cleaned']} titles cleaned, "
        f"{stats['content_notes_stripped']} poems had notes stripped from content"
    )
    print(
        f"  {stats['unknown_author']} poems attributed to '{UNKNOWN_POET_NAME}' "
        f"({stats['unrecognized_author']} because the author wasn't in authors.tang.json)"
    )
    print(
        f"  {stats['in_tang300']} poems matched 唐诗三百首, {stats['in_qianjia']} matched 千家诗; "
        f"{len(anthology_entries) - len(matched_entries)} anthology entries found no poem"
    )
    print(
        f"  {stats['with_stars']} poems matched 古诗文网 star counts; "
        f"{len(star_entries) - len(matched_star_entries)} 古诗文网 poems found no poem"
    )
    print(f"  {len(review)} poems flagged for manual review")

    def write(directory: Path, name: str, data):
        directory.mkdir(parents=True, exist_ok=True)
        (directory / name).write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    # Seed input only -- everything in OUT_DIR is meant to be loaded.
    write(OUT_DIR, "poets.json", list(poets.values()))
    write(OUT_DIR, "poems.json", cleaned_poems)
    write(OUT_DIR, "dynasties.json", [DYNASTY_NAME])
    write(OUT_DIR, "tags.json", sorted(tag_set))

    # Reports for manual review; never loaded into the DB.
    write(AUDIT_DIR, "review.json", review)
    write(AUDIT_DIR, "author_list.json", authors_list)
    # Changed decisions first: those are the ones worth checking.
    attributions.sort(key=lambda a: a["reason"] == "first copy")
    write(AUDIT_DIR, "duplicate_attributions.json", attributions)

    print(f"\nSaved cleaned data to {OUT_DIR}")
    print(f"Saved audit reports to {AUDIT_DIR}")


if __name__ == "__main__":
    main()
