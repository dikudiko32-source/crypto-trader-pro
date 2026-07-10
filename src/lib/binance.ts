// =====================================================
// BINANCE API INTEGRATION (via Next.js proxy to avoid CORS)
// =====================================================

import type { Candle, OrderBookData, LiquidationData, FundingHeatmapItem } from './types'

// ---- Get klines (candlestick data) ----
export async function getKlines(symbol: string, timeframe: string, limit = 200): Promise<Candle[]> {
  try {
    const interval = tfToInterval(timeframe)
    const url = `/api/proxy/binance?path=klines&symbol=${symbol}&interval=${interval}&limit=${limit}`
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`Binance klines error: ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data.map((k: unknown[]): Candle => ({
      time: k[0] as number,
      open: parseFloat(k[1] as string),
      high: parseFloat(k[2] as string),
      low: parseFloat(k[3] as string),
      close: parseFloat(k[4] as string),
      volume: parseFloat(k[5] as string),
    }))
  } catch (err) {
    console.error('getKlines error:', err)
    return []
  }
}

function tfToInterval(tf: string): string {
  const map: Record<string, string> = {
    '15m': '15m',
    '1H': '1h',
    '4H': '4h',
    '1D': '1d',
    '1W': '1w',
  }
  return map[tf] || '1d'
}

// ---- Get 24h ticker ----
export interface Ticker24h {
  symbol: string
  lastPrice: number
  priceChangePercent: number
  highPrice: number
  lowPrice: number
  volume: number
  quoteVolume: number
}

export async function getTicker24h(symbol: string): Promise<Ticker24h | null> {
  try {
    const url = `/api/proxy/binance?path=ticker/24hr&symbol=${symbol}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Ticker error: ${res.status}`)
    const data = await res.json()
    return {
      symbol: data.symbol,
      lastPrice: parseFloat(data.lastPrice),
      priceChangePercent: parseFloat(data.priceChangePercent),
      highPrice: parseFloat(data.highPrice),
      lowPrice: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
    }
  } catch (err) {
    console.error('getTicker24h error:', err)
    return null
  }
}

// ---- Get top gainers / losers ----
export async function getTopMovers(limit = 20): Promise<Ticker24h[]> {
  try {
    const url = `/api/proxy/binance?path=ticker/24hr`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Top movers error')
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data
      .filter((t: { symbol: string; quoteVolume: string }) => 
        t.symbol.endsWith('USDT') && 
        !t.symbol.includes('UP') && 
        !t.symbol.includes('DOWN') &&
        !t.symbol.includes('BULL') &&
        !t.symbol.includes('BEAR') &&
        parseFloat(t.quoteVolume) > 10000000
      )
      .map((t: { symbol: string; lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; volume: string; quoteVolume: string }) => ({
        symbol: t.symbol,
        lastPrice: parseFloat(t.lastPrice),
        priceChangePercent: parseFloat(t.priceChangePercent),
        highPrice: parseFloat(t.highPrice),
        lowPrice: parseFloat(t.lowPrice),
        volume: parseFloat(t.volume),
        quoteVolume: parseFloat(t.quoteVolume),
      }))
      .sort((a: Ticker24h, b: Ticker24h) => b.priceChangePercent - a.priceChangePercent)
      .slice(0, limit)
  } catch (err) {
    console.error('getTopMovers error:', err)
    return []
  }
}

// ---- Futures funding rate ----
export async function getFundingRate(symbol: string): Promise<{ fundingRate: number; nextFundingTime: number } | null> {
  try {
    const url = `/api/proxy/futures?path=premiumIndex&symbol=${symbol}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return {
      fundingRate: parseFloat(data.lastFundingRate),
      nextFundingTime: data.nextFundingTime,
    }
  } catch {
    return null
  }
}

// ---- Open Interest (futures) ----
export async function getOpenInterest(symbol: string): Promise<{ openInterest: number; openInterestValue: number } | null> {
  try {
    const url = `/api/proxy/futures?path=openInterest&symbol=${symbol}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return {
      openInterest: parseFloat(data.openInterest),
      openInterestValue: 0,
    }
  } catch {
    return null
  }
}

// ---- Long/Short Ratio ----
export async function getLongShortRatio(symbol: string): Promise<{ longShortRatio: number; longAccount: number; shortAccount: number } | null> {
  try {
    const url = `/api/proxy/futures?path=topLongShortAccountRatio&symbol=${symbol}&period=1h&limit=1`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.length === 0) return null
    return {
      longShortRatio: parseFloat(data[0].longShortRatio),
      longAccount: parseFloat(data[0].longAccount),
      shortAccount: parseFloat(data[0].shortAccount),
    }
  } catch {
    return null
  }
}

// ---- Order Book Depth ----
export async function getOrderBook(symbol: string, limit = 100): Promise<{
  bids: { price: number; quantity: number; total: number }[]
  asks: { price: number; quantity: number; total: number }[]
} | null> {
  try {
    const url = `/api/proxy/binance?path=depth&symbol=${symbol}&limit=${limit}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    
    let bidTotal = 0
    const bids = (data.bids || []).map((b: string[]): { price: number; quantity: number; total: number } => {
      const price = parseFloat(b[0])
      const quantity = parseFloat(b[1])
      bidTotal += quantity
      return { price, quantity, total: bidTotal }
    })
    
    let askTotal = 0
    const asks = (data.asks || []).map((a: string[]): { price: number; quantity: number; total: number } => {
      const price = parseFloat(a[0])
      const quantity = parseFloat(a[1])
      askTotal += quantity
      return { price, quantity, total: askTotal }
    })
    
    return { bids, asks }
  } catch (err) {
    console.error('getOrderBook error:', err)
    return null
  }
}

// ---- Analyze Order Book ----
export async function analyzeOrderBook(symbol: string): Promise<OrderBookData | null> {
  const ob = await getOrderBook(symbol, 100)
  if (!ob || ob.bids.length === 0 || ob.asks.length === 0) return null
  
  const bestBid = ob.bids[0].price
  const bestAsk = ob.asks[0].price
  const midPrice = (bestBid + bestAsk) / 2
  const spread = bestAsk - bestBid
  const spreadPct = (spread / midPrice) * 100
  
  // Imbalance: compare bid volume vs ask volume within 1% of mid price
  const onePctRange = midPrice * 0.01
  const bidVolumeNear = ob.bids
    .filter(b => b.price >= midPrice - onePctRange)
    .reduce((sum, b) => sum + b.quantity, 0)
  const askVolumeNear = ob.asks
    .filter(a => a.price <= midPrice + onePctRange)
    .reduce((sum, a) => sum + a.quantity, 0)
  
  const totalVol = bidVolumeNear + askVolumeNear
  const bidImbalance = totalVol > 0 ? (bidVolumeNear - askVolumeNear) / totalVol : 0
  
  // Liquidity (USD value within 1%)
  const liquidityAbovePrice = ob.asks
    .filter(a => a.price <= midPrice + onePctRange)
    .reduce((sum, a) => sum + a.quantity * a.price, 0)
  const liquidityBelowPrice = ob.bids
    .filter(b => b.price >= midPrice - onePctRange)
    .reduce((sum, b) => sum + b.quantity * b.price, 0)
  
  let signal: OrderBookData['signal'] = 'BALANCED'
  if (bidImbalance > 0.2) signal = 'BUY_PRESSURE'
  else if (bidImbalance < -0.2) signal = 'SELL_PRESSURE'
  
  return {
    symbol,
    bids: ob.bids.slice(0, 20),
    asks: ob.asks.slice(0, 20),
    bidImbalance,
    spread,
    spreadPct,
    liquidityAbovePrice,
    liquidityBelowPrice,
    signal,
  }
}

// ---- Liquidations (24h summary) ----
// Binance doesn't have public liquidations API, so we estimate from price action
export async function getLiquidationEstimate(symbol: string): Promise<LiquidationData | null> {
  try {
    // Get 24h ticker for volatility
    const ticker = await getTicker24h(symbol)
    if (!ticker) return null
    
    // Get funding rate to estimate leverage
    const funding = await getFundingRate(symbol)
    if (!funding) return null
    
    // Estimate liquidation zones based on common leverage levels
    const price = ticker.lastPrice
    const dailyRange = (ticker.highPrice - ticker.lowPrice) / price
    
    // Long liquidations: typically 5-15% below current price (10x-3x leverage)
    // Short liquidations: typically 5-15% above current price
    const longLiqPrice10x = price * 0.91  // ~10x long liq
    const longLiqPrice5x = price * 0.82   // ~5x long liq
    const shortLiqPrice10x = price * 1.09
    const shortLiqPrice5x = price * 1.18
    
    // Estimate liquidation volumes (rough: higher funding = more leverage = more liquidations)
    const leverageMultiplier = Math.abs(funding.fundingRate) * 1000
    const estLongLiq24h = dailyRange * price * 1000 * (1 + leverageMultiplier)
    const estShortLiq24h = dailyRange * price * 800 * (1 + leverageMultiplier * 0.7)
    
    const heatmap = [
      { price: longLiqPrice5x, longLiq: estLongLiq24h * 0.4, shortLiq: 0 },
      { price: longLiqPrice10x, longLiq: estLongLiq24h * 0.6, shortLiq: 0 },
      { price: price, longLiq: 0, shortLiq: 0 },
      { price: shortLiqPrice10x, longLiq: 0, shortLiq: estShortLiq24h * 0.6 },
      { price: shortLiqPrice5x, longLiq: 0, shortLiq: estShortLiq24h * 0.4 },
    ]
    
    let signal: LiquidationData['signal'] = 'NEUTRAL'
    if (funding.fundingRate > 0.0005) signal = 'LONG_SQUEEZE_RISK'
    else if (funding.fundingRate < -0.0005) signal = 'SHORT_SQUEEZE_RISK'
    
    return {
      symbol,
      longLiquidations: estLongLiq24h,
      shortLiquidations: estShortLiq24h,
      totalLong24h: estLongLiq24h,
      totalShort24h: estShortLiq24h,
      heatmap,
      signal,
    }
  } catch (err) {
    console.error('getLiquidationEstimate error:', err)
    return null
  }
}

// ---- Funding Rate Heatmap (multiple coins) ----
export async function getFundingHeatmap(symbols: string[]): Promise<FundingHeatmapItem[]> {
  const results: FundingHeatmapItem[] = []
  
  for (const symbol of symbols) {
    try {
      const funding = await getFundingRate(symbol)
      if (funding) {
        const annualized = funding.fundingRate * 3 * 365 * 100 // 3 funding periods/day, 365 days
        let signal: FundingHeatmapItem['signal'] = 'NEUTRAL'
        if (funding.fundingRate > 0.0005) signal = 'OVERLEVERAGED_LONG'
        else if (funding.fundingRate < -0.0005) signal = 'OVERLEVERAGED_SHORT'
        
        results.push({
          symbol,
          fundingRate: funding.fundingRate,
          annualized,
          trend: 'FLAT',
          signal,
        })
      }
    } catch {
      // skip individual failures
    }
  }
  
  return results.sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
}

// Need to import OrderBookData, LiquidationData, FundingHeatmapItem types
// (defined in types.ts)
