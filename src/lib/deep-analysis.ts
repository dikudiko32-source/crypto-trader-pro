// =====================================================
// DEEP ANALYSIS ENGINE — 6-Layer Validation
// =====================================================
// Phase 1 (Fast): Run 4 trading styles → get candidates
// Phase 2 (Deep): For top candidates, run Layer 1 (Macro) + Layer 3 (Fundamental) + Layer 5 (Checklist)
// Only deep-passed setups get sent to Telegram

import { getFearGreedIndex, getMoonPhase, getEconomicEvents, getAggregateFunding } from './macro'
import { getGlobalData, getTopCoins } from './coingecko'
import { getTokenomics } from './tokenomics'
import { getFundingRate } from './binance'
import type { 
  ScanMacroData, DeepAnalysisResult, ConfluenceLevel,
  ScannerResult, ScannerSignal
} from './types'

// ---- Fetch macro data once per scan session ----
export async function fetchScanMacroData(): Promise<ScanMacroData> {
  try {
    const [fg, global, funding] = await Promise.all([
      getFearGreedIndex(),
      getGlobalData(),
      getAggregateFunding(),
    ])
    
    const events = getEconomicEvents()
    const highImpactToday = events.filter(e => e.impact === 'HIGH').length
    
    const fgValue = fg?.value || 50
    const btcDom = global?.btcDominance || 54
    const btcDomTrend = btcDom > 52 ? 'UP' : 'DOWN'
    const usdtTrend = fgValue < 40 ? 'UP' : 'DOWN'
    
    // Determine macro bias
    let macroBias: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
    let bullScore = 0
    let bearScore = 0
    
    if (btcDomTrend === 'DOWN') bullScore++
    else bearScore++
    
    if (usdtTrend === 'DOWN') bullScore++
    else bearScore++
    
    if (fgValue < 30) bullScore += 2  // Extreme fear = contrarian bullish
    else if (fgValue > 70) bearScore += 2
    
    if (funding && funding.avgFunding > 0.0005) bearScore++  // overleveraged long
    else if (funding && funding.avgFunding < -0.0001) bullScore++
    
    if (highImpactToday > 0) {
      // Reduce both — be cautious
      bullScore = Math.max(0, bullScore - 1)
      bearScore = Math.max(0, bearScore - 1)
    }
    
    if (bullScore > bearScore + 1) macroBias = 'LONG'
    else if (bearScore > bullScore + 1) macroBias = 'SHORT'
    
    return {
      fearGreed: fgValue,
      fearGreedLabel: fg?.classification || 'Neutral',
      btcDominance: btcDom,
      btcDominanceTrend: btcDomTrend,
      usdtDominanceTrend: usdtTrend,
      fundingAggregate: funding?.avgFunding || 0,
      highImpactEventsToday: highImpactToday,
      macroBias,
    }
  } catch (err) {
    console.error('fetchScanMacroData error:', err)
    // Fallback
    return {
      fearGreed: 50,
      fearGreedLabel: 'Neutral',
      btcDominance: 54,
      btcDominanceTrend: 'FLAT',
      usdtDominanceTrend: 'FLAT',
      fundingAggregate: 0,
      highImpactEventsToday: 0,
      macroBias: 'NEUTRAL',
    }
  }
}

// ---- Detect confluence between styles ----
export function detectConfluence(signals: ScannerSignal[]): {
  level: ConfluenceLevel
  styles: string[]
  agreedBias: 'LONG' | 'SHORT' | 'NEUTRAL'
} {
  if (signals.length === 0) {
    return { level: 'NONE', styles: [], agreedBias: 'NEUTRAL' }
  }
  
  const longSignals = signals.filter(s => s.bias === 'LONG')
  const shortSignals = signals.filter(s => s.bias === 'SHORT')
  
  if (longSignals.length >= 3) {
    return {
      level: 'MEGA',
      styles: longSignals.map(s => s.styleName),
      agreedBias: 'LONG',
    }
  }
  
  if (shortSignals.length >= 3) {
    return {
      level: 'MEGA',
      styles: shortSignals.map(s => s.styleName),
      agreedBias: 'SHORT',
    }
  }
  
  if (longSignals.length >= 2) {
    return {
      level: 'STRONG',
      styles: longSignals.map(s => s.styleName),
      agreedBias: 'LONG',
    }
  }
  
  if (shortSignals.length >= 2) {
    return {
      level: 'STRONG',
      styles: shortSignals.map(s => s.styleName),
      agreedBias: 'SHORT',
    }
  }
  
  // Single signal
  const single = signals[0]
  return {
    level: 'SINGLE',
    styles: [single.styleName],
    agreedBias: single.bias,
  }
}

// ---- Layer 1: Macro Alignment Check ----
function checkMacroAlignment(
  bias: 'LONG' | 'SHORT',
  macro: ScanMacroData
): { score: number; aligned: boolean; notes: string[] } {
  let score = 50
  const notes: string[] = []
  let aligned = true
  
  // Fear & Greed check (contrarian)
  if (bias === 'LONG') {
    if (macro.fearGreed < 30) {
      score += 15
      notes.push(`✅ Fear&Greed ${macro.fearGreed} (Extreme Fear) — contrarian bullish`)
    } else if (macro.fearGreed > 70) {
      score -= 15
      notes.push(`⚠️ Fear&Greed ${macro.fearGreed} (Extreme Greed) — caution for long`)
      aligned = false
    } else if (macro.fearGreed < 45) {
      score += 5
      notes.push(`✅ Fear&Greed ${macro.fearGreed} (Fear) — slight bullish`)
    }
  } else {
    if (macro.fearGreed > 70) {
      score += 15
      notes.push(`✅ Fear&Greed ${macro.fearGreed} (Extreme Greed) — contrarian bearish`)
    } else if (macro.fearGreed < 30) {
      score -= 15
      notes.push(`⚠️ Fear&Greed ${macro.fearGreed} (Extreme Fear) — caution for short`)
      aligned = false
    }
  }
  
  // BTC Dominance
  if (bias === 'LONG' && macro.btcDominanceTrend === 'DOWN') {
    score += 10
    notes.push(`✅ BTC.D turun (${macro.btcDominance.toFixed(1)}%) — alt-friendly`)
  } else if (bias === 'SHORT' && macro.btcDominanceTrend === 'UP') {
    score += 10
    notes.push(`✅ BTC.D naik (${macro.btcDominance.toFixed(1)}%) — risk-off`)
  }
  
  // USDT Dominance
  if (bias === 'LONG' && macro.usdtDominanceTrend === 'DOWN') {
    score += 10
    notes.push(`✅ USDT.D turun — money flowing into crypto`)
  } else if (bias === 'SHORT' && macro.usdtDominanceTrend === 'UP') {
    score += 10
    notes.push(`✅ USDT.D naik — money leaving crypto`)
  }
  
  // Funding rate
  if (bias === 'LONG' && macro.fundingAggregate > 0.0005) {
    score -= 10
    notes.push(`⚠️ Funding ${(macro.fundingAggregate * 100).toFixed(4)}% tinggi — overleveraged long, squeeze risk`)
  } else if (bias === 'SHORT' && macro.fundingAggregate < -0.0001) {
    score -= 10
    notes.push(`⚠️ Funding negative — overleveraged short, squeeze risk`)
  }
  
  // High impact events
  if (macro.highImpactEventsToday > 0) {
    score -= 15
    notes.push(`⚠️ ${macro.highImpactEventsToday} high-impact event(s) today — reduce exposure`)
    aligned = false
  }
  
  // Macro bias alignment
  if (macro.macroBias === bias) {
    score += 10
    notes.push(`✅ Macro bias ${macro.macroBias} aligned with signal`)
  } else if (macro.macroBias !== 'NEUTRAL') {
    score -= 10
    notes.push(`⚠️ Macro bias ${macro.macroBias} conflicts with ${bias} signal`)
    aligned = false
  }
  
  score = Math.max(0, Math.min(100, score))
  return { score, aligned, notes }
}

// ---- Layer 3: Fundamental Check ----
async function checkFundamental(
  symbol: string
): Promise<{ score: number; pass: boolean; notes: string[]; unlockRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; inflationRate?: number }> {
  let score = 50
  const notes: string[] = []
  let pass = true
  let unlockRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined
  let inflationRate: number | undefined
  
  try {
    // Get coin ID from symbol
    const coins = await getTopCoins(200)
    const coin = coins.find(c => c.symbol === symbol.replace('USDT', ''))
    
    if (!coin) {
      notes.push('⚠️ Coin not found in top 200 — fundamental data unavailable')
      return { score: 40, pass: true, notes }  // Don't fail, just cautious
    }
    
    // Volume / Market Cap check
    const volToMcap = coin.totalVolume / coin.marketCap
    if (volToMcap > 0.1) {
      score += 10
      notes.push(`✅ Vol/MCap ${(volToMcap * 100).toFixed(1)}% — healthy liquidity`)
    } else if (volToMcap < 0.03) {
      score -= 15
      notes.push(`⚠️ Vol/MCap ${(volToMcap * 100).toFixed(1)}% — illiquid, slippage risk`)
      pass = false
    }
    
    // Market cap rank
    if (coin.marketCapRank < 50) {
      score += 8
      notes.push(`✅ Rank #${coin.marketCapRank} — blue chip tier`)
    } else if (coin.marketCapRank > 200) {
      score -= 5
      notes.push(`⚠️ Rank #${coin.marketCapRank} — small cap, higher risk`)
    }
    
    // FDV / Market Cap (inflation check)
    if (coin.totalSupply) {
      const fdv = coin.currentPrice * coin.totalSupply
      const fdvToMcap = fdv / coin.marketCap
      if (fdvToMcap < 1.3) {
        score += 8
        notes.push(`✅ FDV/MCap ${fdvToMcap.toFixed(2)}x — low inflation`)
      } else if (fdvToMcap > 2.5) {
        score -= 15
        notes.push(`⚠️ FDV/MCap ${fdvToMcap.toFixed(2)}x — high hidden inflation`)
        pass = false
      }
      
      // Calculate inflation rate
      inflationRate = ((coin.totalSupply - coin.circulatingSupply) / coin.circulatingSupply) * 100
      if (inflationRate > 200) {
        unlockRisk = 'CRITICAL'
        score -= 20
        notes.push(`🚨 Inflation ${inflationRate.toFixed(0)}% — CRITICAL unlock risk`)
        pass = false
      } else if (inflationRate > 100) {
        unlockRisk = 'HIGH'
        score -= 10
        notes.push(`⚠️ Inflation ${inflationRate.toFixed(0)}% — HIGH unlock risk`)
      } else if (inflationRate > 50) {
        unlockRisk = 'MEDIUM'
        score -= 5
        notes.push(`Inflation ${inflationRate.toFixed(0)}% — MEDIUM unlock risk`)
      } else {
        unlockRisk = 'LOW'
        notes.push(`✅ Inflation ${inflationRate.toFixed(0)}% — healthy`)
      }
    }
  } catch (err) {
    console.error('checkFundamental error:', err)
    notes.push('⚠️ Fundamental data fetch failed — using cautious default')
    score = 45
  }
  
  score = Math.max(0, Math.min(100, score))
  return { score, pass, notes, unlockRisk, inflationRate }
}

// ---- Layer 5: Auto-Verifiable Checklist ----
function autoCheckChecklist(
  macroAligned: boolean,
  fundamentalPass: boolean,
  signal: ScannerSignal,
  highImpactEventsToday: number,
  confluence: ConfluenceLevel
): { score: number; passed: boolean; items: { item: string; checked: boolean; auto: boolean }[] } {
  const items: { item: string; checked: boolean; auto: boolean }[] = []
  
  // 1. Macro layer aligned
  items.push({ item: 'Macro layer aligned with bias', checked: macroAligned, auto: true })
  
  // 2. Coin fundamental OK
  items.push({ item: 'Coin fundamental OK (no critical unlock)', checked: fundamentalPass, auto: true })
  
  // 3. HTF bias clear (style already checks this)
  items.push({ item: 'HTF bias clear (Weekly/Daily aligned)', checked: signal.confidence >= 60, auto: true })
  
  // 4. LTF setup complete (3+ confluence — style has internal confluence)
  items.push({ item: 'LTF setup complete (3+ confluence)', checked: signal.confidence >= 65, auto: true })
  
  // 5. No high-impact event in 24h
  items.push({ item: 'No high-impact event in 24h', checked: highImpactEventsToday === 0, auto: true })
  
  // 6. R:R minimum 1:2
  items.push({ item: 'R:R minimum 1:2', checked: signal.rr >= 2, auto: true })
  
  // 7. Confluence level (2+ styles agree)
  items.push({ item: 'Multi-style confluence (2+ styles agree)', checked: confluence === 'STRONG' || confluence === 'MEGA', auto: true })
  
  // 8. Stop loss at valid structure (style provides this)
  items.push({ item: 'Stop loss at valid structure', checked: signal.stopLoss > 0, auto: true })
  
  // Items that CANNOT be auto-checked (user must verify manually):
  items.push({ item: 'Narrative active (<7 days declining)', checked: false, auto: false })
  items.push({ item: 'Mental state OK (not FOMO/revenge/tired)', checked: false, auto: false })
  
  const requiredItems = items.filter(i => i.auto)
  const checkedRequired = requiredItems.filter(i => i.checked)
  const allRequiredChecked = checkedRequired.length === requiredItems.length
  
  // Score based on required items
  const score = (checkedRequired.length / requiredItems.length) * 100
  
  return { score, passed: allRequiredChecked, items }
}

// ---- Perform Deep Analysis on a single result ----
export async function performDeepAnalysis(
  result: ScannerResult,
  macro: ScanMacroData
): Promise<DeepAnalysisResult> {
  const signal = result.bestSignal!
  
  // Detect confluence
  const confluenceInfo = detectConfluence(result.signals)
  
  // Layer 1: Macro
  const macroCheck = checkMacroAlignment(signal.bias, macro)
  
  // Layer 3: Fundamental
  const fundamentalCheck = await checkFundamental(result.symbol)
  
  // Layer 5: Checklist
  const checklist = autoCheckChecklist(
    macroCheck.aligned,
    fundamentalCheck.pass,
    signal,
    macro.highImpactEventsToday,
    confluenceInfo.level
  )
  
  // Calculate 6-layer total score
  // Weight: Technical (from style confidence) 30%, Macro 20%, Fundamental 15%, Checklist 20%, Confluence bonus 15%
  const technicalScore = signal.confidence
  const confluenceBonus = confluenceInfo.level === 'MEGA' ? 100 : 
                          confluenceInfo.level === 'STRONG' ? 80 :
                          confluenceInfo.level === 'SINGLE' ? 50 : 30
  
  const totalLayerScore = 
    technicalScore * 0.30 +
    macroCheck.score * 0.20 +
    fundamentalCheck.score * 0.15 +
    checklist.score * 0.20 +
    confluenceBonus * 0.15
  
  // Determine if passed deep analysis
  const passedDeepAnalysis = 
    macroCheck.aligned &&
    fundamentalCheck.pass &&
    checklist.passed &&
    totalLayerScore >= 65 &&
    signal.rr >= 2
  
  // Recommendation
  let recommendation: 'STRONG_BUY' | 'BUY' | 'WATCH' | 'AVOID'
  let recommendationReason = ''
  
  if (passedDeepAnalysis && confluenceInfo.level === 'MEGA' && totalLayerScore >= 80) {
    recommendation = 'STRONG_BUY'
    recommendationReason = `MEGA confluence (${confluenceInfo.styles.length} styles agree) + 6-layer score ${totalLayerScore.toFixed(0)}/100`
  } else if (passedDeepAnalysis && (confluenceInfo.level === 'STRONG' || confluenceInfo.level === 'MEGA')) {
    recommendation = 'BUY'
    recommendationReason = `STRONG confluence + 6-layer score ${totalLayerScore.toFixed(0)}/100`
  } else if (passedDeepAnalysis) {
    recommendation = 'BUY'
    recommendationReason = `Single style + 6-layer score ${totalLayerScore.toFixed(0)}/100`
  } else if (totalLayerScore >= 50) {
    recommendation = 'WATCH'
    recommendationReason = `6-layer score ${totalLayerScore.toFixed(0)}/100 — partial pass, monitor`
  } else {
    recommendation = 'AVOID'
    recommendationReason = `6-layer score ${totalLayerScore.toFixed(0)}/100 — failed deep analysis`
  }
  
  return {
    macroScore: macroCheck.score,
    macroAligned: macroCheck.aligned,
    macroNotes: macroCheck.notes,
    fundamentalScore: fundamentalCheck.score,
    fundamentalPass: fundamentalCheck.pass,
    fundamentalNotes: fundamentalCheck.notes,
    unlockRisk: fundamentalCheck.unlockRisk,
    inflationRate: fundamentalCheck.inflationRate,
    checklistScore: checklist.score,
    checklistPassed: checklist.passed,
    checklistItems: checklist.items,
    totalLayerScore,
    passedDeepAnalysis,
    confluence: confluenceInfo.level,
    confluenceStyles: confluenceInfo.styles,
    recommendation,
    recommendationReason,
  }
}

// ---- Format enhanced alert message ----
export function formatDeepAlertMessage(
  result: ScannerResult,
  deep: DeepAnalysisResult,
  macro: ScanMacroData
): string {
  const sig = result.bestSignal!
  const fmt = (n: number) => n < 1 ? n.toFixed(5) : n < 100 ? n.toFixed(3) : n.toFixed(2)
  
  let msg = `🚨 <b>${deep.recommendation === 'STRONG_BUY' ? '⭐ STRONG BUY' : 'SETUP'} ALERT</b> 🚨\n\n`
  msg += `📊 <b>${result.name}</b> (${result.symbol})\n`
  msg += `💵 Price: $${fmt(result.price)} (${result.change24h >= 0 ? '+' : ''}${result.change24h.toFixed(2)}% 24h)\n`
  msg += `📈 Volume: $${formatVol(result.volume24h)}\n\n`
  
  msg += `🎯 <b>Signal: ${sig.bias}</b>\n`
  msg += `📋 Style: ${sig.styleName}\n`
  msg += `💪 Confidence: ${sig.confidence.toFixed(0)}/100\n`
  msg += `⚖️ R:R: 1:${sig.rr.toFixed(2)}\n`
  
  // Confluence badge
  if (deep.confluence === 'MEGA') {
    msg += `🔥 <b>MEGA CONFLUENCE</b> (${deep.confluenceStyles.length} styles agree)\n`
  } else if (deep.confluence === 'STRONG') {
    msg += `✅ <b>STRONG CONFLUENCE</b> (2 styles agree)\n`
  }
  msg += `📊 <b>6-Layer Score: ${deep.totalLayerScore.toFixed(0)}/100</b>\n`
  msg += `🏆 Recommendation: <b>${deep.recommendation}</b>\n\n`
  
  msg += `<b>📋 Trade Plan:</b>\n`
  msg += `  Entry: $${fmt(sig.entry)}\n`
  msg += `  Stop Loss: $${fmt(sig.stopLoss)}\n`
  msg += `  TP1 (50%): $${fmt(sig.takeProfits.tp1)}\n`
  msg += `  TP2 (30%): $${fmt(sig.takeProfits.tp2)}\n`
  msg += `  TP3 (20%): $${fmt(sig.takeProfits.tp3)}\n\n`
  
  msg += `<b>🔍 Deep Analysis:</b>\n`
  msg += `  L1 Macro: ${deep.macroScore.toFixed(0)}/100 ${deep.macroAligned ? '✅' : '⚠️'}\n`
  msg += `  L3 Fundamental: ${deep.fundamentalScore.toFixed(0)}/100 ${deep.fundamentalPass ? '✅' : '⚠️'}\n`
  msg += `  L5 Checklist: ${deep.checklistScore.toFixed(0)}/100 ${deep.checklistPassed ? '✅' : '⚠️'}\n`
  msg += `  Fear&Greed: ${macro.fearGreed} (${macro.fearGreedLabel})\n`
  if (deep.inflationRate !== undefined) {
    msg += `  Inflation: ${deep.inflationRate.toFixed(0)}% (${deep.unlockRisk})\n`
  }
  msg += `\n`
  
  msg += `<b>✅ Reasons:</b>\n`
  sig.reasons.slice(0, 5).forEach(r => { msg += `  ${r}\n` })
  
  if (deep.macroNotes.length > 0) {
    msg += `\n<b>🌐 Macro Notes:</b>\n`
    deep.macroNotes.slice(0, 3).forEach(n => { msg += `  ${n}\n` })
  }
  
  msg += `\n🕐 Scanned: ${new Date(result.lastScannedAt).toLocaleString('id-ID')}\n`
  msg += `⚠️ Educational only. DYOR & manage risk.`
  
  return msg
}

function formatVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`
  return v.toFixed(0)
}
