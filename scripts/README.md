# Data scripts

These scripts build the poetry dataset for Chinese Poetry Explorer. The current
pipeline covers **Tang poetry**. Its sources are:

- [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry):
  全唐诗 (Complete Tang Poems), 唐诗三百首 and 千家诗.
- [Wikidata](https://www.wikidata.org/): poet identifiers, portraits, dates and aliases.
- An older scrape of [古诗文网](https://www.gushiwen.cn/) (`prisma/data/raw/LCPoetry*.json`,
  not committed): only its per-poem reader star counts are used, as a fame signal.

```
fetch_tang_data.py ──► prisma/data/raw/tang/          raw downloads (not committed)
        │
clean_tang_data.py ──► prisma/data/cleaned/tang/      seed input (not committed)
        │          └─► prisma/data/audit/tang/        reports for manual review
        │                                             (incl. near_duplicates.json)
        │
match_wikidata_poets.py ─► cleaned/tang/poet_wikidata.json
        │              └─► audit/tang/wikidata_matches.json
        │
score_fame.py ───────► adds `fame` to cleaned/tang/poets.json and poems.json
        │          └─► audit/tang/fame_top.json
        │
prisma/seed.ts ──────► Postgres
```

## Setup

You need Python 3.10 or later, and one package for Traditional → Simplified conversion:

```bash
pip install opencc-python-reimplemented
```

Run every script from the repo root.

## 1. Fetch: `fetch_tang_data.py`

```bash
python3 scripts/fetch_tang_data.py
```

| Source | Saved as (`prisma/data/raw/tang/`) | Used for |
|---|---|---|
| `全唐诗/authors.tang.json` | `authors.tang.json` | poet names and bios |
| `全唐诗/poet.tang.*.json` (58 files) | `poems/poet.tang.*.json` | poems |
| `全唐诗/唐诗三百首.json` | `唐诗三百首.json` | fame signal |
| `蒙学/qianjiashi.json` | `千家诗.json` | fame signal (Tang entries only) |
| Wikidata SPARQL, [`queries/tang_poets.rq`](queries/tang_poets.rq) | `wikidata_tang_poets.json` | poet matching evidence (`isTangPoet`), portraits, dates |
| Wikidata SPARQL, [`queries/authors_by_name.rq`](queries/authors_by_name.rq), in batches | `wikidata_by_name/batch_NNN.json` | poet matching candidates, portraits, dates |

The script is safe to re-run:

- GitHub files are skipped if they already exist.
- Each Wikidata result stores a SHA-256 hash of the full query text it was
  produced by. Editing a `.rq` file, or a change in the author names that fill
  a batch, triggers a fresh query for the affected files only. To refresh
  unchanged data, delete the file. Batch files left over from a longer name
  list are removed.
- All files are written to a `.tmp` file first and then renamed, so an
  interrupted run never leaves a partial file that later runs would skip.

The Wikidata requests follow the
[User-Agent policy](https://meta.wikimedia.org/wiki/User-Agent_policy) and are
sent by POST, because a batch of names is too long for a URL.
Any failure raises a `WikidataQueryError` that says which stage failed:

- **transport:** an HTTP error or no connection;
- **content:** the response isn't valid SPARQL JSON results;
- **empty:** the query returned 0 rows.

An empty result is never cached.

### The Wikidata queries

There are two queries with different jobs. The by-name lookup provides
**coverage** (finding candidates), and the property query provides
**evidence** (Wikidata itself calls the item a Tang poet). Neither replaces
the other.

**`tang_poets.rq`** selects items with occupation *poet* (`P106 = Q49757`) and
country of citizenship *Tang dynasty* (`P27 = Q9683`). For each item it returns:

- label, falling back through `zh-hant → zh-hans → zh → mul → en`. Without the
  `zh`/`zh-hans` fallbacks, items labelled only in those variants came back with
  their QID as the label (33 items) and could never match by name;
- Chinese aliases (`zh`, `zh-hant`, `zh-hans`, with duplicates removed);
- portrait (`P18`);
- birth and death dates (`P569`, `P570`);
- `wikibase:sitelinks`, the number of Wikipedia editions with an article on the poet.

It currently returns about 2,900 items. On its own it misses many 全唐诗 poets,
because a missing statement on Wikidata excludes the item:

- no *poet* occupation: 貫休 is listed as painter, calligrapher and monk;
  吳筠 as a 道士;
- citizenship is a Five Dynasties and Ten Kingdoms state or 宋, not 唐:
  皮日休 (吳越國), 李中 (南唐), 徐鉉 (宋朝).

**`authors_by_name.rq`** turns the question around and looks up every local
author name. It is a template: `fetch_tang_data.py` fills its `{NAMES}`
placeholder with a `VALUES` list, 200 names per batch.

- **Names:** the raw author names after `normalize_author()` (the same rules
  as the cleaning step, so the spelling is cleaned but still Traditional).
  Each name is sent in its Traditional form and, if different, its
  Simplified form, because some items store Simplified text under a `zh-hant`
  or `zh` tag (王湾, not 王灣). Every form is sent under all three Chinese
  language tags, because `"貫休"@zh-hant` only matches labels tagged
  `zh-hant`. Names are escaped with `json.dumps`, so a name can't break the query.
- **Skipped names:** "surname + 氏" (王氏, 張氏) means "a woman née Wang", not a
  specific person, and matched thousands of items. Longer names such as
  閩后陳氏 are kept.
- **Match:** an item's label *or* an alias equals the name
  (`rdfs:label|skos:altLabel`). The search name is returned as `searchName`.
- **Filters:** humans only (`P31 = Q5`), because a name search also finds
  places (永安 is a town). A period filter drops items whose known dates rule
  out the era: born before 500 or after 1000, died before 580 or after 1100.
  Items without dates are kept: missing data is not evidence against them.

The by-name lookup can't catch variant characters (异体字): the source writes
龐藴, 陳彥, 胡証, and Wikidata stores 龐蘊, 陳彦, 胡證. `tang_poets.rq`
covers these, because its results are compared locally after `t2s` converts
both sides.

## 2. Clean: `clean_tang_data.py`

```bash
python3 scripts/clean_tang_data.py
```

The text-cleaning rules live in [`tang_cleaning.py`](tang_cleaning.py), and
`clean_tang_data.py` applies them to the whole dataset.

**Editorial markers.** The source keeps the 全唐诗 editors' notes in the text.
Each marker has a fixed meaning:

| Marker | Meaning | Handling |
|---|---|---|
| `（…）` | note or variant reading (一作…) | removed, kept in `notes` |
| `〖…〗` | footnote number or gloss | removed; glosses kept in `notes` |
| `[X]` | character supplied or corrected by the editors | brackets dropped, `X` kept |
| `[一]` | footnote reference | removed |
| `{…}` | description of a character with no Unicode codepoint | replaced with `□` |
| `●`, `□` | lost character | `□` |
| TAB in title | separates the title from a preface (小序) | preface moved to `notes` |

Notes are stripped after the paragraphs are joined, because a note often spans
several paragraph entries. Nested brackets are handled.

**Authors.**

- About a dozen "author unknown" placeholders are folded into a single **佚名**
  poet: 不詳, 無名氏, 缺名, 闕名, 失名, and others.
- Authors known only by a role or place, such as 江油令 or 天目僧, are
  deliberately kept as separate poets.
- Title-style names are renamed to the name the person is commonly known by,
  which is also their Wikidata label, so they can be matched:
  - **Emperors by temple name:** 太宗皇帝 and 太宗皇帝李世民 → 唐太宗, by one
    rule for all X宗皇帝 names (`^(.宗)皇帝(李..)?$`).
  - **Monks with a 僧 prefix:** 僧貫休 → 貫休, but only if the rest of the name
    is a known poet. 僧 ("monk") is a title in 僧貫休, but part of the name in
    僧鸞 or 僧可, which are kept.
  - **Everything irregular** is listed in `_AUTHOR_ALIASES`: 則天皇后 → 武則天,
    後主煜 → 李煜, 明皇帝 / 唐明皇 → 唐玄宗. The same table merges the
    same person listed under two names (李世民 → 唐太宗, 武曌 → 武則天).
- A few author fields name two people, such as 趙光逢、張衮 or 道鏡　善導 (the
  full-width space becomes 、). Most are 郊廟歌辭 hymns that the source credits
  to a group; they are kept as joint "poets" for now (see the checklist).

**Dedupe and attribution.** Poems are deduplicated by SHA-256 of the cleaned
Simplified content, the same `contentHash` that `prisma/seed.ts` computes.
Copies that differ only in their notes collapse into one.

全唐诗 often prints one poem under two poets (互见诗). Keeping the first copy in
corpus order showed 登鹳雀楼 as 朱斌's 登楼 and 寻隐者不遇 as 孙革's 访羊尊师.
So all copies are grouped by hash first, and `choose_attribution()` keeps the
copy whose poet has the most evidence:

1. an anthology lists the poem under that poet;
2. 古诗文网 lists it under that poet;
3. a named poet beats 佚名.

Without any evidence the first copy is kept, as before. The other
attributions are kept in the poem's `notes` (`互见朱斌《登楼》`).

**Fame signals.** The search-hit "rank" data was dropped because it measured how
common a title is, not how famous the poem is: generic titles like 句 scored far
above 登鸛雀樓. Each poem now records its evidence in `fameSignals`:

- `in_tang300`: the poem appears in 唐诗三百首;
- `in_qianjia`: the poem appears in 千家诗;
- `gushiwen_stars`: 古诗文网 reader votes for the poem (将进酒 32,615; median 1).
  These measure modern familiarity, while the anthologies measure the canon.
  Only the counts are used, not the site's translations or commentary.

The scores are computed later, by `score_fame.py`, because the poet score also
needs Wikidata sitelinks. `stars` in the app stays a pure count of user favorites.

Poems are matched to the anthologies and to 古诗文网 by their first sentence,
using CJK characters only. The key ends at the first 。？！ or line break, but
holds at least one five-character couplet, because a question can end
mid-couplet (何处秋风至？萧萧送鴈群。). A sentence rather than a line, because
sources break lines differently: 全唐诗 has one couplet per line, 古诗文网 often
two. When the exact key fails, a fuzzy match against the same poet's poems
(similarity ≥ 0.75) catches variant readings (异文), such as 床前看月光 vs.
床前明月光.

Two more rules apply to the 古诗文网 stars:

- A leading prose preface is skipped (琵琶行 starts with 元和十年，予左迁…),
  because 全唐诗 moves it to the notes.
- A match under a different poet is rejected if that poet is also a local
  poet, since it is the other attribution of a 互见 poem. Matches under a
  spelling variant (顾夐 for 顾敻) or with no poet are kept.

All text is converted to Simplified Chinese (OpenCC `t2s`) after cleaning.

### Outputs

`prisma/data/cleaned/tang/` (seed input):

- `poems.json`: one entry per poem, with these fields: `title`, `content`,
  `contentHash`, `poetName`, `dynasty`, `type`, `tags`, `notes` and
  `fameSignals` (`fame` is added by `score_fame.py`).
- `poets.json`: `name`, `introduction` (the longest bio among the duplicate
  entries) and `dynasty`.
- `dynasties.json`, `tags.json`.

`prisma/data/audit/tang/` (for manual review):

- `review.json`: poems that still need checking, for one of three reasons:
  more than 20% of their characters are `□`, leftover brackets, or fewer than
  10 characters of text.
- `author_list.json`: poets sorted by poem count, with every raw spelling that
  was folded into each one.
- `duplicate_attributions.json`: every duplicate credited to more than one
  poet, with the copy kept and the reason. Changed decisions come first.
- `near_duplicates.json`: every near-duplicate group, with each copy's
  similarity and whether it was merged.

Latest run: 56,446 unique poems (964 exact duplicates removed). Of the 792
near-duplicate groups, 549 were merged, removing 550 reprints and leaving
**55,896 poems**. 1,442 more had their 乐府 heading moved to the notes.
3,614 poets; 1,860 poems under 佚名; 332 poems in 唐诗三百首 and 137 in 千家诗;
40,596 with a 古诗文网 star count; 435 flagged for review. 358 duplicates were
credited to more than one poet; 56 of them now keep a later copy on evidence.

243 groups were not merged, because they fail at least one rule above:
different poets, no 乐府 copy, more than one plain copy, or similarity below
0.9 (which includes distinct hymns that share an anthology entry). They are
listed in `near_duplicates.json` for manual review.

Hashing only catches exact copies. About 20 of the joint-author hymns also
appear under one of their authors with a few variant characters (升圓丘 /
昇圜丘), so both copies are kept.

**Near-duplicates and 乐府 reprints.** 全唐诗 prints many poems twice: once in
the poet's own chapters, and again in the 乐府 chapters with the category
in front of the title (杂曲歌辞·游子吟). Poems with slightly different text
don't share a hash, so a third pass groups poems that matched the same
anthology or 古诗文网 entry and records each copy's text similarity
(`SequenceMatcher` on the full text). `choose_reprint_to_keep()` merges a
group only when the evidence is clear:

- every copy is by the same poet, with similarity ≥ 0.9;
- at least one copy has a 乐府 heading, and exactly one copy doesn't.

The plain copy is kept, with the copies' fame signals combined (anthology
matches OR'd, the highest star count) and a 又见《…》 note for each merged
title. This runs after the fame signals are collected, because the merge needs
them.

A poem printed only in the 乐府 chapters has no plain copy to keep (孟郊's
杂曲歌辞·游子吟). Its heading is a chapter category, not part of the title, so
it moves to the notes as `乐府·杂曲歌辞`. Nested headings are all moved.

## 3. Match poets to Wikidata: `match_wikidata_poets.py`

```bash
python3 scripts/match_wikidata_poets.py
```

This runs after `clean_tang_data.py`. It first merges both Wikidata result sets
into one candidate per QID. The same item often appears several times: from
both queries, and once per local name that found it (王灣 and 王湾, or 李隆基 and
唐明皇). Each candidate records:

- `isTangPoet`: whether `tang_poets.rq` returned it;
- `foundBy`: the local names (Simplified) whose by-name search found it.

Local poet names are then compared with Wikidata names, both converted to
Simplified Chinese. A local name can match an item in two ways:

- **Label:** the Wikidata item's main name.
- **Alias:** courtesy names (字), style names (号) and alternative spellings,
  plus the item's `foundBy` names. A `foundBy` name is one Wikidata itself
  matched exactly against the item's labels or aliases, so it also covers names
  the kept label and aliases miss: a `zh-hans` label when the kept label is
  `zh-hant` (唐中宗 on Q9717, labelled 李顯), variant characters (陶彝之 /
  陶彞之) and courtesy names missing from our alias list (柳中庸 → 柳淡).

Label and alias matches are collected **together** into one list of
candidates, with each item listed once even if it matches both ways. An earlier
version tried labels first and stopped at the first label match. That picked
the wrong item in 38 cases, where a namesake's label equals the local name but
the real poet is only reachable through an alias. For example, 朱庆余 matched a
0-sitelink item labelled 朱庆余, while the poet Q11093704 is labelled 朱可久.

Aliases can also mislead. 李昂 is an alias of 唐文宗 (Q9790), his personal
name, but the local 李昂 is a 開元-era official with the same name. Cases like
this are fixed with manual matches (below).

`matchMethod` records whether the chosen item matched by label or by alias.

If a name matches more than one item, `resolve_ambiguous()` decides which one to
use, or none. Many Wikidata items share names, especially the bulk-imported
items with no Wikipedia articles. It applies cautious filters in order, because
a wrong match (another person's portrait and dates) is worse than no match:

1. **Reject items that belong to another local poet.** If a candidate's label is
   a *different* name in the local poet list, the match came through a shared
   courtesy or Buddhist name. For example, 虚中 matches both 王毂 (字虚中) and
   the monk 释虚中; 王毂 is rejected and 释虚中 is used. Only labels are checked,
   not aliases: an alias that is also a local name usually means the same
   person is listed twice locally (皎然 / 清昼). If exactly one candidate is
   left it is used; if none are left the poet stays unmatched.
2. **Tang poets:** if any candidates have `isTangPoet`, only those are kept.
   If one is left it is used; several go on to steps 3–4, which choose among them.
   One exception: if every Tang poet is an empty item (0 sitelinks) and
   exactly one other candidate has sitelinks, with no birth or death year more
   than 15 years apart, that candidate is kept too, and step 3 picks it. See
   below.
3. **Sitelinks:** a candidate with a unique highest sitelink count is used.
   Candidates tied for the highest count go on to step 4.
4. **Duplicate items:** the tied candidates are accepted as duplicate items for
   one person only if at least two of them share a known birth or death year
   and no years conflict. Missing dates count as unknown, not as agreement;
   otherwise almost every pair of bulk-imported items without data would pass.
   The oldest item (lowest QID, compared numerically) is used.

The order matters. Each step decides only when its evidence is conclusive, and
otherwise passes the remaining candidates on. More specific evidence comes
before popularity:

- On sitelinks alone, 陆羽 (26 sitelinks, 字鸿渐) would take the name of the
  monk 释鸿渐; step 1 prevents that.
- 王建 the poet (9 sitelinks) would lose to 王建 the founder of Former Shu (16
  sitelinks); step 2 prevents that.

Step 2 has a known cost. Many poets have two Wikidata items: a bulk import
from CBDB (China Biographical Database), tagged as a Tang poet but empty, and a
Wikipedia-backed item without the tag. Plain step 2 always chose the empty
one: 常建 got Q45596202 (0 sitelinks) instead of Q1111062 (8), which also cost
him his dates and his fame score. The exception fixes 284 poets this way
(常建, 金昌绪, 丘为, 张泌, 曹邺…) and lets 29 unresolved poets resolve, without
losing any match. It was narrowed twice, on evidence from the diff:

- **Dates must not conflict.** Without the check, 12 poets moved to namesakes
  from other centuries: the poet 法藏 (744–825) became the Huayan patriarch
  法藏 (643–712). CBDB and Wikipedia dates for one person often differ by a
  few years (丘为 703 / 694), hence the 15-year tolerance.
- **Exactly one candidate with sitelinks.** Several (周朴, 张登, 王琚) mean a
  common name, not a duplicate item, and the poet keeps the Tang item.

Rulers of the Five Dynasties and Ten Kingdoms states still go wrong when an
empty Tang item and *several* other items share their name: 李煜 and 李璟 (the
Southern Tang rulers) are fixed with manual matches.

**Manual matches.** `MANUAL_MATCHES` maps a local poet to a QID and skips
matching entirely (`matchMethod: "manual"`). It is for poets the rules get
wrong, and each entry carries a comment with its evidence:

| Poet | QID | Evidence |
|---|---|---|
| 李昂 | Q45500865 | CBDB 92964: 考功員外郎, 知貢舉 in 開元24 (736), as in his bio |
| 李煜 | Q378528 | the Southern Tang ruler (後主煜), not the empty Tang item Q45512023 |
| 李璟 | Q718254 | aliases 伯玉 and 南唐元宗 match his bio (字伯玉 … 諡元宗) |

The script stops with an error if an entry's name is no longer a local poet or
its QID is missing from the Wikidata results, so a stale entry can't silently
stop applying.

Outputs:

- `cleaned/tang/poet_wikidata.json`: local poet name → `wikidataId`,
  `matchMethod` (`label`, `alias`, either with `-ambiguous`, or `manual`),
  `sitelinks`, `birthYear`, `deathYear`, `picture`, `isTangPoet`.
- `audit/tang/wikidata_matches.json`:
  - `summary`: counts per match method;
  - `ambiguous`: name clashes, with all candidates;
  - `unmatched`: poets with no match, sorted by poem count;
  - `collisions`: Wikidata items claimed by two local poets. These are usually
    the same person listed under two names in the source (李冶/李季兰), so
    they are candidates for merging. They can also expose a wrong match: 李昂
    showed up only once 唐文宗 matched the same item.

Latest run: 2,941 of 3,614 poets matched, covering 52,549 of 56,446 poems
(93%). 1,270 name clashes were resolved, 192 left for review (182 from labels,
10 from aliases), 3 poets are matched manually, and 481 have no candidate at
all. There are 30 collisions. Before the by-name lookup it was 2,371 poets and
46,037 poems.

Combining labels and aliases corrected 40 matches, but moved 16 poets that
label-first matching had resolved into review. An alias now adds a second Tang
poet as a candidate, and steps 3–4 can't choose between them: 牛峤 (a variant
spelling 牛𫊸, probably a duplicate item), 卢殷 (卢隠, with conflicting dates).
For 子兰 the old match was probably wrong, so review is the better outcome.
Preferring label matches among several Tang poets would resolve some of these.

## 4. Score fame: `score_fame.py`

```bash
python3 scripts/score_fame.py
```

This runs after `match_wikidata_poets.py`, because the poet score uses Wikidata
sitelinks. It rewrites `poets.json` and `poems.json` in place with a `fame`
field, an unrounded float from 0 to 100 that the app sorts by. Both files are
written to a temp file first and then renamed, because the script overwrites
its own input. It's safe to re-run, and takes about a second, so the weights
can be tuned without re-running the cleaning step.

**Poets are scored first**, from four inputs collected per poet:

| Input | Measures | Example |
|---|---|---|
| `sitelinks` | fame as a *person* | 李白 199, but also 玄奘 77, 空海 49 |
| `anthologyPoems` | standing in the canon | 杜甫 63, 李白 53 |
| `starsTotal` | modern familiarity, whole output | 李白 227,760 |
| `starsMax` | modern familiarity, best-known poem | 张若虚 21,548 from 3 poems |

Each input is put on a log scale from 0 to 1 against a fixed saturation point,
not the data's maximum, so one poet's count changing doesn't shift everyone's
score. Then:

```
poetry = (anthology + (starsTotal + starsMax) / 2) / 2
fame   = 100 × poetry × (1 + sitelinks / 2) / 1.5
```

- The two star inputs are averaged into one value, because they measure the
  same thing. Adding them separately would give stars half the weight;
  multiplying them would square them.
- Sitelinks *amplify* the poetry evidence (×⅔ to ×1) instead of adding to it.
  Without any poetry evidence a poet scores 0, however famous: 玄奘, 李渊 and
  空海 wrote little and are known for other reasons.
- 佚名 scores 0: its star total adds up poems by many unrelated authors.

Poet fame was also a data-quality check. Well-known poets with 0 sitelinks
pointed to the step 2 problem described above (常建).

**Poems are scored second**, from their own signals (`in_tang300`,
`in_qianjia`, `gushiwen_stars`) with the poet's score as a prior: the poem's
own evidence should decide where there is some, and the poet's fame orders
the roughly 15,000 poems with none.

```
own  = (anthology + stars) / 2          anthology is 1 if in either anthology
fame = 100 × own + 0.085 × poetFame × (1 − own)
```

The poet's share shrinks as the poem's own evidence grows, so a poem with
strong evidence is scored on itself, and an unknown poem by a famous poet
ranks above an unknown poem by an obscure one, but below any poem with real
evidence.

The 全唐诗 poem count is deliberately not used. It measures output, not fame:
易静 has 720 poems and no other signal, while 王之涣 has 7.

Output: `audit/tang/fame_top.json` lists the top 100 poets and poems with their
inputs, to check the ranking by eye.

Latest run: 2,309 poets score above 0, with a median of 2.0. The top five
poets are 李白 95.1, 杜甫 94.7, 王维 77.5, 李商隐 74.0 and 孟浩然 69.3; the
top five poems are 将进酒 100.0, 春望 97.2, 长恨歌 96.5, 静夜思 95.8 and
白雪歌送武判官归京 95.1.

Re-run `score_fame.py` after every `clean_tang_data.py` run: cleaning
rewrites `poems.json` and `poets.json` without `fame`, and the seed refuses
data without it.

## Status and next steps

- [x] Fame signals: anthologies plus 古诗文网 star counts, and duplicates
      attributed by evidence instead of corpus order.
- [x] `poet_fame()` in `score_fame.py`.
- [x] `poem_fame()` in `score_fame.py`: the poem's own signals, with the poet's
      score as a prior.
- [x] Near-duplicate 乐府 reprints merged into the plain copy (550), and
      leftover 乐府 headings moved from titles to notes.
- [ ] Review the 243 unmerged near-duplicate groups, especially the
      same-poet pairs with similarity ≥ 0.9.
- [x] `resolve_ambiguous()` in `match_wikidata_poets.py`: the rule for name clashes.
- [x] Unmatched famous poets (齐己, 贯休, 皮日休…): found by the by-name lookup.
- [x] Cross-tier matching in `match_poet()`: label and alias matches compete
      as one list of candidates.
- [ ] Optional: prefer label matches among several Tang-poet candidates, to
      resolve some of the 16 poets moved to review.
- [x] Title-style names (太宗皇帝, 則天皇后, 後主煜, 僧貫休): renamed in
      `normalize_author()`, and `foundBy` names indexed as aliases.
- [x] Manual matches for poets the rules get wrong (李昂, 李煜, 李璟).
- [ ] Merge the remaining duplicate local poets found by `collisions` (30) and
      by candidates whose `foundBy` lists two local names. The emperors are done.
- [ ] Joint-author poems (趙光逢、張衮…): drop the near-duplicate hymns that
      also appear under one author (fuzzy matching, since hashes miss variant
      characters), and decide whether co-authorship needs a many-to-many
      `Poem`–`Poet` relation.
- [x] Step 2 exception: an empty Tang-tagged item no longer beats the single
      Wikipedia-backed item for the same person (284 poets, e.g. 常建).
- [ ] Portraits: download the `P18` images from Wikimedia Commons with their
      license and author metadata, resize them to WebP, and save them in
      `public/portraits/<QID>.webp`.
- [x] `prisma/seed.ts` loads `cleaned/tang/`: fame on poets and poems,
      `stars` starting at 0 (古诗文网 votes go into `fame`), and notes as
      background annotations.
- [ ] Add `wikidataId`, years and portrait fields to the schema and seed them
      from `poet_wikidata.json`.
- [ ] Wikidata contributions from the gaps found here: add `P106 = poet` to
      Tang poets without it (貫休), add the 全唐诗 spellings as aliases (龐藴 on
      Q6505629), add `P31 = human` where missing, review likely duplicate
      items listed under `ambiguous`, and the CBDB / Wikipedia item pairs that
      the step 2 exception found (merge where they are one person).

## Legacy scripts

These predate the Tang pipeline. They work on the older mixed-dynasty dataset in
`prisma/data/raw/LC*.json`:

- `clean_data.py`: cleans and dedupes it into `prisma/data/cleaned/cleaned_*.json`.
- `create_dev_subset.py`: copies the top 5,000 poems by stars into `prisma/data/dev/`.
- `data_insights.py`: summarizes `prisma/data/cleaned/statistics.json`.
- `semantic_search.py`: a proof of concept of OpenAI-embeddings search. The app
  doesn't use it; its search is a simple `contains` query in `lib/queries.ts`.
