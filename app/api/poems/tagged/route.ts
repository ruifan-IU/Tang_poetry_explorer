import { NextRequest, NextResponse } from 'next/server';
import { getFilteredPoems } from '@/lib/queries';

// Public, like the home page: later pages of the selected tags' feed, best
// known first. The first page is rendered on the server; PoemFeed fetches
// the rest from here.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tagIds = searchParams.getAll('tagId').map(Number);
  const offset = Number(searchParams.get('offset') ?? '0');

  // At most as many tags as anyone would select; offset bounded by the corpus.
  const validTags =
    tagIds.length > 0 && tagIds.length <= 50 && tagIds.every((id) => Number.isInteger(id) && id > 0);
  if (!validTags || !Number.isInteger(offset) || offset < 0 || offset > 100_000) {
    return NextResponse.json({ error: 'Invalid tagId or offset' }, { status: 400 });
  }

  const poems = await getFilteredPoems({ tagIds, offset });
  return NextResponse.json({ poems });
}
