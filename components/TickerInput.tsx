'use client';

import { useState, type KeyboardEvent } from 'react';

interface Props {
  value: string;
  onSubmit: (ticker: string) => void;
  disabled?: boolean;
}

export default function TickerInput({ value, onSubmit, disabled }: Props) {
  const [input, setInput] = useState(value);

  const submit = () => {
    const trimmed = input.trim().toUpperCase();
    if (trimmed && trimmed !== value) onSubmit(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  return (
    <div className="flex items-center gap-1">
      <div className="relative flex items-center">
        <span className="absolute left-2.5 text-slate-500 text-xs pointer-events-none select-none">
          $
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          onBlur={submit}
          disabled={disabled}
          placeholder="AAPL"
          maxLength={12}
          className="
            pl-6 pr-3 py-1.5 w-28 bg-[#0f172a] border border-[#1e293b] rounded
            text-slate-100 text-sm font-mono placeholder:text-slate-600
            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        />
      </div>
      <button
        onClick={submit}
        disabled={disabled || !input.trim()}
        className="
          px-2.5 py-1.5 bg-[#1e293b] border border-[#334155] rounded text-xs text-slate-400
          hover:text-slate-200 hover:border-slate-500 transition-colors duration-150
          disabled:opacity-40 disabled:cursor-not-allowed
        "
      >
        ↵
      </button>
    </div>
  );
}
