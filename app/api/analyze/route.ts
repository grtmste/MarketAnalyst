import { fetchOHLCV } from '@/lib/yahooFinance';
import { computeIndicators } from '@/lib/indicators';
import { analyzeTechnicals } from '@/lib/analysisEngine';

// Always run fresh — analysis depends on the latest candles
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ticker, timeframe = '1D' } = body as { ticker: string; timeframe: string };

    if (!ticker) {
      return Response.json({ error: 'Ticker symbol is required' }, { status: 400 });
    }

    const allCandles = await fetchOHLCV(ticker, timeframe);

    if (allCandles.length < 30) {
      return Response.json(
        { error: 'Insufficient historical data for analysis (need ≥30 candles)' },
        { status: 400 }
      );
    }

    // Use the last 100 candles for indicator accuracy
    const candles = allCandles.slice(-100);
    const indicators = computeIndicators(candles);

    // Deterministic technical-analysis engine — no API key, no billing
    const analysis = analyzeTechnicals(candles, indicators, timeframe);

    return Response.json(analysis);
  } catch (error: unknown) {
    console.error('Analyze error:', error);
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
