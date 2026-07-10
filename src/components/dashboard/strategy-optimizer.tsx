'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Beaker, AlertTriangle, TrendingUp, CheckCircle2, XCircle } from 'lucide-react'
import { useAppStore, formatIDR } from '@/store/app-store'
import { fetchHistoricalCandles, runBacktest } from '@/lib/backtest'
import type { BacktestConfig, BacktestStrategy, Timeframe, OptimizationResult } from '@/lib/types'

export function StrategyOptimizer() {
  const { settings } = useAppStore()
  const [config, setConfig] = useState<Omit<BacktestConfig, 'emaFast' | 'emaSlow' | 'rsiPeriod' | 'rsiOversold' | 'rsiOverbought'>>({
    symbol: 'BTCUSDT',
    strategy: 'TREND_PULLBACK',
    timeframe: '1D',
    startDate: '2023-01-01',
    endDate: '2024-12-31',
    initialCapital: settings.capital,
    riskPerTrade: settings.riskPerTrade,
    slippagePct: 0.2,
    feePct: 0.1,
  })
  
  const [acknowledged, setAcknowledged] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<OptimizationResult[]>([])
  const [error, setError] = useState<string | null>(null)

  // Parameter ranges
  const paramRanges = {
    TREND_PULLBACK: {
      emaFast: [10, 15, 20, 25, 30],
      emaSlow: [40, 50, 60, 80, 100],
      rsiPeriod: [10, 14, 21],
      rsiOversold: [30, 35, 40],
      rsiOverbought: [60, 65, 70],
    },
    MEAN_REVERSION: {
      rsiPeriod: [10, 14, 21],
      rsiOversold: [20, 25, 30],
      rsiOverbought: [70, 75, 80],
      emaFast: [20],  // not used but needed for type
      emaSlow: [50],
    },
    BREAKOUT: {
      emaFast: [20],
      emaSlow: [50],
      rsiPeriod: [14],
      rsiOversold: [30],
      rsiOverbought: [70],
    },
  }

  async function optimize() {
    setLoading(true)
    setError(null)
    setResults([])
    
    try {
      // Fetch candles once
      const candles = await fetchHistoricalCandles(
        config.symbol, config.timeframe, config.startDate, config.endDate
      )
      
      if (candles.length < 100) {
        throw new Error(`Insufficient data: ${candles.length} candles`)
      }
      
      // Limit iterations to prevent overfit (max 15 combinations)
      const ranges = paramRanges[config.strategy]
      const combinations: { emaFast: number; emaSlow: number; rsiPeriod: number; rsiOversold: number; rsiOverbought: number }[] = []
      
      for (const ef of ranges.emaFast.slice(0, 2)) {
        for (const es of ranges.emaSlow.slice(0, 2)) {
          for (const rp of ranges.rsiPeriod.slice(0, 2)) {
            for (const ro of ranges.rsiOversold.slice(0, 1)) {
              for (const rob of ranges.rsiOverbought.slice(0, 1)) {
                if (ef < es) {
                  combinations.push({ emaFast: ef, emaSlow: es, rsiPeriod: rp, rsiOversold: ro, rsiOverbought: rob })
                }
              }
            }
          }
        }
      }
      
      const allResults: OptimizationResult[] = []
      
      for (const combo of combinations) {
        const btConfig: BacktestConfig = {
          ...config,
          ...combo,
        }
        
        const btResult = runBacktest(candles, btConfig)
        
        // Composite score: Sharpe + Profit Factor - Max DD penalty
        const score = 
          btResult.metrics.sharpeRatio * 2 + 
          Math.min(btResult.metrics.profitFactor, 3) - 
          (btResult.metrics.maxDrawdownPct / 10)
        
        // Overfit detection
        const isOverfit = 
          btResult.metrics.winRate > 70 ||
          btResult.metrics.profitFactor > 3 ||
          btResult.metrics.sharpeRatio > 3 ||
          btResult.metrics.totalTrades < 20
        
        const warnings: string[] = []
        if (btResult.metrics.winRate > 70) warnings.push('Win rate >70% — overfit suspected')
        if (btResult.metrics.profitFactor > 3) warnings.push('Profit factor >3 — unrealistic')
        if (btResult.metrics.sharpeRatio > 3) warnings.push('Sharpe >3 — curve-fitting')
        if (btResult.metrics.totalTrades < 20) warnings.push('<20 trades — not significant')
        if (btResult.metrics.maxDrawdownPct > 30) warnings.push('Max DD >30% — dangerous')
        
        allResults.push({
          parameters: [
            { name: 'emaFast', value: combo.emaFast },
            { name: 'emaSlow', value: combo.emaSlow },
            { name: 'rsiPeriod', value: combo.rsiPeriod },
            { name: 'rsiOversold', value: combo.rsiOversold },
            { name: 'rsiOverbought', value: combo.rsiOverbought },
          ],
          metrics: btResult.metrics,
          score: Math.max(0, score),
          isOverfit,
          warnings,
        })
      }
      
      // Sort by score descending
      allResults.sort((a, b) => b.score - a.score)
      setResults(allResults)
      
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Optimization failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Warning */}
      {!acknowledged && (
        <Alert className="border-red-800 bg-red-950/30">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-300">🚨 STRATEGY OPTIMIZER — HIGH OVERFIT RISK</AlertTitle>
          <AlertDescription className="text-xs text-red-200 space-y-2">
            <div>Strategy optimizer adalah senjata bermata dua:</div>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Mudah menemukan parameter yang "profit" di historical data</li>
              <li>Tapi parameter itu sangat jarang work di live trading</li>
              <li>Ini namanya <strong>overfitting</strong> — menyesuaikan noise, bukan edge</li>
              <li>Backtest bagus ≠ live trading bagus</li>
            </ul>
            <div className="mt-2">
              <strong>Aturan pakai:</strong>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Max 15 kombinasi per run (sudah dibatasi sistem)</li>
                <li>Paper trade 1 bulan dengan parameter pilihan sebelum live</li>
                <li>Jangan pakai parameter dengan &gt;70% win rate (suspicious)</li>
                <li>Walk-forward: test di data yang berbeda dari optimization</li>
              </ul>
            </div>
            <Button size="sm" variant="outline" className="mt-2 border-red-600 text-red-300" onClick={() => setAcknowledged(true)}>
              I understand the overfit risk — proceed
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Config */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            Optimization Config
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Symbol</Label>
              <Input value={config.symbol} onChange={(e) => setConfig({ ...config, symbol: e.target.value.toUpperCase() })} className="bg-zinc-950 border-zinc-700 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Strategy</Label>
              <Select value={config.strategy} onValueChange={(v) => setConfig({ ...config, strategy: v as BacktestStrategy })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TREND_PULLBACK">Trend Pullback</SelectItem>
                  <SelectItem value="MEAN_REVERSION">Mean Reversion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start</Label>
              <Input type="date" value={config.startDate} onChange={(e) => setConfig({ ...config, startDate: e.target.value })} className="bg-zinc-950 border-zinc-700 text-sm" />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input type="date" value={config.endDate} onChange={(e) => setConfig({ ...config, endDate: e.target.value })} className="bg-zinc-950 border-zinc-700 text-sm" />
            </div>
          </div>
          <Button onClick={optimize} disabled={loading || !acknowledged} className="w-full" size="sm">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Optimizing (max 15 combos)...</>
            ) : (
              <><Beaker className="h-4 w-4 mr-2" />Run Optimization</>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-950/30 border-red-800">
          <CardContent className="p-3 text-xs text-red-300">{error}</CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Optimization Results ({results.length} combinations)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className={`p-2 rounded border text-xs ${
                    r.isOverfit ? 'border-red-800 bg-red-950/20' : 
                    i === 0 ? 'border-emerald-700 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/30'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">#{i + 1}</span>
                        {i === 0 && !r.isOverfit && <Badge variant="default" className="text-[9px] bg-emerald-600">BEST</Badge>}
                        {r.isOverfit && <Badge variant="destructive" className="text-[9px]">OVERFIT</Badge>}
                      </div>
                      <span className="font-mono font-bold">Score: {r.score.toFixed(2)}</span>
                    </div>
                    
                    <div className="text-zinc-500 mb-1">
                      Params: {r.parameters.map(p => `${p.name}=${p.value}`).join(', ')}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-1 text-[10px]">
                      <div>WR: <span className="font-mono">{r.metrics.winRate.toFixed(0)}%</span></div>
                      <div>PF: <span className="font-mono">{r.metrics.profitFactor === Infinity ? '∞' : r.metrics.profitFactor.toFixed(2)}</span></div>
                      <div>DD: <span className="font-mono text-red-400">{r.metrics.maxDrawdownPct.toFixed(1)}%</span></div>
                      <div>Sharpe: <span className="font-mono">{r.metrics.sharpeRatio.toFixed(2)}</span></div>
                    </div>
                    
                    <div className="mt-1 font-mono text-[10px]">
                      Return: <span className={r.metrics.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {r.metrics.totalReturn >= 0 ? '+' : ''}{formatIDR(r.metrics.totalReturn)}
                      </span>
                      {' '}• Trades: {r.metrics.totalTrades}
                    </div>
                    
                    {r.warnings.length > 0 && (
                      <div className="mt-1 pt-1 border-t border-zinc-800">
                        {r.warnings.map((w, j) => (
                          <div key={j} className="text-[9px] text-yellow-400">⚠️ {w}</div>
                        ))}
                      </div>
                    )}
                    
                    {i === 0 && !r.isOverfit && (
                      <div className="mt-1 pt-1 border-t border-zinc-800 text-[10px] text-emerald-400">
                        <CheckCircle2 className="h-3 w-3 inline mr-1" />
                        Recommended — but still paper trade 1 bulan sebelum live!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          💡 <strong>Pro tip:</strong> Parameter optimal berubah seiring waktu. Yang bagus di 2023 belum tentu bagus di 2025.
          Re-optimize tiap 3 bulan, dan selalu validate dengan walk-forward test (test di data yang tidak dipakai saat optimization).
        </AlertDescription>
      </Alert>
    </div>
  )
}
