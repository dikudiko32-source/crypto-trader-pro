// =====================================================
// BACKTESTING ENGINE — with safety guardrails
// =====================================================
// ⚠️ CRITICAL WARNINGS:
// 1. Backtest ≠ live results. Past performance ≠ future results.
// 2. Includes slippage (0.2% default) + fee (0.1% per side)
// 3. Win rate >60% in backtest = likely overfit, BEWARE
// 4. Always validate with paper trading before going live

import type { Candle, BacktestConfig, BacktestResult, BacktestTrade, BacktestMetrics, Timeframe } from './types'
import { ema, rsi, bollinger, adx } from './indicators'

// ---- Fetch historical candles (paginated) ----
export async function fetchHistoricalCandles(
  symbol: string,
  timeframe: Timeframe,
  startDate: string,
  endDate: string
): Promise<Candle[]> {
  const interval = tfToInterval(timeframe)
  const startTime = new Date(startDate).getTime()
  const endTime = new Date(endDate).getTime()
  
  const allCandles: Candle[] = []
  let currentStart = startTime
  const MAX_PER_REQUEST = 1000
  
  while (currentStart < endTime) {
    const url = `/api/proxy/binance?path=klines&symbol=${symbol}&interval=${interval}&startTime=${currentStart}&endTime=${endTime}&limit=${MAX_PER_REQUEST}`
    
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Binance API error: ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) break
      
      const batch: Candle[] = data.map((k: unknown[]): Candle => ({
        time: k[0] as number,
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
        volume: parseFloat(k[5] as string),
      }))
      
      allCandles.push(...batch)
      
      // Move start to after the last candle
      const lastTime = batch[batch.length - 1].time
      currentStart = lastTime + 1
      
      // Safety: prevent infinite loop
      if (data.length < MAX_PER_REQUEST) break
      
      // Small delay to avoid rate limit
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      console.error('fetchHistoricalCandles error:', err)
      break
    }
  }
  
  return allCandles
}

function tfToInterval(tf: Timeframe): string {
  const map: Record<Timeframe, string> = {
    '15m': '15m',
    '1H': '1h',
    '4H': '4h',
    '1D': '1d',
    '1W': '1w',
  }
  return map[tf] || '1d'
}

// ---- Run backtest ----
export function runBacktest(candles: Candle[], config: BacktestConfig): BacktestResult {
  const warnings: string[] = []
  
  // Safety guardrails
  if (candles.length < 100) {
    warnings.push('⚠️ Insufficient data (<100 candles). Results unreliable.')
  }
  if (candles.length > 5000) {
    warnings.push('⚠️ Large dataset. Consider splitting into walk-forward windows.')
  }
  if (config.slippagePct < 0.1) {
    warnings.push('⚠️ Slippage <0.1% is unrealistic. Default 0.2%.')
  }
  if (config.feePct < 0.05) {
    warnings.push('⚠️ Fee <0.05% per side is unrealistic. Binance spot = 0.1%.')
  }
  if (config.riskPerTrade > 3) {
    warnings.push('⚠️ Risk >3% per trade is dangerous. Live trading will likely blow up.')
  }
  
  // Determine date range span
  const daysSpan = (new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSpan < 90) {
    warnings.push('⚠️ Backtest span <90 days. Single market regime — results may not generalize.')
  }
  
  // Compute indicators
  const closes = candles.map(c => c.close)
  const emaFastPeriod = config.emaFast || 20
  const emaSlowPeriod = config.emaSlow || 50
  const rsiPeriod = config.rsiPeriod || 14
  
  const emaFastArr = ema(closes, emaFastPeriod)
  const emaSlowArr = ema(closes, emaSlowPeriod)
  const rsiArr = computeRSISeries(closes, rsiPeriod)
  const bbArr = computeBBSeries(closes, 20)
  
  // Backtest state
  let capital = config.initialCapital
  const trades: BacktestTrade[] = []
  const equityCurve: { date: string; value: number }[] = []
  
  let currentTrade: {
    entryDate: string
    entryPrice: number
    side: 'LONG' | 'SHORT'
    stopLoss: number
    takeProfit: number
    quantity: number
    entryBar: number
  } | null = null
  
  let totalFees = 0
  let totalSlippage = 0
  let consecutiveWins = 0
  let consecutiveLosses = 0
  let longestWinStreak = 0
  let longestLossStreak = 0
  let peakEquity = config.initialCapital
  let maxDrawdown = 0
  let maxDrawdownPct = 0
  
  const slippageMult = config.slippagePct / 100
  const feeMult = config.feePct / 100
  
  // Iterate through candles (skip first 50 for indicator warmup)
  for (let i = 50; i < candles.length; i++) {
    const candle = candles[i]
    const emaFast = emaFastArr[i]
    const emaSlow = emaSlowArr[i]
    const rsiVal = rsiArr[i]
    const bb = bbArr[i]
    
    // Update equity curve
    let currentEquity = capital
    if (currentTrade) {
      const unrealizedPnl = (candle.close - currentTrade.entryPrice) * currentTrade.quantity * (currentTrade.side === 'LONG' ? 1 : -1)
      currentEquity = capital + unrealizedPnl
    }
    equityCurve.push({ date: new Date(candle.time).toISOString(), value: currentEquity })
    
    // Track drawdown
    if (currentEquity > peakEquity) peakEquity = currentEquity
    const drawdown = peakEquity - currentEquity
    const drawdownPct = (drawdown / peakEquity) * 100
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
      maxDrawdownPct = drawdownPct
    }
    
    // Check exit conditions first (if in trade)
    if (currentTrade) {
      let exitPrice: number | null = null
      let exitReason: BacktestTrade['reason'] | null = null
      
      // Stop loss hit
      if (currentTrade.side === 'LONG' && candle.low <= currentTrade.stopLoss) {
        exitPrice = currentTrade.stopLoss
        exitReason = 'STOP_LOSS'
      } else if (currentTrade.side === 'SHORT' && candle.high >= currentTrade.stopLoss) {
        exitPrice = currentTrade.stopLoss
        exitReason = 'STOP_LOSS'
      }
      // Take profit hit
      else if (currentTrade.side === 'LONG' && candle.high >= currentTrade.takeProfit) {
        exitPrice = currentTrade.takeProfit
        exitReason = 'TAKE_PROFIT'
      } else if (currentTrade.side === 'SHORT' && candle.low <= currentTrade.takeProfit) {
        exitPrice = currentTrade.takeProfit
        exitReason = 'TAKE_PROFIT'
      }
      
      // Apply slippage + fee on exit
      if (exitPrice !== null && exitReason !== null) {
        const slippageCost = exitPrice * slippageMult
        const actualExitPrice = currentTrade.side === 'LONG' 
          ? exitPrice - slippageCost 
          : exitPrice + slippageCost
        const fee = actualExitPrice * currentTrade.quantity * feeMult
        
        const pnl = (actualExitPrice - currentTrade.entryPrice) * currentTrade.quantity * (currentTrade.side === 'LONG' ? 1 : -1) - fee
        const pnlPercent = (pnl / (currentTrade.entryPrice * currentTrade.quantity)) * 100
        const risk = Math.abs(currentTrade.entryPrice - currentTrade.stopLoss) * currentTrade.quantity
        const rr = risk > 0 ? Math.abs(actualExitPrice - currentTrade.entryPrice) * currentTrade.quantity / risk : 0
        
        trades.push({
          entryDate: currentTrade.entryDate,
          entryPrice: currentTrade.entryPrice,
          exitDate: new Date(candle.time).toISOString(),
          exitPrice: actualExitPrice,
          side: currentTrade.side,
          quantity: currentTrade.quantity,
          pnl,
          pnlPercent,
          rr,
          reason: exitReason,
          bars: i - currentTrade.entryBar,
        })
        
        capital += pnl
        totalFees += fee
        totalSlippage += slippageCost * currentTrade.quantity
        
        // Track streaks
        if (pnl >= 0) {
          consecutiveWins++
          consecutiveLosses = 0
          if (consecutiveWins > longestWinStreak) longestWinStreak = consecutiveWins
        } else {
          consecutiveLosses++
          consecutiveWins = 0
          if (consecutiveLosses > longestLossStreak) longestLossStreak = consecutiveLosses
        }
        
        currentTrade = null
      }
    }
    
    // Check entry conditions (if not in trade)
    if (!currentTrade) {
      let signal: { side: 'LONG' | 'SHORT'; stopLoss: number; takeProfit: number } | null = null
      
      if (config.strategy === 'TREND_PULLBACK') {
        // Long: EMA fast > slow, RSI 40-60 (pullback), price near EMA fast
        if (emaFast > emaSlow && rsiVal > 40 && rsiVal < 60 && candle.close <= emaFast * 1.01) {
          const stopLoss = Math.min(candle.low * 0.99, emaSlow * 0.99)
          const risk = candle.close - stopLoss
          const takeProfit = candle.close + risk * 2 // R:R 1:2
          signal = { side: 'LONG', stopLoss, takeProfit }
        }
        // Short: EMA fast < slow, RSI 40-60, price near EMA fast
        else if (emaFast < emaSlow && rsiVal > 40 && rsiVal < 60 && candle.close >= emaFast * 0.99) {
          const stopLoss = Math.max(candle.high * 1.01, emaSlow * 1.01)
          const risk = stopLoss - candle.close
          const takeProfit = candle.close - risk * 2
          signal = { side: 'SHORT', stopLoss, takeProfit }
        }
      }
      
      else if (config.strategy === 'MEAN_REVERSION') {
        // Long: price below lower BB, RSI < 30
        if (candle.close < bb.lower && rsiVal < (config.rsiOversold || 30)) {
          const stopLoss = candle.close * 0.97 // 3% stop
          const risk = candle.close - stopLoss
          const takeProfit = bb.middle // target middle band
          signal = { side: 'LONG', stopLoss, takeProfit }
        }
        // Short: price above upper BB, RSI > 70
        else if (candle.close > bb.upper && rsiVal > (config.rsiOverbought || 70)) {
          const stopLoss = candle.close * 1.03
          const risk = stopLoss - candle.close
          const takeProfit = bb.middle
          signal = { side: 'SHORT', stopLoss, takeProfit }
        }
      }
      
      else if (config.strategy === 'BREAKOUT') {
        // Detect simple breakout: close above 20-candle high
        const lookback = 20
        if (i >= lookback) {
          const recentHigh = Math.max(...candles.slice(i - lookback, i).map(c => c.high))
          const recentLow = Math.min(...candles.slice(i - lookback, i).map(c => c.low))
          const volume = candle.volume
          const avgVol = candles.slice(i - 20, i).reduce((sum, c) => sum + c.volume, 0) / 20
          
          // Long breakout
          if (candle.close > recentHigh && volume > avgVol * 1.5) {
            const stopLoss = recentHigh * 0.97
            const risk = candle.close - stopLoss
            const takeProfit = candle.close + risk * 2.5
            signal = { side: 'LONG', stopLoss, takeProfit }
          }
          // Short breakout
          else if (candle.close < recentLow && volume > avgVol * 1.5) {
            const stopLoss = recentLow * 1.03
            const risk = stopLoss - candle.close
            const takeProfit = candle.close - risk * 2.5
            signal = { side: 'SHORT', stopLoss, takeProfit }
          }
        }
      }
      
      if (signal) {
        // Apply slippage on entry
        const slippageCost = candle.close * slippageMult
        const entryPrice = signal.side === 'LONG' 
          ? candle.close + slippageCost 
          : candle.close - slippageCost
        const fee = entryPrice * feeMult // fee on notional
        totalFees += fee
        
        // Position size based on risk
        const riskAmount = capital * (config.riskPerTrade / 100)
        const riskPerUnit = Math.abs(entryPrice - signal.stopLoss)
        const quantity = riskPerUnit > 0 ? riskAmount / riskPerUnit : 0
        
        currentTrade = {
          entryDate: new Date(candle.time).toISOString(),
          entryPrice,
          side: signal.side,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          quantity,
          entryBar: i,
        }
      }
    }
  }
  
  // Close any open trade at end of data
  if (currentTrade && candles.length > 0) {
    const lastCandle = candles[candles.length - 1]
    const exitPrice = lastCandle.close
    const fee = exitPrice * currentTrade.quantity * feeMult
    const pnl = (exitPrice - currentTrade.entryPrice) * currentTrade.quantity * (currentTrade.side === 'LONG' ? 1 : -1) - fee
    const pnlPercent = (pnl / (currentTrade.entryPrice * currentTrade.quantity)) * 100
    const risk = Math.abs(currentTrade.entryPrice - currentTrade.stopLoss) * currentTrade.quantity
    const rr = risk > 0 ? Math.abs(exitPrice - currentTrade.entryPrice) * currentTrade.quantity / risk : 0
    
    trades.push({
      entryDate: currentTrade.entryDate,
      entryPrice: currentTrade.entryPrice,
      exitDate: new Date(lastCandle.time).toISOString(),
      exitPrice,
      side: currentTrade.side,
      quantity: currentTrade.quantity,
      pnl,
      pnlPercent,
      rr,
      reason: 'END_OF_DATA',
      bars: candles.length - 1 - currentTrade.entryBar,
    })
    
    capital += pnl
    totalFees += fee
  }
  
  // Calculate metrics
  const winningTrades = trades.filter(t => t.pnl > 0)
  const losingTrades = trades.filter(t => t.pnl < 0)
  const totalReturn = capital - config.initialCapital
  const totalReturnPct = (totalReturn / config.initialCapital) * 100
  
  const avgWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
    : 0
  const avgLoss = losingTrades.length > 0 
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) 
    : 0
  
  const profitFactor = avgLoss > 0 
    ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) 
    : winningTrades.length > 0 ? Infinity : 0
  
  // Sharpe ratio (simplified — using trade returns, not daily)
  const returns = trades.map(t => t.pnlPercent / 100)
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
  const stdDev = returns.length > 1 
    ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
    : 0
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0 // annualized
  
  const avgRr = trades.length > 0 
    ? trades.reduce((sum, t) => sum + t.rr, 0) / trades.length 
    : 0
  
  const metrics: BacktestMetrics = {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
    totalReturn,
    totalReturnPct,
    avgWin,
    avgLoss,
    profitFactor,
    maxDrawdown,
    maxDrawdownPct,
    sharpeRatio,
    avgRr,
    longestWinStreak,
    longestLossStreak,
    finalCapital: capital,
    fees: totalFees,
    slippageCost: totalSlippage,
  }
  
  // Additional safety warnings based on results
  if (metrics.winRate > 70) {
    warnings.push('⚠️ Win rate >70% in backtest is suspicious. Likely overfit. Validate with paper trading.')
  }
  if (metrics.maxDrawdownPct > 30) {
    warnings.push('⚠️ Max drawdown >30% is dangerous. Strategy may not be tradable live.')
  }
  if (metrics.profitFactor > 3) {
    warnings.push('⚠️ Profit factor >3 is unrealistic. Check for look-ahead bias.')
  }
  if (metrics.totalTrades < 20) {
    warnings.push('⚠️ <20 trades is statistically insignificant. Need more data or longer period.')
  }
  if (metrics.sharpeRatio > 3) {
    warnings.push('⚠️ Sharpe ratio >3 is suspicious. Curve-fitting likely.')
  }
  
  return {
    trades,
    metrics,
    equityCurve,
    config,
    warnings,
  }
}

// ---- Helper: RSI series for backtest ----
function computeRSISeries(closes: number[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(50)
      continue
    }
    let gains = 0
    let losses = 0
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1]
      if (diff >= 0) gains += diff
      else losses -= diff
    }
    const avgGain = gains / period
    const avgLoss = losses / period
    if (avgLoss === 0) {
      result.push(100)
    } else {
      const rs = avgGain / avgLoss
      result.push(100 - 100 / (1 + rs))
    }
  }
  return result
}

// ---- Helper: Bollinger series for backtest ----
function computeBBSeries(closes: number[], period: number): Array<{ upper: number; middle: number; lower: number }> {
  const result: Array<{ upper: number; middle: number; lower: number }> = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      const v = closes[i]
      result.push({ upper: v * 1.02, middle: v, lower: v * 0.98 })
      continue
    }
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period
    const std = Math.sqrt(variance)
    result.push({
      upper: mean + 2 * std,
      middle: mean,
      lower: mean - 2 * std,
    })
  }
  return result
}
