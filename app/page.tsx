'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useCompletion } from 'ai/react';
import AnalysisPanel from '@/components/AnalysisPanel';
import TickerInput from '@/components/TickerInput';
import TimeframeSelector from '@/components/TimeframeSelector';
import type { OHLCVData, TradingAnalysis, Timeframe } from '@/types';

const TradingChart = dynamic(() => import('@/components/TradingChart'), { ssr: false });

export default function Home() {
  const [ticker, setTicker] = useState('AAPL');
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
        const trimmed = completion.trim();
        // Strip any markdown code fences Claude might add despite instructions
        const clean = trimmed.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        const data = JSON.parse(clean) as TradingAnalysis;
        setAnalysis(data);
      } catch {
        // Try to extract JSON object from arbitrary text
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

  const handleAnalyze = () => {
    if (!ticker || isAnalyzing || isLoadingData) return;
    setAnalysis(null);
    setParseError(null);
    complete('', { body: { ticker, timeframe } });
  };

  const analysisError =
    parseError ?? (aiError ? aiError.message : null);

  const isBusy = isLoadingData || isAnalyzing;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0a0f1e]">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[#0f172a] border-b border-[#1e293b]">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-xs font-bold">
            M
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-100 hidden sm:block">
            MarketAnalyst
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <TickerInput value={ticker} onSubmit={setTicker} disabled={isBusy} />
          <TimeframeSelector
            value={timeframe}
            onChange={setTimeframe}
            disabled={isBusy}
          />
          <button
            onClick={handleAnalyze}
            disabled={isBusy || chartData.length === 0}
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold
              bg-blue-600 hover:bg-blue-500 text-white
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150 shadow-md shadow-blue-900/30
              whitespace-nowrap
            "
          >
            {isAnalyzing ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <span>🤖</span>
                Analyze Chart
              </>
            )}
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 hidden sm:flex">
          {currentPrice && !isLoadingData && (
            <span className="text-xs font-mono text-slate-300">
              {ticker} <span className="text-blue-400">${currentPrice >= 10000 ? currentPrice.toFixed(0) : currentPrice >= 100 ? currentPrice.toFixed(2) : currentPrice.toFixed(4)}</span>
            </span>
          )}
          <div className={`w-1.5 h-1.5 rounded-full ${isBusy ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
        </div>
      </header>

      {/* Error banner */}
      {dataError && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-950/50 border-b border-red-900/50 text-red-300 text-xs">
          <span>⚠</span>
          <span>{dataError}</span>
          <button
            onClick={() => fetchChartData(ticker, timeframe)}
            className="ml-auto underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Chart — 70% on desktop */}
        <div className="flex-1 min-h-0 lg:min-h-full border-b lg:border-b-0 lg:border-r border-[#1e293b]" style={{ minHeight: '55vh' }}>
          <TradingChart
            data={chartData}
            stopLoss={analysis?.stopLoss}
            takeProfit={analysis?.takeProfit}
            isLoading={isLoadingData}
          />
        </div>

        {/* Analysis panel — 30% on desktop */}
        <div className="flex-shrink-0 lg:w-80 xl:w-96 bg-[#0a0f1e] overflow-hidden" style={{ minHeight: '45vh' }}>
          <AnalysisPanel
            analysis={analysis}
            isLoading={isAnalyzing}
            error={analysisError}
            ticker={ticker}
            currentPrice={currentPrice}
          />
        </div>
      </main>

      {/* Footer disclaimer */}
      <footer className="flex-shrink-0 px-4 py-1.5 bg-[#0f172a] border-t border-[#1e293b]">
        <p className="text-center text-xs text-slate-600">
          ⚠ <span className="font-medium text-slate-500">Disclaimer:</span> MarketAnalyst is for
          educational and informational purposes only. This is not financial advice. Never trade with
          money you cannot afford to lose. Past performance does not guarantee future results.
        </p>
      </footer>
    </div>
  );
}
