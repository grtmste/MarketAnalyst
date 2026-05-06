import type { OHLCVData } from '@/types';

// Exact interval/range mappings per Yahoo Finance capabilities
const INTERVAL_CONFIG: Record<string, { interval: string; range: string }> = {
  '1M':  { interval: '1m',  range: '1d'  },
  '5M':  { interval: '5m',  range: '5d'  },
  '15M': { interval: '15m', range: '1mo' },
  '1H':  { interval: '60m', range: '3mo' },
  '4H':  { interval: '1d',  range: '1y'  }, // Yahoo has no 4H; proxy with daily
  '1D':  { interval: '1d',  range: '2y'  },
  '5D':  { interval: '5m',  range: '5d'  },
  '1W':  { interval: '1d',  range: '1mo' },
  '3M':  { interval: '1d',  range: '3mo' },
  '6M':  { interval: '1d',  range: '6mo' },
  'YTD': { interval: '1d',  range: 'ytd' },
  '1Y':  { interval: '1d',  range: '1y'  },
  '5Y':  { interval: '1wk', range: '5y'  },
  'ALL': { interval: '1mo', range: 'max' },
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

export async function fetchOHLCV(ticker: string, timeframe: string): Promise<OHLCVData[]> {
  const config = INTERVAL_CONFIG[timeframe] ?? INTERVAL_CONFIG['1D'];
  const symbol = ticker.toUpperCase();

  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  );
  url.searchParams.set('interval', config.interval);
  url.searchParams.set('range', config.range);
  url.searchParams.set('includePrePost', 'false');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    // No caching — always fetch latest market data
    cache: 'no-store',
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

  // Always return sorted ascending by time
  candles.sort((a, b) => a.time - b.time);

  return candles;
}
