import { NextRequest, NextResponse } from 'next/server';
import { getFilteredPoems } from '@/lib/queries';

// Public, like the home page: later pages of the selected poets' and tags'
// feed, best known first. The first page is rendered on the server;
// PoemFeed fetches the rest from here.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const poetIds = searchParams.getAll('poetId').map(Number);
  const tagIds = searchParams.getAll('tagId').map(Number);
  const offset = Number(searchParams.get('offset') ?? '0');

  // At least one filter, at most as many as anyone would select; offset
  // bounded by the corpus.
  const ids = [...poetIds, ...tagIds];
  const validIds =
    ids.length > 0 && ids.length <= 100 && ids.every((id) => Number.isInteger(id) && id > 0);
  if (!validIds || !Number.isInteger(offset) || offset < 0 || offset > 100_000) {
    return NextResponse.json({ error: 'Invalid poetId, tagId or offset' }, { status: 400 });
  }

  const poems = await getFilteredPoems({ poetIds, tagIds, offset });
  return NextResponse.json({ poems });
}
