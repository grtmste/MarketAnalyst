import { NextRequest, NextResponse } from 'next/server';
import type { NewsArticle } from '@/types';

// Always run fresh — news changes constantly
export const dynamic = 'force-dynamic';

interface YFNewsItem {
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker')?.trim();

  if (!ticker) {
    return NextResponse.json({ articles: [] });
  }

  try {
    const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
    url.searchParams.set('q', ticker);
    url.searchParams.set('quotesCount', '0');
    url.searchParams.set('newsCount', '6');
    url.searchParams.set('enableFuzzyQuery', 'false');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://finance.yahoo.com/',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ articles: [] });
    }

    const data = await res.json();
    const items: YFNewsItem[] = data.news ?? [];

    const articles: NewsArticle[] = items
      .filter((n) => n.title && n.link)
      .slice(0, 3)
      .map((n) => ({
        title: n.title as string,
        publisher: n.publisher || 'Unknown',
        link: n.link as string,
        publishedAt: n.providerPublishTime ?? 0,
      }));

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('News error:', error);
    return NextResponse.json({ articles: [] });
  }
}
