// =====================================================
// POSITION CORRELATION ANALYZER
// =====================================================
// Calculates correlation between coin holdings
// High correlation = portfolio risk concentration

import type { PositionCorrelation } from './types'

// ---- Calculate correlation coefficient (Pearson) ----
export function pearsonCorrelation(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length < 2) return 0
  
  const meanA = a.reduce((sum, x) => sum + x, 0) / a.length
  const meanB = b.reduce((sum, x) => sum + x, 0) / b.length
  
  let numerator = 0
  let denomA = 0
  let denomB = 0
  
  for (let i = 0; i < a.length; i++) {
    const dA = a[i] - meanA
    const dB = b[i] - meanB
    numerator += dA * dB
    denomA += dA * dA
    denomB += dB * dB
  }
  
  const denom = Math.sqrt(denomA * denomB)
  return denom === 0 ? 0 : numerator / denom
}

// ---- Get price series for correlation ----
export async function getPriceReturns(symbol: string, days = 30): Promise<number[]> {
  try {
    const url = `/api/proxy/binance?path=klines&symbol=${symbol}&interval=1d&limit=${days + 1}`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    
    const closes: number[] = data.map((k: unknown[]) => parseFloat(k[4] as string))
    // Calculate daily returns
    const returns: number[] = []
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] > 0) {
        returns.push((closes[i] - closes[i - 1]) / closes[i - 1])
      }
    }
    return returns
  } catch {
    return []
  }
}

// ---- Analyze correlation between positions ----
export async function analyzeCorrelation(
  positions: { symbol: string; value: number }[],
  totalCapital: number
): Promise<PositionCorrelation> {
  if (positions.length === 0) {
    return {
      symbols: [],
      matrix: [],
      riskLevel: 'LOW',
      recommendation: 'No open positions',
      totalExposurePct: 0,
    }
  }
  
  // Get price returns for all symbols
  const returnsMap = new Map<string, number[]>()
  await Promise.all(
    positions.map(async (p) => {
      const returns = await getPriceReturns(p.symbol, 30)
      returnsMap.set(p.symbol, returns)
    })
  )
  
  // Build correlation matrix
  const matrix: { from: string; to: string; coefficient: number }[] = []
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = returnsMap.get(positions[i].symbol) || []
      const b = returnsMap.get(positions[j].symbol) || []
      const minLen = Math.min(a.length, b.length)
      if (minLen < 5) {
        matrix.push({ from: positions[i].symbol, to: positions[j].symbol, coefficient: 0 })
      } else {
        const coef = pearsonCorrelation(a.slice(0, minLen), b.slice(0, minLen))
        matrix.push({ from: positions[i].symbol, to: positions[j].symbol, coefficient: coef })
      }
    }
  }
  
  // Determine risk level
  const highCorrPairs = matrix.filter(m => Math.abs(m.coefficient) > 0.7)
  const mediumCorrPairs = matrix.filter(m => Math.abs(m.coefficient) > 0.4 && Math.abs(m.coefficient) <= 0.7)
  
  let riskLevel: PositionCorrelation['riskLevel'] = 'LOW'
  let recommendation = 'Portfolio well diversified'
  
  if (highCorrPairs.length > 0) {
    riskLevel = 'HIGH'
    recommendation = `⚠️ ${highCorrPairs.length} pair(s) with high correlation (>0.7). Reduce exposure to one of them.`
  } else if (mediumCorrPairs.length > 0) {
    riskLevel = 'MEDIUM'
    recommendation = `${mediumCorrPairs.length} pair(s) with medium correlation (0.4-0.7). Monitor.`
  }
  
  const totalExposurePct = (positions.reduce((sum, p) => sum + p.value, 0) / totalCapital) * 100
  
  return {
    symbols: positions.map(p => p.symbol),
    matrix,
    riskLevel,
    recommendation,
    totalExposurePct,
  }
}

// ---- Color code for correlation ----
export function correlationColor(coef: number): string {
  const abs = Math.abs(coef)
  if (abs > 0.7) return 'text-red-400'
  if (abs > 0.4) return 'text-yellow-400'
  if (abs > 0.2) return 'text-blue-400'
  return 'text-emerald-400'
}
