import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { fetchOHLCV } from '@/lib/yahooFinance';
import { computeIndicators } from '@/lib/indicators';

const SYSTEM_PROMPT = `You are an expert day trader and technical analyst. You will receive OHLCV candlestick data along with pre-calculated technical indicators (RSI, MACD, EMA 20/50, Bollinger Bands, ATR) and must analyze them using price action, support/resistance levels, momentum, and trend direction. Respond ONLY with valid JSON matching the specified schema. Be decisive and precise with price levels.`;

function fmt(n: number | null | undefined, digits = 4): string {
  return n != null ? n.toFixed(digits) : 'N/A';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker, timeframe = '1D' } = body as { ticker: string; timeframe: string };

    if (!ticker) {
      return new Response(JSON.stringify({ error: 'Ticker symbol is required' }), { status: 400 });
    }

    const allCandles = await fetchOHLCV(ticker, timeframe);

    if (allCandles.length < 30) {
      return new Response(
        JSON.stringify({ error: 'Insufficient historical data for analysis (need ≥30 candles)' }),
        { status: 400 }
      );
    }

    // Use last 100 candles for indicator accuracy, then take last 50 for the prompt
    const candles = allCandles.slice(-100);
    const indicators = computeIndicators(candles);
    const last50 = candles.slice(-50);
    const currentPrice = candles[candles.length - 1].close;
    const atrValue = indicators.atr ?? 0;

    const slFloor = currentPrice - atrValue * 1.5;
    const tpFloor = currentPrice + atrValue * 3;

    const userPrompt = `Analyze ${ticker.toUpperCase()} on the ${timeframe} timeframe and provide a trading decision.

Current Price: ${currentPrice}
Symbol: ${ticker.toUpperCase()}
Timeframe: ${timeframe}

Last 50 OHLCV Candles (Unix time, oldest → newest):
${last50
  .map(
    (c) =>
      `T:${c.time} O:${fmt(c.open)} H:${fmt(c.high)} L:${fmt(c.low)} C:${fmt(c.close)} V:${c.volume}`
  )
  .join('\n')}

Technical Indicators (latest values):
RSI(14): ${fmt(indicators.rsi, 2)}
MACD Line: ${fmt(indicators.macd.macd)} | Signal: ${fmt(indicators.macd.signal)} | Histogram: ${fmt(indicators.macd.histogram)}
EMA(20): ${fmt(indicators.ema20)} | EMA(50): ${fmt(indicators.ema50)}
Bollinger Upper: ${fmt(indicators.bollingerBands.upper)} | Middle: ${fmt(indicators.bollingerBands.middle)} | Lower: ${fmt(indicators.bollingerBands.lower)}
ATR(14): ${fmt(indicators.atr)}

ATR-validated minimum levels (respect these):
Stop-loss floor: ${fmt(slFloor)} (entry − ATR×1.5)
Take-profit floor: ${fmt(tpFloor)} (entry + ATR×3)

Respond with ONLY valid JSON — no markdown, no explanation outside JSON:
{
  "decision": "BUY" | "SELL" | "WAIT",
  "confidence": <integer 0-100>,
  "reasoning": "<concise analysis: trend direction, momentum signals, key levels, risk factors>",
  "stopLoss": <precise price>,
  "takeProfit": <precise price>,
  "riskRewardRatio": <number to 2 decimals>,
  "keyLevels": { "support": <price>, "resistance": <price> }
}`;

    const streamResult = await streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    return streamResult.toDataStreamResponse();
  } catch (error: unknown) {
    console.error('Analyze error:', error);
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
