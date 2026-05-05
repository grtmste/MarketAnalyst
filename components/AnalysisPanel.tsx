'use client';

import type { TradingAnalysis } from '@/types';

interface Props {
  analysis: TradingAnalysis | null;
  isLoading: boolean;
  error: string | null;
  ticker?: string;
  currentPrice?: number;
}

const DECISION_STYLES = {
  BUY: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    dot: 'bg-green-400',
    label: 'BUY',
  },
  SELL: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-400',
    label: 'SELL',
  },
  WAIT: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
    label: 'WAIT',
  },
};

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#1e293b] last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-medium font-mono ${valueClass ?? 'text-slate-200'}`}>
        {value}
      </span>
    </div>
  );
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(2);
  return price.toFixed(4);
}

export default function AnalysisPanel({ analysis, isLoading, error, ticker, currentPrice }: Props) {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-blue-500/30 rounded-full" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-300 font-medium">Analyzing {ticker}…</p>
          <p className="text-xs text-slate-500 mt-1">Claude is reading the charts</p>
        </div>
        <div className="w-full space-y-2 opacity-40">
          {['Scanning price action', 'Evaluating indicators', 'Calculating levels'].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 pulse-glow" />
              <span className="text-xs text-slate-400">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-3">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
          <span className="text-red-400 text-lg">!</span>
        </div>
        <p className="text-sm text-red-400 text-center font-medium">Analysis Failed</p>
        <p className="text-xs text-slate-500 text-center leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-16 h-16 rounded-full border border-[#1e293b] flex items-center justify-center">
          <span className="text-2xl opacity-30">🤖</span>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-400 font-medium">AI Analysis</p>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Click &ldquo;Analyze Chart&rdquo; to receive a trading decision powered by Claude AI
          </p>
        </div>
        <div className="w-full border border-dashed border-[#1e293b] rounded-lg p-3 space-y-1.5">
          {['Decision (BUY/SELL/WAIT)', 'Stop Loss & Take Profit', 'Risk/Reward Ratio', 'Key Support & Resistance'].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <span className="text-xs text-slate-600">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const style = DECISION_STYLES[analysis.decision];
  const rrRatio = analysis.riskRewardRatio?.toFixed(2) ?? 'N/A';
  const isGoodRR = analysis.riskRewardRatio >= 2;

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* Decision Badge */}
      <div className={`rounded-lg border p-3 ${style.bg} ${style.border}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${style.dot}`} />
            <span className="text-xs text-slate-400 uppercase tracking-widest">Decision</span>
          </div>
          {currentPrice && (
            <span className="text-xs text-slate-500 font-mono">${formatPrice(currentPrice)}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-3xl font-bold font-mono tracking-wider ${style.text}`}>
            {style.label}
          </span>
          <span className="text-xs text-slate-400 bg-[#0a0f1e]/60 px-2 py-0.5 rounded font-mono">
            {ticker}
          </span>
        </div>
      </div>

      {/* Confidence */}
      <div className="bg-[#0f172a] rounded-lg border border-[#1e293b] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 uppercase tracking-widest">Confidence</span>
          <span className={`text-sm font-bold font-mono ${style.text}`}>
            {analysis.confidence}%
          </span>
        </div>
        <div className="w-full bg-[#1e293b] rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              analysis.confidence >= 70
                ? 'bg-green-500'
                : analysis.confidence >= 45
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${analysis.confidence}%` }}
          />
        </div>
      </div>

      {/* Price Levels */}
      <div className="bg-[#0f172a] rounded-lg border border-[#1e293b] p-3">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Price Levels</p>
        <Metric
          label="Stop Loss"
          value={`$${formatPrice(analysis.stopLoss)}`}
          valueClass="text-red-400"
        />
        <Metric
          label="Take Profit"
          value={`$${formatPrice(analysis.takeProfit)}`}
          valueClass="text-green-400"
        />
        <Metric
          label="Risk / Reward"
          value={`1 : ${rrRatio}`}
          valueClass={isGoodRR ? 'text-green-400' : 'text-yellow-400'}
        />
      </div>

      {/* Key Levels */}
      <div className="bg-[#0f172a] rounded-lg border border-[#1e293b] p-3">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Key Levels</p>
        <Metric
          label="Support"
          value={`$${formatPrice(analysis.keyLevels.support)}`}
          valueClass="text-blue-400"
        />
        <Metric
          label="Resistance"
          value={`$${formatPrice(analysis.keyLevels.resistance)}`}
          valueClass="text-purple-400"
        />
      </div>

      {/* Reasoning */}
      <div className="bg-[#0f172a] rounded-lg border border-[#1e293b] p-3">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Analysis</p>
        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
          {analysis.reasoning}
        </p>
      </div>

      {/* Powered by */}
      <div className="flex items-center justify-center gap-1.5 py-1">
        <span className="text-xs text-slate-700">Powered by</span>
        <span className="text-xs text-slate-600 font-medium">Claude claude-sonnet-4-6</span>
      </div>
    </div>
  );
}
