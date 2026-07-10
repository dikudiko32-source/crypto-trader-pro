// =====================================================
// MULTI-TIMEFRAME ANALYSIS ENGINE
// =====================================================
// Analyze multiple timeframes (5m, 15m, 30m, 1H, 4H, 12H, 1D)
// Detect alignment, conflicts, and generate recommendation

import { getKlines } from './binance'
import { analyzeTimeframe, ema, rsi, adx } from './indicators'
import type { Candle, ScanTimeframe, MTFAnalysisResult, MTFScannerConfig } from './types'

// ---- Map our timeframe to Binance interval ----
const TF_TO_INTERVAL: Record<ScanTimeframe, string> = {
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1H': '1h',
  '4H': '4h',
  '12H': '12h',
  '1D': '1d',
}

// ---- Analyze single timeframe ----
async function analyzeSingleTF(symbol: string, tf: ScanTimeframe): Promise<{
  timeframe: ScanTimeframe
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  rsi: number
  adx: number
  emaAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  signal: 'LONG' | 'SHORT' | 'NEUTRAL'
  confidence: number
} | null> {
  try {
    const candles = await getKlines(symbol, tf, 200)
    if (candles.length < 50) return null
    
    const analysis = analyzeTimeframe(candles, tf as '15m' | '1H' | '4H' | '1D')
    const closes = candles.map(c => c.close)
    
    const ema20 = ema(closes, 20)[closes.length - 1]
    const ema50 = ema(closes, 50)[closes.length - 1]
    const ema200 = closes.length >= 200 ? ema(closes, 200)[closes.length - 1] : ema50
    
    const price = closes[closes.length - 1]
    
    let emaAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
    if (price > ema20 && ema20 > ema50 && ema50 > ema200) emaAlignment = 'BULLISH'
    else if (price < ema20 && ema20 < ema50 && ema50 < ema200) emaAlignment = 'BEARISH'
    
    const rsiVal = rsi(closes)
    const adxVal = adx(candles)
    
    let signal: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
    let confidence = 50
    
    // Determine signal based on confluence
    let bullCount = 0
    let bearCount = 0
    
    if (emaAlignment === 'BULLISH') bullCount += 2
    else if (emaAlignment === 'BEARISH') bearCount += 2
    
    if (analysis.trend === 'BULLISH') bullCount++
    else if (analysis.trend === 'BEARISH') bearCount++
    
    if (rsiVal > 50 && rsiVal < 70) bullCount++
    else if (rsiVal < 50 && rsiVal > 30) bearCount++
    
    if (adxVal > 25) {
      if (emaAlignment === 'BULLISH') bullCount++
      else if (emaAlignment === 'BEARISH') bearCount++
    }
    
    if (bullCount > bearCount + 1) {
      signal = 'LONG'
      confidence = 50 + bullCount * 8
    } else if (bearCount > bullCount + 1) {
      signal = 'SHORT'
      confidence = 50 + bearCount * 8
    }
    
    confidence = Math.min(100, Math.max(0, confidence))
    
    return {
      timeframe: tf,
      trend: analysis.trend,
      rsi: rsiVal,
      adx: adxVal,
      emaAlignment,
      signal,
      confidence,
    }
  } catch (err) {
    console.error(`analyzeSingleTF ${symbol} ${tf} error:`, err)
    return null
  }
}

// ---- Analyze all timeframes ----
export async function analyzeMultipleTimeframes(
  symbol: string,
  config: MTFScannerConfig
): Promise<MTFAnalysisResult> {
  const analyses: MTFAnalysisResult['analyses'] = []
  
  // Analyze all timeframes in parallel
  const results = await Promise.all(
    config.timeframes.map(tf => analyzeSingleTF(symbol, tf))
  )
  
  for (const result of results) {
    if (result) analyses.push(result)
  }
  
  // Count signals
  const bullishCount = analyses.filter(a => a.signal === 'LONG').length
  const bearishCount = analyses.filter(a => a.signal === 'SHORT').length
  const neutralCount = analyses.filter(a => a.signal === 'NEUTRAL').length
  
  // HTF bias (default 1D)
  const htfAnalysis = analyses.find(a => a.timeframe === config.htfTimeframe)
  const htfBias = htfAnalysis?.signal || 'NEUTRAL'
  
  // LTF signal (default 1H)
  const ltfAnalysis = analyses.find(a => a.timeframe === config.ltfTimeframe)
  const ltfSignal = ltfAnalysis?.signal || 'NEUTRAL'
  
  // Calculate alignment score (0-100)
  const totalAnalyses = analyses.length
  const maxAgreement = Math.max(bullishCount, bearCount(bearishCount), neutralCount)
  const alignmentScore = totalAnalyses > 0 ? (maxAgreement / totalAnalyses) * 100 : 0
  
  // Detect conflict (HTF vs LTF)
  const conflict = htfBias !== 'NEUTRAL' && ltfSignal !== 'NEUTRAL' && htfBias !== ltfSignal
  
  let conflictDescription = 'No conflict — timeframes aligned'
  if (conflict) {
    conflictDescription = `⚠️ CONFLICT: HTF (${config.htfTimeframe}) = ${htfBias}, LTF (${config.ltfTimeframe}) = ${ltfSignal}. Wait for alignment before entry.`
  }
  
  // Recommendation
  let recommendation: 'PROCEED' | 'WAIT' | 'AVOID' = 'WAIT'
  const agreementCount = Math.max(bullishCount, bearCount(bearishCount))
  
  if (conflict) {
    recommendation = 'AVOID'
  } else if (agreementCount >= config.requireMTFAgreement && alignmentScore >= 60) {
    recommendation = 'PROCEED'
  } else if (agreementCount >= Math.floor(totalAnalyses / 2)) {
    recommendation = 'WAIT'
  } else {
    recommendation = 'AVOID'
  }
  
  return {
    analyses,
    alignmentScore,
    bullishCount,
    bearishCount,
    neutralCount,
    htfBias,
    ltfSignal,
    conflict,
    conflictDescription,
    recommendation,
  }
}

function bearCount(n: number) {
  return n
}
