// =====================================================
// EVENT INTELLIGENCE ENGINE
// =====================================================
// Detect upcoming crypto market events
// Assess impact and recommend trading action

import type { CryptoEvent, EventIntelligence } from './types'

// ---- Hardcoded upcoming events (in production, would fetch from API) ----
// Updated periodically — manual maintenance required
const UPCOMING_EVENTS: CryptoEvent[] = [
  // Recurring macro events
  {
    id: 'fomc-monthly',
    title: 'FOMC Meeting & Rate Decision',
    type: 'FOMC',
    impact: 'CRITICAL',
    scheduledAt: getNextOccurrence(3, 2),  // Wednesday 02:00 WIB
    hoursUntil: 0,
    affectedAssets: 'ALL',
    description: 'Federal Reserve interest rate decision. Highest volatility event for crypto. BTC can move 5-10% in 1 hour.',
    recommendedAction: 'AVOID_TRADING',
    reasonForAction: 'Extreme volatility. Wait 1-2 hours after announcement for dust to settle. Close positions before if possible.',
  },
  {
    id: 'cpi-monthly',
    title: 'CPI Release (Consumer Price Index)',
    type: 'CPI',
    impact: 'HIGH',
    scheduledAt: getNextOccurrence(15, 20.5),  // Around 15th, 20:30 WIB
    hoursUntil: 0,
    affectedAssets: 'ALL',
    description: 'Inflation data. Higher than expected = bearish for risk assets (crypto). Lower = bullish.',
    recommendedAction: 'REDUCE_SIZE',
    reasonForAction: 'Significant volatility. Reduce position size by 50%. Avoid new entries 1 hour before/after.',
  },
  {
    id: 'nfp-monthly',
    title: 'Non-Farm Payrolls',
    type: 'NFP',
    impact: 'HIGH',
    scheduledAt: getNextOccurrence(5, 20.5),  // First Friday, 20:30 WIB
    hoursUntil: 0,
    affectedAssets: 'ALL',
    description: 'US employment data. Strong jobs = hawkish Fed = bearish crypto. Weak jobs = dovish = bullish.',
    recommendedAction: 'REDUCE_SIZE',
    reasonForAction: 'High volatility. Reduce size. Avoid new entries 30 min before/after.',
  },
  {
    id: 'ppi-monthly',
    title: 'PPI Release (Producer Price Index)',
    type: 'PPI',
    impact: 'MEDIUM',
    scheduledAt: getNextOccurrence(13, 20.5),  // Around 13th, 20:30 WIB
    hoursUntil: 0,
    affectedAssets: 'ALL',
    description: 'Wholesale inflation. Leading indicator for CPI. Moderate crypto impact.',
    recommendedAction: 'MONITOR',
    reasonForAction: 'Moderate volatility. Monitor but normal trading OK.',
  },
  {
    id: 'gdp-quarterly',
    title: 'GDP Release',
    type: 'GDP',
    impact: 'MEDIUM',
    scheduledAt: getNextOccurrence(28, 20.5),
    hoursUntil: 0,
    affectedAssets: 'ALL',
    description: 'Economic growth data. Quarterly release. Moderate impact.',
    recommendedAction: 'MONITOR',
    reasonForAction: 'Moderate volatility. Normal trading OK.',
  },
  {
    id: 'jobless-claims-weekly',
    title: 'Initial Jobless Claims',
    type: 'NFP',
    impact: 'LOW',
    scheduledAt: getNextOccurrence(4, 20.5),  // Every Thursday
    hoursUntil: 0,
    affectedAssets: 'ALL',
    description: 'Weekly unemployment data. Low impact unless significantly off expectations.',
    recommendedAction: 'NORMAL',
    reasonForAction: 'Low volatility. Normal trading.',
  },
  // Crypto-specific events (would need API in production)
  {
    id: 'btc-halving-2028',
    title: 'Bitcoin Halving (next cycle)',
    type: 'FORK',
    impact: 'CRITICAL',
    scheduledAt: '2028-04-01T00:00:00Z',
    hoursUntil: 0,
    affectedAssets: 'BTC',
    description: 'Bitcoin block reward halving. Historically triggers bull market 6-12 months after.',
    recommendedAction: 'SWING_ONLY',
    reasonForAction: 'Long-term bullish. Accumulate on dips. Not for day trading.',
  },
]

// ---- Helper: Get next occurrence of monthly event ----
function getNextOccurrence(dayOfWeekOrDate: number, hourWIB: number): string {
  const now = new Date()
  const target = new Date(now)
  
  if (dayOfWeekOrDate <= 4) {
    // Day of week (0=Sunday, 4=Thursday)
    const currentDay = now.getDay()
    let daysUntil = dayOfWeekOrDate - currentDay
    if (daysUntil < 0) daysUntil += 7
    if (daysUntil === 0 && now.getHours() >= hourWIB) daysUntil = 7
    target.setDate(now.getDate() + daysUntil)
  } else {
    // Date of month
    target.setDate(dayOfWeekOrDate)
    if (target < now) {
      target.setMonth(target.getMonth() + 1)
    }
  }
  
  target.setHours(hourWIB, 0, 0, 0)
  return target.toISOString()
}

// ---- Get event intelligence ----
export async function getEventIntelligence(): Promise<EventIntelligence> {
  const now = new Date()
  
  // Calculate hoursUntil for each event
  const eventsWithHours = UPCOMING_EVENTS.map(e => ({
    ...e,
    hoursUntil: (new Date(e.scheduledAt).getTime() - now.getTime()) / (1000 * 60 * 60),
  }))
  
  // Filter upcoming (next 7 days)
  const upcomingEvents = eventsWithHours
    .filter(e => e.hoursUntil > 0 && e.hoursUntil < 168)
    .sort((a, b) => a.hoursUntil - b.hoursUntil)
  
  // Critical events next 24h
  const criticalEventsNext24h = upcomingEvents.filter(e => 
    e.hoursUntil < 24 && (e.impact === 'CRITICAL' || e.impact === 'HIGH')
  )
  
  // High impact events next 48h
  const highImpactEventsNext48h = upcomingEvents.filter(e => 
    e.hoursUntil < 48 && e.impact === 'HIGH'
  )
  
  // Determine market risk level
  let marketRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
  let tradingRecommendation: 'NORMAL' | 'CAUTIOUS' | 'DEFENSIVE' | 'HALT' = 'NORMAL'
  let recommendationReason = 'No significant events in next 48h. Normal trading conditions.'
  
  if (criticalEventsNext24h.some(e => e.impact === 'CRITICAL')) {
    marketRiskLevel = 'CRITICAL'
    tradingRecommendation = 'HALT'
    const event = criticalEventsNext24h.find(e => e.impact === 'CRITICAL')!
    recommendationReason = `🚨 CRITICAL event "${event.title}" in ${event.hoursUntil.toFixed(1)}h. ${event.reasonForAction}`
  } else if (criticalEventsNext24h.length > 0) {
    marketRiskLevel = 'HIGH'
    tradingRecommendation = 'DEFENSIVE'
    const event = criticalEventsNext24h[0]
    recommendationReason = `⚠️ High impact event "${event.title}" in ${event.hoursUntil.toFixed(1)}h. ${event.reasonForAction}`
  } else if (highImpactEventsNext48h.length > 0) {
    marketRiskLevel = 'MEDIUM'
    tradingRecommendation = 'CAUTIOUS'
    const event = highImpactEventsNext48h[0]
    recommendationReason = `⚠️ Event "${event.title}" in ${event.hoursUntil.toFixed(1)}h. ${event.reasonForAction}`
  }
  
  return {
    upcomingEvents,
    criticalEventsNext24h,
    highImpactEventsNext48h,
    marketRiskLevel,
    tradingRecommendation,
    recommendationReason,
  }
}

// ---- Check if event affects symbol ----
export function isSymbolAffected(event: CryptoEvent, symbol: string): boolean {
  if (event.affectedAssets === 'ALL') return true
  if (event.affectedAssets === 'BTC') return symbol.startsWith('BTC')
  if (event.affectedAssets === 'ETH') return symbol.startsWith('ETH')
  if (Array.isArray(event.affectedAssets)) {
    return event.affectedAssets.some(a => symbol.startsWith(a))
  }
  return false
}
