'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle, Calendar, Target, Shield, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { getGlobalData, getCategories } from '@/lib/coingecko'
import { getFearGreedIndex, getEconomicEvents, getMoonPhase } from '@/lib/macro'
import { getKlines } from '@/lib/binance'
import { analyzeTimeframe } from '@/lib/indicators'
import type { DailyChecklist } from '@/lib/types'

export function DailyChecklist() {
  const { settings, pushAlert } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null)
  const [notes, setNotes] = useState('')

  async function generateChecklist() {
    setLoading(true)
    try {
      const [global, fearGreed, categories, btcKlines] = await Promise.all([
        getGlobalData(),
        getFearGreedIndex(),
        getCategories(),
        getKlines('BTCUSDT', '1D', 200),
      ])
      
      const fg = fearGreed?.value || 50
      const events = getEconomicEvents()
      const moon = getMoonPhase()
      
      // BTC trend analysis
      const btcAnalysis = analyzeTimeframe(btcKlines, '1D')
      const btcTrend = btcAnalysis.trend
      
      // Macro bias
      let macroBias: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
      if (fg < 30 && btcTrend === 'BULLISH') macroBias = 'LONG'
      else if (fg > 70 && btcTrend === 'BEARISH') macroBias = 'SHORT'
      else if (btcTrend === 'BULLISH') macroBias = 'LONG'
      else if (btcTrend === 'BEARISH') macroBias = 'SHORT'
      
      // Active narratives
      const activeNarratives = categories
        .filter(c => c.marketCapChange24h > 5)
        .slice(0, 3)
        .map(c => c.name)
      
      // High impact events
      const highImpact = events
        .filter(e => e.impact === 'HIGH')
        .map(e => `${e.title} (${e.time})`)
      
      // Risk budget (reduced if high impact event today)
      const todayEvents = events.filter(e => e.impact === 'HIGH').length
      const riskBudget = todayEvents > 0 ? settings.riskPerTrade * 0.5 : settings.riskPerTrade
      
      // Status
      let status: DailyChecklist['status'] = 'READY'
      const reasons: string[] = []
      if (fg > 75) { status = 'NO_TRADE'; reasons.push('Extreme Greed') }
      if (fg < 10) { status = 'NO_TRADE'; reasons.push('Extreme Fear') }
      if (todayEvents > 0) { status = 'WAIT'; reasons.push(`${todayEvents} high-impact event(s) today`) }
      
      const tradePlan = status === 'NO_TRADE' 
        ? `⚠️ NO TRADE TODAY. Reasons: ${reasons.join(', ')}. Review dan prepare untuk besok.`
        : status === 'WAIT'
        ? `Wait until after high-impact events (${highImpact.join(', ')}). Set alerts, jangan entry sebelum event clear.`
        : macroBias === 'LONG'
        ? `Bias: LONG. Fokus: ${activeNarratives.join(', ') || 'BTC/ETH'}. Risk per trade: ${riskBudget}%.`
        : macroBias === 'SHORT'
        ? `Bias: SHORT. Cuma cari short setup. Risk per trade: ${riskBudget}%.`
        : `Bias: NEUTRAL. Trade kecil-kecil saja, atau wait untuk clearer signal.`
      
      setChecklist({
        date: new Date().toISOString(),
        macroBias,
        activeNarratives,
        highImpactEvents: highImpact,
        btcTrend,
        fearGreed: fg,
        tradePlan,
        riskBudget,
        status,
        notes,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    generateChecklist()
  }, [])

  function saveNotes() {
    if (checklist) {
      setChecklist({ ...checklist, notes })
      pushAlert({
        type: 'INFO',
        title: 'Daily Checklist Saved',
        message: `Trade plan for ${new Date().toLocaleDateString('id-ID')} saved`,
      })
    }
  }

  if (loading && !checklist) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (!checklist) return null

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-3">
      {/* Date Header */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium">{today}</span>
            </div>
            <Badge variant={checklist.status === 'READY' ? 'default' : checklist.status === 'WAIT' ? 'secondary' : 'destructive'}
              className={checklist.status === 'READY' ? 'bg-emerald-600' : ''}>
              {checklist.status === 'READY' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {checklist.status === 'WAIT' && '⏳'}
              {checklist.status === 'NO_TRADE' && <XCircle className="h-3 w-3 mr-1" />}
              {checklist.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Trade Plan */}
      <Card className={`bg-zinc-900/50 border-zinc-800 border-l-4 ${
        checklist.status === 'READY' ? 'border-l-emerald-500' :
        checklist.status === 'WAIT' ? 'border-l-yellow-500' : 'border-l-red-500'
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Trade Plan Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{checklist.tradePlan}</p>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Macro Bias</div>
            <div className="text-base font-bold">{checklist.macroBias}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">BTC Trend (1D)</div>
            <div className={`text-base font-bold ${
              checklist.btcTrend === 'BULLISH' ? 'text-emerald-400' :
              checklist.btcTrend === 'BEARISH' ? 'text-red-400' : ''
            }`}>{checklist.btcTrend}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Fear & Greed</div>
            <div className="text-base font-bold">{checklist.fearGreed}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Risk Budget</div>
            <div className="text-base font-bold">{checklist.riskBudget}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Narratives */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Active Narratives</CardTitle>
        </CardHeader>
        <CardContent>
          {checklist.activeNarratives.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {checklist.activeNarratives.map(n => (
                <Badge key={n} variant="outline" className="text-[10px]">{n}</Badge>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-500">No active narratives today</div>
          )}
        </CardContent>
      </Card>

      {/* High Impact Events */}
      {checklist.highImpactEvents.length > 0 && (
        <Card className="bg-yellow-950/30 border-yellow-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              High Impact Events Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {checklist.highImpactEvents.map((e, i) => (
              <div key={i} className="text-xs text-yellow-300">⚠️ {e}</div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Notes Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tulis plan, observation, atau hal yang perlu diingat untuk hari ini..."
            className="bg-zinc-950 border-zinc-700 text-sm"
            rows={3}
          />
          <Button size="sm" className="w-full mt-2" onClick={saveNotes}>Save Notes</Button>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" className="w-full" onClick={generateChecklist}>
        <Loader2 className="h-3 w-3 mr-1" />
        Refresh Checklist
      </Button>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription className="text-xs">
          ⚠️ Daily checklist bukan jaminan profit. Ini hanya filter awal — tetap jalankan Layer 1-6 analysis sebelum setiap trade.
        </AlertDescription>
      </Alert>
    </div>
  )
}
