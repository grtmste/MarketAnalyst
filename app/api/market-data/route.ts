import { NextRequest, NextResponse } from 'next/server';
import { fetchOHLCV } from '@/lib/yahooFinance';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const timeframe = searchParams.get('timeframe') || '1D';
  const limit = parseInt(searchParams.get('limit') || '200');

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker symbol is required' }, { status: 400 });
  }

  try {
    const candles = await fetchOHLCV(ticker, timeframe);

    if (candles.length === 0) {
      return NextResponse.json(
        { error: `No market data found for "${ticker.toUpperCase()}"` },
        { status: 404 }
      );
    }

    const sliced = candles.slice(-limit);
    const currentPrice = sliced[sliced.length - 1]?.close ?? null;

    return NextResponse.json({
      candles: sliced,
      currentPrice,
      ticker: ticker.toUpperCase(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch market data';
    const status = message.toLowerCase().includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
