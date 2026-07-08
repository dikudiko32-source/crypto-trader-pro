// =====================================================
// 6-LAYER SCORING ENGINE
// =====================================================

import type { 
  MacroData, 
  Narrative, 
  CoinFundamental, 
  TechnicalAnalysis, 
  Timeframe, 
  Bias,
  LayerScore,
  TradeSetup,
  SetupType
} from './types'
import { countConfluence, fibonacci } from './indicators'

// ---- Layer 1: Macro Regime ----
export function scoreMacro(macro: MacroData): { score: number; bias: Bias; notes: string[] } {
  let score = 50
  const notes: string[] = []
  let bullSignals = 0
  let bearSignals = 0

  // BTC Dominance trending down = altseason (bullish for alts)
  if (macro.btcDominanceTrend === 'DOWN') {
    score += 5
    bullSignals++
    notes.push('BTC.D turun → alt-friendly')
  } else if (macro.btcDominanceTrend === 'UP') {
    score -= 5
    bearSignals++
    notes.push('BTC.D naik → risk-off')
  }

  // USDT Dominance down = money flowing in
  if (macro.usdtDominanceTrend === 'DOWN') {
    score += 8
    bullSignals++
    notes.push('USDT.D turun → liquidity in-flow')
  } else if (macro.usdtDominanceTrend === 'UP') {
    score -= 8
    bearSignals++
    notes.push('USDT.D naik → money leaving crypto')
  }

  // Fear & Greed (contrarian)
  if (macro.fearGreed < 25) {
    score += 10
    bullSignals++
    notes.push('Extreme Fear → contrarian bullish')
  } else if (macro.fearGreed > 75) {
    score -= 10
    bearSignals++
    notes.push('Extreme Greed → caution zone')
  } else if (macro.fearGreed < 45) {
    score += 3
    bullSignals++
    notes.push('Fear zone → slight bullish')
  }

  // Funding rate (overleveraged = bearish risk)
  if (macro.fundingAggregate > 0.0005) {
    score -= 8
    bearSignals++
    notes.push('Funding tinggi → overleveraged long, risiko squeeze')
  } else if (macro.fundingAggregate < -0.0001) {
    score += 5
    notes.push('Funding negative → shorts overextended')
  } else {
    score += 3
    notes.push('Funding netral → healthy')
  }

  // Long/Short ratio extreme
  if (macro.longShortRatio > 2 || macro.longShortRatio < 0.5) {
    score -= 5
    notes.push('L/S ratio extreme → contrarian signal')
  }

  // Moon phase
  if (macro.moonPhase.bullBearBias === 'BULLISH') {
    score += 2
    notes.push(`Moon phase (${macro.moonPhase.phase}) → slight bullish bias`)
  } else if (macro.moonPhase.bullBearBias === 'BEARISH') {
    score -= 2
    notes.push(`Moon phase (${macro.moonPhase.phase}) → slight bearish bias`)
  }

  // High impact events in next 24h
  const highImpactSoon = macro.economicEvents.some(e => 
    e.impact === 'HIGH' && (e.title.includes('CPI') || e.title.includes('FOMC') || e.title.includes('Non-Farm'))
  )
  if (highImpactSoon) {
    score -= 10
    notes.push('⚠️ High-impact event dalam 24 jam → reduce exposure')
  }

  let bias: Bias = 'NEUTRAL'
  if (bullSignals > bearSignals + 1) bias = 'LONG'
  else if (bearSignals > bullSignals + 1) bias = 'SHORT'

  score = Math.max(0, Math.min(100, score))
  return { score, bias, notes }
}

// ---- Layer 2: Narrative ----
export function scoreNarrative(narrative: Narrative | null): { score: number; notes: string[] } {
  if (!narrative) return { score: 50, notes: ['No narrative context'] }
  
  let score = 50
  const notes: string[] = []

  // Narrative strength
  if (narrative.strength > 70) {
    score += 15
    notes.push(`Narrative strength STRONG (${narrative.strength}/100)`)
  } else if (narrative.strength > 50) {
    score += 8
    notes.push(`Narrative strength MODERATE (${narrative.strength}/100)`)
  } else if (narrative.strength < 30) {
    score -= 10
    notes.push(`Narrative strength WEAK → declining`)
  }

  // Week of rotation (3-6 weeks = peak, >8 = dying)
  if (narrative.weekOfRotation >= 2 && narrative.weekOfRotation <= 6) {
    score += 8
    notes.push(`Week ${narrative.weekOfRotation} → in peak rotation phase`)
  } else if (narrative.weekOfRotation > 8) {
    score -= 12
    notes.push(`Week ${narrative.weekOfRotation} → narrative may be dying`)
  } else if (narrative.weekOfRotation === 1) {
    score += 5
    notes.push(`Week 1 → early rotation, high risk/reward`)
  }

  // Volume change 7d
  if (narrative.volumeChange7d > 200) {
    score += 10
    notes.push(`Volume 7d +${narrative.volumeChange7d}% → strong money flow`)
  } else if (narrative.volumeChange7d > 50) {
    score += 5
    notes.push(`Volume 7d +${narrative.volumeChange7d}% → moderate flow`)
  } else if (narrative.volumeChange7d < 0) {
    score -= 8
    notes.push(`Volume 7d ${narrative.volumeChange7d}% → declining interest`)
  }

  // Catalysts
  if (narrative.catalysts.length > 0) {
    score += 5
    notes.push(`${narrative.catalysts.length} upcoming catalyst(s): ${narrative.catalysts.join(', ')}`)
  }

  score = Math.max(0, Math.min(100, score))
  return { score, notes }
}

// ---- Layer 3: Coin Fundamental ----
export function scoreFundamental(coin: CoinFundamental): { score: number; notes: string[] } {
  let score = 50
  const notes: string[] = []

  // Volume / Market Cap (liquidity check)
  if (coin.volToMcap > 0.1) {
    score += 10
    notes.push(`Vol/MCap ${(coin.volToMcap * 100).toFixed(1)}% → healthy liquidity`)
  } else if (coin.volToMcap < 0.03) {
    score -= 12
    notes.push(`Vol/MCap ${(coin.volToMcap * 100).toFixed(1)}% → illiquid, slippage risk`)
  }

  // Market cap rank
  if (coin.marketCapRank < 50) {
    score += 8
    notes.push(`Rank #${coin.marketCapRank} → blue chip tier`)
  } else if (coin.marketCapRank < 200) {
    score += 4
    notes.push(`Rank #${coin.marketCapRank} → mid tier`)
  } else {
    score -= 5
    notes.push(`Rank #${coin.marketCapRank} → small cap, higher risk`)
  }

  // FDV / Market Cap (inflation check)
  if (coin.tokenomics.fdvToMcap < 1.3) {
    score += 8
    notes.push(`FDV/MCap ${coin.tokenomics.fdvToMcap.toFixed(2)}x → low inflation`)
  } else if (coin.tokenomics.fdvToMcap > 2.5) {
    score -= 10
    notes.push(`FDV/MCap ${coin.tokenomics.fdvToMcap.toFixed(2)}x → high hidden inflation`)
  }

  // Token unlock warning
  if (coin.tokenomics.nextUnlock) {
    if (coin.tokenomics.nextUnlock.percentOfCirc > 5) {
      score -= 15
      notes.push(`⚠️ Unlock ${coin.tokenomics.nextUnlock.percentOfCirc.toFixed(1)}% in ${coin.tokenomics.nextUnlock.date} → MAJOR RISK`)
    } else if (coin.tokenomics.nextUnlock.percentOfCirc > 1) {
      score -= 5
      notes.push(`Unlock ${coin.tokenomics.nextUnlock.percentOfCirc.toFixed(1)}% in ${coin.tokenomics.nextUnlock.date} → moderate risk`)
    }
  }

  // Active addresses trend
  if (coin.activeAddressesTrend === 'UP') {
    score += 5
    notes.push('Active addresses up → real adoption')
  } else if (coin.activeAddressesTrend === 'DOWN') {
    score -= 5
    notes.push('Active addresses down → declining interest')
  }

  // Developer activity
  if (coin.devActivity > 70) {
    score += 5
    notes.push(`Dev activity top ${100 - coin.devActivity}% → strong team`)
  }

  // News sentiment
  if (coin.newsSentiment > 70) {
    score += 5
    notes.push(`News sentiment ${coin.newsSentiment}% → positive buzz`)
  } else if (coin.newsSentiment < 30) {
    score -= 5
    notes.push(`News sentiment ${coin.newsSentiment}% → FUD risk`)
  }

  score = Math.max(0, Math.min(100, score))
  return { score, notes }
}

// ---- Layer 4: Multi-Timeframe Technical ----
export function scoreTechnical(
  tfs: Record<Timeframe, TechnicalAnalysis>,
  bias: Bias
): { score: number; notes: string[]; setupType: SetupType | null } {
  let score = 50
  const notes: string[] = []
  let setupType: SetupType | null = null

  const weekly = tfs['1W']
  const daily = tfs['1D']
  const h4 = tfs['4H']
  const h1 = tfs['1H']

  if (!weekly || !daily || !h4 || !h1) {
    return { score: 30, notes: ['Insufficient timeframe data'], setupType: null }
  }

  // HTF bias alignment (Weekly + Daily)
  const htfBullish = weekly.verdict === 'BULLISH' && daily.verdict === 'BULLISH'
  const htfBearish = weekly.verdict === 'BEARISH' && daily.verdict === 'BEARISH'

  if (bias === 'LONG' && htfBullish) {
    score += 20
    notes.push('✅ Weekly + Daily bullish alignment')
  } else if (bias === 'SHORT' && htfBearish) {
    score += 20
    notes.push('✅ Weekly + Daily bearish alignment')
  } else {
    score -= 10
    notes.push('❌ HTF bias conflicts with trade bias')
  }

  // ADX check (trending market)
  if (daily.adx > 25) {
    score += 8
    notes.push(`Daily ADX ${daily.adx.toFixed(0)} → trend strong`)
    setupType = 'TREND_PULLBACK'
  } else if (daily.adx < 20) {
    notes.push(`Daily ADX ${daily.adx.toFixed(0)} → ranging market`)
    setupType = 'MEAN_REVERSION'
    // Mean reversion setup
    if (bias === 'LONG' && h4.rsi < 35) {
      score += 10
      notes.push('4H RSI oversold → mean reversion candidate')
    }
  }

  // Bollinger squeeze detection (breakout potential)
  if (h4.bollinger.squeeze && daily.bollinger.squeeze) {
    score += 5
    notes.push('Bollinger squeeze multi-TF → breakout pending')
    if (!setupType) setupType = 'BREAKOUT'
  }

  // Confluence counter at entry timeframe
  const confluence = countConfluence(h4, bias)
  if (confluence >= 5) {
    score += 15
    notes.push(`4H confluence ${confluence}/7 → strong confirmation`)
  } else if (confluence >= 3) {
    score += 8
    notes.push(`4H confluence ${confluence}/7 → moderate confirmation`)
  } else {
    score -= 5
    notes.push(`4H confluence ${confluence}/7 → weak confirmation, wait`)
  }

  // Volume confirmation
  if (h4.volumeTrend === 'UP' && h4.candlestickPattern) {
    score += 5
    notes.push(`Volume up + pattern (${h4.candlestickPattern}) → momentum confirmed`)
  }

  // RSI extreme (overbought/oversold warning)
  if (bias === 'LONG' && h4.rsi > 75) {
    score -= 10
    notes.push('4H RSI overbought → late entry risk')
  } else if (bias === 'SHORT' && h4.rsi < 25) {
    score -= 10
    notes.push('4H RSI oversold → late entry risk')
  }

  // MACD cross at entry TF
  if ((bias === 'LONG' && h1.macd.cross === 'BULLISH') || (bias === 'SHORT' && h1.macd.cross === 'BEARISH')) {
    score += 5
    notes.push(`1H MACD cross aligned → fresh entry signal`)
  }

  // SMC confluence
  if (h4.smc.bos || h4.smc.choch) {
    score += 5
    notes.push('SMC: BOS/CHoCH detected → structure aligned')
  }

  score = Math.max(0, Math.min(100, score))
  return { score, notes, setupType }
}

// ---- Layer 5: Pre-Trade Checklist ----
export function scoreChecklist(items: { item: string; checked: boolean; required: boolean }[]): {
  score: number
  notes: string[]
  allRequiredChecked: boolean
} {
  const requiredItems = items.filter(i => i.required)
  const checkedRequired = requiredItems.filter(i => i.checked)
  const optionalItems = items.filter(i => !i.required)
  const checkedOptional = optionalItems.filter(i => i.checked)

  // Required = 70% of score, optional = 30%
  let score = 50
  if (requiredItems.length > 0) {
    score = (checkedRequired.length / requiredItems.length) * 70 + 30
  }
  if (optionalItems.length > 0) {
    const optionalBonus = (checkedOptional.length / optionalItems.length) * 30
    score = score * 0.7 + (50 + optionalBonus) * 0.3
  }

  const allRequiredChecked = checkedRequired.length === requiredItems.length
  const notes: string[] = []
  notes.push(`${checkedRequired.length}/${requiredItems.length} required checks passed`)
  if (!allRequiredChecked) {
    notes.push('⚠️ Cannot execute trade — required checks missing')
  } else {
    notes.push('✅ All required checks passed')
  }

  return { score, notes, allRequiredChecked }
}

// ---- Layer 6: Risk Management ----
export function scoreRisk(
  rr: number,
  riskPercent: number,
  openPositions: number,
  maxPositions: number,
  dailyDrawdown: number,
  dailyLimit: number
): { score: number; notes: string[] } {
  let score = 50
  const notes: string[] = []

  // R:R
  if (rr >= 3) {
    score += 20
    notes.push(`R:R 1:${rr.toFixed(2)} → excellent`)
  } else if (rr >= 2) {
    score += 12
    notes.push(`R:R 1:${rr.toFixed(2)} → good`)
  } else if (rr >= 1.5) {
    score += 5
    notes.push(`R:R 1:${rr.toFixed(2)} → acceptable`)
  } else {
    score -= 10
    notes.push(`R:R 1:${rr.toFixed(2)} → below 1:1.5 minimum`)
  }

  // Risk per trade
  if (riskPercent <= 1) {
    score += 10
    notes.push(`Risk ${riskPercent}% → conservative, sustainable`)
  } else if (riskPercent <= 2) {
    score += 5
    notes.push(`Risk ${riskPercent}% → within 1-2% rule`)
  } else {
    score -= 15
    notes.push(`⚠️ Risk ${riskPercent}% → exceeds 2% rule`)
  }

  // Position count
  if (openPositions >= maxPositions) {
    score -= 15
    notes.push(`Max concurrent positions reached (${openPositions}/${maxPositions})`)
  } else {
    notes.push(`Open positions: ${openPositions}/${maxPositions}`)
  }

  // Daily drawdown
  if (dailyDrawdown >= dailyLimit * 0.8) {
    score -= 15
    notes.push(`⚠️ Daily DD ${dailyDrawdown.toFixed(1)}% approaching limit ${dailyLimit}%`)
  } else if (dailyDrawdown < dailyLimit * 0.5) {
    score += 5
    notes.push(`Daily DD ${dailyDrawdown.toFixed(1)}% healthy`)
  }

  score = Math.max(0, Math.min(100, score))
  return { score, notes }
}

// ---- Calculate total confidence score ----
export function calculateTotalScore(layers: {
  macro: { score: number }
  narrative: { score: number }
  fundamental: { score: number }
  technical: { score: number }
  checklist: { score: number; allRequiredChecked: boolean }
  risk: { score: number }
}): LayerScore {
  // Weighted: Technical 30%, Macro 20%, Checklist 20%, Fundamental 15%, Narrative 10%, Risk 5%
  const total =
    layers.macro.score * 0.20 +
    layers.narrative.score * 0.10 +
    layers.fundamental.score * 0.15 +
    layers.technical.score * 0.30 +
    layers.checklist.score * 0.20 +
    layers.risk.score * 0.05

  let confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH' = 'LOW'
  if (!layers.checklist.allRequiredChecked) {
    confidence = 'LOW'
  } else if (total >= 80) {
    confidence = 'VERY HIGH'
  } else if (total >= 70) {
    confidence = 'HIGH'
  } else if (total >= 60) {
    confidence = 'MEDIUM'
  }

  return {
    layer1Macro: layers.macro.score,
    layer2Narrative: layers.narrative.score,
    layer3Fundamental: layers.fundamental.score,
    layer4Technical: layers.technical.score,
    layer5Checklist: layers.checklist.score,
    layer6Risk: layers.risk.score,
    totalScore: total,
    confidence,
  }
}

// ---- Default checklist items (Layer 5) ----
export function defaultChecklist(): { item: string; checked: boolean; required: boolean }[] {
  return [
    { item: 'Macro layer aligned with bias', checked: false, required: true },
    { item: 'Narrative active (<7 days declining)', checked: false, required: true },
    { item: 'Coin fundamental OK (no major unlock in 7d)', checked: false, required: true },
    { item: 'HTF bias clear (Weekly/Daily aligned)', checked: false, required: true },
    { item: 'LTF setup complete (3+ confluence)', checked: false, required: true },
    { item: 'No high-impact event in 24h (CPI/FOMC/NFP)', checked: false, required: true },
    { item: 'R:R minimum 1:2', checked: false, required: true },
    { item: 'Position size within 1-2% rule', checked: false, required: true },
    { item: 'Stop loss at valid structure', checked: false, required: true },
    { item: 'Mental state OK (not FOMO/revenge/tired)', checked: false, required: true },
    { item: 'Funding rate not extreme (|f| < 0.05%)', checked: false, required: false },
    { item: 'Open Interest not parabolic', checked: false, required: false },
    { item: 'Trailing stop plan ready', checked: false, required: false },
    { item: 'Partial TP plan set', checked: false, required: false },
  ]
}

// =====================================================
// PHASE 3 — Multi-TF Alignment & Risk Recovery
// =====================================================

import type { MultiTFAlignment, RiskState, TechnicalAnalysis, Timeframe } from './types'

// ---- Multi-TF Alignment Score ----
export function calculateMultiTFAlignment(
  tfs: Record<Timeframe, TechnicalAnalysis>
): MultiTFAlignment {
  const weekly = tfs['1W']?.verdict || 'NEUTRAL'
  const daily = tfs['1D']?.verdict || 'NEUTRAL'
  const h4 = tfs['4H']?.verdict || 'NEUTRAL'
  const h1 = tfs['1H']?.verdict || 'NEUTRAL'
  
  const mapToScore = (v: string): number => {
    if (v === 'BULLISH') return 1
    if (v === 'BEARISH') return -1
    return 0
  }
  
  // Weight: Weekly 40%, Daily 30%, 4H 20%, 1H 10%
  const weightedScore = 
    mapToScore(weekly) * 0.4 +
    mapToScore(daily) * 0.3 +
    mapToScore(h4) * 0.2 +
    mapToScore(h1) * 0.1
  
  // Convert to 0-100 score (50 = neutral)
  const alignmentScore = 50 + (weightedScore * 50)
  
  let bias: MultiTFAlignment['bias'] = 'NEUTRAL'
  if (weightedScore > 0.7) bias = 'STRONG_LONG'
  else if (weightedScore > 0.2) bias = 'LONG'
  else if (weightedScore < -0.7) bias = 'STRONG_SHORT'
  else if (weightedScore < -0.2) bias = 'SHORT'
  
  // Conflict detection: HTF and LTF disagree
  const htfBullish = weekly === 'BULLISH' && daily === 'BULLISH'
  const htfBearish = weekly === 'BEARISH' && daily === 'BEARISH'
  const ltfBullish = h4 === 'BULLISH' && h1 === 'BULLISH'
  const ltfBearish = h4 === 'BEARISH' && h1 === 'BEARISH'
  
  const conflict = (htfBullish && ltfBearish) || (htfBearish && ltfBullish)
  
  return {
    weekly: weekly as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    daily: daily as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    h4: h4 as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    h1: h1 as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    alignmentScore,
    bias,
    conflict,
  }
}

// ---- Risk Recovery Protocol ----
export function assessRiskState(
  consecutiveLosses: number,
  dailyDrawdown: number,       // percent
  weeklyDrawdown: number,      // percent
  dailyLimit: number,          // percent
  weeklyLimit: number,         // percent
  journalEntries: { pnl: number | null; date: string }[]
): RiskState {
  const reasons: string[] = []
  let status: RiskState['status'] = 'NORMAL'
  let recommendedSizeMultiplier = 1.0
  let cooldownUntil: string | null = null
  
  // Check consecutive losses
  if (consecutiveLosses >= 5) {
    status = 'COOLDOWN'
    recommendedSizeMultiplier = 0
    cooldownUntil = new Date(Date.now() + 48 * 3600 * 1000).toISOString() // 48h cooldown
    reasons.push(`🚨 ${consecutiveLosses} consecutive losses — 48h cooldown mandatory`)
  } else if (consecutiveLosses >= 3) {
    if (status === 'NORMAL') status = 'WARNING'
    recommendedSizeMultiplier = 0.5
    reasons.push(`⚠️ ${consecutiveLosses} consecutive losses — reduce size to 50%`)
  } else if (consecutiveLosses >= 2) {
    if (status === 'NORMAL') status = 'CAUTION'
    recommendedSizeMultiplier = 0.75
    reasons.push(`${consecutiveLosses} consecutive losses — reduce size to 75%`)
  }
  
  // Check daily drawdown
  if (dailyDrawdown >= dailyLimit) {
    status = 'COOLDOWN'
    recommendedSizeMultiplier = 0
    cooldownUntil = new Date(Date.now() + 24 * 3600 * 1000).toISOString() // 24h
    reasons.push(`🚨 Daily DD ${dailyDrawdown.toFixed(1)}% hit limit ${dailyLimit}% — stop trading today`)
  } else if (dailyDrawdown >= dailyLimit * 0.7) {
    if (status === 'NORMAL') status = 'WARNING'
    recommendedSizeMultiplier = Math.min(recommendedSizeMultiplier, 0.3)
    reasons.push(`⚠️ Daily DD ${dailyDrawdown.toFixed(1)}% approaching limit ${dailyLimit}% — reduce size to 30%`)
  }
  
  // Check weekly drawdown
  if (weeklyDrawdown >= weeklyLimit) {
    status = 'COOLDOWN'
    recommendedSizeMultiplier = 0
    cooldownUntil = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() // 7 days
    reasons.push(`🚨 Weekly DD ${weeklyDrawdown.toFixed(1)}% hit limit ${weeklyLimit}% — 7 day cooldown`)
  } else if (weeklyDrawdown >= weeklyLimit * 0.7) {
    if (status === 'NORMAL') status = 'WARNING'
    recommendedSizeMultiplier = Math.min(recommendedSizeMultiplier, 0.3)
    reasons.push(`⚠️ Weekly DD ${weeklyDrawdown.toFixed(1)}% approaching limit — reduce size to 30%`)
  }
  
  // Check for revenge trading pattern (3+ trades in same day after a loss)
  const today = new Date().toDateString()
  const todayTrades = journalEntries.filter(e => 
    e.pnl !== null && new Date(e.date).toDateString() === today
  )
  if (todayTrades.length >= 4) {
    if (status === 'NORMAL') status = 'CAUTION'
    reasons.push(`⚠️ ${todayTrades.length} trades today — possible overtrading/revenge trading`)
  }
  
  return {
    consecutiveLosses,
    dailyDrawdown,
    weeklyDrawdown,
    status,
    recommendedSizeMultiplier,
    cooldownUntil,
    reasons,
  }
}

// ---- Calculate consecutive losses from journal ----
export function getConsecutiveLosses(journal: { pnl: number | null }[]): number {
  let count = 0
  for (const entry of journal) {
    if ((entry.pnl || 0) < 0) count++
    else if ((entry.pnl || 0) > 0) break
    // null P&L doesn't reset (open trade)
  }
  return count
}
