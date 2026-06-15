import { fetchOHLCV } from '@/lib/yahooFinance';
import { computeIndicators } from '@/lib/indicators';
import { analyzeTechnicals } from '@/lib/analysisEngine';
import type { Timeframe, MultiTimeframeAnalysis, TimeframeSignal } from '@/types';

// Always run fresh — analysis depends on the latest candles
export const dynamic = 'force-dynamic';

// Core timeframes used for multi-timeframe alignment checks
const CORE: Timeframe[] = ['5M', '15M', '1H', '4H', '1D', '1W'];

// Map every selectable timeframe onto the nearest core timeframe
const CORE_MAP: Record<Timeframe, Timeframe> = {
  '1M': '5M',
  '5M': '5M',
  '15M': '15M',
  '1H': '1H',
  '4H': '4H',
  '1D': '1D',
  '5D': '1D',
  '1W': '1W',
  '3M': '1W',
  '6M': '1W',
  YTD: '1W',
  '1Y': '1W',
  '5Y': '1W',
  ALL: '1W',
};

const LABELS: Record<Timeframe, string> = {
  '1M': '1-Minute',
  '5M': '5-Minute',
  '15M': '15-Minute',
  '1H': '1-Hour',
  '4H': '4-Hour',
  '1D': 'Daily',
  '5D': '5-Day',
  '1W': 'Weekly',
  '3M': '3-Month',
  '6M': '6-Month',
  YTD: 'YTD',
  '1Y': '1-Year',
  '5Y': '5-Year',
  ALL: 'All-Time',
};

// '1W' candles (1mo of daily data) don't have enough history for indicators —
// fetch a longer daily range instead while keeping the "Weekly" label
const FETCH_OVERRIDE: Partial<Record<Timeframe, Timeframe>> = { '1W': '1Y' };

function getTriplet(tf: Timeframe): Timeframe[] {
  const mapped = CORE_MAP[tf] ?? '1D';
  const idx = CORE.indexOf(mapped);
  if (idx <= 0) return CORE.slice(0, 3);
  if (idx >= CORE.length - 1) return CORE.slice(CORE.length - 3);
  return CORE.slice(idx - 1, idx + 2);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ticker, timeframe = '1D' } = body as { ticker: string; timeframe: Timeframe };

    if (!ticker) {
      return Response.json({ error: 'Ticker symbol is required' }, { status: 400 });
    }

    const triplet = getTriplet(timeframe);

    const signals: TimeframeSignal[] = await Promise.all(
      triplet.map(async (tf): Promise<TimeframeSignal> => {
        const fetchTf = FETCH_OVERRIDE[tf] ?? tf;
        const allCandles = await fetchOHLCV(ticker, fetchTf);
        if (allCandles.length < 30) {
          return { timeframe: tf, label: LABELS[tf], decision: 'WAIT', confidence: 35 };
        }
        const candles = allCandles.slice(-100);
        const indicators = computeIndicators(candles);
        const analysis = analyzeTechnicals(candles, indicators, tf);
        return {
          timeframe: tf,
          label: LABELS[tf],
          decision: analysis.decision,
          confidence: analysis.confidence,
        };
      })
    );

    const decisions = signals.map((s) => s.decision);
    const buys = decisions.filter((d) => d === 'BUY').length;
    const sells = decisions.filter((d) => d === 'SELL').length;

    let alignment: MultiTimeframeAnalysis['alignment'];
    let summary: string;
    if (buys === signals.length) {
      alignment = 'aligned';
      summary = 'All timeframes agree: BUY — a higher-conviction setup.';
    } else if (sells === signals.length) {
      alignment = 'aligned';
      summary = 'All timeframes agree: SELL — a higher-conviction setup.';
    } else if (buys >= 2 || sells >= 2) {
      alignment = 'partial';
      summary = 'Mixed signals — most timeframes lean one way, but not all agree. Consider smaller size or wait for confirmation.';
    } else {
      alignment = 'conflicting';
      summary = 'Timeframes disagree with each other. No clear edge — best to wait for alignment.';
    }

    const result: MultiTimeframeAnalysis = { signals, alignment, summary };
    return Response.json(result);
  } catch (error: unknown) {
    console.error('Multi-timeframe analyze error:', error);
    const message = error instanceof Error ? error.message : 'Multi-timeframe analysis failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
