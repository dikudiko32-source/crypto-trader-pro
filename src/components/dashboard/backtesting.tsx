'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Loader2, Play, AlertTriangle, TrendingUp, TrendingDown, Activity, DollarSign, Percent, BarChart3 } from 'lucide-react'
import { useAppStore, formatIDR, formatNumber } from '@/store/app-store'
import { fetchHistoricalCandles, runBacktest } from '@/lib/backtest'
import type { BacktestConfig, BacktestResult, BacktestStrategy, Timeframe } from '@/lib/types'

const DEFAULT_CONFIG: BacktestConfig = {
  symbol: 'BTCUSDT',
  strategy: 'TREND_PULLBACK',
  timeframe: '1D',
  startDate: '2023-01-01',
  endDate: '2024-12-31',
  initialCapital: 15000000,
  riskPerTrade: 1.5,
  slippagePct: 0.2,
  feePct: 0.1,
  emaFast: 20,
  emaSlow: 50,
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
}

export function Backtesting() {
  const { settings } = useAppStore()
  const [config, setConfig] = useState<BacktestConfig>({ ...DEFAULT_CONFIG, initialCapital: settings.capital, riskPerTrade: settings.riskPerTrade })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      // Fetch historical candles
      const candles = await fetchHistoricalCandles(
        config.symbol,
        config.timeframe,
        config.startDate,
        config.endDate
      )
      
      if (candles.length < 100) {
        throw new Error(`Insufficient data: only ${candles.length} candles fetched. Try a longer date range.`)
      }
      
      // Run backtest
      const btResult = runBacktest(candles, config)
      setResult(btResult)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Backtest failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Warning Banner */}
      {!acknowledged && (
        <Alert className="border-red-800 bg-red-950/30">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-300">⚠️ Backtest Reality Check</AlertTitle>
          <AlertDescription className="text-xs text-red-200 space-y-2">
            <div>Backtest ≠ live results. Beberapa hal yang sering salah:</div>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Win rate &gt;70% di backtest = kemungkinan overfit, bukan realistis</li>
              <li>Slippage & fee selalu dihitung (default: 0.2% + 0.1% per side)</li>
              <li>Past performance ≠ future results</li>
              <li>Selalu paper trade 1 bulan sebelum live</li>
            </ul>
            <Button size="sm" variant="outline" className="mt-2 border-red-600 text-red-300" onClick={() => setAcknowledged(true)}>
              I understand — proceed
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Config Form */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Backtest Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Symbol</Label>
              <Input
                value={config.symbol}
                onChange={(e) => setConfig({ ...config, symbol: e.target.value.toUpperCase() })}
                placeholder="BTCUSDT"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Strategy</Label>
              <Select value={config.strategy} onValueChange={(v) => setConfig({ ...config, strategy: v as BacktestStrategy })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TREND_PULLBACK">Trend Pullback (EMA + RSI)</SelectItem>
                  <SelectItem value="MEAN_REVERSION">Mean Reversion (BB + RSI)</SelectItem>
                  <SelectItem value="BREAKOUT">Breakout (20-bar high + volume)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Timeframe</Label>
              <Select value={config.timeframe} onValueChange={(v) => setConfig({ ...config, timeframe: v as Timeframe })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1H">1 Hour</SelectItem>
                  <SelectItem value="4H">4 Hour</SelectItem>
                  <SelectItem value="1D">1 Day</SelectItem>
                  <SelectItem value="1W">1 Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Risk per Trade (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={config.riskPerTrade}
                onChange={(e) => setConfig({ ...config, riskPerTrade: parseFloat(e.target.value) || 0 })}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={config.startDate}
                onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={config.endDate}
                onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Slippage %</Label>
              <Input
                type="number"
                step="0.05"
                value={config.slippagePct}
                onChange={(e) => setConfig({ ...config, slippagePct: parseFloat(e.target.value) || 0 })}
                className="bg-zinc-950 border-zinc-700 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Fee % /side</Label>
              <Input
                type="number"
                step="0.01"
                value={config.feePct}
                onChange={(e) => setConfig({ ...config, feePct: parseFloat(e.target.value) || 0 })}
                className="bg-zinc-950 border-zinc-700 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Capital (IDR)</Label>
              <Input
                type="number"
                value={config.initialCapital}
                onChange={(e) => setConfig({ ...config, initialCapital: parseFloat(e.target.value) || 0 })}
                className="bg-zinc-950 border-zinc-700 text-xs"
              />
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            ⚠️ Realistic defaults: slippage 0.2%, fee 0.1% (Binance spot). Jangan turunkan di bawah ini!
          </div>

          <Button 
            onClick={runAnalysis} 
            disabled={loading || !acknowledged}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fetching data & running backtest...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-950/30 border-red-800">
          <CardContent className="p-3 text-sm text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
            <TabsTrigger value="trades" className="text-xs">Trades ({result.trades.length})</TabsTrigger>
            <TabsTrigger value="equity" className="text-xs">Equity Curve</TabsTrigger>
          </TabsList>

          {/* METRICS TAB */}
          <TabsContent value="metrics" className="space-y-3 mt-2">
            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Alert className="border-yellow-800 bg-yellow-950/30">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertTitle className="text-yellow-300 text-xs">Safety Warnings ({result.warnings.length})</AlertTitle>
                <AlertDescription className="text-xs text-yellow-200">
                  <ul className="list-disc list-inside space-y-0.5 mt-1">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard 
                label="Total Return" 
                value={`${result.metrics.totalReturn >= 0 ? '+' : ''}${formatIDR(result.metrics.totalReturn)}`}
                sub={`${result.metrics.totalReturnPct >= 0 ? '+' : ''}${result.metrics.totalReturnPct.toFixed(2)}%`}
                positive={result.metrics.totalReturn >= 0}
                icon={DollarSign}
              />
              <MetricCard 
                label="Win Rate" 
                value={`${result.metrics.winRate.toFixed(1)}%`}
                sub={`${result.metrics.winningTrades}W / ${result.metrics.losingTrades}L`}
                positive={result.metrics.winRate >= 50}
                icon={Percent}
              />
              <MetricCard 
                label="Profit Factor" 
                value={result.metrics.profitFactor === Infinity ? '∞' : result.metrics.profitFactor.toFixed(2)}
                sub={`Avg R:R 1:${result.metrics.avgRr.toFixed(2)}`}
                positive={result.metrics.profitFactor >= 1.5}
                icon={BarChart3}
              />
              <MetricCard 
                label="Max Drawdown" 
                value={`-${result.metrics.maxDrawdownPct.toFixed(2)}%`}
                sub={formatIDR(result.metrics.maxDrawdown)}
                positive={result.metrics.maxDrawdownPct < 20}
                icon={TrendingDown}
              />
              <MetricCard 
                label="Sharpe Ratio" 
                value={result.metrics.sharpeRatio.toFixed(2)}
                sub="annualized"
                positive={result.metrics.sharpeRatio >= 1}
                icon={Activity}
              />
              <MetricCard 
                label="Total Trades" 
                value={result.metrics.totalTrades.toString()}
                sub={`Streaks: ${result.metrics.longestWinStreak}W/${result.metrics.longestLossStreak}L`}
                positive={result.metrics.totalTrades >= 20}
                icon={BarChart3}
              />
            </div>

            {/* Detailed Stats */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Detailed Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <Row label="Initial Capital" value={formatIDR(result.config.initialCapital)} />
                <Row label="Final Capital" value={formatIDR(result.metrics.finalCapital)} />
                <Separator className="my-1" />
                <Row label="Avg Win" value={`+${formatIDR(result.metrics.avgWin)}`} positive />
                <Row label="Avg Loss" value={`-${formatIDR(result.metrics.avgLoss)}`} negative />
                <Row label="Longest Win Streak" value={`${result.metrics.longestWinStreak} trades`} />
                <Row label="Longest Loss Streak" value={`${result.metrics.longestLossStreak} trades`} />
                <Separator className="my-1" />
                <Row label="Total Fees Paid" value={formatIDR(result.metrics.fees)} negative />
                <Row label="Total Slippage Cost" value={formatIDR(result.metrics.slippageCost)} negative />
                <Row label="Net Profit" value={`${result.metrics.totalReturn >= 0 ? '+' : ''}${formatIDR(result.metrics.totalReturn)}`} positive={result.metrics.totalReturn >= 0} />
              </CardContent>
            </Card>

            {/* Strategy Description */}
            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-3 text-xs text-zinc-400">
                <div className="font-semibold text-zinc-300 mb-1">Strategy Logic ({result.config.strategy}):</div>
                {result.config.strategy === 'TREND_PULLBACK' && (
                  <div>
                    Entry LONG: EMA{result.config.emaFast} &gt; EMA{result.config.emaSlow}, RSI 40-60, price near EMA fast. 
                    SL: below EMA slow. TP: 2R.
                  </div>
                )}
                {result.config.strategy === 'MEAN_REVERSION' && (
                  <div>
                    Entry LONG: Price below lower Bollinger Band, RSI &lt; {result.config.rsiOversold}. 
                    SL: 3% below entry. TP: middle band.
                  </div>
                )}
                {result.config.strategy === 'BREAKOUT' && (
                  <div>
                    Entry LONG: Close above 20-bar high + volume &gt; 1.5x average. 
                    SL: 3% below breakout level. TP: 2.5R.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRADES TAB */}
          <TabsContent value="trades" className="mt-2">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-2">
                {result.trades.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-sm">No trades generated</div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-1">
                      {result.trades.map((trade, i) => (
                        <div key={i} className="p-2 rounded border border-zinc-800 bg-zinc-950/50 text-xs">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant={trade.side === 'LONG' ? 'default' : 'destructive'} className="text-[9px]">
                                  {trade.side}
                                </Badge>
                                <span className="text-zinc-500">
                                  {new Date(trade.entryDate).toLocaleDateString('id-ID')} → {new Date(trade.exitDate).toLocaleDateString('id-ID')}
                                </span>
                              </div>
                              <div className="text-zinc-400 mt-1 font-mono">
                                Entry: ${formatNumber(trade.entryPrice)} → Exit: ${formatNumber(trade.exitPrice)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {trade.pnl >= 0 ? '+' : ''}{formatIDR(trade.pnl)}
                              </div>
                              <div className={`text-[10px] ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {trade.pnl >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}% • 1:{trade.rr.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            {trade.reason.replace(/_/g, ' ')} • {trade.bars} bars
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EQUITY CURVE TAB */}
          <TabsContent value="equity" className="mt-2">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Equity Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <EquityCurveChart data={result.equityCurve} initialCapital={result.config.initialCapital} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function MetricCard({ label, value, sub, positive, icon: Icon }: { 
  label: string
  value: string
  sub: string
  positive: boolean
  icon: React.ElementType
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-400">{label}</span>
          <Icon className={`h-3.5 w-3.5 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />
        </div>
        <div className={`text-base font-bold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {value}
        </div>
        <div className="text-[10px] text-zinc-500">{sub}</div>
      </CardContent>
    </Card>
  )
}

function Row({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-mono ${positive ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-zinc-300'}`}>
        {value}
      </span>
    </div>
  )
}

function EquityCurveChart({ data, initialCapital }: { data: { date: string; value: number }[]; initialCapital: number }) {
  if (data.length === 0) return <div className="text-center py-8 text-zinc-500 text-sm">No equity data</div>
  
  // Sample to max 100 points for performance
  const sampled = data.length > 100 
    ? data.filter((_, i) => i % Math.ceil(data.length / 100) === 0)
    : data
  
  const values = sampled.map(d => d.value)
  const min = Math.min(...values, initialCapital)
  const max = Math.max(...values, initialCapital)
  const range = max - min || 1
  
  const width = 320
  const height = 200
  
  const points = sampled.map((d, i) => ({
    x: (i / (sampled.length - 1)) * width,
    y: height - ((d.value - min) / range) * height,
    value: d.value,
    date: d.date,
  }))
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  
  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Initial capital line */}
        <line
          x1="0"
          y1={height - ((initialCapital - min) / range) * height}
          x2={width}
          y2={height - ((initialCapital - min) / range) * height}
          stroke="#52525b"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
        <text x="4" y={height - ((initialCapital - min) / range) * height - 4} fill="#71717a" fontSize="9">
          Initial: {formatIDR(initialCapital)}
        </text>
        
        {/* Equity curve */}
        <path d={pathD} fill="none" stroke={values[values.length - 1] >= initialCapital ? '#22c55e' : '#ef4444'} strokeWidth="1.5" />
        
        {/* Area under curve */}
        <path 
          d={`${pathD} L ${width} ${height} L 0 ${height} Z`} 
          fill={values[values.length - 1] >= initialCapital ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'} 
        />
      </svg>
      <div className="text-xs text-zinc-500 mt-2 text-center">
        {sampled.length} data points • {new Date(sampled[0].date).toLocaleDateString('id-ID')} → {new Date(sampled[sampled.length - 1].date).toLocaleDateString('id-ID')}
      </div>
    </div>
  )
}
