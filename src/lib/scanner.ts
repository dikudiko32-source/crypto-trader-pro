// =====================================================
// AUTO SCANNER ENGINE
// =====================================================
// Scans top Binance pairs dan run 4 trading styles
// Returns ranked setups with confidence > threshold

import { getKlines, getTicker24h } from './binance'
import { 
  trendFollowingStyle, 
  meanReversionStyle, 
  volumeBreakoutStyle, 
  smartMoneyStyle,
  type TradingStyleSignal 
} from './indicators'
import { fetchScanMacroData, performDeepAnalysis, formatDeepAlertMessage, detectConfluence } from './deep-analysis'
import { analyzeMultipleTimeframes } from './mtf-analysis'
import { getEventIntelligence } from './event-intelligence'
import { generateSmartRecommendation, formatUltraDetailedAlert } from './smart-recommendation'
import type { 
  ScannerConfig, ScannerResult, ScannerSignal, ScanSummary, DeepAnalysisResult, ScanMacroData,
  MTFAnalysisResult, EventIntelligence, SmartRecommendation, EnhancedScannerResult, EnhancedScanSummary,
  MTFScannerConfig
} from './types'

// Note: scanMultipleCoins (legacy, non-enhanced) is removed. Use scanMultipleCoinsEnhanced instead.

// ---- Get top USDT pairs by 24h volume ----
export async function getTopPairsByVolume(limit = 50): Promise<Array<{
  symbol: string
  price: number
  change24h: number
  volume24h: number
}>> {
  try {
    const url = `/api/proxy/binance?path=ticker/24hr`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch tickers')
    const data = await res.json()
    if (!Array.isArray(data)) return []
    
    return data
      .filter((t: { symbol: string; quoteVolume: string }) => 
        t.symbol.endsWith('USDT') && 
        !t.symbol.includes('UP') && 
        !t.symbol.includes('DOWN') &&
        !t.symbol.includes('BULL') &&
        !t.symbol.includes('BEAR') &&
        !['USDCUSDT', 'BUSDUSDT', 'TUSDUSDT', 'FDUSDUSDT', 'DAIUSDT', 'EURUSDT'].includes(t.symbol)
      )
      .map((t: { symbol: string; lastPrice: string; priceChangePercent: string; quoteVolume: string }) => ({
        symbol: t.symbol,
        price: parseFloat(t.lastPrice),
        change24h: parseFloat(t.priceChangePercent),
        volume24h: parseFloat(t.quoteVolume),
      }))
      .sort((a: { volume24h: number }, b: { volume24h: number }) => b.volume24h - a.volume24h)
      .slice(0, limit)
  } catch (err) {
    console.error('getTopPairsByVolume error:', err)
    return []
  }
}

// ---- Scan single coin with all 4 styles ----
export async function scanCoin(
  symbol: string,
  price: number,
  change24h: number,
  volume24h: number,
  styles: ScannerConfig['styles']
): Promise<ScannerResult | null> {
  try {
    // Fetch klines for multiple timeframes
    const [daily, h4] = await Promise.all([
      getKlines(symbol, '1D', 200),
      getKlines(symbol, '4H', 100),
    ])
    
    if (daily.length < 60 || h4.length < 50) {
      return null  // insufficient data
    }
    
    const signals: ScannerSignal[] = []
    
    // Run selected styles
    if (styles.includes('TREND_FOLLOWING')) {
      const sig = trendFollowingStyle(daily, h4)
      if (sig && sig.bias !== 'NEUTRAL') {
        signals.push(convertSignal(sig, 'TREND_FOLLOWING', 'Trend Following'))
      }
    }
    
    if (styles.includes('MEAN_REVERSION')) {
      const sig = meanReversionStyle(daily, h4)
      if (sig && sig.bias !== 'NEUTRAL') {
        signals.push(convertSignal(sig, 'MEAN_REVERSION', 'Mean Reversion'))
      }
    }
    
    if (styles.includes('VOLUME_BREAKOUT')) {
      const sig = volumeBreakoutStyle(daily, h4)
      if (sig && sig.bias !== 'NEUTRAL') {
        signals.push(convertSignal(sig, 'VOLUME_BREAKOUT', 'Volume Breakout'))
      }
    }
    
    if (styles.includes('SMART_MONEY')) {
      const sig = smartMoneyStyle(daily, h4)
      if (sig && sig.bias !== 'NEUTRAL') {
        signals.push(convertSignal(sig, 'SMART_MONEY', 'Smart Money'))
      }
    }
    
    if (signals.length === 0) return null
    
    // Get best signal (highest confidence)
    const bestSignal = signals.reduce((best, s) => 
      s.confidence > best.confidence ? s : best, signals[0])
    
    return {
      symbol,
      name: symbol.replace('USDT', ''),
      price,
      change24h,
      volume24h,
      signals,
      bestSignal,
      lastScannedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error(`scanCoin ${symbol} error:`, err)
    return null
  }
}

// ---- Convert TradingStyleSignal to ScannerSignal ----
function convertSignal(
  sig: TradingStyleSignal,
  style: ScannerSignal['style'],
  styleName: string
): ScannerSignal {
  return {
    style,
    styleName,
    bias: sig.bias,
    confidence: sig.confidence,
    marketRegime: sig.marketRegime,
    entry: sig.entry.price,
    stopLoss: sig.stopLoss,
    takeProfits: sig.takeProfits,
    rr: sig.rr,
    reasons: sig.reasons,
    warnings: sig.warnings,
  }
}

// ---- Scan multiple coins with rate limiting (ENHANCED Phase 6) ----
export async function scanMultipleCoinsEnhanced(
  config: ScannerConfig,
  mtfConfig: MTFScannerConfig,
  capital: number,
  riskPercent: number,
  onProgress?: (scanned: number, total: number, found: number) => void
): Promise<EnhancedScanSummary> {
  const startTime = Date.now()
  const errors: string[] = []
  
  // Pre-fetch macro + event data once
  const [macroData, eventIntelligence] = await Promise.all([
    fetchScanMacroData(),
    getEventIntelligence(),
  ])
  
  // Get top pairs by volume
  const pairs = await getTopPairsByVolume(config.topPairsLimit)
  
  if (pairs.length === 0) {
    return {
      totalScanned: 0,
      totalWithSignals: 0,
      longSignals: 0,
      shortSignals: 0,
      topPicks: [],
      scannedAt: new Date().toISOString(),
      duration: 0,
      errors: ['Failed to fetch top pairs from Binance'],
      marketRiskLevel: eventIntelligence.marketRiskLevel,
      tradingMode: eventIntelligence.tradingRecommendation,
    }
  }
  
  // Filter by min volume
  const filteredPairs = pairs.filter(p => p.volume24h >= config.minVolume24h)
  
  // Phase 1: Fast scan in batches of 5
  const BATCH_SIZE = 5
  const results: ScannerResult[] = []
  let scanned = 0
  
  for (let i = 0; i < filteredPairs.length; i += BATCH_SIZE) {
    const batch = filteredPairs.slice(i, i + BATCH_SIZE)
    
    const batchResults = await Promise.allSettled(
      batch.map(p => scanCoin(p.symbol, p.price, p.change24h, p.volume24h, config.styles))
    )
    
    batchResults.forEach((result, idx) => {
      scanned++
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.bestSignal && result.value.bestSignal.confidence >= config.minConfidence) {
          results.push(result.value)
        }
      } else if (result.status === 'rejected') {
        errors.push(`${batch[idx].symbol}: ${result.reason}`)
      }
    })
    
    onProgress?.(scanned, filteredPairs.length, results.length)
    
    if (i + BATCH_SIZE < filteredPairs.length) {
      await new Promise(r => setTimeout(r, 200))
    }
  }
  
  // Sort by best confidence
  results.sort((a, b) => 
    (b.bestSignal?.confidence || 0) - (a.bestSignal?.confidence || 0))
  
  // Phase 2: Enhanced analysis for top 5 (MTF + Deep + Recommendation)
  const topCandidates = results.slice(0, 5)
  const enhancedResults: EnhancedScannerResult[] = []
  
  for (const candidate of topCandidates) {
    try {
      // Multi-timeframe analysis
      const mtf = await analyzeMultipleTimeframes(candidate.symbol, mtfConfig)
      
      // Deep analysis (Layer 1 + 3 + 5)
      const deep = await performDeepAnalysis(candidate, macroData)
      
      // Smart recommendation
      const recommendation = generateSmartRecommendation(
        candidate.bestSignal!,
        mtf,
        eventIntelligence,
        deep,
        capital,
        riskPercent
      )
      
      enhancedResults.push({
        ...candidate,
        mtfAnalysis: mtf,
        eventIntelligence,
        smartRecommendation: recommendation,
        deepAnalysis: deep,
      })
    } catch (err) {
      console.error(`Enhanced analysis failed for ${candidate.symbol}:`, err)
      enhancedResults.push(candidate)
    }
  }
  
  // Merge with non-enhanced results
  const finalResults: EnhancedScannerResult[] = [
    ...enhancedResults,
    ...results.slice(5).map(r => ({ ...r }) as EnhancedScannerResult),
  ]
  
  // Re-sort by final score (if available), else by confidence
  finalResults.sort((a, b) => {
    const aScore = a.smartRecommendation?.finalScore || a.bestSignal?.confidence || 0
    const bScore = b.smartRecommendation?.finalScore || b.bestSignal?.confidence || 0
    return bScore - aScore
  })
  
  const longSignals = finalResults.filter(r => r.bestSignal?.bias === 'LONG').length
  const shortSignals = finalResults.filter(r => r.bestSignal?.bias === 'SHORT').length
  
  const duration = (Date.now() - startTime) / 1000
  
  return {
    totalScanned: scanned,
    totalWithSignals: finalResults.length,
    longSignals,
    shortSignals,
    topPicks: finalResults.slice(0, 20),
    scannedAt: new Date().toISOString(),
    duration,
    errors,
    marketRiskLevel: eventIntelligence.marketRiskLevel,
    tradingMode: eventIntelligence.tradingRecommendation,
  }
}

// ---- Format enhanced alert (Phase 6 — ultra detailed) ----
export function formatEnhancedAlertMessage(result: EnhancedScannerResult): string {
  if (!result.smartRecommendation || !result.mtfAnalysis || !result.eventIntelligence) {
    return formatAlertMessage(result)
  }
  
  return formatUltraDetailedAlert(
    result.symbol,
    result.name,
    result.price,
    result.change24h,
    result.volume24h,
    result.bestSignal!,
    result.mtfAnalysis,
    result.eventIntelligence,
    result.smartRecommendation,
    result.deepAnalysis
  )
}

// ---- Format alert message for Telegram/WhatsApp ----
export function formatAlertMessage(result: ScannerResult): string {
  const sig = result.bestSignal!
  const fmt = (n: number) => n < 1 ? n.toFixed(5) : n < 100 ? n.toFixed(3) : n.toFixed(2)
  
  let msg = `🚨 <b>SETUP ALERT</b> 🚨\n\n`
  msg += `📊 <b>${result.name}</b> (${result.symbol})\n`
  msg += `💵 Price: $${fmt(result.price)} (${result.change24h >= 0 ? '+' : ''}${result.change24h.toFixed(2)}% 24h)\n`
  msg += `📈 Volume 24h: $${formatVolume(result.volume24h)}\n\n`
  
  msg += `🎯 <b>Signal: ${sig.bias}</b>\n`
  msg += `📋 Style: ${sig.styleName}\n`
  msg += `💪 Confidence: ${sig.confidence.toFixed(0)}/100\n`
  msg += `⚖️ R:R: 1:${sig.rr.toFixed(2)}\n`
  msg += `🌐 Market: ${sig.marketRegime}\n\n`
  
  msg += `<b>📋 Trade Plan:</b>\n`
  msg += `  Entry: $${fmt(sig.entry)}\n`
  msg += `  Stop Loss: $${fmt(sig.stopLoss)}\n`
  msg += `  TP1 (50%): $${fmt(sig.takeProfits.tp1)}\n`
  msg += `  TP2 (30%): $${fmt(sig.takeProfits.tp2)}\n`
  msg += `  TP3 (20%): $${fmt(sig.takeProfits.tp3)}\n\n`
  
  msg += `<b>✅ Reasons:</b>\n`
  sig.reasons.forEach(r => { msg += `  ${r}\n` })
  
  if (sig.warnings.length > 0) {
    msg += `\n<b>⚠️ Warnings:</b>\n`
    sig.warnings.forEach(w => { msg += `  ${w}\n` })
  }
  
  msg += `\n🕐 Scanned: ${new Date(result.lastScannedAt).toLocaleString('id-ID')}\n`
  msg += `⚠️ Educational only. DYOR & manage risk.`
  
  return msg
}

// ---- Format for WhatsApp (plain text, no HTML) ----
export function formatWhatsAppMessage(result: ScannerResult): string {
  const sig = result.bestSignal!
  const fmt = (n: number) => n < 1 ? n.toFixed(5) : n < 100 ? n.toFixed(3) : n.toFixed(2)
  
  let msg = `🚨 SETUP ALERT 🚨\n\n`
  msg += `📊 ${result.name} (${result.symbol})\n`
  msg += `💵 Price: $${fmt(result.price)} (${result.change24h >= 0 ? '+' : ''}${result.change24h.toFixed(2)}% 24h)\n`
  msg += `📈 Volume 24h: $${formatVolume(result.volume24h)}\n\n`
  
  msg += `🎯 Signal: ${sig.bias}\n`
  msg += `📋 Style: ${sig.styleName}\n`
  msg += `💪 Confidence: ${sig.confidence.toFixed(0)}/100\n`
  msg += `⚖️ R:R: 1:${sig.rr.toFixed(2)}\n\n`
  
  msg += `📋 Trade Plan:\n`
  msg += `  Entry: $${fmt(sig.entry)}\n`
  msg += `  SL: $${fmt(sig.stopLoss)}\n`
  msg += `  TP1: $${fmt(sig.takeProfits.tp1)}\n`
  msg += `  TP2: $${fmt(sig.takeProfits.tp2)}\n`
  msg += `  TP3: $${fmt(sig.takeProfits.tp3)}\n\n`
  
  msg += `✅ Reasons:\n`
  sig.reasons.forEach(r => { msg += `  ${r}\n` })
  
  msg += `\n⚠️ Educational only. DYOR.`
  
  return msg
}

// ---- Helper: format volume ----
function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`
  return v.toFixed(0)
}
