'use client';

import type { TradingAnalysis } from '@/types';

interface Props {
  analysis: TradingAnalysis | null;
  isLoading: boolean;
  error: string | null;
  ticker?: string;
  currentPrice?: number;
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

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[#FAFAFA] rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function MetricRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0">
      <span className="text-xs text-[#6B7280]">{label}</span>
      <span className={`text-xs font-semibold font-mono ${valueColor ?? 'text-[#1A1A2E]'}`}>
        {value}
      </span>
    </div>
  );
}

export default function AnalysisPanel({ analysis, isLoading, error, ticker, currentPrice }: Props) {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 p-6">
        <div className="relative">
          <div className="w-14 h-14 border-2 border-[#7C9CBF]/20 rounded-full" />
          <div className="absolute inset-0 w-14 h-14 border-2 border-[#7C9CBF] border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#7C9CBF]" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#1A1A2E]">Analyzing {ticker}…</p>
          <p className="text-xs text-[#6B7280] mt-1">Claude is reading the market</p>
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
      <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
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
      <div className="h-full flex flex-col items-center justify-center p-6 gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#F0EEF0] flex items-center justify-center">
          <svg className="w-7 h-7 text-[#7C9CBF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.698-1.317 2.698H4.115c-1.347 0-2.317-1.698-1.317-2.698L4.2 15.3" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#1A1A2E]">AI Analysis</p>
          <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed max-w-[200px]">
            Click &ldquo;Analyze Chart&rdquo; to receive a trading signal from Claude
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
    );
  }

  const cfg = DECISION_CONFIG[analysis.decision];
  const rrRatio = analysis.riskRewardRatio?.toFixed(2) ?? 'N/A';

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3 fade-in-up">
      {/* Decision */}
      <Card className={`p-4 border ${cfg.borderClass} ${cfg.bgClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
            <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest">
              Signal
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
        <SectionLabel>Confidence</SectionLabel>
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

      {/* Price Levels */}
      <Card className="p-4">
        <SectionLabel>Price Levels</SectionLabel>
        <MetricRow
          label="Stop Loss"
          value={`$${formatPrice(analysis.stopLoss)}`}
          valueColor="text-[#c45c5c]"
        />
        <MetricRow
          label="Take Profit"
          value={`$${formatPrice(analysis.takeProfit)}`}
          valueColor="text-[#3a9668]"
        />
        <MetricRow
          label="Risk / Reward"
          value={`1 : ${rrRatio}`}
          valueColor={
            analysis.riskRewardRatio >= 2 ? 'text-[#3a9668]' : 'text-[#F0A854]'
          }
        />
      </Card>

      {/* Key Levels */}
      <Card className="p-4">
        <SectionLabel>Key Levels</SectionLabel>
        <MetricRow
          label="Support"
          value={`$${formatPrice(analysis.keyLevels.support)}`}
          valueColor="text-[#7C9CBF]"
        />
        <MetricRow
          label="Resistance"
          value={`$${formatPrice(analysis.keyLevels.resistance)}`}
          valueColor="text-[#9B7CBF]"
        />
      </Card>

      {/* Reasoning */}
      <Card className="p-4">
        <SectionLabel>Analysis</SectionLabel>
        <p className="text-xs text-[#1A1A2E] leading-relaxed whitespace-pre-wrap">
          {analysis.reasoning}
        </p>
      </Card>

      {/* Attribution */}
      <p className="text-center text-[10px] text-[#6B7280] pb-1">
        Technical analysis engine · RSI · MACD · EMA · Bollinger · ATR
      </p>
    </div>
  );
}
