// =====================================================
// SMART RECOMMENDATION ENGINE
// =====================================================
// Generate detailed trade recommendation based on:
// - Multi-timeframe analysis
// - Event intelligence
// - Trading style signal
// - Deep analysis (6-layer)
// - Market conditions

import type { 
  SmartRecommendation, TradeType, MTFAnalysisResult, 
  EventIntelligence, ScannerSignal, DeepAnalysisResult, ScanTimeframe
} from './types'

// ---- Generate smart recommendation ----
export function generateSmartRecommendation(
  signal: ScannerSignal,
  mtf: MTFAnalysisResult,
  events: EventIntelligence,
  deep: DeepAnalysisResult | undefined,
  capital: number,
  riskPercent: number
): SmartRecommendation {
  const price = signal.entry
  
  // ---- Determine trade type based on timeframe + style ----
  let tradeType: TradeType = 'DAY_TRADE'
  let tradeTypeLabel = 'Day Trade'
  let holdDuration: 'HOURS' | 'DAYS' | 'WEEKS' = 'HOURS'
  let estimatedHoldTime = '4-12 hours'
  
  // Style-based trade type
  if (signal.style === 'TREND_FOLLOWING') {
    tradeType = 'SWING'
    tradeTypeLabel = 'Swing Trade'
    holdDuration = 'DAYS'
    estimatedHoldTime = '2-7 days'
  } else if (signal.style === 'SMART_MONEY') {
    tradeType = 'SWING'
    tradeTypeLabel = 'Swing Trade (SMC)'
    holdDuration = 'DAYS'
    estimatedHoldTime = '1-5 days'
  } else if (signal.style === 'MEAN_REVERSION') {
    tradeType = 'DAY_TRADE'
    tradeTypeLabel = 'Day Trade (Mean Reversion)'
    holdDuration = 'HOURS'
    estimatedHoldTime = '4-24 hours'
  } else if (signal.style === 'VOLUME_BREAKOUT') {
    tradeType = 'DAY_TRADE'
    tradeTypeLabel = 'Day Trade (Breakout)'
    holdDuration = 'HOURS'
    estimatedHoldTime = '2-12 hours'
  }
  
  // Adjust based on MTF — if HTF (1D) strong, swing; if only LTF, scalp
  if (mtf.htfBias !== 'NEUTRAL' && mtf.alignmentScore > 70) {
    if (tradeType === 'DAY_TRADE') {
      tradeType = 'SWING'
      tradeTypeLabel = 'Swing Trade (HTF aligned)'
      holdDuration = 'DAYS'
      estimatedHoldTime = '2-7 days'
    }
  } else if (mtf.alignmentScore < 40 && mtf.recommendation === 'WAIT') {
    tradeType = 'SCALP'
    tradeTypeLabel = 'Scalp (quick in/out)'
    holdDuration = 'HOURS'
    estimatedHoldTime = '15-60 min'
  }
  
  // ---- Event adjustment ----
  // If critical event soon, downgrade to AVOID or SWING_ONLY
  let eventAdjustedTradeType = tradeType
  let eventAdjustedRisk = riskPercent
  let eventNote = ''
  
  if (events.marketRiskLevel === 'CRITICAL') {
    eventAdjustedTradeType = 'AVOID'
    eventAdjustedRisk = 0
    eventNote = '🚨 CRITICAL event imminent — AVOID trading'
  } else if (events.marketRiskLevel === 'HIGH') {
    eventAdjustedRisk = riskPercent * 0.5
    eventNote = '⚠️ High impact event — reduce size 50%'
    if (tradeType === 'SCALP') {
      eventAdjustedTradeType = 'AVOID'
      eventNote = '🚨 Scalp not recommended during high volatility event'
    }
  } else if (events.marketRiskLevel === 'MEDIUM') {
    eventAdjustedRisk = riskPercent * 0.75
    eventNote = '⚠️ Event soon — reduce size 25%'
  }
  
  // ---- MTF conflict adjustment ----
  if (mtf.conflict) {
    eventAdjustedTradeType = 'AVOID'
    eventAdjustedRisk = 0
    eventNote = '⚠️ MTF conflict — wait for alignment'
  }
  
  // ---- Entry strategy ----
  let entryStrategy: 'LIMIT' | 'MARKET' | 'WAIT_PULLBACK' | 'WAIT_BREAKOUT'
  let entryTrigger = ''
  
  if (signal.style === 'TREND_FOLLOWING' || signal.style === 'VOLUME_BREAKOUT') {
    entryStrategy = 'WAIT_BREAKOUT'
    entryTrigger = `Wait for ${mtf.ltfTimeframe} close above $${price.toFixed(2)} with volume > 1.5x avg`
  } else if (signal.style === 'MEAN_REVERSION') {
    entryStrategy = 'LIMIT'
    entryTrigger = `Place limit order at $${price.toFixed(2)} (BB extreme + RSI < 30)`
  } else if (signal.style === 'SMART_MONEY') {
    entryStrategy = 'WAIT_PULLBACK'
    entryTrigger = `Wait for pullback to OB/FVG zone, then enter on ${mtf.ltfTimeframe} bullish confirmation`
  } else {
    entryStrategy = 'MARKET'
    entryTrigger = `Market entry acceptable — confirm with ${mtf.ltfTimeframe} close`
  }
  
  // ---- Stop loss ----
  const slDistance = Math.abs(price - signal.stopLoss) || 0.0001  // Guard against zero
  const slPercentage = (slDistance / price) * 100
  
  let stopLossType: 'STRUCTURE' | 'ATR' | 'PERCENTAGE' | 'TIME_BASED'
  let stopLossReason = ''
  
  if (signal.style === 'TREND_FOLLOWING') {
    stopLossType = 'ATR'
    stopLossReason = `Below 2x ATR from entry — allows for normal volatility`
  } else if (signal.style === 'MEAN_REVERSION') {
    stopLossType = 'STRUCTURE'
    stopLossReason = `Below Bollinger Band - 1 std — invalidates mean reversion thesis`
  } else if (signal.style === 'VOLUME_BREAKOUT') {
    stopLossType = 'STRUCTURE'
    stopLossReason = `Below breakout level — invalidates breakout`
  } else if (signal.style === 'SMART_MONEY') {
    stopLossType = 'STRUCTURE'
    stopLossReason = `Below Order Block — invalidates SMC thesis`
  } else {
    stopLossType = 'PERCENTAGE'
    stopLossReason = `${slPercentage.toFixed(2)}% from entry`
  }
  
  // ---- Take profits (detailed) ----
  const tp1 = signal.takeProfits.tp1
  const tp2 = signal.takeProfits.tp2
  const tp3 = signal.takeProfits.tp3
  
  // TP4 (runner) — only for swing trades
  let tp4: { price: number; percentage: number; rr: number; reason: string } | undefined
  if (eventAdjustedTradeType === 'SWING') {
    const tp4Price = signal.bias === 'LONG' 
      ? tp3 + (tp3 - tp2) * 1.5
      : tp3 - (tp2 - tp3) * 1.5
    tp4 = {
      price: tp4Price,
      percentage: 10,
      rr: Math.abs(tp4Price - price) / slDistance,
      reason: 'Runner — trail with EMA or Donchian',
    }
  }
  
  // ---- Risk management ----
  const finalRiskPercent = eventAdjustedRisk
  const maxLossUSD = (capital * finalRiskPercent / 100)
  
  let positionSize = ''
  if (finalRiskPercent === 0) {
    positionSize = '0% (NO TRADE)'
  } else if (finalRiskPercent <= 0.5) {
    positionSize = `${finalRiskPercent.toFixed(2)}% (conservative — event risk)`
  } else if (finalRiskPercent <= 1) {
    positionSize = `${finalRiskPercent.toFixed(2)}% (cautious)`
  } else if (finalRiskPercent <= 2) {
    positionSize = `${finalRiskPercent.toFixed(2)}% (normal)`
  } else {
    positionSize = `${finalRiskPercent.toFixed(2)}% (aggressive)`
  }
  
  // ---- Trade management rules ----
  const rules: string[] = [
    `Move SL to breakeven after TP1 hit`,
    `Trail SL after TP2 — use ${mtf.ltfTimeframe} EMA20`,
    `Close 50% at TP1, 30% at TP2, 20% at TP3${tp4 ? ', 10% runner' : ''}`,
  ]
  
  if (eventAdjustedTradeType === 'SWING') {
    rules.push('Hold overnight only if HTF (1D) bias still aligned')
    rules.push('Check funding rate daily — exit if > 0.05%')
  }
  
  if (events.marketRiskLevel !== 'LOW') {
    rules.push(`⚠️ Event risk: ${events.marketRiskLevel} — monitor ${events.recommendationReason}`)
  }
  
  if (mtf.conflict) {
    rules.push('⚠️ MTF conflict detected — DO NOT enter until resolved')
  }
  
  rules.push(`Time-based exit: close position if no progress in ${estimatedHoldTime}`)
  
  // ---- Final score ----
  let finalScore = 50
  if (deep) {
    finalScore = deep.totalLayerScore * 0.4 +
                 mtf.alignmentScore * 0.3 +
                 signal.confidence * 0.2 +
                 (events.marketRiskLevel === 'LOW' ? 100 : events.marketRiskLevel === 'MEDIUM' ? 70 : events.marketRiskLevel === 'HIGH' ? 40 : 10) * 0.1
  } else {
    finalScore = signal.confidence * 0.5 + mtf.alignmentScore * 0.3 + 50 * 0.2
  }
  
  if (mtf.conflict) finalScore -= 30
  if (eventAdjustedTradeType === 'AVOID') finalScore = Math.min(finalScore, 30)
  
  finalScore = Math.max(0, Math.min(100, finalScore))
  
  // ---- Final recommendation ----
  let finalRecommendation: 'STRONG_BUY' | 'BUY' | 'WATCH' | 'AVOID'
  let recommendationReason = ''
  
  if (eventAdjustedTradeType === 'AVOID') {
    finalRecommendation = 'AVOID'
    recommendationReason = eventNote || 'Avoid — conditions not favorable'
  } else if (finalScore >= 80 && mtf.recommendation === 'PROCEED' && events.marketRiskLevel === 'LOW') {
    finalRecommendation = 'STRONG_BUY'
    recommendationReason = `MTF aligned (${mtf.alignmentScore.toFixed(0)}%), low event risk, high confidence`
  } else if (finalScore >= 65 && !mtf.conflict) {
    finalRecommendation = 'BUY'
    recommendationReason = `Score ${finalScore.toFixed(0)}/100, MTF ${mtf.recommendation}`
  } else if (finalScore >= 50) {
    finalRecommendation = 'WATCH'
    recommendationReason = `Score ${finalScore.toFixed(0)}/100 — monitor for better entry`
  } else {
    finalRecommendation = 'AVOID'
    recommendationReason = `Score ${finalScore.toFixed(0)}/100 — too risky`
  }
  
  return {
    tradeType: eventAdjustedTradeType,
    tradeTypeLabel: eventAdjustedTradeType === 'AVOID' ? 'AVOID' : tradeTypeLabel,
    holdDuration,
    estimatedHoldTime: eventAdjustedTradeType === 'AVOID' ? 'N/A' : estimatedHoldTime,
    entryStrategy,
    entryZone: { lower: price * 0.998, upper: price * 1.002 },
    entryTrigger,
    stopLoss: signal.stopLoss,
    stopLossType,
    stopLossReason,
    stopLossPercentage: slPercentage,
    takeProfits: {
      tp1: { 
        price: tp1, 
        percentage: 50, 
        rr: Math.abs(tp1 - price) / slDistance,
        reason: 'First target — secure 50% position',
      },
      tp2: { 
        price: tp2, 
        percentage: 30, 
        rr: Math.abs(tp2 - price) / slDistance,
        reason: 'Second target — secure 30% position',
      },
      tp3: { 
        price: tp3, 
        percentage: 20, 
        rr: Math.abs(tp3 - price) / slDistance,
        reason: 'Final target — secure last 20%',
      },
      tp4,
    },
    riskPercent: finalRiskPercent,
    positionSize,
    maxLossUSD,
    rules,
    finalScore,
    finalRecommendation,
    recommendationReason,
  }
}

// ---- Format ultra-detailed alert message ----
export function formatUltraDetailedAlert(
  symbol: string,
  name: string,
  price: number,
  change24h: number,
  volume24h: number,
  signal: ScannerSignal,
  mtf: MTFAnalysisResult,
  events: EventIntelligence,
  recommendation: SmartRecommendation,
  deep: DeepAnalysisResult | undefined
): string {
  const fmt = (n: number) => n < 1 ? n.toFixed(5) : n < 100 ? n.toFixed(3) : n.toFixed(2)
  
  let msg = ''
  
  // Header
  if (recommendation.finalRecommendation === 'STRONG_BUY') {
    msg = `🚨 <b>⭐ STRONG BUY ALERT</b> 🚨\n\n`
  } else if (recommendation.finalRecommendation === 'AVOID') {
    msg = `⚠️ <b>AVOID — DO NOT TRADE</b> ⚠️\n\n`
  } else {
    msg = `🔔 <b>SETUP ALERT</b>\n\n`
  }
  
  // Symbol info
  msg += `📊 <b>${name}</b> (${symbol})\n`
  msg += `💵 Price: $${fmt(price)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% 24h)\n`
  msg += `📈 Volume: $${formatVol(volume24h)}\n\n`
  
  // Recommendation summary
  msg += `🏆 <b>RECOMMENDATION: ${recommendation.finalRecommendation}</b>\n`
  msg += `📋 Trade Type: <b>${recommendation.tradeTypeLabel}</b>\n`
  msg += `⏱️ Hold Time: ${recommendation.estimatedHoldTime}\n`
  msg += `📊 Final Score: ${recommendation.finalScore.toFixed(0)}/100\n`
  msg += `💡 Reason: ${recommendation.recommendationReason}\n\n`
  
  // Multi-timeframe analysis
  msg += `<b>🕐 MULTI-TIMEFRAME ANALYSIS:</b>\n`
  for (const a of mtf.analyses) {
    const emoji = a.signal === 'LONG' ? '🟢' : a.signal === 'SHORT' ? '🔴' : '⚪'
    msg += `  ${emoji} ${a.timeframe}: ${a.signal} (RSI ${a.rsi.toFixed(0)}, ADX ${a.adx.toFixed(0)})\n`
  }
  msg += `  Alignment: ${mtf.alignmentScore.toFixed(0)}% (${mtf.bullishCount}B/${mtf.bearishCount}B/${mtf.neutralCount}N)\n`
  if (mtf.conflict) {
    msg += `  ⚠️ CONFLICT: ${mtf.conflictDescription}\n`
  }
  msg += `\n`
  
  // Event intelligence
  if (events.marketRiskLevel !== 'LOW') {
    msg += `<b>📅 EVENT INTELLIGENCE:</b>\n`
    msg += `  Market Risk: <b>${events.marketRiskLevel}</b>\n`
    msg += `  Trading Mode: ${events.tradingRecommendation}\n`
    msg += `  Reason: ${events.recommendationReason}\n`
    if (events.criticalEventsNext24h.length > 0) {
      msg += `  🚨 Critical (24h): ${events.criticalEventsNext24h.map(e => e.title).join(', ')}\n`
    }
    msg += `\n`
  }
  
  // Deep analysis (if available)
  if (deep) {
    msg += `<b>🔍 6-LAYER DEEP ANALYSIS:</b>\n`
    msg += `  L1 Macro: ${deep.macroScore.toFixed(0)}/100 ${deep.macroAligned ? '✅' : '⚠️'}\n`
    msg += `  L3 Fundamental: ${deep.fundamentalScore.toFixed(0)}/100 ${deep.fundamentalPass ? '✅' : '❌'}\n`
    msg += `  L5 Checklist: ${deep.checklistScore.toFixed(0)}/100 ${deep.checklistPassed ? '✅' : '⚠️'}\n`
    if (deep.confluence !== 'SINGLE' && deep.confluence !== 'NONE') {
      msg += `  🔥 Confluence: ${deep.confluence} (${deep.confluenceStyles.join(' + ')})\n`
    }
    msg += `\n`
  }
  
  // Trade plan
  msg += `<b>📋 TRADE PLAN:</b>\n`
  msg += `  Entry Strategy: ${recommendation.entryStrategy}\n`
  msg += `  Entry Zone: $${fmt(recommendation.entryZone.lower)} - $${fmt(recommendation.entryZone.upper)}\n`
  msg += `  Trigger: ${recommendation.entryTrigger}\n\n`
  
  msg += `  🛑 Stop Loss: $${fmt(recommendation.stopLoss)} (-${recommendation.stopLossPercentage.toFixed(2)}%)\n`
  msg += `     Type: ${recommendation.stopLossType}\n`
  msg += `     Reason: ${recommendation.stopLossReason}\n\n`
  
  msg += `  ✅ TP1 (50%): $${fmt(recommendation.takeProfits.tp1.price)} (1:${recommendation.takeProfits.tp1.rr.toFixed(2)})\n`
  msg += `     ${recommendation.takeProfits.tp1.reason}\n`
  msg += `  ✅ TP2 (30%): $${fmt(recommendation.takeProfits.tp2.price)} (1:${recommendation.takeProfits.tp2.rr.toFixed(2)})\n`
  msg += `     ${recommendation.takeProfits.tp2.reason}\n`
  msg += `  ✅ TP3 (20%): $${fmt(recommendation.takeProfits.tp3.price)} (1:${recommendation.takeProfits.tp3.rr.toFixed(2)})\n`
  msg += `     ${recommendation.takeProfits.tp3.reason}\n`
  if (recommendation.takeProfits.tp4) {
    msg += `  🏃 TP4 Runner (10%): $${fmt(recommendation.takeProfits.tp4.price)} (1:${recommendation.takeProfits.tp4.rr.toFixed(2)})\n`
    msg += `     ${recommendation.takeProfits.tp4.reason}\n`
  }
  msg += `\n`
  
  // Risk management
  msg += `<b>💰 RISK MANAGEMENT:</b>\n`
  msg += `  Position Size: ${recommendation.positionSize}\n`
  msg += `  Max Loss: $${recommendation.maxLossUSD.toFixed(2)}\n`
  msg += `  Risk/Reward Avg: 1:${((recommendation.takeProfits.tp1.rr + recommendation.takeProfits.tp2.rr + recommendation.takeProfits.tp3.rr) / 3).toFixed(2)}\n\n`
  
  // Trade rules
  msg += `<b>📜 TRADE MANAGEMENT RULES:</b>\n`
  for (const rule of recommendation.rules) {
    msg += `  • ${rule}\n`
  }
  
  // Footer
  msg += `\n🕐 Scanned: ${new Date().toLocaleString('id-ID')}\n`
  msg += `⚠️ Educational only. DYOR & manage risk.`
  
  return msg
}

function formatVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`
  return v.toFixed(0)
}
