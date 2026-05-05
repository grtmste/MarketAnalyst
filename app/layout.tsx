import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarketAnalyst — AI Day Trading Assistant',
  description:
    'Real-time AI-powered trading decision assistant with technical analysis, candlestick charts, and Claude AI insights.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0f1e] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
