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
    <div className="flex items-center gap-0.5 bg-[#F0EEF0] rounded-xl border border-[rgba(0,0,0,0.06)] p-0.5">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          disabled={disabled}
          className={`
            px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150
            ${
              value === tf.value
                ? 'bg-[#7C9CBF] text-white shadow-sm'
                : 'text-[#6B7280] hover:text-[#1A1A2E] hover:bg-white/60'
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
