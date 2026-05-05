import type { OHLCVData, IndicatorData } from '@/types';

function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1]! * (1 - k);
  }
  return result;
}

function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

function calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9) {
  const fastEMA = calculateEMA(closes, fast);
  const slowEMA = calculateEMA(closes, slow);

  const macdLine: (number | null)[] = closes.map((_, i) =>
    fastEMA[i] !== null && slowEMA[i] !== null ? fastEMA[i]! - slowEMA[i]! : null
  );

  const macdValues: number[] = [];
  const macdIndices: number[] = [];
  macdLine.forEach((v, i) => {
    if (v !== null) {
      macdValues.push(v);
      macdIndices.push(i);
    }
  });

  const signalEMAValues = calculateEMA(macdValues, signal);
  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  const histogram: (number | null)[] = new Array(closes.length).fill(null);

  macdIndices.forEach((idx, i) => {
    signalLine[idx] = signalEMAValues[i];
    if (macdLine[idx] !== null && signalEMAValues[i] !== null) {
      histogram[idx] = macdLine[idx]! - signalEMAValues[i]!;
    }
  });

  return { macdLine, signalLine, histogram };
}

function calculateBollingerBands(closes: number[], period = 20, stdDevMult = 2) {
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const middle: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    middle[i] = sma;
    upper[i] = sma + stdDevMult * std;
    lower[i] = sma - stdDevMult * std;
  }

  return { upper, middle, lower };
}

function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): (number | null)[] {
  const trueRanges: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    trueRanges.push(
      Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      )
    );
  }

  const atrEMA = calculateEMA(trueRanges, period);
  return [null, ...atrEMA];
}

export function computeIndicators(candles: OHLCVData[]): IndicatorData {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const last = candles.length - 1;

  const rsi = calculateRSI(closes);
  const { macdLine, signalLine, histogram } = calculateMACD(closes);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const bb = calculateBollingerBands(closes);
  const atr = calculateATR(highs, lows, closes);

  return {
    rsi: rsi[last],
    macd: {
      macd: macdLine[last],
      signal: signalLine[last],
      histogram: histogram[last],
    },
    ema20: ema20[last],
    ema50: ema50[last],
    bollingerBands: {
      upper: bb.upper[last],
      middle: bb.middle[last],
      lower: bb.lower[last],
    },
    atr: atr[last],
  };
}
