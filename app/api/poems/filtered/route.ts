import { NextRequest, NextResponse } from 'next/server';
import { getFilteredPoems } from '@/lib/queries';

// Public, like the home page: later pages of a search and/or the selected
// poets' and tags' feed, best known first. The first page is rendered on
// the server; PoemFeed fetches the rest from here.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Trimmed the same way as on the home page, so both agree.
  const query = searchParams.get('q')?.trim() || undefined;
  const poetIds = searchParams.getAll('poetId').map(Number);
  const tagIds = searchParams.getAll('tagId').map(Number);
  const offset = Number(searchParams.get('offset') ?? '0');

  // At least one of a query, poets or tags; a query longer than any title
  // or line anyone would search for, or more ids than anyone would select,
  // is rejected; offset bounded by the corpus.
  const ids = [...poetIds, ...tagIds];
  const valid =
    (query !== undefined || ids.length > 0) &&
    (query === undefined || query.length <= 100) &&
    ids.length <= 100 &&
    ids.every((id) => Number.isInteger(id) && id > 0) &&
    Number.isInteger(offset) &&
    offset >= 0 &&
    offset <= 100_000;
  if (!valid) {
    return NextResponse.json({ error: 'Invalid q, poetId, tagId or offset' }, { status: 400 });
  }

  const poems = await getFilteredPoems({ query, poetIds, tagIds, offset });
  return NextResponse.json({ poems });
}
