'use client';

import type { Timeframe } from '@/types';

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1M',  label: '1M'  },
  { value: '5M',  label: '5M'  },
  { value: '15M', label: '15M' },
  { value: '1H',  label: '1H'  },
  { value: '4H',  label: '4H'  },
  { value: '1D',  label: '1D'  },
  { value: '5D',  label: '5D'  },
  { value: '1W',  label: '1W'  },
  { value: '3M',  label: '3M'  },
  { value: '6M',  label: '6M'  },
  { value: 'YTD', label: 'YTD' },
  { value: '1Y',  label: '1Y'  },
  { value: '5Y',  label: '5Y'  },
  { value: 'ALL', label: 'ALL' },
];

interface Props {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
  disabled?: boolean;
}

export default function TimeframeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center flex-wrap gap-0.5 bg-[#F0EEF0] rounded-xl border border-[rgba(0,0,0,0.06)] p-0.5">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          disabled={disabled}
          className={`
            px-2 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150
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
