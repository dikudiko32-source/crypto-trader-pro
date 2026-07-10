// =====================================================
// MACRO DATA — Fear&Greed, Moon Phase, Economic Events
// =====================================================

// ---- Fear & Greed Index ----
export async function getFearGreedIndex(): Promise<{ value: number; classification: string; timestamp: string } | null> {
  try {
    const url = '/api/proxy/fng'
    const res = await fetch(url)
    if (!res.ok) throw new Error('F&G error')
    const data = await res.json()
    return {
      value: parseInt(data.data[0].value),
      classification: data.data[0].value_classification,
      timestamp: data.data[0].timestamp,
    }
  } catch (err) {
    console.error('getFearGreedIndex error:', err)
    return null
  }
}

// ---- Moon Phase Calculation ----
// Algorithm: based on known new moon date + 29.5305882 day cycle
export function getMoonPhase(date = new Date()): {
  phase: string
  emoji: string
  bullBearBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  daysToNext: number
} {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime()
  const lunarCycle = 29.5305882 * 24 * 60 * 60 * 1000
  const diff = date.getTime() - knownNewMoon
  const phase = ((diff % lunarCycle) + lunarCycle) % lunarCycle / lunarCycle

  let phaseName = 'New Moon'
  let emoji = '🌑'
  let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'

  if (phase < 0.0625) { phaseName = 'New Moon'; emoji = '🌑'; bias = 'BULLISH' }
  else if (phase < 0.1875) { phaseName = 'Waxing Crescent'; emoji = '🌒'; bias = 'BULLISH' }
  else if (phase < 0.3125) { phaseName = 'First Quarter'; emoji = '🌓'; bias = 'BULLISH' }
  else if (phase < 0.4375) { phaseName = 'Waxing Gibbous'; emoji = '🌔'; bias = 'BULLISH' }
  else if (phase < 0.5625) { phaseName = 'Full Moon'; emoji = '🌕'; bias = 'BEARISH' }
  else if (phase < 0.6875) { phaseName = 'Waning Gibbous'; emoji = '🌖'; bias = 'BEARISH' }
  else if (phase < 0.8125) { phaseName = 'Last Quarter'; emoji = '🌗'; bias = 'BEARISH' }
  else if (phase < 0.9375) { phaseName = 'Waning Crescent'; emoji = '🌘'; bias = 'BEARISH' }
  else { phaseName = 'New Moon'; emoji = '🌑'; bias = 'BULLISH' }

  const daysToNext = Math.round((1 - phase) * 29.53)

  return { phase: phaseName, emoji, bullBearBias: bias, daysToNext }
}

// ---- Economic Events (hardcoded upcoming high-impact events) ----
// In production, would call Forex Factory or Investing.com API
export function getEconomicEvents(): Array<{ time: string; title: string; impact: 'LOW' | 'MEDIUM' | 'HIGH'; currency: string }> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  // Generate next 7 days of typical recurring events
  const events: Array<{ time: string; title: string; impact: 'LOW' | 'MEDIUM' | 'HIGH'; currency: string }> = []
  
  // Next FOMC-style (placeholder - would be API-driven)
  events.push({
    time: 'Next Wednesday 02:00 WIB',
    title: 'FOMC Meeting Minutes',
    impact: 'HIGH',
    currency: 'USD',
  })
  
  // CPI (monthly, around mid-month)
  events.push({
    time: `${month + 2}/15 20:30 WIB`,
    title: 'CPI Release (MoM)',
    impact: 'HIGH',
    currency: 'USD',
  })
  
  // NFP (first Friday of month)
  events.push({
    time: 'First Friday 20:30 WIB',
    title: 'Non-Farm Payrolls',
    impact: 'HIGH',
    currency: 'USD',
  })

  // PPI
  events.push({
    time: `${month + 2}/13 20:30 WIB`,
    title: 'PPI Release',
    impact: 'MEDIUM',
    currency: 'USD',
  })

  // Initial Jobless Claims (weekly Thursday)
  events.push({
    time: 'Every Thursday 20:30 WIB',
    title: 'Initial Jobless Claims',
    impact: 'MEDIUM',
    currency: 'USD',
  })

  return events
}

// ---- Aggregate Funding Rate (from multiple coins, via proxy) ----
export async function getAggregateFunding(): Promise<{ avgFunding: number; extremeCount: number; sampleCount: number } | null> {
  try {
    const pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
                   'MATICUSDT', 'TONUSDT', 'TRXUSDT', 'LTCUSDT', 'BCHUSDT', 'NEARUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT', 'FILUSDT']
    let total = 0
    let count = 0
    let extreme = 0
    for (const pair of pairs) {
      try {
        const res = await fetch(`/api/proxy/futures?path=premiumIndex&symbol=${pair}`)
        if (res.ok) {
          const data = await res.json()
          const rate = parseFloat(data.lastFundingRate)
          if (!isNaN(rate)) {
            total += rate
            count++
            if (Math.abs(rate) > 0.0005) extreme++
          }
        }
      } catch {
        // skip individual failures
      }
    }
    if (count === 0) return null
    return { avgFunding: total / count, extremeCount: extreme, sampleCount: count }
  } catch (err) {
    console.error('getAggregateFunding error:', err)
    return null
  }
}

// ---- Total Open Interest (BTC futures, via proxy) ----
export async function getBtcOpenInterest(): Promise<{ oiValue: number; oiValueUsd: number } | null> {
  try {
    const res = await fetch('/api/proxy/futures?path=openInterest&symbol=BTCUSDT')
    if (!res.ok) return null
    const data = await res.json()
    const oiValue = parseFloat(data.openInterest)
    // Get BTC price via proxy
    const priceRes = await fetch('/api/proxy/binance?path=ticker/price&symbol=BTCUSDT')
    const priceData = await priceRes.json()
    const btcPrice = parseFloat(priceData.price)
    return { oiValue, oiValueUsd: oiValue * btcPrice }
  } catch {
    return null
  }
}
