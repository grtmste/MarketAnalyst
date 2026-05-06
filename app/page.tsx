'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useCompletion } from 'ai/react';
import AnalysisPanel from '@/components/AnalysisPanel';
import TickerSearch from '@/components/TickerSearch';
import TimeframeSelector from '@/components/TimeframeSelector';
import type { OHLCVData, TradingAnalysis, Timeframe } from '@/types';

const TradingChart = dynamic(() => import('@/components/TradingChart'), { ssr: false });

function formatDisplayPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(2);
  return price.toFixed(4);
}

export default function Home() {
  const [ticker, setTicker] = useState('AAPL');
  const [displayTicker, setDisplayTicker] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartData, setChartData] = useState<OHLCVData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | undefined>();
  const [analysis, setAnalysis] = useState<TradingAnalysis | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const { complete, isLoading: isAnalyzing, error: aiError } = useCompletion({
    api: '/api/analyze',
    onFinish: (_, completion) => {
      setParseError(null);
      try {
        const clean = completion
          .trim()
          .replace(/^```(?:json)?\n?/, '')
          .replace(/\n?```$/, '');
        setAnalysis(JSON.parse(clean) as TradingAnalysis);
      } catch {
        const match = completion.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            setAnalysis(JSON.parse(match[0]) as TradingAnalysis);
          } catch {
            setParseError('Received malformed analysis response. Please try again.');
          }
        } else {
          setParseError('Could not parse analysis response. Please try again.');
        }
      }
    },
  });

  const fetchChartData = useCallback(async (symbol: string, tf: Timeframe) => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      const res = await fetch(
        `/api/market-data?ticker=${encodeURIComponent(symbol)}&timeframe=${tf}&limit=200`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch market data');
      setChartData(json.candles as OHLCVData[]);
      setCurrentPrice(json.currentPrice);
      setAnalysis(null);
      setDisplayTicker(json.ticker ?? symbol.toUpperCase());
    } catch (err: unknown) {
      setDataError(err instanceof Error ? err.message : 'Unknown error');
      setChartData([]);
      setCurrentPrice(undefined);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchChartData(ticker, timeframe);
  }, [ticker, timeframe, fetchChartData]);

  const handleTickerSelect = (symbol: string) => {
    setTicker(symbol);
  };

  const handleAnalyze = () => {
    if (!ticker || isAnalyzing || isLoadingData) return;
    setAnalysis(null);
    setParseError(null);
    complete('', { body: { ticker, timeframe } });
  };

  const analysisError = parseError ?? (aiError ? aiError.message : null);
  const isBusy = isLoadingData || isAnalyzing;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-[rgba(0,0,0,0.06)] shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#7C9CBF] flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
          <TimeframeSelector value={timeframe} onChange={setTimeframe} disabled={isBusy} />
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
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.698-1.317 2.698H4.115c-1.347 0-2.317-1.698-1.317-2.698L4.2 15.3" />
                </svg>
                Analyze Chart
              </>
            )}
          </button>
        </div>

        {/* Live price badge */}
        <div className="flex items-center gap-2 flex-shrink-0 hidden sm:flex">
          {currentPrice && !isLoadingData && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F0EEF0] rounded-xl">
              <span className="text-xs font-semibold text-[#1A1A2E]">{displayTicker}</span>
              <span className="text-xs font-mono font-bold text-[#7C9CBF]">
                ${formatDisplayPrice(currentPrice)}
              </span>
            </div>
          )}
          <div
            title={isBusy ? 'Loading…' : 'Live'}
            className={`w-2 h-2 rounded-full transition-colors ${
              isBusy ? 'bg-amber-400 animate-pulse' : 'bg-[#4CAF7D]'
            }`}
          />
        </div>
      </header>

      {/* Error banner */}
      {dataError && (
        <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 bg-[#E07070]/8 border-b border-[#E07070]/15 text-[#c45c5c] text-xs">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
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
        {/* Chart card — ~70% */}
        <div
          className="flex-1 min-h-0 bg-[#FAFAFA] rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-card overflow-hidden"
          style={{ minHeight: '55vh' }}
        >
          <TradingChart
            data={chartData}
            stopLoss={analysis?.stopLoss}
            takeProfit={analysis?.takeProfit}
            isLoading={isLoadingData}
          />
        </div>

        {/* Analysis panel — ~30% */}
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
