# MarketAnalyst — AI Day Trading Assistant

A full-stack day trading decision assistant powered by Claude AI, with real-time TradingView charts and server-side technical analysis.

## Features

- **Live Candlestick Charts** — TradingView Lightweight Charts with full OHLCV data
- **Multi-Market Support** — US stocks (AAPL), European stocks (SAP.DE, ASML.AS), Crypto (BTC-USD, ETH-USD)
- **6 Timeframes** — 1m, 5m, 15m, 1H, 4H, 1D
- **Server-side Indicators** — RSI(14), MACD(12,26,9), EMA 20/50, Bollinger Bands, ATR(14)
- **AI Analysis** — Claude claude-sonnet-4-6 provides BUY/SELL/WAIT decisions with confidence, stop loss, take profit, and R:R ratio
- **Visual SL/TP Lines** — Stop loss (red dashed) and take profit (green dashed) drawn directly on chart
- **Dark Terminal Theme** — Professional trading terminal aesthetic

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) with `streamText`
- TradingView Lightweight Charts v4
- yahoo-finance2 for OHLCV data

## Local Development

### 1. Clone and install dependencies

```bash
git clone <repo>
cd market-analyst
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get your API key at [console.anthropic.com](https://console.anthropic.com).

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts, then add your environment variable:

```bash
vercel env add ANTHROPIC_API_KEY
```

### Option B: Vercel Dashboard

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add `ANTHROPIC_API_KEY` in **Settings → Environment Variables**
4. Deploy

## Usage

1. Enter a ticker symbol (e.g. `AAPL`, `BTC-USD`, `SAP.DE`) and press Enter
2. Select a timeframe (1M, 5M, 15M, 1H, 4H, 1D)
3. The chart loads automatically with the latest OHLCV data
4. Click **Analyze Chart** — Claude fetches fresh data, calculates indicators, and returns a structured trading analysis
5. Red dashed line = Stop Loss, Green dashed line = Take Profit

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/market-data` | GET | Fetch OHLCV candles via yahoo-finance2 |
| `/api/analyze` | POST | Run AI analysis with Claude (streamed JSON) |

### `/api/market-data` params
- `ticker` — Symbol (required)
- `timeframe` — `1m`, `5m`, `15m`, `1H`, `4H`, `1D` (default: `1D`)
- `limit` — Number of candles to return (default: 200)

### `/api/analyze` body
- `ticker` — Symbol (required)
- `timeframe` — Timeframe string

## Architecture Notes

- All API keys are server-side only — never exposed to the client
- `streamText` from Vercel AI SDK streams Claude's JSON response; `useCompletion` accumulates and parses it on completion
- Technical indicators are calculated server-side in `lib/indicators.ts` before the Claude call
- ATR(14) is used to validate/floor the AI's suggested stop loss and take profit levels
- yahoo-finance2 covers US stocks, European stocks (`.DE`, `.AS`, etc.), and crypto (`BTC-USD`)

## Disclaimer

This tool is for **educational and informational purposes only**. It does not constitute financial advice. Always do your own research and consult a licensed financial advisor before making any investment decisions.
