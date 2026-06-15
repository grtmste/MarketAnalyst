'use client';

import { useState, useEffect } from 'react';
import { logoUrl } from '@/lib/logo';

interface Props {
  symbol: string;
  size?: number;
  className?: string;
}

export default function Logo({ symbol, size = 32, className = '' }: Props) {
  const [failed, setFailed] = useState(false);

  // Reset failed state when the symbol changes so a new logo gets a chance to load
  useEffect(() => {
    setFailed(false);
  }, [symbol]);

  if (failed || !symbol) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-[#F0EEF0] text-[#7C9CBF] font-bold flex-shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl(symbol)}
      alt=""
      width={size}
      height={size}
      className={`rounded-lg object-contain bg-white flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
