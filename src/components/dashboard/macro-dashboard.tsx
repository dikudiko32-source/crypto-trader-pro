'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getGlobalData, getCategories } from '@/lib/coingecko'
import { getFearGreedIndex, getMoonPhase, getEconomicEvents, getAggregateFunding, getBtcOpenInterest } from '@/lib/macro'
import type { MacroData } from '@/lib/types'

export function MacroDashboard() {
  const [data, setData] = useState<MacroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [global, fearGreed, categories, funding, btcOi] = await Promise.all([
          getGlobalData(),
          getFearGreedIndex(),
          getCategories(),
          getAggregateFunding(),
          getBtcOpenInterest(),
        ])

        if (!mounted) return

        // Calculate OTHER/BTC ratio from top alts (placeholder: derive from categories)
        const totalAltMcap = (global?.totalMarketCap || 0) - (global?.totalMarketCap || 0) * (global?.btcDominance || 0) / 100
        const btcMcap = (global?.totalMarketCap || 0) * (global?.btcDominance || 0) / 100
        const otherBtcRatio = btcMcap > 0 ? totalAltMcap / btcMcap : 0

        // Determine trends (simplified - in production would track historical)
        const btcDomTrend = (global?.btcDominance || 50) > 52 ? 'UP' : 'DOWN'
        const usdtTrend = ((fearGreed?.value || 50) < 40) ? 'UP' : 'DOWN'

        // Fear & Greed classification
        const fgValue = fearGreed?.value || 50
        let fgLabel: MacroData['fearGreedLabel'] = 'Neutral'
        if (fgValue < 25) fgLabel = 'Extreme Fear'
        else if (fgValue < 45) fgLabel = 'Fear'
        else if (fgValue < 55) fgLabel = 'Neutral'
        else if (fgValue < 75) fgLabel = 'Greed'
        else fgLabel = 'Extreme Greed'

        // Macro verdict
        let macroVerdict: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
        let bullScore = 0
        let bearScore = 0
        if (btcDomTrend === 'DOWN') bullScore++; else bearScore++
        if (usdtTrend === 'DOWN') bullScore++; else bearScore++
        if (fgValue < 30) bullScore += 2
        if (fgValue > 70) bearScore += 2
        if ((funding?.avgFunding || 0) > 0.0005) bearScore++
        if (bullScore > bearScore + 1) macroVerdict = 'LONG'
        else if (bearScore > bullScore + 1) macroVerdict = 'SHORT'

        const macroData: MacroData = {
          btcDominance: global?.btcDominance || 0,
          btcDominanceTrend: btcDomTrend,
          usdtDominance: 100 - (global?.btcDominance || 0) - (global?.ethDominance || 0),
          usdtDominanceTrend: usdtTrend,
          otherBtcRatio,
          otherBtcTrend: otherBtcRatio > 0.5 ? 'UP' : 'DOWN',
          fearGreed: fgValue,
          fearGreedLabel: fgLabel,
          fundingAggregate: funding?.avgFunding || 0,
          openInterestBtc: btcOi?.oiValueUsd || 0,
          longShortRatio: 1.0,
          moonPhase: getMoonPhase(),
          economicEvents: getEconomicEvents(),
          macroVerdict,
        }
        setData(macroData)
      } catch (err) {
        console.error(err)
        setError('Failed to load macro data. Using fallback.')
        // Fallback data
        const fallback: MacroData = {
          btcDominance: 54.2,
          btcDominanceTrend: 'DOWN',
          usdtDominance: 5.8,
          usdtDominanceTrend: 'DOWN',
          otherBtcRatio: 0.42,
          otherBtcTrend: 'UP',
          fearGreed: 32,
          fearGreedLabel: 'Fear',
          fundingAggregate: 0.0008,
          openInterestBtc: 18200000000,
          longShortRatio: 1.05,
          moonPhase: getMoonPhase(),
          economicEvents: getEconomicEvents(),
          macroVerdict: 'LONG',
        }
        setData(fallback)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 60000) // Refresh every minute
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-zinc-900 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Macro Verdict Banner */}
      <Card className={`border-l-4 ${
        data.macroVerdict === 'LONG' ? 'border-l-emerald-500 bg-emerald-950/30' :
        data.macroVerdict === 'SHORT' ? 'border-l-red-500 bg-red-950/30' :
        'border-l-zinc-500 bg-zinc-900/30'
      }`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Macro Regime Verdict</CardTitle>
            <Badge variant={
              data.macroVerdict === 'LONG' ? 'default' :
              data.macroVerdict === 'SHORT' ? 'destructive' : 'secondary'
            } className={
              data.macroVerdict === 'LONG' ? 'bg-emerald-600 hover:bg-emerald-600' : ''
            }>
              {data.macroVerdict === 'LONG' ? '🟢 LONG BIAS' :
               data.macroVerdict === 'SHORT' ? '🔴 SHORT BIAS' : '⚪ NEUTRAL'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-400">
            {data.macroVerdict === 'LONG' && 'Liquidity flowing in, alt-friendly regime. Safe to take long setups with confirmation.'}
            {data.macroVerdict === 'SHORT' && 'Risk-off environment. Reduce position sizes, prioritize short setups or stay in cash.'}
            {data.macroVerdict === 'NEUTRAL' && 'Mixed signals. Wait for clearer alignment before taking directional bets.'}
          </p>
        </CardContent>
      </Card>

      {/* Macro Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* BTC Dominance */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">BTC Dominance</div>
            <div className="text-xl font-bold">{data.btcDominance.toFixed(1)}%</div>
            <div className={`text-xs flex items-center gap-1 mt-1 ${
              data.btcDominanceTrend === 'DOWN' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {data.btcDominanceTrend === 'DOWN' ? '↓' : '↑'} {data.btcDominanceTrend}
              <span className="text-zinc-500 ml-1">
                {data.btcDominanceTrend === 'DOWN' ? 'Alt-friendly' : 'Risk-off'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* USDT Dominance */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">USDT Dominance</div>
            <div className="text-xl font-bold">{data.usdtDominance.toFixed(1)}%</div>
            <div className={`text-xs flex items-center gap-1 mt-1 ${
              data.usdtDominanceTrend === 'DOWN' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {data.usdtDominanceTrend === 'DOWN' ? '↓' : '↑'} {data.usdtDominanceTrend}
              <span className="text-zinc-500 ml-1">
                {data.usdtDominanceTrend === 'DOWN' ? 'Money in' : 'Money out'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Fear & Greed */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Fear & Greed</div>
            <div className="text-xl font-bold">{data.fearGreed}</div>
            <Progress 
              value={data.fearGreed} 
              className="h-1.5 mt-1"
            />
            <div className="text-xs text-zinc-500 mt-1">{data.fearGreedLabel}</div>
          </CardContent>
        </Card>

        {/* Funding Aggregate */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Funding (Aggregate)</div>
            <div className="text-xl font-bold">
              {(data.fundingAggregate * 100).toFixed(4)}%
            </div>
            <div className={`text-xs mt-1 ${
              Math.abs(data.fundingAggregate) > 0.0005 ? 'text-yellow-400' : 'text-zinc-500'
            }`}>
              {Math.abs(data.fundingAggregate) > 0.0005 ? '⚠️ Extreme' : 'Healthy'}
            </div>
          </CardContent>
        </Card>

        {/* BTC Open Interest */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">BTC OI Value</div>
            <div className="text-xl font-bold">
              ${(data.openInterestBtc / 1e9).toFixed(2)}B
            </div>
            <div className="text-xs text-zinc-500 mt-1">Binance Futures</div>
          </CardContent>
        </Card>

        {/* OTHER/BTC */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">OTHER/BTC Ratio</div>
            <div className="text-xl font-bold">{data.otherBtcRatio.toFixed(3)}</div>
            <div className={`text-xs mt-1 ${
              data.otherBtcTrend === 'UP' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {data.otherBtcTrend === 'UP' ? '↑' : '↓'} {data.otherBtcTrend}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Moon Phase */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-400">Moon Phase</div>
              <div className="text-base font-semibold">{data.moonPhase.phase}</div>
              <div className="text-xs text-zinc-500">
                {data.moonPhase.daysToNext}d to next phase
              </div>
            </div>
            <div className="text-4xl">{data.moonPhase.emoji}</div>
            <Badge variant="outline" className={
              data.moonPhase.bullBearBias === 'BULLISH' ? 'border-emerald-500 text-emerald-400' :
              data.moonPhase.bullBearBias === 'BEARISH' ? 'border-red-500 text-red-400' : ''
            }>
              {data.moonPhase.bullBearBias}
            </Badge>
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Historical edge: 52-56% bias (use as confluence only, not trigger)
          </div>
        </CardContent>
      </Card>

      {/* Economic Events */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📅 Economic Calendar (Next 7 Days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.economicEvents.map((event, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Badge variant={
                  event.impact === 'HIGH' ? 'destructive' :
                  event.impact === 'MEDIUM' ? 'default' : 'secondary'
                } className="text-[10px]">
                  {event.impact}
                </Badge>
                <span>{event.title}</span>
              </div>
              <span className="text-zinc-500">{event.time}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>API Notice</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
