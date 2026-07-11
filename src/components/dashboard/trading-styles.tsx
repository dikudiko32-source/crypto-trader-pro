'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, TrendingUp, Activity, Zap, Target, ArrowUpDown } from 'lucide-react'
import { getKlines } from '@/lib/binance'
import { 
  trendFollowingStyle, 
  meanReversionStyle, 
  volumeBreakoutStyle, 
  smartMoneyStyle,
  type TradingStyleSignal 
} from '@/lib/indicators'
import { useAppStore, formatIDR } from '@/store/app-store'

const STYLE_INFO = [
  {
    id: 'TREND_FOLLOWING' as const,
    name: 'Trend Following',
    icon: TrendingUp,
    description: 'Donchian Channel + ATR + ADX',
    bestFor: 'Trending market (bull or bear)',
    expected: '40-50% WR, R:R 1:3+',
    source: 'Turtle Traders (1980s, proven 40+ years)',
    color: 'emerald',
  },
  {
    id: 'MEAN_REVERSION' as const,
    name: 'Mean Reversion',
    icon: Activity,
    description: 'Bollinger Bands + RSI + ADX < 20',
    bestFor: 'Sideways / ranging market',
    expected: '60-70% WR, R:R 1:1.5',
    source: 'Linda Raschke style',
    color: 'yellow',
  },
  {
    id: 'VOLUME_BREAKOUT' as const,
    name: 'Volume Breakout',
    icon: Zap,
    description: '20-day S/R + Volume + VWAP',
    bestFor: 'Momentum / breakout from consolidation',
    expected: '35-45% WR, R:R 1:4+',
    source: 'William O\'Neil CANSLIM adapted',
    color: 'blue',
  },
  {
    id: 'SMART_MONEY' as const,
    name: 'Smart Money',
    icon: Target,
    description: 'Order Block + FVG + BOS',
    bestFor: 'All conditions (subjective)',
    expected: '50-55% WR, R:R 1:2.5',
    source: 'ICT/SMC modern',
    color: 'purple',
  },
]

export function TradingStyles() {
  const { settings, pushAlert, addSetup } = useAppStore()
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [loading, setLoading] = useState(false)
  const [signals, setSignals] = useState<Record<string, TradingStyleSignal | null>>({})
  const [activeStyle, setActiveStyle] = useState('TREND_FOLLOWING')

  const isMountedRef = useRef(true)
  
  async function analyze() {
    setLoading(true)
    try {
      const [daily, h4] = await Promise.all([
        getKlines(symbol, '1D', 200),
        getKlines(symbol, '4H', 100),
      ])
      
      if (!isMountedRef.current) return
      
      if (daily.length === 0 || h4.length === 0) {
        console.warn('No candle data returned')
        return
      }
      
      setSignals({
        TREND_FOLLOWING: trendFollowingStyle(daily, h4),
        MEAN_REVERSION: meanReversionStyle(daily, h4),
        VOLUME_BREAKOUT: volumeBreakoutStyle(daily, h4),
        SMART_MONEY: smartMoneyStyle(daily, h4),
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    analyze()
    return () => { isMountedRef.current = false }
  }, [])

  function saveAsSetup(signal: TradingStyleSignal) {
    if (signal.bias === 'NEUTRAL') {
      alert('Cannot save NEUTRAL signal — no actionable setup')
      return
    }
    
    const setup = {
      id: Math.random().toString(36).slice(2),
      symbol,
      bias: signal.bias,
      setupType: signal.style as 'TREND_PULLBACK' | 'MEAN_REVERSION' | 'BREAKOUT' | 'SMC',
      confidence: signal.confidence,
      createdAt: new Date().toISOString(),
      status: 'WAIT_TRIGGER' as const,
      timeframeAnalysis: {} as never,
      fibonacci: { swingLow: 0, swingHigh: 0, levels: { '0.236': 0, '0.382': 0, '0.500': 0, '0.618': 0, '0.786': 0 }, extensions: { '1.272': 0, '1.414': 0, '1.618': 0 } },
      entry: {
        zone: signal.entry.zone,
        trigger: signal.entry.trigger,
        triggerPrice: signal.entry.price,
      },
      stopLoss: { price: signal.stopLoss, reason: `${signal.styleName} rules` },
      takeProfits: {
        tp1: { price: signal.takeProfits.tp1, percent: 50, rr: 0 },
        tp2: { price: signal.takeProfits.tp2, percent: 30, rr: 0 },
        tp3: { price: signal.takeProfits.tp3, percent: 20, rr: 0 },
      },
      rrAverage: signal.rr,
      positionSize: {
        capital: settings.capital,
        riskPercent: settings.riskPerTrade,
        riskAmount: settings.capital * settings.riskPerTrade / 100,
        quantity: 0,
        nominalValue: 0,
      },
      invalidityConditions: signal.warnings.map(w => w),
      checklist: [],
      alerts: [],
      coinFundamental: {} as never,
      narrative: null,
    }
    
    addSetup(setup)
    pushAlert({
      type: 'INFO',
      title: `${signal.styleName} Saved`,
      message: `${symbol} ${signal.bias} setup saved with ${signal.confidence.toFixed(0)}% confidence`,
    })
  }

  const fmt = (n: number) => n < 1 ? n.toFixed(5) : n < 100 ? n.toFixed(3) : n.toFixed(2)
  
  const currentSignal = signals[activeStyle]

  return (
    <div className="space-y-3">
      {/* Input */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTCUSDT"
              className="bg-zinc-950 border-zinc-700 text-sm"
            />
            <Button size="sm" onClick={analyze} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze All'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Style Selection */}
      <Tabs value={activeStyle} onValueChange={setActiveStyle}>
        <TabsList className="grid w-full grid-cols-4 h-9">
          {STYLE_INFO.map(s => {
            const Icon = s.icon
            return (
              <TabsTrigger key={s.id} value={s.id} className="text-[10px] flex flex-col gap-0.5 py-1">
                <Icon className="h-3 w-3" />
                {s.name}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Style Content */}
        {STYLE_INFO.map(styleInfo => {
          const signal = signals[styleInfo.id]
          return (
            <TabsContent key={styleInfo.id} value={styleInfo.id} className="space-y-3 mt-2">
              {/* Style Info */}
              <Card className={`bg-zinc-900/50 border-zinc-800 border-l-4 border-l-${styleInfo.color}-500`}>
                <CardContent className="p-3">
                  <div className="text-sm font-bold mb-1">{styleInfo.name}</div>
                  <div className="text-xs text-zinc-400">{styleInfo.description}</div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-zinc-500">Best for:</span> {styleInfo.bestFor}
                    </div>
                    <div>
                      <span className="text-zinc-500">Expected:</span> {styleInfo.expected}
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">Source: {styleInfo.source}</div>
                </CardContent>
              </Card>

              {/* Signal */}
              {signal && (
                <>
                  {/* Bias & Confidence */}
                  <Card className={`bg-zinc-900/50 border-zinc-800 border-l-4 ${
                    signal.bias === 'LONG' ? 'border-l-emerald-500' :
                    signal.bias === 'SHORT' ? 'border-l-red-500' : 'border-l-zinc-500'
                  }`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-xs text-zinc-400">Signal</div>
                          <div className={`text-xl font-bold ${
                            signal.bias === 'LONG' ? 'text-emerald-400' :
                            signal.bias === 'SHORT' ? 'text-red-400' : 'text-zinc-400'
                          }`}>
                            {signal.bias}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-zinc-400">Confidence</div>
                          <div className="text-xl font-bold">{signal.confidence.toFixed(0)}/100</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-zinc-400">R:R</div>
                          <div className="text-xl font-bold text-emerald-400">1:{signal.rr.toFixed(2)}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px]">
                        Market: {signal.marketRegime}
                      </Badge>
                    </CardContent>
                  </Card>

                  {/* Trade Plan */}
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Trade Plan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Entry</span>
                        <span className="font-mono text-blue-400">{fmt(signal.entry.price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Stop Loss</span>
                        <span className="font-mono text-red-400">{fmt(signal.stopLoss)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">TP1 (50%)</span>
                        <span className="font-mono text-emerald-400">{fmt(signal.takeProfits.tp1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">TP2 (30%)</span>
                        <span className="font-mono text-emerald-400">{fmt(signal.takeProfits.tp2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">TP3 (20%)</span>
                        <span className="font-mono text-emerald-400">{fmt(signal.takeProfits.tp3)}</span>
                      </div>
                      <div className="text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
                        Trigger: {signal.entry.trigger}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Reasons */}
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Signal Reasons</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {signal.reasons.map((r, i) => (
                        <div key={i} className="text-xs">{r}</div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Warnings */}
                  {signal.warnings.length > 0 && (
                    <Card className="bg-yellow-950/30 border-yellow-800">
                      <CardContent className="p-3 space-y-1">
                        {signal.warnings.map((w, i) => (
                          <div key={i} className="text-xs text-yellow-300">{w}</div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Indicators Detail */}
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Indicators Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {signal.indicators.map((ind, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <div>
                            <span className="text-zinc-500">{ind.name}:</span>{' '}
                            <span className="font-mono">{ind.value}</span>
                          </div>
                          {ind.signal && (
                            <Badge variant="outline" className="text-[9px]">{ind.signal}</Badge>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <Button 
                    className="w-full" 
                    onClick={() => saveAsSetup(signal)}
                    disabled={signal.bias === 'NEUTRAL'}
                  >
                    {signal.bias === 'NEUTRAL' ? 'No actionable signal' : `Save as Setup (${signal.bias})`}
                  </Button>
                </>
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Comparison */}
      {Object.values(signals).filter(Boolean).length === 4 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">All Styles Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {STYLE_INFO.map(s => {
                const sig = signals[s.id]!
                return (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded border border-zinc-800 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[9px] ${
                        sig.bias === 'LONG' ? 'border-emerald-500 text-emerald-400' :
                        sig.bias === 'SHORT' ? 'border-red-500 text-red-400' : ''
                      }`}>{sig.bias}</Badge>
                      <span>{s.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono">{sig.confidence.toFixed(0)}/100</span>
                      <span className="text-zinc-500 ml-2">1:{sig.rr.toFixed(1)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertDescription className="text-xs">
          💡 <strong>Cara pakai:</strong> Jalankan semua 4 styles. Kalau 2+ styles memberi sinyal sama (misal: 2 LONG), 
          itu <strong>high confluence</strong>. Kalau 4 styles berbeda-beda, market sideways — wait.
        </AlertDescription>
      </Alert>
    </div>
  )
}
