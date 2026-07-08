// =====================================================
// TECHNICAL INDICATORS — Pure functions
// =====================================================

import type { Candle, TechnicalAnalysis, FibonacciLevels, Timeframe } from './types'

// ---- EMA ----
export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  let prev = values[0]
  result.push(prev)
  for (let i = 1; i < values.length; i++) {
    const v = values[i] * k + prev * (1 - k)
    result.push(v)
    prev = v
  }
  return result
}

// ---- RSI ----
export function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50
  let gains = 0
  let losses = 0
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

// ---- MACD ----
export function macd(values: number[]): {
  macd: number
  signal: number
  histogram: number
  cross: 'BULLISH' | 'BEARISH' | 'NONE'
} {
  if (values.length < 35) {
    return { macd: 0, signal: 0, histogram: 0, cross: 'NONE' }
  }
  const ema12 = ema(values, 12)
  const ema26 = ema(values, 26)
  const macdLine: number[] = []
  for (let i = 0; i < values.length; i++) {
    macdLine.push(ema12[i] - ema26[i])
  }
  const signalLine = ema(macdLine, 9)
  const macdVal = macdLine[macdLine.length - 1]
  const signalVal = signalLine[signalLine.length - 1]
  const hist = macdVal - signalVal
  const prevHist = macdLine[macdLine.length - 2] - signalLine[signalLine.length - 2]
  let cross: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE'
  if (prevHist < 0 && hist >= 0) cross = 'BULLISH'
  else if (prevHist > 0 && hist <= 0) cross = 'BEARISH'
  return { macd: macdVal, signal: signalVal, histogram: hist, cross }
}

// ---- ADX ----
export function adx(candles: Candle[], period = 14): number {
  if (candles.length < period * 2) return 20
  const plusDM: number[] = []
  const minusDM: number[] = []
  const tr: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].high - candles[i - 1].high
    const down = candles[i - 1].low - candles[i].low
    plusDM.push(up > down && up > 0 ? up : 0)
    minusDM.push(down > up && down > 0 ? down : 0)
    const highLow = candles[i].high - candles[i].low
    const highClose = Math.abs(candles[i].high - candles[i - 1].close)
    const lowClose = Math.abs(candles[i].low - candles[i - 1].close)
    tr.push(Math.max(highLow, highClose, lowClose))
  }
  const trAvg = tr.slice(-period).reduce((a, b) => a + b, 0) / period
  const plusDMAvg = plusDM.slice(-period).reduce((a, b) => a + b, 0) / period
  const minusDMAvg = minusDM.slice(-period).reduce((a, b) => a + b, 0) / period
  if (trAvg === 0) return 20
  const plusDI = (plusDMAvg / trAvg) * 100
  const minusDI = (minusDMAvg / trAvg) * 100
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100
  return dx
}

// ---- Bollinger Bands ----
export function bollinger(values: number[], period = 20, mult = 2): {
  upper: number
  middle: number
  lower: number
  squeeze: boolean
} {
  if (values.length < period) {
    const v = values[values.length - 1] || 0
    return { upper: v * 1.02, middle: v, lower: v * 0.98, squeeze: false }
  }
  const slice = values.slice(-period)
  const middle = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period
  const std = Math.sqrt(variance)
  const upper = middle + mult * std
  const lower = middle - mult * std
  // squeeze: band width < 4% of price
  const bandWidth = (upper - lower) / middle
  const squeeze = bandWidth < 0.04
  return { upper, middle, lower, squeeze }
}

// ---- ATR (Average True Range) ----
export function atr(candles: Candle[], period = 14): number {
  if (candles.length < period) return 0
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const highLow = candles[i].high - candles[i].low
    const highClose = Math.abs(candles[i].high - candles[i - 1].close)
    const lowClose = Math.abs(candles[i].low - candles[i - 1].close)
    trs.push(Math.max(highLow, highClose, lowClose))
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period
}

// ---- Fibonacci ----
export function fibonacci(swingLow: number, swingHigh: number): FibonacciLevels {
  const diff = swingHigh - swingLow
  return {
    swingLow,
    swingHigh,
    levels: {
      '0.236': swingHigh - diff * 0.236,
      '0.382': swingHigh - diff * 0.382,
      '0.500': swingHigh - diff * 0.500,
      '0.618': swingHigh - diff * 0.618,
      '0.786': swingHigh - diff * 0.786,
    },
    extensions: {
      '1.272': swingHigh + diff * 0.272,
      '1.414': swingHigh + diff * 0.414,
      '1.618': swingHigh + diff * 0.618,
    },
  }
}

// ---- Support/Resistance from swings ----
export function findSupportResistance(candles: Candle[]): {
  supports: number[]
  resistances: number[]
} {
  const supports: number[] = []
  const resistances: number[] = []
  const window = 5
  for (let i = window; i < candles.length - window; i++) {
    const slice = candles.slice(i - window, i + window + 1)
    const current = candles[i]
    const isSupport = slice.every(c => c.low >= current.low)
    const isResistance = slice.every(c => c.high <= current.high)
    if (isSupport) supports.push(current.low)
    if (isResistance) resistances.push(current.high)
  }
  return {
    supports: supports.slice(-3),
    resistances: resistances.slice(-3),
  }
}

// ---- Candlestick pattern recognition (basic) ----
export function candlestickPattern(candles: Candle[]): string | null {
  if (candles.length < 3) return null
  const c1 = candles[candles.length - 3]
  const c2 = candles[candles.length - 2]
  const c3 = candles[candles.length - 1]
  const body = (c: Candle) => Math.abs(c.close - c.open)
  const isBullish = (c: Candle) => c.close > c.open
  const isBearish = (c: Candle) => c.close < c.open

  // Hammer
  if (isBullish(c3) && body(c3) < (c3.high - c3.low) * 0.4 && c3.close > (c3.high + c3.low) / 2) {
    return 'Hammer'
  }
  // Bullish Engulfing
  if (isBearish(c2) && isBullish(c3) && c3.open <= c2.close && c3.close >= c2.open) {
    return 'Bullish Engulfing'
  }
  // Bearish Engulfing
  if (isBullish(c2) && isBearish(c3) && c3.open >= c2.close && c3.close <= c2.open) {
    return 'Bearish Engulfing'
  }
  // Doji
  if (body(c3) < (c3.high - c3.low) * 0.1) {
    return 'Doji'
  }
  // Morning Star
  if (isBearish(c1) && body(c2) < body(c1) * 0.5 && isBullish(c3) && c3.close > (c1.open + c1.close) / 2) {
    return 'Morning Star'
  }
  // Evening Star
  if (isBullish(c1) && body(c2) < body(c1) * 0.5 && isBearish(c3) && c3.close < (c1.open + c1.close) / 2) {
    return 'Evening Star'
  }
  return null
}

// ---- Full Technical Analysis for a timeframe ----
export function analyzeTimeframe(candles: Candle[], timeframe: Timeframe): TechnicalAnalysis {
  // Need at least 20 candles to compute basic indicators
  if (candles.length < 20) {
    const price = candles[candles.length - 1]?.close || 0
    return {
      timeframe,
      trend: 'RANGING',
      ema20: price,
      ema50: price,
      ema200: price,
      price,
      adx: 20,
      rsi: 50,
      macd: { macd: 0, signal: 0, histogram: 0, cross: 'NONE' },
      bollinger: { upper: price * 1.02, middle: price, lower: price * 0.98, squeeze: false },
      volume: 0,
      volumeAvg20: 0,
      volumeTrend: 'FLAT',
      keySupport: [],
      keyResistance: [],
      smc: { orderBlocks: [], fvgs: [], liquidityAbove: null, liquidityBelow: null, bos: false, choch: false },
      candlestickPattern: null,
      verdict: 'NEUTRAL',
    }
  }
  const closes = candles.map(c => c.close)
  const volumes = candles.map(c => c.volume)
  const price = closes[closes.length - 1] || 0

  const ema20Arr = ema(closes, 20)
  const ema50Arr = closes.length >= 50 ? ema(closes, 50) : ema(closes, Math.min(20, closes.length))
  const ema200Arr = closes.length >= 200 ? ema(closes, 200) : ema50Arr
  const ema20Val = ema20Arr[ema20Arr.length - 1]
  const ema50Val = ema50Arr[ema50Arr.length - 1]
  const ema200Val = ema200Arr[ema200Arr.length - 1]

  const adxVal = candles.length >= 28 ? adx(candles) : 20
  const rsiVal = rsi(closes)
  const macdVal = candles.length >= 35 ? macd(closes) : { macd: 0, signal: 0, histogram: 0, cross: 'NONE' as const }
  const bb = bollinger(closes)
  const volumeAvg20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length)
  const volume = volumes[volumes.length - 1] || 0
  const volChange = volume > volumeAvg20 ? 'UP' : volume < volumeAvg20 * 0.7 ? 'DOWN' : 'FLAT'

  const { supports, resistances } = findSupportResistance(candles)
  const pattern = candlestickPattern(candles)

  let trend: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING'
  if (adxVal > 25) {
    if (price > ema20Val && ema20Val > ema50Val) trend = 'BULLISH'
    else if (price < ema20Val && ema20Val < ema50Val) trend = 'BEARISH'
  } else {
    trend = 'RANGING'
  }

  let verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
  let bullCount = 0
  let bearCount = 0
  if (price > ema20Val) bullCount++; else bearCount++
  if (ema20Val > ema50Val) bullCount++; else bearCount++
  if (closes.length >= 200 && ema50Val > ema200Val) bullCount++; else if (closes.length >= 200) bearCount++
  if (rsiVal > 50) bullCount++; else bearCount++
  if (macdVal.histogram > 0) bullCount++; else bearCount++
  if (macdVal.cross === 'BULLISH') bullCount++
  if (macdVal.cross === 'BEARISH') bearCount++
  if (pattern === 'Bullish Engulfing' || pattern === 'Hammer' || pattern === 'Morning Star') bullCount += 2
  if (pattern === 'Bearish Engulfing' || pattern === 'Evening Star') bearCount += 2
  if (bullCount > bearCount + 1) verdict = 'BULLISH'
  else if (bearCount > bullCount + 1) verdict = 'BEARISH'

  return {
    timeframe,
    trend,
    ema20: ema20Val,
    ema50: ema50Val,
    ema200: ema200Val,
    price,
    adx: adxVal,
    rsi: rsiVal,
    macd: macdVal,
    bollinger: bb,
    volume,
    volumeAvg20,
    volumeTrend: volChange,
    keySupport: supports,
    keyResistance: resistances,
    smc: {
      orderBlocks: supports.slice(-2).map(p => ({ price: p, type: 'BULLISH' as const }))
        .concat(resistances.slice(-2).map(p => ({ price: p, type: 'BEARISH' as const }))),
      fvgs: [{ lower: ema50Val * 0.99, upper: ema20Val * 1.01, filled: false }],
      liquidityAbove: resistances[0] || null,
      liquidityBelow: supports[0] || null,
      bos: bullCount > bearCount + 2,
      choch: macdVal.cross !== 'NONE',
    },
    candlestickPattern: pattern,
    verdict,
  }
}

// ---- Confluence counter (Layer 4 detail) ----
export function countConfluence(ta: TechnicalAnalysis, bias: 'LONG' | 'SHORT'): number {
  let count = 0
  if (bias === 'LONG') {
    if (ta.price > ta.ema20) count++
    if (ta.ema20 > ta.ema50) count++
    if (ta.rsi > 50 && ta.rsi < 70) count++
    if (ta.macd.histogram > 0) count++
    if (ta.candlestickPattern === 'Bullish Engulfing' || ta.candlestickPattern === 'Hammer') count++
    if (ta.volumeTrend === 'UP') count++
    if (ta.trend === 'BULLISH') count++
  } else {
    if (ta.price < ta.ema20) count++
    if (ta.ema20 < ta.ema50) count++
    if (ta.rsi < 50 && ta.rsi > 30) count++
    if (ta.macd.histogram < 0) count++
    if (ta.candlestickPattern === 'Bearish Engulfing') count++
    if (ta.volumeTrend === 'UP') count++
    if (ta.trend === 'BEARISH') count++
  }
  return count
}

// =====================================================
// PHASE 3 INDICATORS — VWAP, Volume Profile, Ichimoku, Stoch RSI, Williams %R, CVD
// =====================================================

import type { 
  VWAPData, VolumeProfile, IchimokuData, StochRSI, 
  WilliamsR, CVDData, Candle 
} from './types'

// ---- VWAP (Volume Weighted Average Price) ----
export function vwap(candles: Candle[]): VWAPData {
  if (candles.length === 0) {
    return { value: 0, upperBand: 0, lowerBand: 0, distance: 0, signal: 'AT' }
  }
  
  let sumPV = 0
  let sumV = 0
  const typicalPrices: number[] = []
  const volumes: number[] = []
  
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3
    sumPV += typical * c.volume
    sumV += c.volume
    typicalPrices.push(typical)
    volumes.push(c.volume)
  }
  
  const vwapValue = sumV > 0 ? sumPV / sumV : candles[candles.length - 1].close
  
  // Std deviation
  const weightedSquaredDiffs = typicalPrices.reduce((sum, p, i) => {
    return sum + Math.pow(p - vwapValue, 2) * volumes[i]
  }, 0)
  const variance = sumV > 0 ? weightedSquaredDiffs / sumV : 0
  const std = Math.sqrt(variance)
  
  const price = candles[candles.length - 1].close
  const distance = vwapValue > 0 ? ((price - vwapValue) / vwapValue) * 100 : 0
  
  let signal: VWAPData['signal'] = 'AT'
  if (distance > 1) signal = 'ABOVE'
  else if (distance < -1) signal = 'BELOW'
  
  return {
    value: vwapValue,
    upperBand: vwapValue + std,
    lowerBand: vwapValue - std,
    distance,
    signal,
  }
}

// ---- Volume Profile & POC ----
export function volumeProfile(candles: Candle[], bins = 50): VolumeProfile {
  if (candles.length === 0) {
    return { poc: 0, vah: 0, val: 0, nodes: [] }
  }
  
  const high = Math.max(...candles.map(c => c.high))
  const low = Math.min(...candles.map(c => c.low))
  const range = high - low
  const binSize = range / bins
  
  const bins_data: { price: number; volume: number }[] = []
  for (let i = 0; i < bins; i++) {
    const binLow = low + i * binSize
    const binHigh = binLow + binSize
    const binMid = (binLow + binHigh) / 2
    
    // Sum volume in this bin
    let vol = 0
    for (const c of candles) {
      // Proportional allocation if candle spans multiple bins
      if (c.low >= binLow && c.high <= binHigh) {
        vol += c.volume
      } else if (c.low < binHigh && c.high > binLow) {
        const overlap = Math.min(c.high, binHigh) - Math.max(c.low, binLow)
        vol += c.volume * (overlap / (c.high - c.low || 1))
      }
    }
    bins_data.push({ price: binMid, volume: vol })
  }
  
  // POC = bin with highest volume
  const sorted = [...bins_data].sort((a, b) => b.volume - a.volume)
  const poc = sorted[0].price
  
  // Value Area (70% around POC)
  const totalVol = bins_data.reduce((sum, b) => sum + b.volume, 0)
  const targetVol = totalVol * 0.7
  
  let pocIdx = bins_data.findIndex(b => b.price === poc)
  let valIdx = pocIdx
  let vahIdx = pocIdx
  let accumulatedVol = bins_data[pocIdx].volume
  
  while (accumulatedVol < targetVol && (valIdx > 0 || vahIdx < bins_data.length - 1)) {
    const downVol = valIdx > 0 ? bins_data[valIdx - 1].volume : 0
    const upVol = vahIdx < bins_data.length - 1 ? bins_data[vahIdx + 1].volume : 0
    
    if (downVol >= upVol && valIdx > 0) {
      valIdx--
      accumulatedVol += bins_data[valIdx].volume
    } else if (vahIdx < bins_data.length - 1) {
      vahIdx++
      accumulatedVol += bins_data[vahIdx].volume
    } else {
      break
    }
  }
  
  return {
    poc,
    vah: bins_data[vahIdx].price,
    val: bins_data[valIdx].price,
    nodes: bins_data.map(b => ({ ...b, isHigh: b.volume > sorted[Math.floor(bins * 0.2)].volume })),
  }
}

// ---- Ichimoku Cloud ----
export function ichimoku(candles: Candle[]): IchimokuData {
  if (candles.length < 52) {
    const price = candles[candles.length - 1]?.close || 0
    return {
      tenkanSen: price, kijunSen: price, senkouA: price, senkouB: price,
      chikouSpan: price, cloudColor: 'NEUTRAL', signal: 'NEUTRAL'
    }
  }
  
  const tenkanPeriod = 9
  const kijunPeriod = 26
  const senkouBPeriod = 52
  const displacement = 26
  
  const calcMidpoint = (period: number, offset = 0) => {
    if (candles.length < period + offset) return candles[candles.length - 1].close
    const slice = candles.slice(candles.length - period - offset, candles.length - offset || undefined)
    const high = Math.max(...slice.map(c => c.high))
    const low = Math.min(...slice.map(c => c.low))
    return (high + low) / 2
  }
  
  const tenkanSen = calcMidpoint(tenkanPeriod)
  const kijunSen = calcMidpoint(kijunPeriod)
  const senkouA = (tenkanSen + kijunSen) / 2  // projected 26 forward
  const senkouB = calcMidpoint(senkouBPeriod)
  const chikouSpan = candles[candles.length - 1 - displacement]?.close || candles[candles.length - 1].close
  
  const price = candles[candles.length - 1].close
  let cloudColor: IchimokuData['cloudColor'] = 'NEUTRAL'
  if (senkouA > senkouB) cloudColor = 'GREEN'
  else if (senkouA < senkouB) cloudColor = 'RED'
  
  let signal: IchimokuData['signal'] = 'NEUTRAL'
  if (price > senkouA && price > senkouB && tenkanSen > kijunSen && cloudColor === 'GREEN') {
    signal = 'BULLISH'
  } else if (price < senkouA && price < senkouB && tenkanSen < kijunSen && cloudColor === 'RED') {
    signal = 'BEARISH'
  }
  
  return { tenkanSen, kijunSen, senkouA, senkouB, chikouSpan, cloudColor, signal }
}

// ---- Stochastic RSI ----
export function stochasticRSI(closes: number[], period = 14, smoothK = 3, smoothD = 3): StochRSI {
  if (closes.length < period + 5) {
    return { k: 50, d: 50, signal: 'NEUTRAL' }
  }
  
  // First compute RSI series
  const rsiSeries: number[] = []
  for (let i = period; i < closes.length; i++) {
    let gains = 0
    let losses = 0
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1]
      if (diff >= 0) gains += diff
      else losses -= diff
    }
    const avgGain = gains / period
    const avgLoss = losses / period
    if (avgLoss === 0) rsiSeries.push(100)
    else rsiSeries.push(100 - 100 / (1 + avgGain / avgLoss))
  }
  
  if (rsiSeries.length < period) {
    return { k: 50, d: 50, signal: 'NEUTRAL' }
  }
  
  // Stoch RSI = (RSI - min(RSI, period)) / (max(RSI, period) - min(RSI, period))
  const stochRsiRaw: number[] = []
  for (let i = period - 1; i < rsiSeries.length; i++) {
    const slice = rsiSeries.slice(i - period + 1, i + 1)
    const min = Math.min(...slice)
    const max = Math.max(...slice)
    if (max - min === 0) stochRsiRaw.push(50)
    else stochRsiRaw.push(((rsiSeries[i] - min) / (max - min)) * 100)
  }
  
  // Smooth K and D
  const kArr: number[] = []
  for (let i = smoothK - 1; i < stochRsiRaw.length; i++) {
    const slice = stochRsiRaw.slice(i - smoothK + 1, i + 1)
    kArr.push(slice.reduce((a, b) => a + b, 0) / smoothK)
  }
  
  const dArr: number[] = []
  for (let i = smoothD - 1; i < kArr.length; i++) {
    const slice = kArr.slice(i - smoothD + 1, i + 1)
    dArr.push(slice.reduce((a, b) => a + b, 0) / smoothD)
  }
  
  const k = kArr[kArr.length - 1] || 50
  const d = dArr[dArr.length - 1] || 50
  
  let signal: StochRSI['signal'] = 'NEUTRAL'
  if (k < 20) signal = 'OVERSOLD'
  else if (k > 80) signal = 'OVERBOUGHT'
  
  // Cross detection
  if (kArr.length >= 2) {
    const prevK = kArr[kArr.length - 2]
    const prevD = dArr[dArr.length - 2] || d
    if (prevK < prevD && k >= d && k < 30) signal = 'BULL_CROSS'
    else if (prevK > prevD && k <= d && k > 70) signal = 'BEAR_CROSS'
  }
  
  return { k, d, signal }
}

// ---- Williams %R ----
export function williamsR(candles: Candle[], period = 14): WilliamsR {
  if (candles.length < period) {
    return { value: -50, signal: 'NEUTRAL' }
  }
  
  const slice = candles.slice(-period)
  const high = Math.max(...slice.map(c => c.high))
  const low = Math.min(...slice.map(c => c.low))
  const close = candles[candles.length - 1].close
  
  const wr = ((high - close) / (high - low)) * -100
  
  let signal: WilliamsR['signal'] = 'NEUTRAL'
  if (wr < -80) signal = 'OVERSOLD'
  else if (wr > -20) signal = 'OVERBOUGHT'
  
  return { value: wr, signal }
}

// ---- CVD (Cumulative Volume Delta) ----
// Simplified: estimate buy/sell volume from candle close vs range
export function cvd(candles: Candle[]): CVDData {
  if (candles.length === 0) {
    return { value: 0, trend: 'NEUTRAL', divergence: 'NONE' }
  }
  
  let cumDelta = 0
  const deltas: number[] = []
  const prices: number[] = []
  
  for (const c of candles) {
    const range = c.high - c.low
    if (range === 0) continue
    
    // Estimate buy/sell pressure from close position in range
    const buyPressure = ((c.close - c.low) / range) * c.volume
    const sellPressure = ((c.high - c.close) / range) * c.volume
    const delta = buyPressure - sellPressure
    
    cumDelta += delta
    deltas.push(cumDelta)
    prices.push(c.close)
  }
  
  // Trend detection: last 20 candles
  const recent = deltas.slice(-20)
  const slope = recent.length > 1 ? (recent[recent.length - 1] - recent[0]) / recent.length : 0
  
  let trend: CVDData['trend'] = 'NEUTRAL'
  if (slope > 0) trend = 'ACCUMULATION'
  else if (slope < 0) trend = 'DISTRIBUTION'
  
  // Divergence: price up but CVD down = bearish divergence (and vice versa)
  let divergence: CVDData['divergence'] = 'NONE'
  if (prices.length >= 20) {
    const priceSlope = (prices[prices.length - 1] - prices[prices.length - 20]) / 20
    const cvdSlope = (deltas[deltas.length - 1] - deltas[deltas.length - 20]) / 20
    
    if (priceSlope > 0 && cvdSlope < 0) divergence = 'BEARISH'
    else if (priceSlope < 0 && cvdSlope > 0) divergence = 'BULLISH'
  }
  
  return { value: cumDelta, trend, divergence }
}

// =====================================================
// PHASE 4 — Donchian Channel + Trading Styles Engine
// =====================================================

// ---- Donchian Channel ----
export function donchian(candles: Candle[], period = 20): {
  upper: number
  lower: number
  middle: number
} {
  if (candles.length < period) {
    const price = candles[candles.length - 1]?.close || 0
    return { upper: price, lower: price, middle: price }
  }
  const slice = candles.slice(-period)
  const upper = Math.max(...slice.map(c => c.high))
  const lower = Math.min(...slice.map(c => c.low))
  return { upper, lower, middle: (upper + lower) / 2 }
}

// ---- Trading Style Signal ----
export interface TradingStyleSignal {
  style: 'TREND_FOLLOWING' | 'MEAN_REVERSION' | 'VOLUME_BREAKOUT' | 'SMART_MONEY'
  styleName: string
  bias: 'LONG' | 'SHORT' | 'NEUTRAL'
  confidence: number  // 0-100
  marketRegime: 'TRENDING' | 'RANGING' | 'MOMENTUM' | 'MIXED'
  entry: {
    zone: { lower: number; upper: number }
    trigger: string
    price: number
  }
  stopLoss: number
  takeProfits: { tp1: number; tp2: number; tp3: number }
  rr: number
  reasons: string[]
  warnings: string[]
  indicators: { name: string; value: string; signal: string }[]
}

// ---- Style 1: Trend Following (Donchian + ATR + ADX) ----
export function trendFollowingStyle(candles: Candle[], candles4H: Candle[]): TradingStyleSignal | null {
  if (candles.length < 60 || candles4H.length < 50) return null
  
  const closes = candles.map(c => c.close)
  const dc = donchian(candles, 20)
  const atrVal = atr(candles, 14)
  const adxVal = adx(candles)
  const ema50Arr = ema(closes, 50)
  const ema200Arr = ema(closes, 200)
  const ema50 = ema50Arr[ema50Arr.length - 1]
  const ema200 = ema200Arr[ema200Arr.length - 1]
  const price = closes[closes.length - 1]
  const prevHigh = candles[candles.length - 2].high
  
  const reasons: string[] = []
  const warnings: string[] = []
  const indicators: { name: string; value: string; signal: string }[] = []
  
  indicators.push(
    { name: 'Donchian 20H', value: dc.upper.toFixed(2), signal: price > dc.upper ? 'ABOVE' : 'BELOW' },
    { name: 'ATR(14)', value: atrVal.toFixed(2), signal: atrVal / price > 0.03 ? 'HIGH' : 'NORMAL' },
    { name: 'ADX(14)', value: adxVal.toFixed(1), signal: adxVal > 25 ? 'TRENDING' : 'RANGING' },
    { name: 'EMA50 vs EMA200', value: `${ema50.toFixed(2)} vs ${ema200.toFixed(2)}`, signal: ema50 > ema200 ? 'BULL' : 'BEAR' },
  )
  
  let bias: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
  let confidence = 50
  
  // Long signal: price breaks above 20-day Donchian + ADX > 25 + EMA50 > EMA200
  if (price > dc.upper && price > prevHigh && adxVal > 25 && ema50 > ema200) {
    bias = 'LONG'
    confidence = 75
    reasons.push('✅ Price breaks above 20-day Donchian high')
    reasons.push('✅ ADX > 25 (trending market)')
    reasons.push('✅ EMA50 > EMA200 (bullish structure)')
  }
  // Short signal: price breaks below 20-day Donchian low + ADX > 25 + EMA50 < EMA200
  else if (price < dc.lower && price < candles[candles.length - 2].low && adxVal > 25 && ema50 < ema200) {
    bias = 'SHORT'
    confidence = 75
    reasons.push('✅ Price breaks below 20-day Donchian low')
    reasons.push('✅ ADX > 25 (trending market)')
    reasons.push('✅ EMA50 < EMA200 (bearish structure)')
  } else {
    reasons.push('❌ No breakout signal — wait for Donchian break + ADX confirmation')
    if (adxVal < 20) warnings.push('ADX < 20 — market ranging, trend following tidak optimal')
  }
  
  if (adxVal < 25) warnings.push('⚠️ ADX < 25 — trend belum kuat, false breakout risk')
  
  // Entry: at breakout price (current)
  const entry = price
  const slDistance = 2 * atrVal
  const stopLoss = bias === 'LONG' ? entry - slDistance : entry + slDistance
  
  // TP: trailing Donchian 10-day (simplified — use 1:2, 1:3, 1:4 R:R)
  const tp1 = bias === 'LONG' ? entry + slDistance * 2 : entry - slDistance * 2
  const tp2 = bias === 'LONG' ? entry + slDistance * 3 : entry - slDistance * 3
  const tp3 = bias === 'LONG' ? entry + slDistance * 4 : entry - slDistance * 4
  
  const rr = 2.0 // average
  
  return {
    style: 'TREND_FOLLOWING',
    styleName: 'Trend Following (Donchian + ATR)',
    bias,
    confidence,
    marketRegime: adxVal > 25 ? 'TRENDING' : 'RANGING',
    entry: { zone: { lower: entry * 0.998, upper: entry * 1.002 }, trigger: 'Donchian breakout + ADX > 25', price: entry },
    stopLoss,
    takeProfits: { tp1, tp2, tp3 },
    rr,
    reasons,
    warnings,
    indicators,
  }
}

// ---- Style 2: Mean Reversion (Bollinger + RSI + ADX < 20) ----
export function meanReversionStyle(candles: Candle[], _candles4H: Candle[]): TradingStyleSignal | null {
  if (candles.length < 30) return null
  
  const closes = candles.map(c => c.close)
  const bb = bollinger(closes, 20, 2)
  const rsiVal = rsi(closes)
  const adxVal = adx(candles)
  const price = closes[closes.length - 1]
  const volumes = candles.map(c => c.volume)
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const currentVol = volumes[volumes.length - 1]
  
  const reasons: string[] = []
  const warnings: string[] = []
  const indicators: { name: string; value: string; signal: string }[] = []
  
  indicators.push(
    { name: 'BB Upper', value: bb.upper.toFixed(2), signal: price > bb.upper ? 'ABOVE' : price < bb.lower ? 'BELOW' : 'INSIDE' },
    { name: 'BB Lower', value: bb.lower.toFixed(2), signal: '' },
    { name: 'RSI(14)', value: rsiVal.toFixed(1), signal: rsiVal < 30 ? 'OVERSOLD' : rsiVal > 70 ? 'OVERBOUGHT' : 'NEUTRAL' },
    { name: 'ADX(14)', value: adxVal.toFixed(1), signal: adxVal < 20 ? 'RANGING' : 'TRENDING' },
    { name: 'Volume vs Avg', value: (currentVol / avgVol).toFixed(2) + 'x', signal: currentVol > avgVol * 1.5 ? 'SPIKE' : 'NORMAL' },
  )
  
  let bias: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
  let confidence = 50
  
  // Long: price below lower BB + RSI < 35 + ADX < 20 + volume spike
  if (price < bb.lower && rsiVal < 35 && adxVal < 20) {
    bias = 'LONG'
    confidence = 70
    reasons.push('✅ Price below lower Bollinger Band')
    reasons.push('✅ RSI < 35 (oversold zone)')
    reasons.push('✅ ADX < 20 (ranging market — ideal for mean reversion)')
    if (currentVol > avgVol * 1.5) {
      reasons.push('✅ Volume spike — capitulation/climax')
      confidence += 5
    }
  }
  // Short: price above upper BB + RSI > 65 + ADX < 20
  else if (price > bb.upper && rsiVal > 65 && adxVal < 20) {
    bias = 'SHORT'
    confidence = 70
    reasons.push('✅ Price above upper Bollinger Band')
    reasons.push('✅ RSI > 65 (overbought zone)')
    reasons.push('✅ ADX < 20 (ranging market)')
    if (currentVol > avgVol * 1.5) {
      reasons.push('✅ Volume spike — blow-off top')
      confidence += 5
    }
  } else {
    reasons.push('❌ No extreme signal — wait for price to touch BB + RSI extreme')
    if (adxVal > 25) warnings.push('⚠️ ADX > 25 — market trending, mean reversion berbahaya (catch falling knife)')
  }
  
  if (adxVal > 25) warnings.push('⚠️ Trend market — mean reversion will likely fail')
  
  // Entry: at current price (extreme)
  const entry = price
  // SL: beyond BB by 1 std
  const std = (bb.upper - bb.middle) / 2
  const stopLoss = bias === 'LONG' ? bb.lower - std : bb.upper + std
  // TP: BB middle (50%) then BB opposite (50%)
  const tp1 = bb.middle
  const tp2 = bias === 'LONG' ? bb.upper : bb.lower
  const tp3 = bias === 'LONG' ? bb.upper + std * 0.5 : bb.lower - std * 0.5
  
  const risk = Math.abs(entry - stopLoss)
  const reward = Math.abs(tp2 - entry)
  const rr = risk > 0 ? reward / risk : 0
  
  return {
    style: 'MEAN_REVERSION',
    styleName: 'Mean Reversion (Bollinger + RSI)',
    bias,
    confidence,
    marketRegime: adxVal < 20 ? 'RANGING' : adxVal > 25 ? 'TRENDING' : 'MIXED',
    entry: { zone: { lower: bb.lower, upper: bb.lower + std * 0.5 }, trigger: 'BB touch + RSI extreme + ADX < 20', price: entry },
    stopLoss,
    takeProfits: { tp1, tp2, tp3 },
    rr,
    reasons,
    warnings,
    indicators,
  }
}

// ---- Style 3: Volume Breakout (S/R + Volume + VWAP) ----
export function volumeBreakoutStyle(candles: Candle[], _candles4H: Candle[]): TradingStyleSignal | null {
  if (candles.length < 30) return null
  
  const closes = candles.map(c => c.close)
  const volumes = candles.map(c => c.volume)
  const price = closes[closes.length - 1]
  
  // Find 20-day high/low (resistance/support)
  const lookback = 20
  const recentCandles = candles.slice(-lookback - 1, -1) // exclude current
  const recentHigh = Math.max(...recentCandles.map(c => c.high))
  const recentLow = Math.min(...recentCandles.map(c => c.low))
  
  // Volume analysis
  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const currentVol = volumes[volumes.length - 1]
  const volRatio = currentVol / avgVol
  
  // VWAP
  const vwapData = vwap(candles.slice(-50))
  
  // Bollinger squeeze detection
  const bb = bollinger(closes, 20, 2)
  
  // Consolidation detection (last 20 candles range < 5%)
  const range = (recentHigh - recentLow) / recentLow * 100
  
  const reasons: string[] = []
  const warnings: string[] = []
  const indicators: { name: string; value: string; signal: string }[] = []
  
  indicators.push(
    { name: '20-day High', value: recentHigh.toFixed(2), signal: price > recentHigh ? 'BROKEN' : 'NOT BROKEN' },
    { name: '20-day Low', value: recentLow.toFixed(2), signal: price < recentLow ? 'BROKEN' : 'NOT BROKEN' },
    { name: 'Volume Ratio', value: volRatio.toFixed(2) + 'x avg', signal: volRatio > 2 ? 'STRONG' : volRatio > 1.5 ? 'GOOD' : 'WEAK' },
    { name: 'VWAP', value: vwapData.value.toFixed(2), signal: price > vwapData.value ? 'ABOVE' : 'BELOW' },
    { name: 'BB Squeeze', value: bb.squeeze ? 'YES' : 'NO', signal: bb.squeeze ? 'COILED' : 'EXPANDED' },
    { name: 'Consolidation Range', value: range.toFixed(1) + '%', signal: range < 5 ? 'TIGHT' : 'WIDE' },
  )
  
  let bias: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
  let confidence = 50
  
  // Long breakout: price > 20-day high + volume > 2x avg + above VWAP
  if (price > recentHigh && volRatio > 2 && price > vwapData.value) {
    bias = 'LONG'
    confidence = 75
    reasons.push('✅ Price breaks above 20-day high (resistance broken)')
    reasons.push(`✅ Volume ${volRatio.toFixed(1)}x average (strong momentum)`)
    reasons.push('✅ Price above VWAP (institutional support)')
    if (bb.squeeze) {
      reasons.push('✅ BB squeeze before breakout (coiled spring)')
      confidence += 5
    }
    if (range < 5) {
      reasons.push(`✅ Tight consolidation (${range.toFixed(1)}%) — energy accumulated`)
      confidence += 5
    }
  }
  // Short breakout: price < 20-day low + volume > 2x avg + below VWAP
  else if (price < recentLow && volRatio > 2 && price < vwapData.value) {
    bias = 'SHORT'
    confidence = 75
    reasons.push('✅ Price breaks below 20-day low (support broken)')
    reasons.push(`✅ Volume ${volRatio.toFixed(1)}x average`)
    reasons.push('✅ Price below VWAP (institutional selling)')
  } else {
    reasons.push('❌ No volume breakout signal')
    reasons.push(`Need: price break 20-day level + volume > 2x avg (currently ${volRatio.toFixed(1)}x)`)
    if (volRatio < 1.5) warnings.push('⚠️ Volume below 1.5x avg — breakout likely fake')
  }
  
  if (volRatio < 2 && bias !== 'NEUTRAL') warnings.push('⚠️ Volume < 2x avg — breakout may fail')
  
  // Entry: at breakout price
  const entry = price
  // SL: below breakout candle (use 3% buffer)
  const stopLoss = bias === 'LONG' ? recentHigh * 0.97 : recentLow * 1.03
  // TP: measured move = breakout level + consolidation range
  const moveSize = Math.abs(recentHigh - recentLow)
  const tp1 = bias === 'LONG' ? entry + moveSize * 0.5 : entry - moveSize * 0.5
  const tp2 = bias === 'LONG' ? entry + moveSize : entry - moveSize
  const tp3 = bias === 'LONG' ? entry + moveSize * 1.5 : entry - moveSize * 1.5
  
  const risk = Math.abs(entry - stopLoss)
  const reward = Math.abs(tp2 - entry)
  const rr = risk > 0 ? reward / risk : 0
  
  return {
    style: 'VOLUME_BREAKOUT',
    styleName: 'Volume Breakout (S/R + Volume + VWAP)',
    bias,
    confidence,
    marketRegime: bb.squeeze || range < 5 ? 'MOMENTUM' : 'MIXED',
    entry: { zone: { lower: entry * 0.995, upper: entry * 1.005 }, trigger: '20-day break + 2x volume + VWAP aligned', price: entry },
    stopLoss,
    takeProfits: { tp1, tp2, tp3 },
    rr,
    reasons,
    warnings,
    indicators,
  }
}

// ---- Style 4: Smart Money (Order Block + FVG + BOS) ----
export function smartMoneyStyle(candles: Candle[], candles4H: Candle[]): TradingStyleSignal | null {
  if (candles.length < 50 || candles4H.length < 30) return null
  
  const closes = candles.map(c => c.close)
  const price = closes[closes.length - 1]
  
  // Find recent swing high/low for structure
  const lookback = 30
  const recentCandles = candles.slice(-lookback)
  const swingHighIdx = recentCandles.indexOf(recentCandles.reduce((max, c) => c.high > max.high ? c : max))
  const swingLowIdx = recentCandles.indexOf(recentCandles.reduce((min, c) => c.low < min.low ? c : min))
  const swingHigh = recentCandles[swingHighIdx].high
  const swingLow = recentCandles[swingLowIdx].low
  
  // Detect Order Block (last down candle before strong up move, or vice versa)
  const findBullishOB = () => {
    for (let i = candles.length - 2; i >= Math.max(5, candles.length - 20); i--) {
      const c = candles[i]
      const nextC = candles[i + 1]
      // Bullish OB: down candle followed by strong up move
      if (c.close < c.open && nextC.close > nextC.open && nextC.close > c.high) {
        return { price: (c.open + c.close) / 2, high: c.high, low: c.low }
      }
    }
    return null
  }
  
  const findBearishOB = () => {
    for (let i = candles.length - 2; i >= Math.max(5, candles.length - 20); i--) {
      const c = candles[i]
      const nextC = candles[i + 1]
      // Bearish OB: up candle followed by strong down move
      if (c.close > c.open && nextC.close < nextC.open && nextC.close < c.low) {
        return { price: (c.open + c.close) / 2, high: c.high, low: c.low }
      }
    }
    return null
  }
  
  const bullOB = findBullishOB()
  const bearOB = findBearishOB()
  
  // FVG (Fair Value Gap) — 3-candle pattern
  const findBullFVG = () => {
    if (candles.length < 3) return null
    const c1 = candles[candles.length - 3]
    const c3 = candles[candles.length - 1]
    if (c3.low > c1.high) return { lower: c1.high, upper: c3.low }
    return null
  }
  
  const findBearFVG = () => {
    if (candles.length < 3) return null
    const c1 = candles[candles.length - 3]
    const c3 = candles[candles.length - 1]
    if (c3.high < c1.low) return { lower: c3.high, upper: c1.low }
    return null
  }
  
  const bullFVG = findBullFVG()
  const bearFVG = findBearFVG()
  
  // BOS (Break of Structure) on 4H
  const h4Closes = candles4H.map(c => c.close)
  const h4SwingHigh = Math.max(...candles4H.slice(-20, -1).map(c => c.high))
  const h4SwingLow = Math.min(...candles4H.slice(-20, -1).map(c => c.low))
  const h4BosBull = price > h4SwingHigh
  const h4BosBear = price < h4SwingLow
  
  // Liquidity sweep (wick below recent low then close above)
  const lastCandle = candles[candles.length - 1]
  const prevLow = candles[candles.length - 2].low
  const liquiditySweepBull = lastCandle.low < prevLow && lastCandle.close > prevLow
  const liquiditySweepBear = lastCandle.high > candles[candles.length - 2].high && lastCandle.close < candles[candles.length - 2].high
  
  const reasons: string[] = []
  const warnings: string[] = []
  const indicators: { name: string; value: string; signal: string }[] = []
  
  indicators.push(
    { name: 'Bullish OB', value: bullOB ? bullOB.price.toFixed(2) : 'None', signal: bullOB && Math.abs(price - bullOB.price) / price < 0.02 ? 'AT OB' : 'NOT AT' },
    { name: 'Bearish OB', value: bearOB ? bearOB.price.toFixed(2) : 'None', signal: bearOB && Math.abs(price - bearOB.price) / price < 0.02 ? 'AT OB' : 'NOT AT' },
    { name: 'Bull FVG', value: bullFVG ? `${bullFVG.lower.toFixed(2)}-${bullFVG.upper.toFixed(2)}` : 'None', signal: bullFVG && price >= bullFVG.lower && price <= bullFVG.upper ? 'IN FVG' : 'NOT IN' },
    { name: 'Bear FVG', value: bearFVG ? `${bearFVG.lower.toFixed(2)}-${bearFVG.upper.toFixed(2)}` : 'None', signal: bearFVG && price >= bearFVG.lower && price <= bearFVG.upper ? 'IN FVG' : 'NOT IN' },
    { name: '4H BOS Bull', value: h4BosBull ? 'YES' : 'NO', signal: h4BosBull ? 'BULLISH' : 'NO' },
    { name: '4H BOS Bear', value: h4BosBear ? 'YES' : 'NO', signal: h4BosBear ? 'BEARISH' : 'NO' },
    { name: 'Liquidity Sweep', value: liquiditySweepBull ? 'BULL' : liquiditySweepBear ? 'BEAR' : 'NONE', signal: liquiditySweepBull ? 'STOP HUNT UP' : liquiditySweepBear ? 'STOP HUNT DOWN' : '' },
  )
  
  let bias: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
  let confidence = 50
  
  // Long: at bullish OB + bull FVG + 4H BOS bullish
  const atBullOB = bullOB && Math.abs(price - bullOB.price) / price < 0.02
  const inBullFVG = bullFVG && price >= bullFVG.lower && price <= bullFVG.upper
  
  if ((atBullOB || inBullFVG) && h4BosBull) {
    bias = 'LONG'
    confidence = 70
    if (atBullOB) reasons.push('✅ Price at bullish Order Block')
    if (inBullFVG) reasons.push('✅ Price in bullish Fair Value Gap')
    reasons.push('✅ 4H Break of Structure (bullish)')
    if (liquiditySweepBull) {
      reasons.push('✅ Liquidity sweep below recent low (stop hunt)')
      confidence += 10
    }
  }
  // Short: at bearish OB + bear FVG + 4H BOS bearish
  else if ((bearOB && Math.abs(price - bearOB.price) / price < 0.02 || (bearFVG && price >= bearFVG.lower && price <= bearFVG.upper)) && h4BosBear) {
    bias = 'SHORT'
    confidence = 70
    reasons.push('✅ Price at bearish OB / bear FVG')
    reasons.push('✅ 4H Break of Structure (bearish)')
    if (liquiditySweepBear) {
      reasons.push('✅ Liquidity sweep above recent high')
      confidence += 10
    }
  } else {
    reasons.push('❌ No SMC confluence — need OB/FVG + BOS alignment')
    if (!h4BosBull && !h4BosBear) warnings.push('⚠️ No 4H BOS — structure not confirmed')
  }
  
  // Entry: at current price
  const entry = price
  // SL: below OB / FVG
  const stopLoss = bias === 'LONG' 
    ? (bullOB ? bullOB.low : bullFVG ? bullFVG.lower : entry * 0.98) - entry * 0.005
    : (bearOB ? bearOB.high : bearFVG ? bearFVG.upper : entry * 1.02) + entry * 0.005
  // TP: at swing high/low (liquidity target)
  const tp1 = bias === 'LONG' ? swingHigh : swingLow
  const tp2 = bias === 'LONG' ? swingHigh + (swingHigh - entry) * 0.5 : swingLow - (entry - swingLow) * 0.5
  const tp3 = bias === 'LONG' ? swingHigh + (swingHigh - entry) : swingLow - (entry - swingLow)
  
  const risk = Math.abs(entry - stopLoss)
  const reward = Math.abs(tp1 - entry)
  const rr = risk > 0 ? reward / risk : 0
  
  return {
    style: 'SMART_MONEY',
    styleName: 'Smart Money (OB + FVG + BOS)',
    bias,
    confidence,
    marketRegime: 'MIXED',
    entry: { zone: { lower: entry * 0.995, upper: entry * 1.005 }, trigger: 'OB/FVG tap + BOS confirmation', price: entry },
    stopLoss,
    takeProfits: { tp1, tp2, tp3 },
    rr,
    reasons,
    warnings,
    indicators,
  }
}
