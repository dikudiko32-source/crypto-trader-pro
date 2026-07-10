// =====================================================
// TOKENOMICS / UNLOCK ANALYZER
// =====================================================
// Uses CoinGecko free API to get token supply data
// Calculates inflation rate + unlock risk

import type { TokenomicsData } from './types'

const PROXY = '/api/proxy/coingecko'

// ---- Get tokenomics data for a coin (via CoinGecko /coins/{id}) ----
export async function getTokenomics(coinId: string): Promise<TokenomicsData | null> {
  try {
    const url = `${PROXY}?path=coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('Tokenomics API failed:', res.status)
      return null
    }
    const c = await res.json()
    
    const circulating = c.market_data?.circulating_supply || 0
    const total = c.market_data?.total_supply || null
    const max = c.market_data?.max_supply || null
    const marketCap = c.market_data?.market_cap?.usd || 0
    const currentPrice = c.market_data?.current_price?.usd || 0
    const fdv = total && total > 0 ? total * currentPrice : (max && max > 0 ? max * currentPrice : 0)
    
    // Calculate inflation rate (locked tokens / circulating)
    const lockedSupply = (total && total > circulating) ? (total - circulating) : 0
    const inflationRate = circulating > 0 ? (lockedSupply / circulating) * 100 : 0
    
    // Estimate annual inflation (assume linear unlock over 4 years average)
    const estimatedAnnualInflation = lockedSupply > 0 ? (lockedSupply / 4) / circulating * 100 : 0
    
    // Determine unlock risk level
    let unlockRisk: TokenomicsData['unlockRisk'] = 'LOW'
    let warning: string | null = null
    
    if (inflationRate > 200) {
      unlockRisk = 'CRITICAL'
      warning = `⚠️ ${inflationRate.toFixed(0)}% inflation pending. FDV is ${(inflationRate / 100 + 1).toFixed(1)}x current market cap. MAJOR sell pressure risk.`
    } else if (inflationRate > 100) {
      unlockRisk = 'HIGH'
      warning = `⚠️ ${inflationRate.toFixed(0)}% inflation pending. Significant unlock risk. Avoid or reduce position before unlocks.`
    } else if (inflationRate > 50) {
      unlockRisk = 'MEDIUM'
      warning = `${inflationRate.toFixed(0)}% inflation pending. Monitor unlock schedule.`
    } else if (inflationRate > 20) {
      unlockRisk = 'LOW'
      warning = `${inflationRate.toFixed(0)}% inflation pending. Manageable.`
    } else {
      unlockRisk = 'LOW'
      warning = null
    }
    
    // Additional warning if max supply is much higher than total (mintable token)
    if (max && total && max > total * 1.5) {
      warning = (warning || '') + ` ⚠️ Max supply ${((max / total - 1) * 100).toFixed(0)}% higher than total — token is mintable.`
    }
    
    return {
      symbol: (c.symbol || '').toUpperCase(),
      name: c.name || coinId,
      circulatingSupply: circulating,
      totalSupply: total,
      maxSupply: max,
      marketCap,
      fdv,
      inflationRate,
      unlockRisk,
      estimatedAnnualInflation,
      warning,
    }
  } catch (err) {
    console.error('getTokenomics error:', err)
    return null
  }
}

// ---- Get tokenomics for multiple coins (batch) ----
export async function getBatchTokenomics(symbols: string[]): Promise<TokenomicsData[]> {
  // First, get top coins to map symbol -> id
  const topCoinsUrl = `${PROXY}?path=coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=false`
  try {
    const res = await fetch(topCoinsUrl)
    if (!res.ok) return []
    const coins = await res.json()
    if (!Array.isArray(coins)) return []
    
    const symbolToId = new Map<string, string>()
    coins.forEach((c: { symbol: string; id: string }) => {
      symbolToId.set(c.symbol.toUpperCase(), c.id)
    })
    
    const results: TokenomicsData[] = []
    for (const sym of symbols) {
      const id = symbolToId.get(sym.replace('USDT', '').toUpperCase())
      if (id) {
        const t = await getTokenomics(id)
        if (t) results.push(t)
      }
    }
    return results
  } catch (err) {
    console.error('getBatchTokenomics error:', err)
    return []
  }
}

// ---- Risk level to color ----
export function riskColor(risk: TokenomicsData['unlockRisk']): string {
  switch (risk) {
    case 'CRITICAL': return 'text-red-500'
    case 'HIGH': return 'text-red-400'
    case 'MEDIUM': return 'text-yellow-400'
    case 'LOW': return 'text-emerald-400'
  }
}

// ---- Risk level to badge variant ----
export function riskBadge(risk: TokenomicsData['unlockRisk']): 'destructive' | 'default' | 'secondary' {
  switch (risk) {
    case 'CRITICAL':
    case 'HIGH':
      return 'destructive'
    case 'MEDIUM':
      return 'default'
    case 'LOW':
      return 'secondary'
  }
}
