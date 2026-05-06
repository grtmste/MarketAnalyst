import { NextRequest, NextResponse } from 'next/server';

interface YFSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  exchange?: string;
  typeDisp?: string;
  quoteType?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
    url.searchParams.set('q', q);
    url.searchParams.set('quotesCount', '10');
    url.searchParams.set('newsCount', '0');
    url.searchParams.set('listsCount', '0');
    url.searchParams.set('enableFuzzyQuery', 'false');
    url.searchParams.set('enableCb', 'false');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://finance.yahoo.com/',
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    const quotes: YFSearchQuote[] = data.quotes ?? [];

    const ALLOWED_TYPES = new Set(['Equity', 'ETF', 'Fund', 'EQUITY', 'ETF', 'MUTUALFUND']);

    const results = quotes
      .filter(
        (q) =>
          q.symbol &&
          (ALLOWED_TYPES.has(q.typeDisp ?? '') ||
            ALLOWED_TYPES.has(q.quoteType ?? '') ||
            // include when type is unknown but symbol looks valid
            (!q.typeDisp && !q.quoteType))
      )
      .slice(0, 8)
      .map((q) => ({
        symbol: q.symbol as string,
        name: q.shortname || q.longname || (q.symbol as string),
        exchange: q.exchDisp || q.exchange || '',
        type:
          q.typeDisp === 'ETF' || q.quoteType === 'ETF'
            ? 'ETF'
            : q.typeDisp === 'Fund' || q.quoteType === 'MUTUALFUND'
            ? 'Fund'
            : 'Stock',
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] });
  }
}
