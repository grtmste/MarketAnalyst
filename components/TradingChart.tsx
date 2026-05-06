'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type CandlestickSeriesOptions,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { OHLCVData } from '@/types';

interface Props {
  data: OHLCVData[];
  stopLoss?: number;
  takeProfit?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function TradingChart({
  data,
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
      timeScale: {
        borderColor: 'rgba(0,0,0,0.06)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
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

  // Update candlestick data and scroll to latest
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
    // Show the most recent candle at the right edge
    chartRef.current?.timeScale().scrollToRealTime();
  }, [data]);

  // Update SL/TP price lines
  useEffect(() => {
    if (!seriesRef.current) return;

    if (slLineRef.current) {
      seriesRef.current.removePriceLine(slLineRef.current);
      slLineRef.current = null;
    }
    if (tpLineRef.current) {
      seriesRef.current.removePriceLine(tpLineRef.current);
      tpLineRef.current = null;
    }

    if (stopLoss !== undefined) {
      slLineRef.current = seriesRef.current.createPriceLine({
        price: stopLoss,
        color: '#E07070',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: ' SL',
      });
    }
    if (takeProfit !== undefined) {
      tpLineRef.current = seriesRef.current.createPriceLine({
        price: takeProfit,
        color: '#4CAF7D',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: ' TP',
      });
    }
  }, [stopLoss, takeProfit]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

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
