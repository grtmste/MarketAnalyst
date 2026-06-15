// Public, keyless logo CDN — returns a company/crypto logo image for a ticker symbol.
export function logoUrl(symbol: string): string {
  return `https://assets.parqet.com/logos/symbol/${encodeURIComponent(symbol.toUpperCase())}?format=png`;
}
