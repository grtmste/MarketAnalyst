'use client';

import { useEffect, useState } from 'react';
import type { TradingAnalysis, MultiTimeframeAnalysis, NewsArticle } from '@/types';

interface Props {
  analysis: TradingAnalysis | null;
  isLoading: boolean;
  error: string | null;
  ticker?: string;
  currentPrice?: number;
  timeframe?: string;
  mtf?: MultiTimeframeAnalysis | null;
  news?: NewsArticle[];
  newsLoading?: boolean;
  // Effective trade levels (entry may be user-overridden; SL/TP shift with it).
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  entryEdited?: boolean;
  onEntryChange?: (value: number | null) => void;
}

// Human-readable horizon for each timeframe, used in tooltips
const HORIZON: Record<string, string> = {
  '1M': '1-minute (scalp)',
  '5M': '5-minute (scalp)',
  '15M': '15-minute (intraday)',
  '1H': '1-hour (intraday)',
  '4H': '4-hour (swing)',
  '1D': 'daily (swing)',
  '5D': '5-day',
  '1W': 'weekly (position)',
  '3M': '3-month',
  '6M': '6-month',
  YTD: 'year-to-date',
  '1Y': '1-year (long-term)',
  '5Y': '5-year (long-term)',
  ALL: 'all-history (long-term)',
};

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group ml-1.5 align-middle">
      <span
        className="w-3.5 h-3.5 flex items-center justify-center rounded-full border border-[#B8B5C0]
                   text-[#9B98A5] text-[9px] font-bold leading-none cursor-help
                   hover:border-[#7C9CBF] hover:text-[#7C9CBF] transition-colors"
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute z-50 left-0 top-full mt-1.5 w-52
                   rounded-lg bg-[#1A1A2E] text-white text-[10px] leading-relaxed p-2.5
                   opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-dropdown"
      >
        {text}
      </span>
    </span>
  );
}

const DECISION_CONFIG = {
  BUY: {
    bgClass: 'bg-[#4CAF7D]/8',
    borderClass: 'border-[#4CAF7D]/20',
    textClass: 'text-[#3a9668]',
    dotClass: 'bg-[#4CAF7D]',
    badgeBg: 'bg-[#4CAF7D]/10',
    label: 'BUY',
  },
  SELL: {
    bgClass: 'bg-[#E07070]/8',
    borderClass: 'border-[#E07070]/20',
    textClass: 'text-[#c45c5c]',
    dotClass: 'bg-[#E07070]',
    badgeBg: 'bg-[#E07070]/10',
    label: 'SELL',
  },
  WAIT: {
    bgClass: 'bg-[#B0B0C0]/10',
    borderClass: 'border-[#B0B0C0]/30',
    textClass: 'text-[#8888A0]',
    dotClass: 'bg-[#B0B0C0]',
    badgeBg: 'bg-[#B0B0C0]/15',
    label: 'WAIT',
  },
} as const;

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(2);
  return price.toFixed(4);
}

// Signed distance of a level from the entry, as "$amount · %". Lets the trader
// see how far the stop/target sits from entry regardless of the absolute price.
function levelHint(level: number, entry: number): string {
  const diff = level - entry;
  const pct = entry ? (diff / entry) * 100 : 0;
  const sign = diff >= 0 ? '+' : '−';
  return `${sign}$${formatPrice(Math.abs(diff))} · ${sign}${Math.abs(pct).toFixed(2)}%`;
}

function timeAgo(unixSeconds: number): string {
  if (!unixSeconds) return '';
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ALIGNMENT_CONFIG = {
  aligned: {
    textClass: 'text-[#3a9668]',
    bgClass: 'bg-[#4CAF7D]/8',
    borderClass: 'border-[#4CAF7D]/20',
    label: 'Aligned',
  },
  partial: {
    textClass: 'text-[#b8862e]',
    bgClass: 'bg-[#F0A854]/10',
    borderClass: 'border-[#F0A854]/25',
    label: 'Partial',
  },
  conflicting: {
    textClass: 'text-[#c45c5c]',
    bgClass: 'bg-[#E07070]/8',
    borderClass: 'border-[#E07070]/20',
    label: 'Conflicting',
  },
} as const;

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[#FAFAFA] rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

function SectionLabel({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <p className="flex items-center text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest mb-3">
      {children}
      {tooltip && <InfoTooltip text={tooltip} />}
    </p>
  );
}

function MetricRow({
  label,
  value,
  valueColor,
  tooltip,
  hint,
}: {
  label: string;
  value: string;
  valueColor?: string;
  tooltip?: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0">
      <span className="flex items-center text-xs text-[#6B7280]">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      <span className="flex flex-col items-end leading-tight">
        <span className={`text-xs font-semibold font-mono ${valueColor ?? 'text-[#1A1A2E]'}`}>
          {value}
        </span>
        {hint && <span className="text-[10px] font-mono text-[#9B98A5] mt-0.5">{hint}</span>}
      </span>
    </div>
  );
}

// Editable entry-price row: lets the trader type their real broker fill so the
// SL/TP re-anchor to it (feeds differ, so the app's price rarely matches a
// broker to the cent). Keeps a local text draft to allow free typing.
function EntryEditor({
  entry,
  edited,
  onChange,
}: {
  entry: number;
  edited: boolean;
  onChange: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState<string>('');
  const [focused, setFocused] = useState(false);

  // Mirror the effective entry into the field whenever it changes externally
  // (new analysis, reset) and the user isn't mid-edit.
  useEffect(() => {
    if (!focused) setDraft(String(entry));
  }, [entry, focused]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(null);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) onChange(parsed);
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.04)]">
      <span className="flex items-center text-xs text-[#6B7280]">
        Entry
        <InfoTooltip text="The price your trade is anchored to. Type your real broker fill here — the app's data feed (Yahoo) rarely matches your broker to the cent, so setting your actual entry re-anchors the Stop Loss and Take Profit while keeping the same distances and risk/reward." />
      </span>
      <span className="flex items-center gap-1.5">
        {edited && (
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Reset to the analyzed price"
            className="text-[10px] font-semibold text-[#7C9CBF] hover:text-[#5e7a9a] transition-colors"
          >
            reset
          </button>
        )}
        <span className="flex items-center rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1 focus-within:border-[#7C9CBF] focus-within:ring-2 focus-within:ring-[#7C9CBF]/20 transition-all">
          <span className="text-xs font-mono text-[#9B98A5] mr-0.5">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={draft}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              setDraft(e.target.value);
              commit(e.target.value);
            }}
            onBlur={() => {
              setFocused(false);
              commit(draft);
            }}
            className="w-20 bg-transparent text-right text-xs font-semibold font-mono text-[#1A1A2E] focus:outline-none"
          />
        </span>
      </span>
    </div>
  );
}

function MultiTimeframeSection({ mtf }: { mtf: MultiTimeframeAnalysis }) {
  const cfg = ALIGNMENT_CONFIG[mtf.alignment];
  return (
    <Card className="p-4">
      <SectionLabel tooltip="The same signal engine run on three related timeframes — one above, one at, and one below your selection — to check whether they agree. Agreement across timeframes is a stronger signal than any single timeframe alone.">
        Multi-Timeframe Check
      </SectionLabel>
      <div className="space-y-2 mb-3">
        {mtf.signals.map((s) => {
          const dCfg = DECISION_CONFIG[s.decision];
          return (
            <div key={s.timeframe} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${dCfg.dotClass}`} />
                <span className="text-xs text-[#6B7280]">{s.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${dCfg.textClass}`}>{dCfg.label}</span>
                <span className="text-[10px] font-mono text-[#9B98A5]">{s.confidence}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className={`rounded-lg px-3 py-2 border ${cfg.borderClass} ${cfg.bgClass}`}>
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${cfg.textClass}`}>
          {cfg.label}
        </p>
        <p className="text-xs text-[#1A1A2E] leading-relaxed">{mtf.summary}</p>
      </div>
    </Card>
  );
}

function NewsSection({
  news,
  isLoading,
  ticker,
}: {
  news?: NewsArticle[];
  isLoading?: boolean;
  ticker?: string;
}) {
  return (
    <Card className="p-4">
      <SectionLabel tooltip="Recent headlines aggregated from multiple financial news sources (Reuters, Bloomberg, Motley Fool, etc.) that may be moving this stock — useful context before entering a trade.">
        Latest News
      </SectionLabel>
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 bg-[#F0EEF0] rounded animate-pulse w-full" />
              <div className="h-2.5 bg-[#F0EEF0] rounded animate-pulse w-1/3" />
            </div>
          ))}
        </div>
      ) : !news || news.length === 0 ? (
        <p className="text-xs text-[#6B7280]">
          No recent news found{ticker ? ` for ${ticker}` : ''}.
        </p>
      ) : (
        <div className="divide-y divide-[rgba(0,0,0,0.04)]">
          {news.map((article, i) => (
            <a
              key={i}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2.5 first:pt-0 last:pb-0 group"
            >
              <p className="text-xs font-medium text-[#1A1A2E] leading-snug line-clamp-2 group-hover:text-[#7C9CBF] transition-colors">
                {article.title}
              </p>
              <p className="text-[10px] text-[#6B7280] mt-1">
                {article.publisher}
                {article.publishedAt ? ` · ${timeAgo(article.publishedAt)}` : ''}
              </p>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function AnalysisPanel({
  analysis,
  isLoading,
  error,
  ticker,
  currentPrice,
  timeframe = '1D',
  mtf,
  news,
  newsLoading,
  entry,
  stopLoss,
  takeProfit,
  entryEdited,
  onEntryChange,
}: Props) {
  const horizon = HORIZON[timeframe] ?? `${timeframe} timeframe`;
  if (isLoading) {
    return (
      <div className="lg:h-full flex flex-col items-center justify-center gap-5 p-6 min-h-[320px]">
        <div className="relative">
          <div className="w-14 h-14 border-2 border-[#7C9CBF]/20 rounded-full" />
          <div className="absolute inset-0 w-14 h-14 border-2 border-[#7C9CBF] border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#7C9CBF]" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#1A1A2E]">Analyzing {ticker}…</p>
          <p className="text-xs text-[#6B7280] mt-1">Reading the market</p>
        </div>
        <div className="w-full space-y-2.5">
          {['Scanning price action', 'Evaluating indicators', 'Calculating risk levels'].map(
            (step) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7C9CBF] pulse-glow" />
                <span className="text-xs text-[#6B7280]">{step}</span>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:h-full flex flex-col items-center justify-center p-6 gap-4 min-h-[320px]">
        <div className="w-12 h-12 rounded-2xl bg-[#E07070]/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#E07070]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#1A1A2E]">Analysis Failed</p>
          <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed max-w-[220px]">{error}</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="lg:h-full lg:overflow-y-auto p-4 space-y-3 fade-in-up">
        <div className="flex flex-col items-center justify-center gap-5 py-6">
          <div className="w-16 h-16 rounded-2xl bg-[#F0EEF0] flex items-center justify-center">
            <svg className="w-7 h-7 text-[#7C9CBF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.698-1.317 2.698H4.115c-1.347 0-2.317-1.698-1.317-2.698L4.2 15.3" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#1A1A2E]">AI Analysis</p>
            <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed max-w-[200px]">
              Click &ldquo;Analyze Chart&rdquo; to receive a trading signal
            </p>
          </div>
          <Card className="w-full p-4">
            <div className="space-y-2">
              {[
                'Decision — BUY / SELL / WAIT',
                'Confidence score',
                'Stop Loss & Take Profit',
                'Risk / Reward ratio',
                'Key support & resistance',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C0C8D8] flex-shrink-0" />
                  <span className="text-xs text-[#6B7280]">{item}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <NewsSection news={news} isLoading={newsLoading} ticker={ticker} />
      </div>
    );
  }

  const cfg = DECISION_CONFIG[analysis.decision];
  const rrRatio = analysis.riskRewardRatio?.toFixed(2) ?? 'N/A';

  // Effective trade levels (fall back to the raw analysis if not supplied).
  const effEntry = entry ?? analysis.entryPrice;
  const effStopLoss = stopLoss ?? analysis.stopLoss;
  const effTakeProfit = takeProfit ?? analysis.takeProfit;

  return (
    <div className="lg:h-full lg:overflow-y-auto p-4 space-y-3 fade-in-up">
      {/* Decision */}
      <Card className={`p-4 border ${cfg.borderClass} ${cfg.bgClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
            <span className="flex items-center text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest">
              Signal
              <InfoTooltip
                text={`The engine's overall call — BUY, SELL, or WAIT — from a weighted blend of 6 technical signals on the ${horizon} chart. WAIT means the signals conflict, so no clear edge.`}
              />
            </span>
          </div>
          {currentPrice && (
            <span className="text-xs font-mono text-[#6B7280]">
              ${formatPrice(currentPrice)}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between">
          <span className={`text-4xl font-bold tracking-wide ${cfg.textClass}`}>
            {cfg.label}
          </span>
          {ticker && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${cfg.badgeBg} ${cfg.textClass}`}
            >
              {ticker}
            </span>
          )}
        </div>
      </Card>

      {/* Confidence */}
      <Card className="p-4">
        <SectionLabel tooltip="How strongly the 6 signals agree with each other. Higher means more of them point the same way. This is a measure of signal alignment — not a probability of profit.">
          Confidence
        </SectionLabel>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#6B7280]">
            {analysis.confidence >= 70
              ? 'High conviction'
              : analysis.confidence >= 45
              ? 'Moderate conviction'
              : 'Low conviction'}
          </span>
          <span className={`text-sm font-bold font-mono ${cfg.textClass}`}>
            {analysis.confidence}%
          </span>
        </div>
        <div className="w-full bg-[#F0EEF0] rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${analysis.confidence}%`,
              backgroundColor:
                analysis.confidence >= 70
                  ? '#4CAF7D'
                  : analysis.confidence >= 45
                  ? '#F0A854'
                  : '#E07070',
            }}
          />
        </div>
      </Card>

      {/* Multi-Timeframe Check */}
      {mtf && <MultiTimeframeSection mtf={mtf} />}

      {/* Price Levels */}
      <Card className="p-4">
        <SectionLabel tooltip={`These levels are sized for a ${horizon} trade. They come from ATR(14) — average volatility over the last 14 ${timeframe} candles — so switching the timeframe rescales them. Set your real broker entry below to re-anchor them to your fill.`}>
          Price Levels
        </SectionLabel>
        {entry !== undefined && onEntryChange && (
          <EntryEditor entry={entry} edited={!!entryEdited} onChange={onEntryChange} />
        )}
        <MetricRow
          label="Stop Loss"
          value={`$${formatPrice(effStopLoss)}`}
          valueColor="text-[#c45c5c]"
          hint={levelHint(effStopLoss, effEntry)}
          tooltip={`Suggested exit if the trade goes against you, placed 1.5×ATR from the entry. ATR is measured on the ${horizon} chart, so this stop is tuned for that trade horizon — tighter on 1M, wider on 1D. Moves with your entry.`}
        />
        <MetricRow
          label="Take Profit"
          value={`$${formatPrice(effTakeProfit)}`}
          valueColor="text-[#3a9668]"
          hint={levelHint(effTakeProfit, effEntry)}
          tooltip={`Suggested exit to lock in gains, placed 3×ATR from the entry on the ${horizon} chart. Twice the distance of the stop, which is what gives the 1:2 risk/reward. Moves with your entry.`}
        />
        <MetricRow
          label="Risk / Reward"
          value={`1 : ${rrRatio}`}
          valueColor={
            analysis.riskRewardRatio >= 2 ? 'text-[#3a9668]' : 'text-[#F0A854]'
          }
          tooltip="Potential reward versus risk. 1:2 means you aim to make twice what you'd lose if stopped out. A ratio of 1:2 or higher is generally considered favorable. Unchanged when you edit the entry — only the price levels shift."
        />
      </Card>

      {/* Key Levels */}
      <Card className="p-4">
        <SectionLabel tooltip={`Recent price floor and ceiling from the last ~30 ${timeframe} candles, where price has tended to reverse.`}>
          Key Levels
        </SectionLabel>
        <MetricRow
          label="Support"
          value={`$${formatPrice(analysis.keyLevels.support)}`}
          valueColor="text-[#7C9CBF]"
          tooltip={`A price floor — the lowest low of roughly the last 30 ${timeframe} candles — where buyers have tended to step in. A break below it often signals further downside.`}
        />
        <MetricRow
          label="Resistance"
          value={`$${formatPrice(analysis.keyLevels.resistance)}`}
          valueColor="text-[#9B7CBF]"
          tooltip={`A price ceiling — the highest high of roughly the last 30 ${timeframe} candles — where sellers have tended to step in. A break above it often signals further upside.`}
        />
      </Card>

      {/* Reasoning */}
      <Card className="p-4">
        <SectionLabel>Analysis</SectionLabel>
        <p className="text-xs text-[#1A1A2E] leading-relaxed whitespace-pre-wrap">
          {analysis.reasoning}
        </p>
      </Card>

      {/* Latest News */}
      <NewsSection news={news} isLoading={newsLoading} ticker={ticker} />

      {/* Attribution */}
      <p className="text-center text-[10px] text-[#6B7280] pb-1">
        Technical analysis engine · RSI · MACD · EMA · Bollinger · ATR
      </p>
    </div>
  );
}
