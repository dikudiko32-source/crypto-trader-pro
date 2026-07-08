import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// On-chain BTC metrics proxy
// Uses blockchain.info API (free, no key needed)
export async function GET() {
  try {
    // Get current BTC data
    const [statsRes, blocksRes] = await Promise.all([
      fetch('https://blockchain.info/q/totalbc', { cache: 'no-store' }),
      fetch('https://blockchain.info/q/bcperblock', { cache: 'no-store' }),
    ])
    
    let totalSupply = 0
    let blockReward = 0
    
    if (statsRes.ok) {
      totalSupply = parseInt(await statsRes.text()) / 1e8
    }
    
    if (blocksRes.ok) {
      blockReward = parseInt(await blocksRes.text()) / 1e8
    }
    
    // Get market data from CoinGecko (already proxied + cached)
    const cgRes = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false', {
      headers: { 'User-Agent': 'CryptoTraderPro/1.0' },
      cache: 'no-store',
    })
    
    let marketCap = 0
    let price = 0
    let ath = 0
    let circulatingSupply = totalSupply
    
    if (cgRes.ok) {
      const cgData = await cgRes.json()
      marketCap = cgData.market_data?.market_cap?.usd || 0
      price = cgData.market_data?.current_price?.usd || 0
      ath = cgData.market_data?.ath?.usd || 0
    }
    
    // Calculate MVRV-like ratio (simplified)
    // Real MVRV = Market Cap / Realized Cap
    // We approximate Realized Cap using cumulative coin-days * price (rough)
    // For simplicity, use: MVRV ≈ price / (ath * 0.3) as a proxy
    const mvrvProxy = ath > 0 ? price / (ath * 0.3) : 1
    
    // Determine market cycle phase
    let cycle: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN' = 'ACCUMULATION'
    let cycleColor = 'text-emerald-400'
    if (mvrvProxy < 1) { cycle = 'ACCUMULATION'; cycleColor = 'text-emerald-400' }
    else if (mvrvProxy < 2) { cycle = 'MARKUP'; cycleColor = 'text-blue-400' }
    else if (mvrvProxy < 3) { cycle = 'DISTRIBUTION'; cycleColor = 'text-yellow-400' }
    else { cycle = 'MARKDOWN'; cycleColor = 'text-red-400' }
    
    // Inflation rate (annual, based on block reward)
    const blocksPerYear = 365 * 24 * 6 // ~6 blocks/hour
    const annualNewSupply = blockReward * blocksPerYear
    const inflationRate = totalSupply > 0 ? (annualNewSupply / totalSupply) * 100 : 0
    
    return NextResponse.json({
      totalSupply,
      circulatingSupply,
      maxSupply: 21000000,
      price,
      marketCap,
      ath,
      mvrvProxy,
      cycle,
      cycleColor,
      inflationRate,
      blockReward,
      annualNewSupply,
      lastUpdated: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (err) {
    console.error('On-chain fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch on-chain data' },
      { status: 500 }
    )
  }
}
