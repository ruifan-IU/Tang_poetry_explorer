import { NextRequest, NextResponse } from 'next/server';
import { searchPoems } from '@/lib/queries';

// Public, like the home page: later pages of a search's results, best known
// first. The first page is rendered on the server; PoemFeed fetches the rest
// from here.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q')?.trim() ?? '';
  const offset = Number(searchParams.get('offset') ?? '0');

  // Longer than any title or line anyone would search for; offset bounded
  // by the corpus.
  if (!q || q.length > 100 || !Number.isInteger(offset) || offset < 0 || offset > 100_000) {
    return NextResponse.json({ error: 'Invalid q or offset' }, { status: 400 });
  }

  const poems = await searchPoems(q, { offset });
  return NextResponse.json({ poems });
}
