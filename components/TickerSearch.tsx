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

// Curated cross-market catalog (US · EU · Switzerland · China) shown when the
// search box is focused. Browsable A–Z; live search still hits the API.
const POPULAR_TICKERS: SearchResult[] = [
  // ── US — mega/large cap ──
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'ABNB', name: 'Airbnb Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'AMGN', name: 'Amgen Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'BA', name: 'Boeing Co.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'BAC', name: 'Bank of America Corp.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway B', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'C', name: 'Citigroup Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'COIN', name: 'Coinbase Global Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'COST', name: 'Costco Wholesale Corp.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'CRM', name: 'Salesforce Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'CVX', name: 'Chevron Corp.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'DIS', name: 'Walt Disney Co.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'F', name: 'Ford Motor Co.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'GE', name: 'GE Aerospace', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'GM', name: 'General Motors Co.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'GS', name: 'Goldman Sachs Group', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'HD', name: 'Home Depot Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'IBM', name: 'IBM Corp.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'INTC', name: 'Intel Corp.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'KO', name: 'Coca-Cola Co.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'LLY', name: 'Eli Lilly & Co.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'MA', name: 'Mastercard Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'MCD', name: "McDonald's Corp.", exchange: 'NYSE', type: 'Stock' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'MRK', name: 'Merck & Co. Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'MS', name: 'Morgan Stanley', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'NKE', name: 'Nike Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'ORCL', name: 'Oracle Corp.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'PLTR', name: 'Palantir Technologies', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'QCOM', name: 'Qualcomm Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'SBUX', name: 'Starbucks Corp.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'TXN', name: 'Texas Instruments Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'UBER', name: 'Uber Technologies Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'UNH', name: 'UnitedHealth Group', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'VZ', name: 'Verizon Communications', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp.', exchange: 'NYSE', type: 'Stock' },

  // ── US — ETFs ──
  { symbol: 'ARKK', name: 'ARK Innovation ETF', exchange: 'NYSEARCA', type: 'ETF' },
  { symbol: 'DIA', name: 'SPDR Dow Jones ETF', exchange: 'NYSEARCA', type: 'ETF' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSEARCA', type: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', type: 'ETF' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSEARCA', type: 'ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'NYSEARCA', type: 'ETF' },
  { symbol: 'VTI', name: 'Vanguard Total Market ETF', exchange: 'NYSEARCA', type: 'ETF' },

  // ── Crypto ──
  { symbol: 'BTC-USD', name: 'Bitcoin USD', exchange: 'Crypto', type: 'Stock' },
  { symbol: 'ETH-USD', name: 'Ethereum USD', exchange: 'Crypto', type: 'Stock' },
  { symbol: 'SOL-USD', name: 'Solana USD', exchange: 'Crypto', type: 'Stock' },
  { symbol: 'XRP-USD', name: 'XRP USD', exchange: 'Crypto', type: 'Stock' },

  // ── Germany (XETRA) ──
  { symbol: 'ADS.DE', name: 'Adidas AG', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'ALV.DE', name: 'Allianz SE', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'BAS.DE', name: 'BASF SE', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'BAYN.DE', name: 'Bayer AG', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'BMW.DE', name: 'Bayerische Motoren Werke', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'DBK.DE', name: 'Deutsche Bank AG', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'DTE.DE', name: 'Deutsche Telekom AG', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'IFX.DE', name: 'Infineon Technologies', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'MBG.DE', name: 'Mercedes-Benz Group AG', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'MUV2.DE', name: 'Münchener Rück (Munich Re)', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'SAP.DE', name: 'SAP SE', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'SIE.DE', name: 'Siemens AG', exchange: 'XETRA', type: 'Stock' },
  { symbol: 'VOW3.DE', name: 'Volkswagen AG (Pref)', exchange: 'XETRA', type: 'Stock' },

  // ── France (Euronext Paris) ──
  { symbol: 'AI.PA', name: 'Air Liquide S.A.', exchange: 'Paris', type: 'Stock' },
  { symbol: 'AIR.PA', name: 'Airbus SE', exchange: 'Paris', type: 'Stock' },
  { symbol: 'BNP.PA', name: 'BNP Paribas S.A.', exchange: 'Paris', type: 'Stock' },
  { symbol: 'KER.PA', name: 'Kering S.A.', exchange: 'Paris', type: 'Stock' },
  { symbol: 'MC.PA', name: 'LVMH Moët Hennessy', exchange: 'Paris', type: 'Stock' },
  { symbol: 'OR.PA', name: "L'Oréal S.A.", exchange: 'Paris', type: 'Stock' },
  { symbol: 'RMS.PA', name: 'Hermès International', exchange: 'Paris', type: 'Stock' },
  { symbol: 'SAN.PA', name: 'Sanofi S.A.', exchange: 'Paris', type: 'Stock' },
  { symbol: 'SU.PA', name: 'Schneider Electric SE', exchange: 'Paris', type: 'Stock' },
  { symbol: 'TTE.PA', name: 'TotalEnergies SE', exchange: 'Paris', type: 'Stock' },

  // ── Netherlands (Euronext Amsterdam) ──
  { symbol: 'ADYEN.AS', name: 'Adyen N.V.', exchange: 'AEX', type: 'Stock' },
  { symbol: 'ASML.AS', name: 'ASML Holding N.V.', exchange: 'AEX', type: 'Stock' },
  { symbol: 'HEIA.AS', name: 'Heineken N.V.', exchange: 'AEX', type: 'Stock' },
  { symbol: 'INGA.AS', name: 'ING Groep N.V.', exchange: 'AEX', type: 'Stock' },
  { symbol: 'PRX.AS', name: 'Prosus N.V.', exchange: 'AEX', type: 'Stock' },

  // ── UK (London Stock Exchange) ──
  { symbol: 'AZN.L', name: 'AstraZeneca PLC', exchange: 'LSE', type: 'Stock' },
  { symbol: 'BP.L', name: 'BP PLC', exchange: 'LSE', type: 'Stock' },
  { symbol: 'GSK.L', name: 'GSK PLC', exchange: 'LSE', type: 'Stock' },
  { symbol: 'HSBA.L', name: 'HSBC Holdings PLC', exchange: 'LSE', type: 'Stock' },
  { symbol: 'RIO.L', name: 'Rio Tinto PLC', exchange: 'LSE', type: 'Stock' },
  { symbol: 'SHEL.L', name: 'Shell PLC', exchange: 'LSE', type: 'Stock' },
  { symbol: 'ULVR.L', name: 'Unilever PLC', exchange: 'LSE', type: 'Stock' },

  // ── Spain / Italy ──
  { symbol: 'ENEL.MI', name: 'Enel S.p.A.', exchange: 'Milan', type: 'Stock' },
  { symbol: 'ENI.MI', name: 'Eni S.p.A.', exchange: 'Milan', type: 'Stock' },
  { symbol: 'IBE.MC', name: 'Iberdrola S.A.', exchange: 'Madrid', type: 'Stock' },
  { symbol: 'ITX.MC', name: 'Industria de Diseño (Zara)', exchange: 'Madrid', type: 'Stock' },
  { symbol: 'RACE.MI', name: 'Ferrari N.V.', exchange: 'Milan', type: 'Stock' },
  { symbol: 'SAN.MC', name: 'Banco Santander S.A.', exchange: 'Madrid', type: 'Stock' },

  // ── Switzerland (SIX) ──
  { symbol: 'ABBN.SW', name: 'ABB Ltd.', exchange: 'SIX', type: 'Stock' },
  { symbol: 'CFR.SW', name: 'Richemont S.A.', exchange: 'SIX', type: 'Stock' },
  { symbol: 'NESN.SW', name: 'Nestlé S.A.', exchange: 'SIX', type: 'Stock' },
  { symbol: 'NOVN.SW', name: 'Novartis AG', exchange: 'SIX', type: 'Stock' },
  { symbol: 'ROG.SW', name: 'Roche Holding AG', exchange: 'SIX', type: 'Stock' },
  { symbol: 'UBSG.SW', name: 'UBS Group AG', exchange: 'SIX', type: 'Stock' },
  { symbol: 'ZURN.SW', name: 'Zurich Insurance Group', exchange: 'SIX', type: 'Stock' },

  // ── China — Hong Kong listings ──
  { symbol: '0700.HK', name: 'Tencent Holdings Ltd.', exchange: 'HKEX', type: 'Stock' },
  { symbol: '0941.HK', name: 'China Mobile Ltd.', exchange: 'HKEX', type: 'Stock' },
  { symbol: '1211.HK', name: 'BYD Co. Ltd.', exchange: 'HKEX', type: 'Stock' },
  { symbol: '1810.HK', name: 'Xiaomi Corp.', exchange: 'HKEX', type: 'Stock' },
  { symbol: '2318.HK', name: 'Ping An Insurance', exchange: 'HKEX', type: 'Stock' },
  { symbol: '3690.HK', name: 'Meituan', exchange: 'HKEX', type: 'Stock' },
  { symbol: '9618.HK', name: 'JD.com Inc.', exchange: 'HKEX', type: 'Stock' },
  { symbol: '9988.HK', name: 'Alibaba Group Holding', exchange: 'HKEX', type: 'Stock' },
  { symbol: '9999.HK', name: 'NetEase Inc.', exchange: 'HKEX', type: 'Stock' },

  // ── China — US-listed ADRs ──
  { symbol: 'BABA', name: 'Alibaba Group (ADR)', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'BIDU', name: 'Baidu Inc. (ADR)', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'JD', name: 'JD.com Inc. (ADR)', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'LI', name: 'Li Auto Inc. (ADR)', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'NIO', name: 'NIO Inc. (ADR)', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'PDD', name: 'PDD Holdings (ADR)', exchange: 'NASDAQ', type: 'Stock' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor (ADR)', exchange: 'NYSE', type: 'Stock' },
  { symbol: 'XPEV', name: 'XPeng Inc. (ADR)', exchange: 'NYSE', type: 'Stock' },
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

  // Show live search results when a query has matches; otherwise fall back to
  // the alphabetical popular list so the dropdown is always browsable.
  const showingResults = input.trim().length > 0 && results.length > 0;
  const activeList = showingResults ? results : POPULAR_TICKERS;

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
            pl-8 pr-9 py-2 w-52 sm:w-64 rounded-xl text-sm font-medium
            bg-white border border-[rgba(0,0,0,0.08)] text-[#1A1A2E]
            placeholder:text-[#6B7280] placeholder:font-normal
            focus:outline-none focus:border-[#7C9CBF] focus:ring-2 focus:ring-[#7C9CBF]/20
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150 shadow-sm
          "
        />

        {/* Loading spinner inside input */}
        {isSearching ? (
          <div className="absolute right-3 w-3.5 h-3.5 border border-[#7C9CBF] border-t-transparent rounded-full animate-spin" />
        ) : (
          /* Dropdown toggle — click to browse the full list without typing */
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault(); // don't steal focus / re-trigger onFocus
              if (isOpen) {
                setIsOpen(false);
              } else {
                inputRef.current?.focus();
                setIsOpen(true);
              }
            }}
            disabled={disabled}
            title="Browse stocks"
            className="
              absolute right-2 w-6 h-6 flex items-center justify-center rounded-md
              text-[#6B7280] hover:text-[#1A1A2E] hover:bg-[#F0EEF0]
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-150
            "
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && activeList.length > 0 && (
        <div className="absolute top-full left-0 mt-1.5 w-80 sm:w-96 bg-white rounded-2xl shadow-dropdown border border-[rgba(0,0,0,0.06)] z-50 overflow-hidden">
          <div className="px-4 pt-2.5 pb-1.5 border-b border-[rgba(0,0,0,0.05)]">
            <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest">
              {showingResults ? 'Search results' : 'Popular · A–Z'}
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
