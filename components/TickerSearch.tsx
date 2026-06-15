'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import Logo from './Logo';

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: 'Stock' | 'ETF' | 'Fund' | string;
}

interface Props {
  value: string;
  onSelect: (ticker: string) => void;
  disabled?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  ETF: 'bg-purple-100 text-purple-700',
  Fund: 'bg-amber-100 text-amber-700',
  Stock: 'bg-sky-100 text-sky-700',
};

// Curated cross-market watchlist shown when the search box is focused but empty —
// sorted alphabetically so it can be browsed like a dropdown.
const POPULAR_TICKERS: SearchResult[] = [
  { symbol: '0700.HK', name: 'Tencent Holdings Ltd.', exchange: 'HKEX', type: 'Stock' },
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'ASML.AS', name: 'ASML Holding N.V.', exchange: 'AEX', type: 'Stock' },
  { symbol: 'BABA', name: 'Alibaba Group Holding', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'BTC-USD', name: 'Bitcoin USD', exchange: 'CCC', type: 'Stock' },
  { symbol: 'DIS', name: 'Walt Disney Co.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'ETH-USD', name: 'Ethereum USD', exchange: 'CCC', type: 'Stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'MC.PA', name: 'LVMH Moët Hennessy', exchange: 'Paris', type: 'Stock' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'SAP.DE', name: 'SAP SE', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSEARCA', type: 'ETF' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', type: 'Stock' },
].sort((a, b) => a.symbol.localeCompare(b.symbol));

export default function TickerSearch({ value, onSelect, disabled }: Props) {
  const [input, setInput] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes (e.g. selecting from chart)
  useEffect(() => {
    setInput(value);
  }, [value]);

  const search = useCallback(async (query: string) => {
    if (query.trim().length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const r: SearchResult[] = data.results ?? [];
      setResults(r);
      setIsOpen(r.length > 0);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInput(v);
    setIsOpen(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const handleSelect = (r: SearchResult) => {
    setInput(r.symbol);
    setIsOpen(false);
    setResults([]);
    onSelect(r.symbol);
  };

  // When the query is empty, browse the alphabetical popular-ticker list instead of search results
  const activeList = input.trim().length > 0 ? results : POPULAR_TICKERS;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, activeList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeList[activeIndex]) {
        handleSelect(activeList[activeIndex]);
      } else if (input.trim()) {
        setIsOpen(false);
        onSelect(input.trim().toUpperCase());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cleanup timer
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const typeColor = (type: string) => TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-500';

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        {/* Search icon */}
        <svg
          className="absolute left-3 w-3.5 h-3.5 text-[#6B7280] pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder="Search ticker…"
          className="
            pl-8 pr-3 py-2 w-52 sm:w-64 rounded-xl text-sm font-medium
            bg-white border border-[rgba(0,0,0,0.08)] text-[#1A1A2E]
            placeholder:text-[#6B7280] placeholder:font-normal
            focus:outline-none focus:border-[#7C9CBF] focus:ring-2 focus:ring-[#7C9CBF]/20
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150 shadow-sm
          "
        />

        {/* Loading spinner inside input */}
        {isSearching && (
          <div className="absolute right-3 w-3.5 h-3.5 border border-[#7C9CBF] border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && activeList.length > 0 && (
        <div className="absolute top-full left-0 mt-1.5 w-80 sm:w-96 bg-white rounded-2xl shadow-dropdown border border-[rgba(0,0,0,0.06)] z-50 overflow-hidden">
          <div className="px-4 pt-2.5 pb-1.5 border-b border-[rgba(0,0,0,0.05)]">
            <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest">
              {input.trim().length > 0 ? 'Search results' : 'Popular · A–Z'}
            </p>
          </div>
          <div className="py-1 max-h-80 overflow-y-auto">
            {activeList.map((result, i) => (
              <button
                key={result.symbol}
                onMouseDown={(e) => {
                  e.preventDefault(); // Keep focus on input
                  handleSelect(result);
                }}
                className={`
                  w-full flex items-center justify-between px-4 py-2.5 text-left
                  transition-colors duration-100
                  ${i === activeIndex ? 'bg-[#F0EEF0]' : 'hover:bg-[#F8F8F8]'}
                `}
              >
                {/* Left: logo + symbol + name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <Logo symbol={result.symbol} size={32} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A2E] leading-tight">
                      {result.symbol}
                    </p>
                    <p className="text-xs text-[#6B7280] truncate max-w-[180px] leading-tight mt-0.5">
                      {result.name}
                    </p>
                  </div>
                </div>

                {/* Right: exchange + type badges */}
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {result.exchange && (
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-[#F0EEF0] text-[#6B7280] font-medium">
                      {result.exchange}
                    </span>
                  )}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${typeColor(result.type)}`}
                  >
                    {result.type}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-[rgba(0,0,0,0.05)]">
            <p className="text-xs text-[#6B7280]">
              Press <kbd className="px-1 py-0.5 rounded bg-[#F0EEF0] font-mono text-[10px]">↵</kbd> to load typed symbol
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
