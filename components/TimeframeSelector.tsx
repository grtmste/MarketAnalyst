'use client';

import type { Timeframe } from '@/types';

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '5m', label: '5M' },
  { value: '15m', label: '15M' },
  { value: '1H', label: '1H' },
  { value: '4H', label: '4H' },
  { value: '1D', label: '1D' },
];

interface Props {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
  disabled?: boolean;
}

export default function TimeframeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-0.5 bg-[#0f172a] rounded border border-[#1e293b] p-0.5">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          disabled={disabled}
          className={`
            px-2.5 py-1 text-xs font-medium rounded transition-all duration-150
            ${
              value === tf.value
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'
            }
            disabled:opacity-40 disabled:cursor-not-allowed
          `}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}
