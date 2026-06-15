import type { OHLCVData, IndicatorData, TradingAnalysis } from '@/types';

/**
 * Deterministic technical-analysis engine.
 *
 * Produces the same TradingAnalysis schema an LLM would, but using a
 * transparent weighted-signal model over the pre-computed indicators.
 * No API key, no billing, no network — runs instantly server-side.
 */

interface Signal {
  name: string;
  // -1 (bearish) … 0 (neutral) … +1 (bullish)
  score: number;
  // how much this signal counts toward the final decision
  weight: number;
  note: string;
}

function findSwingLevels(candles: OHLCVData[]): { support: number; resistance: number } {
  // Use the most recent ~30 candles for near-term S/R
  const recent = candles.slice(-30);
  const lows = recent.map((c) => c.low);
  const highs = recent.map((c) => c.high);
  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
  };
}

function round(n: number): number {
  if (Math.abs(n) >= 1000) return Math.round(n * 100) / 100;
  if (Math.abs(n) >= 1) return Math.round(n * 100) / 100;
  return Math.round(n * 10000) / 10000;
}

export function analyzeTechnicals(
  candles: OHLCVData[],
  ind: IndicatorData,
  timeframe: string
): TradingAnalysis {
  const currentPrice = candles[candles.length - 1].close;
  const prevClose = candles[candles.length - 2]?.close ?? currentPrice;
  const signals: Signal[] = [];

  // ── 1. Trend: EMA20 vs EMA50 (golden/death cross bias) ──
  if (ind.ema20 != null && ind.ema50 != null) {
    const spread = (ind.ema20 - ind.ema50) / ind.ema50;
    const score = Math.max(-1, Math.min(1, spread * 40)); // ±2.5% spread saturates
    signals.push({
      name: 'Trend (EMA 20/50)',
      score,
      weight: 0.25,
      note:
        ind.ema20 > ind.ema50
          ? `EMA20 above EMA50 — uptrend bias (${(spread * 100).toFixed(2)}% spread)`
          : `EMA20 below EMA50 — downtrend bias (${(spread * 100).toFixed(2)}% spread)`,
    });
  }

  // ── 2. Price vs EMA20 (short-term momentum) ──
  if (ind.ema20 != null) {
    const dev = (currentPrice - ind.ema20) / ind.ema20;
    const score = Math.max(-1, Math.min(1, dev * 50));
    signals.push({
      name: 'Price vs EMA20',
      score,
      weight: 0.1,
      note:
        currentPrice > ind.ema20
          ? 'Price trading above EMA20 — buyers in control'
          : 'Price trading below EMA20 — sellers in control',
    });
  }

  // ── 3. RSI (momentum / mean-reversion) ──
  if (ind.rsi != null) {
    let score = 0;
    let note = '';
    if (ind.rsi >= 70) {
      score = -0.7;
      note = `RSI ${ind.rsi.toFixed(1)} — overbought, pullback risk`;
    } else if (ind.rsi <= 30) {
      score = 0.7;
      note = `RSI ${ind.rsi.toFixed(1)} — oversold, bounce potential`;
    } else if (ind.rsi > 55) {
      score = 0.35;
      note = `RSI ${ind.rsi.toFixed(1)} — bullish momentum`;
    } else if (ind.rsi < 45) {
      score = -0.35;
      note = `RSI ${ind.rsi.toFixed(1)} — bearish momentum`;
    } else {
      score = 0;
      note = `RSI ${ind.rsi.toFixed(1)} — neutral`;
    }
    signals.push({ name: 'RSI(14)', score, weight: 0.2, note });
  }

  // ── 4. MACD (trend momentum) ──
  if (ind.macd.macd != null && ind.macd.signal != null) {
    const hist = ind.macd.histogram ?? ind.macd.macd - ind.macd.signal;
    const bullish = ind.macd.macd > ind.macd.signal;
    const score = bullish ? 0.6 : -0.6;
    signals.push({
      name: 'MACD',
      score,
      weight: 0.2,
      note: bullish
        ? `MACD above signal — bullish momentum (hist ${hist.toFixed(4)})`
        : `MACD below signal — bearish momentum (hist ${hist.toFixed(4)})`,
    });
  }

  // ── 5. Bollinger Bands (volatility / extremes) ──
  if (ind.bollingerBands.upper != null && ind.bollingerBands.lower != null) {
    const { upper, lower, middle } = ind.bollingerBands;
    let score = 0;
    let note = '';
    if (currentPrice >= upper) {
      score = -0.5;
      note = 'Price at/above upper Bollinger Band — stretched, reversion risk';
    } else if (currentPrice <= lower) {
      score = 0.5;
      note = 'Price at/below lower Bollinger Band — stretched, bounce potential';
    } else if (middle != null) {
      score = currentPrice > middle ? 0.2 : -0.2;
      note =
        currentPrice > middle
          ? 'Price in upper Bollinger half — mild bullish'
          : 'Price in lower Bollinger half — mild bearish';
    }
    signals.push({ name: 'Bollinger Bands', score, weight: 0.15, note });
  }

  // ── 6. Last candle direction (immediate price action) ──
  {
    const score = currentPrice > prevClose ? 0.15 : currentPrice < prevClose ? -0.15 : 0;
    signals.push({
      name: 'Price action',
      score,
      weight: 0.1,
      note:
        currentPrice > prevClose
          ? 'Latest candle closed higher'
          : currentPrice < prevClose
          ? 'Latest candle closed lower'
          : 'Latest candle flat',
    });
  }

  // ── Weighted aggregate score in [-1, 1] ──
  const totalWeight = signals.reduce((s, x) => s + x.weight, 0) || 1;
  const composite = signals.reduce((s, x) => s + x.score * x.weight, 0) / totalWeight;

  // ── Decision + confidence ──
  let decision: TradingAnalysis['decision'];
  const absStrength = Math.abs(composite);
  if (composite > 0.18) decision = 'BUY';
  else if (composite < -0.18) decision = 'SELL';
  else decision = 'WAIT';

  // Confidence: scale composite strength to 35–95, with agreement bonus
  const bullishCount = signals.filter((s) => s.score > 0.1).length;
  const bearishCount = signals.filter((s) => s.score < -0.1).length;
  const agreement =
    decision === 'BUY'
      ? bullishCount / signals.length
      : decision === 'SELL'
      ? bearishCount / signals.length
      : 1 - absStrength;
  let confidence = Math.round(35 + absStrength * 45 + agreement * 15);
  confidence = Math.max(35, Math.min(95, confidence));
  if (decision === 'WAIT') confidence = Math.max(35, Math.min(60, 50 - Math.round(absStrength * 20)));

  // ── ATR-based Stop Loss / Take Profit (1.5×/3× → clean ~1:2 R:R) ──
  // ATR sizing is the primary risk model; swing levels are reported separately
  // as keyLevels and referenced in the reasoning rather than mixed into SL/TP.
  const atr = ind.atr ?? currentPrice * 0.02; // fallback 2% if ATR missing
  const { support, resistance } = findSwingLevels(candles);

  let stopLoss: number;
  let takeProfit: number;

  if (decision === 'SELL') {
    // Short framing: SL above entry, TP below
    stopLoss = currentPrice + atr * 1.5;
    takeProfit = currentPrice - atr * 3;
  } else {
    // BUY or WAIT (long framing): SL below entry, TP above
    stopLoss = currentPrice - atr * 1.5;
    takeProfit = currentPrice + atr * 3;
  }

  const risk = Math.abs(currentPrice - stopLoss);
  const reward = Math.abs(takeProfit - currentPrice);
  const riskRewardRatio = risk > 0 ? round(reward / risk) : 0;

  // ── Reasoning text ──
  const trendWord =
    composite > 0.18 ? 'bullish' : composite < -0.18 ? 'bearish' : 'mixed / range-bound';
  const topSignals = [...signals]
    .sort((a, b) => Math.abs(b.score * b.weight) - Math.abs(a.score * a.weight))
    .slice(0, 4)
    .map((s) => `• ${s.note}`)
    .join('\n');

  const reasoning =
    `${timeframe} technical read is ${trendWord} (composite score ${composite.toFixed(2)}). ` +
    `${bullishCount} of ${signals.length} signals lean bullish, ${bearishCount} bearish.\n\n` +
    `${topSignals}\n\n` +
    (decision === 'WAIT'
      ? `Signals conflict, so the higher-probability play is to WAIT for confirmation. ` +
        `Watch a break of support $${round(support)} or resistance $${round(resistance)} to take a side.`
      : `Bias: ${decision} near $${round(currentPrice)}. ` +
        `Risk managed via ATR(14)=${round(atr)} — stop ${decision === 'SELL' ? 'above' : 'below'} ` +
        `at $${round(stopLoss)}, target $${round(takeProfit)} (R:R 1:${riskRewardRatio}). ` +
        `Key support $${round(support)}, resistance $${round(resistance)}.`);

  return {
    decision,
    confidence,
    reasoning,
    stopLoss: round(stopLoss),
    takeProfit: round(takeProfit),
    riskRewardRatio,
    keyLevels: {
      support: round(support),
      resistance: round(resistance),
    },
  };
}
