'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  CrosshairMode,
  LineStyle,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type CandlestickSeriesOptions,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { OHLCVData, Timeframe } from '@/types';
import Logo from './Logo';

// Timeframes backed by intraday (minute/hour-level) candles, where the
// time-of-day is meaningful. Everything else is backed by daily/weekly/
// monthly bars whose timestamp is Yahoo's market-open marker, not a real
// intraday time — show date only for those to avoid a confusing fixed
// "13:30" tick label.
const INTRADAY_TIMEFRAMES = new Set<Timeframe>(['1M', '5M', '15M', '1H', '4H', '5D']);

// Lightweight Charts treats UTCTimestamp values as UTC and formats axis/crosshair
// labels in UTC by default. `new Date(seconds * 1000)` + the locale formatters
// below convert that instant into the viewer's own browser timezone instead.
function formatTickMark(time: UTCTimestamp, tickMarkType: TickMarkType): string {
  const date = new Date(time * 1000);
  switch (tickMarkType) {
    case TickMarkType.Year:
      return date.toLocaleDateString(undefined, { year: 'numeric' });
    case TickMarkType.Month:
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    case TickMarkType.DayOfMonth:
      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    case TickMarkType.Time:
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    case TickMarkType.TimeWithSeconds:
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    default:
      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
}

function formatCrosshairTime(time: UTCTimestamp, intraday: boolean): string {
  const date = new Date(time * 1000);
  if (intraday) {
    return date.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  data: OHLCVData[];
  ticker?: string;
  timeframe?: Timeframe;
  entry?: number;
  decision?: 'BUY' | 'SELL' | 'WAIT';
  stopLoss?: number;
  takeProfit?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function TradingChart({
  data,
  ticker,
  timeframe,
  entry,
  decision,
  stopLoss,
  takeProfit,
  isLoading,
  onRefresh,
  isRefreshing,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);
  const entryLineRef = useRef<IPriceLine | null>(null);

  // Overlay band/tag elements (positioned each frame from price coordinates)
  const tpBandRef = useRef<HTMLDivElement>(null);
  const slBandRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#FAFAFA' },
        textColor: '#6B7280',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(0,0,0,0.04)' },
        horzLines: { color: 'rgba(0,0,0,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#7C9CBF', labelBackgroundColor: '#7C9CBF' },
        horzLine: { color: '#7C9CBF', labelBackgroundColor: '#7C9CBF' },
      },
      rightPriceScale: {
        borderColor: 'rgba(0,0,0,0.06)',
        textColor: '#6B7280',
      },
      localization: {
        timeFormatter: (time: UTCTimestamp) =>
          formatCrosshairTime(time, timeframe ? INTRADAY_TIMEFRAMES.has(timeframe) : true),
      },
      timeScale: {
        borderColor: 'rgba(0,0,0,0.06)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        tickMarkFormatter: formatTickMark,
      },
      // Single-finger touch is left to the page (vertical scroll on mobile);
      // pinch-to-zoom still works for chart scale via handleScale.pinch.
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: false, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#4CAF7D',
      downColor: '#E07070',
      borderUpColor: '#4CAF7D',
      borderDownColor: '#E07070',
      wickUpColor: '#4CAF7D',
      wickDownColor: '#E07070',
    } as Partial<CandlestickSeriesOptions>);

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      slLineRef.current = null;
      tpLineRef.current = null;
    };
  }, []);

  // Update candlestick data and open at a sensible zoom
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;
    seriesRef.current.setData(
      data.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    // Open focused on the most recent ~110 candles (TradingView-style default
    // density) rather than dumping the full history. The user can scroll/zoom
    // back to see the rest; analysis still uses every fetched candle.
    const DEFAULT_BARS = 110;
    const ts = chartRef.current?.timeScale();
    if (ts) {
      if (data.length > DEFAULT_BARS) {
        ts.setVisibleLogicalRange({ from: data.length - DEFAULT_BARS, to: data.length + 3 });
      } else {
        ts.fitContent();
      }
    }
  }, [data]);

  // Toggle time-of-day display based on the selected timeframe. Daily+ bars
  // (1D/1W/4H proxy/etc.) carry a fixed market-open timestamp from Yahoo, so
  // showing it as a "time" is misleading — display the date only instead.
  useEffect(() => {
    if (!chartRef.current) return;
    const isIntraday = timeframe ? INTRADAY_TIMEFRAMES.has(timeframe) : true;
    chartRef.current.applyOptions({
      timeScale: { timeVisible: isIntraday, secondsVisible: false },
      localization: {
        timeFormatter: (time: UTCTimestamp) => formatCrosshairTime(time, isIntraday),
      },
    });
  }, [timeframe]);

  // Update Entry / SL / TP price lines
  useEffect(() => {
    if (!seriesRef.current) return;
    const series = seriesRef.current;

    [slLineRef, tpLineRef, entryLineRef].forEach((ref) => {
      if (ref.current) {
        series.removePriceLine(ref.current);
        ref.current = null;
      }
    });

    if (entry !== undefined && (stopLoss !== undefined || takeProfit !== undefined)) {
      entryLineRef.current = series.createPriceLine({
        price: entry,
        color: '#7C9CBF',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: ' Entry',
      });
    }
    if (stopLoss !== undefined) {
      slLineRef.current = series.createPriceLine({
        price: stopLoss,
        color: '#E07070',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: ' SL',
      });
    }
    if (takeProfit !== undefined) {
      tpLineRef.current = series.createPriceLine({
        price: takeProfit,
        color: '#4CAF7D',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: ' TP',
      });
    }
  }, [entry, stopLoss, takeProfit]);

  // Shade the profit (green) and risk (red) zones, kept aligned to the price
  // scale via an animation-frame loop so they track zoom/pan/auto-scale.
  useEffect(() => {
    const hasTrade =
      entry !== undefined && (stopLoss !== undefined || takeProfit !== undefined);

    const setBand = (
      el: HTMLDivElement | null,
      yA: number | null,
      yB: number | null
    ) => {
      if (!el) return;
      if (yA == null || yB == null) {
        el.style.display = 'none';
        return;
      }
      const top = Math.min(yA, yB);
      const height = Math.abs(yB - yA);
      el.style.display = 'block';
      el.style.top = `${top}px`;
      el.style.height = `${height}px`;
    };

    const update = () => {
      const series = seriesRef.current;
      if (series && hasTrade) {
        const yEntry = entry != null ? series.priceToCoordinate(entry) : null;
        const ySL = stopLoss != null ? series.priceToCoordinate(stopLoss) : null;
        const yTP = takeProfit != null ? series.priceToCoordinate(takeProfit) : null;
        setBand(tpBandRef.current, yEntry as number | null, yTP as number | null);
        setBand(slBandRef.current, yEntry as number | null, ySL as number | null);
        if (tagRef.current && yEntry != null) {
          tagRef.current.style.display = 'flex';
          tagRef.current.style.top = `${yEntry}px`;
        } else if (tagRef.current) {
          tagRef.current.style.display = 'none';
        }
      } else {
        [tpBandRef, slBandRef].forEach((r) => {
          if (r.current) r.current.style.display = 'none';
        });
        if (tagRef.current) tagRef.current.style.display = 'none';
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [entry, stopLoss, takeProfit]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Profit zone (green) — entry → take profit */}
      <div
        ref={tpBandRef}
        className="absolute left-0 right-0 z-[5] pointer-events-none bg-[#4CAF7D]/10 border-y border-[#4CAF7D]/20"
        style={{ display: 'none' }}
      />
      {/* Risk zone (red) — entry → stop loss */}
      <div
        ref={slBandRef}
        className="absolute left-0 right-0 z-[5] pointer-events-none bg-[#E07070]/10 border-y border-[#E07070]/20"
        style={{ display: 'none' }}
      />
      {/* Direction tag at the entry level */}
      {(decision === 'BUY' || decision === 'SELL') && (
        <div
          ref={tagRef}
          className="absolute left-3 z-[6] pointer-events-none -translate-y-1/2 items-center gap-1 px-2 py-0.5 rounded-md shadow-sm text-[11px] font-bold text-white"
          style={{
            display: 'none',
            backgroundColor: decision === 'SELL' ? '#E07070' : '#4CAF7D',
          }}
        >
          {decision === 'SELL' ? '▼ SHORT' : '▲ LONG'}
        </div>
      )}

      {/* Ticker watermark */}
      {ticker && data.length > 0 && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2.5 py-1.5 bg-white/75 backdrop-blur-sm rounded-lg shadow-sm pointer-events-none">
          <Logo symbol={ticker} size={20} />
          <span className="text-sm font-bold text-[#1A1A2E]/80 tracking-tight">{ticker}</span>
        </div>
      )}

      {/* Refresh button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isLoading || isRefreshing}
          title="Refresh chart data"
          className="
            absolute top-3 right-3 z-10
            w-7 h-7 flex items-center justify-center
            bg-white rounded-lg border border-[rgba(0,0,0,0.08)]
            text-[#6B7280] hover:text-[#1A1A2E] hover:border-[rgba(0,0,0,0.15)]
            shadow-sm hover:shadow transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          <svg
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAFA]/80 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-brand-secondary">Loading market data…</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F0EEF0] flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#C0C0C8]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <p className="text-brand-primary font-medium text-sm">Search for a symbol to begin</p>
            <p className="text-brand-secondary text-xs mt-1">
              e.g. AAPL · BTC-USD · SAP.DE · 9988.HK
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
