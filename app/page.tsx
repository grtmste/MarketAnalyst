'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import AnalysisPanel from '@/components/AnalysisPanel';
import TickerSearch from '@/components/TickerSearch';
import TimeframeSelector from '@/components/TimeframeSelector';
import type {
  OHLCVData,
  TradingAnalysis,
  Timeframe,
  MultiTimeframeAnalysis,
  NewsArticle,
} from '@/types';

const TradingChart = dynamic(() => import('@/components/TradingChart'), { ssr: false });

// NYSE regular trading hours: 09:30–16:00 Eastern Time
function isNYSEOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const totalMins = et.getHours() * 60 + et.getMinutes();
  return totalMins >= 9 * 60 + 30 && totalMins < 16 * 60;
}

function formatDisplayPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(2);
  return price.toFixed(4);
}

export default function Home() {
  // ── State — initialized with SSR-safe defaults; localStorage applied after mount ──
  const [mounted, setMounted] = useState(false);
  const [ticker, setTicker] = useState('AAPL');
  const [displayTicker, setDisplayTicker] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');

  const [chartData, setChartData] = useState<OHLCVData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | undefined>();

  const [analysis, setAnalysis] = useState<TradingAnalysis | null>(null);
  const [mtfAnalysis, setMtfAnalysis] = useState<MultiTimeframeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const autoRefreshRef = useRef<ReturnType<typeof setInterval>>();

  // ── Fix 5: Restore from localStorage after hydration ──
  useEffect(() => {
    const savedTicker = localStorage.getItem('lastTicker') ?? 'AAPL';
    const savedTimeframe = (localStorage.getItem('lastTimeframe') as Timeframe) ?? '1D';
    setTicker(savedTicker);
    setDisplayTicker(savedTicker);
    setTimeframe(savedTimeframe);
    setMounted(true);
  }, []);

  // ── Fetch chart data ──
  const fetchChartData = useCallback(
    async (symbol: string, tf: Timeframe, silent = false) => {
      if (!silent) setIsLoadingData(true);
      else setIsRefreshing(true);
      setDataError(null);
      try {
        const res = await fetch(
          `/api/market-data?ticker=${encodeURIComponent(symbol)}&timeframe=${tf}&limit=500`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to fetch market data');
        setChartData(json.candles as OHLCVData[]);
        setCurrentPrice(json.currentPrice);
        if (!silent) {
          setAnalysis(null);
          setMtfAnalysis(null);
        }
        setDisplayTicker(json.ticker ?? symbol.toUpperCase());
      } catch (err: unknown) {
        setDataError(err instanceof Error ? err.message : 'Unknown error');
        if (!silent) {
          setChartData([]);
          setCurrentPrice(undefined);
        }
      } finally {
        setIsLoadingData(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  // ── Initial fetch after localStorage is read ──
  useEffect(() => {
    if (!mounted) return;
    fetchChartData(ticker, timeframe);
  }, [mounted, ticker, timeframe, fetchChartData]);

  // ── Fetch latest news whenever the ticker changes ──
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    setNews([]);
    setIsLoadingNews(true);
    fetch(`/api/news?ticker=${encodeURIComponent(ticker)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setNews((json.articles as NewsArticle[]) ?? []);
      })
      .catch(() => {
        if (!cancelled) setNews([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNews(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, ticker]);

  // ── Fix 5: Persist to localStorage on change ──
  const handleTickerSelect = (symbol: string) => {
    localStorage.setItem('lastTicker', symbol);
    setTicker(symbol);
  };

  const handleTimeframeChange = (tf: Timeframe) => {
    localStorage.setItem('lastTimeframe', tf);
    setTimeframe(tf);
  };

  // ── Fix 2: Manual refresh ──
  const handleRefresh = useCallback(() => {
    fetchChartData(ticker, timeframe, true);
  }, [ticker, timeframe, fetchChartData]);

  // ── Fix 2: Auto-refresh every 60s when NYSE is open ──
  useEffect(() => {
    if (!mounted) return;
    autoRefreshRef.current = setInterval(() => {
      if (isNYSEOpen()) {
        fetchChartData(ticker, timeframe, true);
      }
    }, 60_000);
    return () => clearInterval(autoRefreshRef.current);
  }, [mounted, ticker, timeframe, fetchChartData]);

  // ── Direct fetch for technical analysis + multi-timeframe check ──
  const handleAnalyze = async () => {
    if (!ticker || isAnalyzing || isLoadingData) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);
    setMtfAnalysis(null);
    try {
      const [analysisRes, mtfRes] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker, timeframe }),
        }),
        fetch('/api/analyze-mtf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker, timeframe }),
        }),
      ]);
      const data = await analysisRes.json();
      if (!analysisRes.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data as TradingAnalysis);

      if (mtfRes.ok) {
        const mtfData = await mtfRes.json();
        setMtfAnalysis(mtfData as MultiTimeframeAnalysis);
      }
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isBusy = isLoadingData || isAnalyzing;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-[rgba(0,0,0,0.06)] shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#7C9CBF] flex items-center justify-center shadow-sm">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="text-sm font-bold text-[#1A1A2E] tracking-tight hidden sm:block">
            MarketAnalyst
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-center min-w-0">
          <TickerSearch value={displayTicker} onSelect={handleTickerSelect} disabled={isBusy} />
          <TimeframeSelector
            value={timeframe}
            onChange={handleTimeframeChange}
            disabled={isBusy}
          />
          <button
            onClick={handleAnalyze}
            disabled={isBusy || chartData.length === 0}
            className="
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
              bg-[#7C9CBF] hover:bg-[#6b8aad] active:bg-[#5e7a9a]
              text-white shadow-sm hover:shadow-md
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
              transition-all duration-150 whitespace-nowrap flex-shrink-0
            "
          >
            {isAnalyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.698-1.317 2.698H4.115c-1.347 0-2.317-1.698-1.317-2.698L4.2 15.3"
                  />
                </svg>
                Analyze Chart
              </>
            )}
          </button>
        </div>

        {/* Live price + status */}
        <div className="flex items-center gap-2 flex-shrink-0 hidden sm:flex">
          {currentPrice && !isLoadingData && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F0EEF0] rounded-xl">
              <span className="text-xs font-semibold text-[#1A1A2E]">{displayTicker}</span>
              <span className="text-xs font-mono font-bold text-[#7C9CBF]">
                ${formatDisplayPrice(currentPrice)}
              </span>
            </div>
          )}
          {/* NYSE open indicator */}
          <div
            title={isNYSEOpen() ? 'NYSE Open — auto-refreshing every 60s' : 'NYSE Closed'}
            className={`w-2 h-2 rounded-full transition-colors ${
              isBusy || isRefreshing
                ? 'bg-amber-400 animate-pulse'
                : isNYSEOpen()
                ? 'bg-[#4CAF7D] animate-pulse'
                : 'bg-[#B0B0C0]'
            }`}
          />
        </div>
      </header>

      {/* Error banner */}
      {dataError && (
        <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 bg-[#E07070]/8 border-b border-[#E07070]/15 text-[#c45c5c] text-xs">
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <span className="flex-1">{dataError}</span>
          <button
            onClick={() => fetchChartData(ticker, timeframe)}
            className="underline hover:no-underline font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 p-3 gap-3">
        {/* Chart card */}
        <div
          className="flex-1 min-h-0 bg-[#FAFAFA] rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-card overflow-hidden"
          style={{ minHeight: '55vh' }}
        >
          <TradingChart
            data={chartData}
            ticker={displayTicker}
            stopLoss={analysis?.stopLoss}
            takeProfit={analysis?.takeProfit}
            isLoading={isLoadingData}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Analysis panel */}
        <div
          className="flex-shrink-0 lg:w-80 xl:w-96 overflow-hidden"
          style={{ minHeight: '45vh' }}
        >
          <AnalysisPanel
            analysis={analysis}
            isLoading={isAnalyzing}
            error={analysisError}
            ticker={displayTicker}
            currentPrice={currentPrice}
            timeframe={timeframe}
            mtf={mtfAnalysis}
            news={news}
            newsLoading={isLoadingNews}
          />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="flex-shrink-0 px-4 py-2 bg-white border-t border-[rgba(0,0,0,0.06)]">
        <p className="text-center text-[11px] text-[#6B7280]">
          <span className="font-medium text-[#1A1A2E]">⚠ Disclaimer:</span> MarketAnalyst is for
          educational purposes only — not financial advice. Never risk money you cannot afford to
          lose.
        </p>
      </footer>
    </div>
  );
}
