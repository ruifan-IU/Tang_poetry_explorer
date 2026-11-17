import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AnnotationType, PoemType } from '../lib/prisma-client/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output of the Python pipeline (see scripts/README.md): clean_tang_data.py,
// then match_wikidata_poets.py, then score_fame.py.
const DATA_DIR = path.resolve(__dirname, './data/cleaned/tang');

interface TangPoet {
  name: string;
  introduction: string | null;
  dynasty: string;
  fame: number;
}

interface TangPoem {
  title: string;
  content: string;
  contentHash: string;
  poetName: string;
  dynasty: string;
  type: PoemType;
  tags: string[];
  notes: string[];
  fame: number;
}

// Postgres has a ~65535 bind-parameter limit per statement; createMany() on
// thousands of rows needs to be chunked to stay under it.
const INSERT_BATCH_SIZE = 2000;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

/**
 * Check the pipeline output before anything is deleted, so a bad or
 * half-built dataset fails the seed instead of leaving an empty database.
 */
function validate(
  dynasties: string[],
  poets: TangPoet[],
  poems: TangPoem[],
  tags: string[]
): void {
  const problems: string[] = [];
  const poetNames = new Set(poets.map((p) => p.name));
  const tagNames = new Set(tags);

  // clean_tang_data.py rewrites poems.json without `fame`, so running it
  // without score_fame.py afterwards would silently seed every poem at 0.
  const unscored = poems.filter((p) => typeof p.fame !== 'number').length;
  if (unscored) problems.push(`${unscored} poems have no fame (run scripts/score_fame.py)`);

  const missingPoet = poems.filter((p) => !poetNames.has(p.poetName));
  if (missingPoet.length) {
    problems.push(`${missingPoet.length} poems name an unknown poet, e.g. ${missingPoet[0].poetName}`);
  }
  const badDynasty = [...poets, ...poems].filter((x) => !dynasties.includes(x.dynasty));
  if (badDynasty.length) problems.push(`${badDynasty.length} rows have an unknown dynasty`);
  const badTag = poems.flatMap((p) => p.tags).filter((t) => !tagNames.has(t));
  if (badTag.length) problems.push(`${badTag.length} poem tags are not in tags.json, e.g. ${badTag[0]}`);
  if (new Set(poems.map((p) => p.contentHash)).size !== poems.length) {
    problems.push('contentHash is not unique');
  }

  if (problems.length) {
    throw new Error(`Seed data failed validation:\n  - ${problems.join('\n  - ')}`);
  }
}

/**
 * Turn a poem's pipeline notes into the annotation to store with it, or null
 * to store none.
 *
 * `notes` mixes several kinds of editorial text, in this order of frequency:
 *   乐府·杂曲歌辞        the 乐府 chapter 全唐诗 printed it in
 *   京本 / 辛本 …        which edition a reading comes from
 *   又见《…》 / 互见X《…》 other places and poets the poem appears under
 *   按：…               the 全唐诗 editors' remarks
 *   一作「…」            variant readings (异文)
 * Annotation types are TRANSLATION, COMMENTARY and BACKGROUND.
 */
function notesToAnnotation(
  notes: string[]
): { type: AnnotationType; content: string } | null {
  if (notes.length === 0) return null;

  return {
    type: 'BACKGROUND',
    content: notes.join('\n'),
  };
}

async function main() {
  console.log('Starting database seed...\n');

  console.log(`Loading pipeline output from ${DATA_DIR}...`);
  const dynasties = readJson<string[]>('dynasties.json');
  const poets = readJson<TangPoet[]>('poets.json');
  const poems = readJson<TangPoem[]>('poems.json');
  const tags = readJson<string[]>('tags.json');
  validate(dynasties, poets, poems, tags);
  console.log(
    `  ${dynasties.length} dynasties, ${poets.length} poets, ` +
      `${poems.length} poems, ${tags.length} tags\n`
  );

  // 0. Clear the old dataset. This is a full replacement, not a merge --
  // deleting Poem cascades to UserFavorite/UserMemorization/PoemAnnotation,
  // so users' favorites and study progress go with it. Refuse to do that
  // unless asked explicitly (it is what you want on a fresh or dev database).
  const [favoriteCount, memorizationCount] = await Promise.all([
    prisma.userFavorite.count(),
    prisma.userMemorization.count(),
  ]);
  if ((favoriteCount || memorizationCount) && process.env.SEED_DELETE_USER_DATA !== '1') {
    throw new Error(
      `The database has ${favoriteCount} favorites and ${memorizationCount} ` +
        `memorization records, which reseeding deletes. ` +
        `Set SEED_DELETE_USER_DATA=1 to proceed anyway.`
    );
  }
  console.log('Clearing existing data...');
  await prisma.poem.deleteMany({});
  await prisma.poet.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.dynasty.deleteMany({});
  console.log('  Cleared\n');

  // 1. Dynasties and tags: small lookup tables, one round trip each.
  console.log('Seeding dynasties and tags...');
  await prisma.dynasty.createMany({ data: dynasties.map((name) => ({ name })) });
  await prisma.tag.createMany({ data: tags.map((name) => ({ name })) });
  const dynastyId = Object.fromEntries(
    (await prisma.dynasty.findMany()).map((d) => [d.name, d.id])
  );
  const tagId = Object.fromEntries((await prisma.tag.findMany()).map((t) => [t.name, t.id]));
  console.log(`  Created ${dynasties.length} dynasties, ${tags.length} tags\n`);

  // 2. Poets. `stars` is left at its default of 0: it counts this app's
  // favorites, which start from nothing.
  console.log('Seeding poets...');
  for (const batch of chunk(poets, INSERT_BATCH_SIZE)) {
    await prisma.poet.createMany({
      data: batch.map((poet) => ({
        name: poet.name,
        introduction: poet.introduction || null,
        fame: poet.fame,
        dynastyId: dynastyId[poet.dynasty],
      })),
    });
  }
  const poetId = Object.fromEntries(
    (await prisma.poet.findMany({ select: { id: true, name: true } })).map((p) => [p.name, p.id])
  );
  console.log(`  Created ${poets.length} poets\n`);

  // 3. Poems
  console.log('Seeding poems...');
  let poemsCreated = 0;
  for (const batch of chunk(poems, INSERT_BATCH_SIZE)) {
    const result = await prisma.poem.createMany({
      data: batch.map((poem) => ({
        title: poem.title,
        content: poem.content,
        contentHash: poem.contentHash,
        type: poem.type,
        fame: poem.fame,
        poetId: poetId[poem.poetName],
        dynastyId: dynastyId[poem.dynasty],
      })),
    });
    poemsCreated += result.count;
    console.log(`  Inserted ${poemsCreated} / ${poems.length} poems...`);
  }
  const poemId = Object.fromEntries(
    (await prisma.poem.findMany({ select: { id: true, contentHash: true } })).map((p) => [
      p.contentHash,
      p.id,
    ])
  );
  console.log(`  Created ${poemsCreated} poems\n`);

  // 4. Tags: few poems have any (the anthology poems), so connect them per
  // tag -- ~240 updates rather than one per tagged poem.
  console.log('Linking tags...');
  const poemsByTag = new Map<string, number[]>();
  for (const poem of poems) {
    for (const tag of poem.tags) {
      poemsByTag.set(tag, [...(poemsByTag.get(tag) ?? []), poemId[poem.contentHash]]);
    }
  }
  for (const [tag, ids] of poemsByTag) {
    await prisma.tag.update({
      where: { id: tagId[tag] },
      data: { poems: { connect: ids.map((id) => ({ id })) } },
    });
  }
  console.log(`  Linked ${poemsByTag.size} tags\n`);

  // 5. Annotations from the pipeline's editorial notes.
  console.log('Seeding annotations...');
  const annotations = poems.flatMap((poem) => {
    const annotation = notesToAnnotation(poem.notes);
    return annotation
      ? [{ ...annotation, poemId: poemId[poem.contentHash], origin: 'IMPORTED' as const }]
      : [];
  });
  for (const batch of chunk(annotations, INSERT_BATCH_SIZE)) {
    await prisma.poemAnnotation.createMany({ data: batch });
  }
  console.log(`  Created ${annotations.length} annotations\n`);

  // 6. Summary
  console.log('Seeding Summary:');
  console.log('-'.repeat(50));

  const counts = await Promise.all([
    prisma.dynasty.count(),
    prisma.poet.count(),
    prisma.tag.count(),
    prisma.poem.count(),
    prisma.poemAnnotation.count(),
  ]);

  console.log(`  Dynasties:   ${counts[0]}`);
  console.log(`  Poets:       ${counts[1]}`);
  console.log(`  Tags:        ${counts[2]}`);
  console.log(`  Poems:       ${counts[3]}`);
  console.log(`  Annotations: ${counts[4]}`);
  console.log('-'.repeat(50));

  console.log('\nDatabase seeded successfully!');
}

main()
  .catch((e) => {
    console.error('\nError seeding database:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
