export interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingAnalysis {
  decision: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  reasoning: string;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  keyLevels: {
    support: number;
    resistance: number;
  };
}

export interface IndicatorData {
  rsi: number | null;
  macd: {
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  };
  ema20: number | null;
  ema50: number | null;
  bollingerBands: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
  };
  atr: number | null;
}

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';
