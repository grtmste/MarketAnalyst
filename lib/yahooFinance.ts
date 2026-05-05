import type { OHLCVData } from '@/types';

const INTERVAL_CONFIG: Record<string, { interval: string; range: string }> = {
  '1m': { interval: '1m', range: '5d' },
  '5m': { interval: '5m', range: '1mo' },
  '15m': { interval: '15m', range: '1mo' },
  '1H': { interval: '1h', range: '3mo' },
  '4H': { interval: '1h', range: '6mo' },
  '1D': { interval: '1d', range: '2y' },
};

interface YFChartResult {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: (number | null)[];
      high?: (number | null)[];
      low?: (number | null)[];
      close?: (number | null)[];
      volume?: (number | null)[];
    }>;
  };
}

interface YFResponse {
  chart?: {
    result?: YFChartResult[];
    error?: { description: string };
  };
}

function aggregateTo4H(candles: OHLCVData[]): OHLCVData[] {
  const result: OHLCVData[] = [];
  for (let i = 0; i < candles.length; i += 4) {
    const chunk = candles.slice(i, i + 4);
    if (chunk.length === 0) continue;
    result.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
    });
  }
  return result;
}

export async function fetchOHLCV(ticker: string, timeframe: string): Promise<OHLCVData[]> {
  const config = INTERVAL_CONFIG[timeframe] ?? INTERVAL_CONFIG['1D'];
  const symbol = ticker.toUpperCase();

  // Yahoo Finance v8 chart endpoint — called server-side, no CORS issues
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  );
  url.searchParams.set('interval', config.interval);
  url.searchParams.set('range', config.range);
  url.searchParams.set('includePrePost', 'false');
  url.searchParams.set('events', 'div,split');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    next: { revalidate: 60 }, // cache for 60s in Next.js
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error(`Ticker not found: ${symbol}`);
    throw new Error(`Yahoo Finance returned ${res.status}`);
  }

  const json: YFResponse = await res.json();

  if (json.chart?.error) {
    throw new Error(json.chart.error.description || 'Yahoo Finance API error');
  }

  const result = json.chart?.result?.[0];
  if (!result?.timestamp?.length) {
    throw new Error(`No historical data found for ${symbol}`);
  }

  const timestamps = result.timestamp;
  const q = result.indicators?.quote?.[0] ?? {};
  const opens = q.open ?? [];
  const highs = q.high ?? [];
  const lows = q.low ?? [];
  const closes = q.close ?? [];
  const volumes = q.volume ?? [];

  const candles: OHLCVData[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (opens[i] == null || highs[i] == null || lows[i] == null || closes[i] == null) continue;
    candles.push({
      time: timestamps[i],
      open: opens[i] as number,
      high: highs[i] as number,
      low: lows[i] as number,
      close: closes[i] as number,
      volume: (volumes[i] as number) ?? 0,
    });
  }

  if (timeframe === '4H') {
    return aggregateTo4H(candles);
  }

  return candles;
}
