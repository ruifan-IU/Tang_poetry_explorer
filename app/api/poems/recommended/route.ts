import { NextRequest, NextResponse } from 'next/server';
import { getRecommendedPoemsPage } from '@/lib/queries';

// Public, like the explore page itself: later pages of the recommended feed.
// The feed's first page is rendered on the server; PoemFeed fetches
// the rest from here with the same seed.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seed = searchParams.get('seed') ?? '';
  const offset = Number(searchParams.get('offset') ?? '0');

  // The seed comes from newRecommendationSeed(); anything else is rejected
  // rather than hashed, and offset is bounded by the size of the corpus.
  if (!/^[a-z0-9]{1,16}$/.test(seed) || !Number.isInteger(offset) || offset < 0 || offset > 100_000) {
    return NextResponse.json({ error: 'Invalid seed or offset' }, { status: 400 });
  }

  const poems = await getRecommendedPoemsPage(seed, offset);
  return NextResponse.json({ poems });
}
