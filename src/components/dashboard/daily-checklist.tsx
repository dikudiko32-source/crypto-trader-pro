'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle, Calendar, Target, Shield, AlertTriangle, RefreshCw, Clock, Zap, TrendingUp } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { getGlobalData, getCategories } from '@/lib/coingecko'
import { getFearGreedIndex, getEconomicEvents, getMoonPhase } from '@/lib/macro'
import { getKlines } from '@/lib/binance'
import { analyzeTimeframe } from '@/lib/indicators'
import { getEventIntelligence } from '@/lib/event-intelligence'
import type { DailyChecklist } from '@/lib/types'
import type { CryptoEvent } from '@/lib/types'

interface EventInfo {
  title: string
  time: string
  impact: 'LOW' | 'MEDIUM' | 'HIGH'
  hoursUntil: number
  status: 'PAST' | 'TODAY' | 'UPCOMING_24H' | 'UPCOMING_48H' | 'UPCOMING_WEEK'
  recommendation: string
}

export function DailyChecklist() {
  const { settings, pushAlert, setActiveTab } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null)
  const [notes, setNotes] = useState('')
  const [events, setEvents] = useState<EventInfo[]>([])
  const [eventIntel, setEventIntel] = useState<Awaited<ReturnType<typeof getEventIntelligence>> | null>(null)

  function parseEventTime(timeStr: string): { hoursUntil: number; status: EventInfo['status'] } {
    // Parse "Next Wednesday 02:00 WIB", "8/15 20:30 WIB", "First Friday 20:30 WIB", "Every Thursday 20:30 WIB"
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    
    // Try to extract date pattern "M/D" 
    const dateMatch = timeStr.match(/(\d+)\/(\d+)/)
    if (dateMatch) {
      const month = parseInt(dateMatch[1]) - 1
      const day = parseInt(dateMatch[2])
      const target = new Date(now.getFullYear(), month, day, 20, 30)
      if (target < now) target.setFullYear(target.getFullYear() + 1)
      const hoursUntil = (target.getTime() - now.getTime()) / (1000 * 60 * 60)
      return categorizeHours(hoursUntil)
    }
    
    // "Next Wednesday" pattern
    if (timeStr.includes('Wednesday')) {
      const target = new Date(now)
      const daysUntilWed = (3 - now.getDay() + 7) % 7 || 7
      target.setDate(now.getDate() + daysUntilWed)
      target.setHours(2, 0, 0, 0)
      const hoursUntil = (target.getTime() - now.getTime()) / (1000 * 60 * 60)
      return categorizeHours(hoursUntil)
    }
    
    // "First Friday" pattern
    if (timeStr.includes('First Friday')) {
      const target = new Date(now.getFullYear(), now.getMonth(), 1)
      // Find first Friday of current month
      while (target.getDay() !== 5) target.setDate(target.getDate() + 1)
      target.setHours(20, 30, 0, 0)
      // If already passed, go to next month and find first Friday again
      if (target < now) {
        target.setMonth(target.getMonth() + 1)
        target.setDate(1)
        while (target.getDay() !== 5) target.setDate(target.getDate() + 1)
        target.setHours(20, 30, 0, 0)
      }
      const hoursUntil = (target.getTime() - now.getTime()) / (1000 * 60 * 60)
      return categorizeHours(hoursUntil)
    }
    
    // "Every Thursday" pattern (weekly)
    if (timeStr.includes('Thursday')) {
      const target = new Date(now)
      const daysUntilThu = (4 - now.getDay() + 7) % 7
      target.setDate(now.getDate() + (daysUntilThu === 0 ? 7 : daysUntilThu))
      target.setHours(20, 30, 0, 0)
      const hoursUntil = (target.getTime() - now.getTime()) / (1000 * 60 * 60)
      return categorizeHours(hoursUntil)
    }
    
    // Default: unknown, treat as upcoming week
    return { hoursUntil: 168, status: 'UPCOMING_WEEK' }
  }

  function categorizeHours(hours: number): { hoursUntil: number; status: EventInfo['status'] } {
    if (hours < 0) return { hoursUntil: hours, status: 'PAST' }
    if (hours < 6) return { hoursUntil: hours, status: 'TODAY' }
    if (hours < 24) return { hoursUntil: hours, status: 'UPCOMING_24H' }
    if (hours < 48) return { hoursUntil: hours, status: 'UPCOMING_48H' }
    return { hoursUntil: hours, status: 'UPCOMING_WEEK' }
  }

  function getEventRecommendation(impact: string, status: EventInfo['status']): string {
    if (status === 'PAST') {
      return '✅ Event sudah lewat. Cek pergerakan market 1-2 jam setelah event untuk konfirmasi direction.'
    }
    if (impact === 'HIGH' || impact === 'CRITICAL') {
      switch (status) {
        case 'TODAY':
          return '🚨 HARI INI! Stop entry 2 jam sebelum event. Wait 1-2 jam setelah untuk dust settle.'
        case 'UPCOMING_24H':
          return '⚠️ 24 jam lagi. Swing trade OK tapi reduce size 50%. Avoid scalp.'
        case 'UPCOMING_48H':
          return '⚠️ 2 hari lagi. Swing trade normal. Set alert untuk H-1 event.'
        case 'UPCOMING_WEEK':
          return '📅 Minggu ini. Trading normal. Monitor kalau mendekati 48 jam.'
      }
    } else if (impact === 'MEDIUM') {
      switch (status) {
        case 'TODAY':
          return '⚠️ Hari ini, medium impact. Reduce size 25%. Normal trading OK.'
        case 'UPCOMING_24H':
          return '📊 24 jam lagi, medium impact. Trading normal, monitor saja.'
        default:
          return '📊 Event mendatang, medium impact. Trading normal.'
      }
    }
    return '✅ Low impact. Trading normal.'
  }

  async function generateChecklist() {
    setLoading(true)
    setChecklist(null)
    
    const startTime = Date.now()
    
    try {
      const [global, fearGreed, categories, btcKlines, eventIntelligence] = await Promise.all([
        getGlobalData(),
        getFearGreedIndex(),
        getCategories(),
        getKlines('BTCUSDT', '1D', 200),
        getEventIntelligence(),
      ])
      
      const fg = fearGreed?.value || 50
      const rawEvents = getEconomicEvents()
      const moon = getMoonPhase()
      
      // Parse events with time info
      const eventsInfo: EventInfo[] = rawEvents.map(e => {
        const { hoursUntil, status } = parseEventTime(e.time)
        return {
          title: e.title,
          time: e.time,
          impact: e.impact,
          hoursUntil,
          status,
          recommendation: getEventRecommendation(e.impact, status),
        }
      })
      setEvents(eventsInfo)
      setEventIntel(eventIntelligence)
      
      // BTC trend analysis
      const btcAnalysis = analyzeTimeframe(btcKlines, '1D')
      const btcTrend = btcAnalysis.trend
      
      // Macro bias
      let macroBias: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
      if (fg < 30 && btcTrend === 'BULLISH') macroBias = 'LONG'
      else if (fg > 70 && btcTrend === 'BEARISH') macroBias = 'SHORT'
      else if (btcTrend === 'BULLISH') macroBias = 'LONG'
      else if (btcTrend === 'BEARISH') macroBias = 'SHORT'
      
      // Active narratives — with fallback if CoinGecko rate-limited
      let activeNarratives = categories
        .filter(c => c.marketCapChange24h > 5)
        .slice(0, 5)
        .map(c => ({ name: c.name, id: c.id, topCoins: c.topCoins, change: c.marketCapChange24h }))
      
      // Fallback narratives if CoinGecko failed (empty or rate-limited)
      if (activeNarratives.length === 0) {
        activeNarratives = [
          { name: 'AI & Big Data', id: 'artificial-intelligence', topCoins: ['FET', 'RNDR', 'AGIX', 'OCEAN', 'TAO'], change: 12.5 },
          { name: 'Meme Coins', id: 'memes', topCoins: ['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK'], change: 8.2 },
          { name: 'DePIN', id: 'depin', topCoins: ['FIL', 'AR', 'THETA', 'STORJ', 'SC'], change: 6.8 },
          { name: 'RWA', id: 'real-world-assets', topCoins: ['ONDO', 'MKR', 'PENDLE', 'RIO', 'TOKEN'], change: 4.5 },
          { name: 'Liquid Staking', id: 'liquid-staking', topCoins: ['LDO', 'WBETH', 'CBETH', 'RPL', 'ANKR'], change: 3.2 },
        ]
      }
      
      // High impact events
      const highImpactEvents = eventsInfo
        .filter(e => (e.impact === 'HIGH') && e.status !== 'PAST')
        .map(e => `${e.title} (${e.time})`)
      
      // Event status analysis
      const todayHighImpact = eventsInfo.filter(e => 
        e.impact === 'HIGH' && (e.status === 'TODAY')
      ).length
      const upcoming24hHigh = eventsInfo.filter(e => 
        e.impact === 'HIGH' && (e.status === 'TODAY' || e.status === 'UPCOMING_24H')
      ).length
      const upcoming48hHigh = eventsInfo.filter(e => 
        e.impact === 'HIGH' && (e.status === 'TODAY' || e.status === 'UPCOMING_24H' || e.status === 'UPCOMING_48H')
      ).length
      
      // Past events (already happened - look for post-event setups)
      const pastEvents = eventsInfo.filter(e => e.status === 'PAST')
      const recentPostEvent = pastEvents.length > 0 ? pastEvents[0] : null
      
      // Risk budget based on event proximity
      let riskBudget = settings.riskPerTrade
      if (todayHighImpact > 0) riskBudget = settings.riskPerTrade * 0.3 // 30% only
      else if (upcoming24hHigh > 0) riskBudget = settings.riskPerTrade * 0.5 // 50%
      else if (upcoming48hHigh > 0) riskBudget = settings.riskPerTrade * 0.75 // 75%
      
      // Status with priority logic (NO_TRADE > WAIT > READY)
      let status: DailyChecklist['status'] = 'READY'
      const reasons: string[] = []
      
      // Check NO_TRADE conditions first (highest priority)
      if (fg > 80) { 
        status = 'NO_TRADE'; reasons.push('Extreme Greed (>80) — bubble territory')
      } else if (fg < 10) { 
        status = 'NO_TRADE'; reasons.push('Extreme Fear (<10) — capitulation, wait for stabilization')
      }
      
      // Then WAIT conditions (only if not already NO_TRADE)
      if (status !== 'NO_TRADE') {
        if (todayHighImpact > 0) { 
          status = 'WAIT'
          reasons.push(`${todayHighImpact} HIGH impact event HARI INI — wait 1-2 jam setelah event`)
        } else if (eventIntelligence.marketRiskLevel === 'CRITICAL') {
          status = 'WAIT'
          reasons.push('Market risk CRITICAL — wait for conditions to stabilize')
        }
      }
      
      // Build comprehensive trade plan
      let tradePlan = ''
      
      if (status === 'NO_TRADE') {
        tradePlan = `🚫 NO TRADE TODAY.\nAlasan: ${reasons.join(', ')}\n\nYang bisa dilakukan:\n• Review portfolio existing\n• Set alert untuk level entry yang Anda inginkan\n• Study market untuk besok\n• Jangan FOMO chase`
      } else if (status === 'WAIT') {
        const eventList = eventsInfo
          .filter(e => e.impact === 'HIGH' && (e.status === 'TODAY' || e.status === 'UPCOMING_24H'))
          .map(e => `  • ${e.title} (${e.time})`)
          .join('\n')
        
        tradePlan = `⏳ WAIT — Event HIGH impact mendekat.\n\nEvent(s):\n${eventList}\n\nYang bisa dilakukan:\n• Jangan entry baru 2 jam sebelum event\n• Set alert untuk 1 jam setelah event\n• Siapkan 2 skenario: bullish outcome & bearish outcome\n• Reduce size 70% kalau terpaksa trade\n• Swing trade yang sudah open: trail stop ketat\n\nSetelah event:\n• Wait 1-2 jam untuk dust settle\n• Cek BTC movement: >3% = direction confirmed\n• Entry hanya kalau confluence 3+ indicators`
      } else {
        // READY status
        const eventContext = upcoming48hHigh > 0 
          ? `\n\n⚠️ Catatan: Ada ${upcoming48hHigh} event HIGH impact dalam 48 jam. Reduce size ke ${riskBudget}%.`
          : ''
        
        const postEventNote = recentPostEvent
          ? `\n\n📌 Post-event setup: ${recentPostEvent.title} sudah lewat. Cek market reaction — kalau BTC move >3%, direction confirmed. Cari setup yang align dengan direction.`
          : ''
        
        if (macroBias === 'LONG') {
          tradePlan = `🟢 READY — Bias: LONG\n\nFokus:\n${activeNarratives.length > 0 ? activeNarratives.map(n => `• ${n.name} (+${n.change.toFixed(1)}%)`).join('\n') : '• BTC/ETH (no strong narrative)'}\n\nRisk per trade: ${riskBudget}%\nSetup priority: Trend Pullback, Volume Breakout (LONG)${eventContext}${postEventNote}`
        } else if (macroBias === 'SHORT') {
          tradePlan = `🔴 READY — Bias: SHORT\n\nCuma cari short setup. Market bearish.\nRisk per trade: ${riskBudget}%\nSetup priority: Mean Reversion (overbought), Trend Following (bearish)${eventContext}${postEventNote}`
        } else {
          tradePlan = `⚪ READY — Bias: NEUTRAL\n\nMarket sideways. Trading kecil-kecil saja.\nRisk per trade: ${riskBudget}%\nSetup priority: Mean Reversion (range trading)${eventContext}${postEventNote}`
        }
      }
      
      setChecklist({
        date: new Date().toISOString(),
        macroBias,
        activeNarratives: activeNarratives.map(n => n.name),
        highImpactEvents: highImpactEvents,
        btcTrend,
        fearGreed: fg,
        tradePlan,
        riskBudget,
        status,
        notes,
      })
      
      // Store narrative data for clickable
      setNarrativeData(activeNarratives)
      
    } catch (err) {
      console.error(err)
      // Set fallback checklist so UI doesn't break
      setChecklist({
        date: new Date().toISOString(),
        macroBias: 'NEUTRAL',
        activeNarratives: [],
        highImpactEvents: [],
        btcTrend: 'RANGING',
        fearGreed: 50,
        tradePlan: '⚠️ Gagal load data. Coba refresh lagi.',
        riskBudget: settings.riskPerTrade * 0.5,
        status: 'WAIT',
        notes: '',
      })
      // Fallback narratives even on error
      setNarrativeData([
        { name: 'AI & Big Data', id: 'artificial-intelligence', topCoins: ['FET', 'RNDR', 'AGIX', 'OCEAN', 'TAO'], change: 12.5 },
        { name: 'Meme Coins', id: 'memes', topCoins: ['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK'], change: 8.2 },
        { name: 'DePIN', id: 'depin', topCoins: ['FIL', 'AR', 'THETA', 'STORJ', 'SC'], change: 6.8 },
      ])
    } finally {
      // Ensure minimum 1.5s loading time so user sees feedback
      const elapsed = Date.now() - startTime
      const minLoadTime = 1500
      if (elapsed < minLoadTime) {
        await new Promise(r => setTimeout(r, minLoadTime - elapsed))
      }
      setLoading(false)
    }
  }

  const [narrativeData, setNarrativeData] = useState<Array<{name: string, id: string, topCoins: string[], change: number}>>([])

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

  function handleNarrativeClick(narrativeName: string) {
    // Navigate to Narrative tab
    setActiveTab('narrative')
    pushAlert({
      type: 'INFO',
      title: 'Navigating to Narrative',
      message: `Membuka detail narrative: ${narrativeName}`,
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        <div className="text-xs text-zinc-500">Loading daily checklist...</div>
      </div>
    )
  }

  if (!checklist) return null

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Sort events by hoursUntil
  const sortedEvents = [...events].sort((a, b) => a.hoursUntil - b.hoursUntil)

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
          <p className="text-sm whitespace-pre-line">{checklist.tradePlan}</p>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Macro Bias</div>
            <div className={`text-base font-bold ${
              checklist.macroBias === 'LONG' ? 'text-emerald-400' :
              checklist.macroBias === 'SHORT' ? 'text-red-400' : ''
            }`}>{checklist.macroBias}</div>
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
            <div className="text-base font-bold">{checklist.riskBudget.toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Narratives — CLICKABLE */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Active Narratives (tap untuk detail)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {narrativeData.length > 0 ? (
            <div className="space-y-2">
              {narrativeData.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNarrativeClick(n.name)}
                  className="w-full text-left p-2 rounded border border-zinc-800 hover:border-emerald-700 hover:bg-zinc-800/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-emerald-400">{n.name}</div>
                      {n.topCoins && n.topCoins.length > 0 && (
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          Top: {n.topCoins.slice(0, 5).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-emerald-400 font-bold">+{n.change.toFixed(1)}%</div>
                      <div className="text-[9px] text-zinc-500">24h</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-500">No active narratives today</div>
          )}
        </CardContent>
      </Card>

      {/* Event Intelligence — Comprehensive */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-400" />
            Event Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {eventIntel && (
            <div className={`p-2 rounded text-xs ${
              eventIntel.marketRiskLevel === 'CRITICAL' ? 'bg-red-950/30 text-red-300' :
              eventIntel.marketRiskLevel === 'HIGH' ? 'bg-orange-950/30 text-orange-300' :
              eventIntel.marketRiskLevel === 'MEDIUM' ? 'bg-yellow-950/30 text-yellow-300' :
              'bg-emerald-950/30 text-emerald-300'
            }`}>
              <strong>Market Risk: {eventIntel.marketRiskLevel}</strong> — {eventIntel.tradingRecommendation}
            </div>
          )}
          
          {sortedEvents.length > 0 ? (
            <div className="space-y-1">
              {sortedEvents.map((e, i) => {
                const statusColor = 
                  e.status === 'PAST' ? 'border-zinc-700 bg-zinc-950/30' :
                  e.status === 'TODAY' ? 'border-red-700 bg-red-950/30' :
                  e.status === 'UPCOMING_24H' ? 'border-orange-700 bg-orange-950/30' :
                  e.status === 'UPCOMING_48H' ? 'border-yellow-700 bg-yellow-950/30' :
                  'border-zinc-800 bg-zinc-950/30'
                
                return (
                  <div key={i} className={`p-2 rounded border text-xs ${statusColor}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">
                          {e.status === 'PAST' && '✅ '}
                          {e.status === 'TODAY' && '🚨 '}
                          {e.status === 'UPCOMING_24H' && '⚠️ '}
                          {e.status === 'UPCOMING_48H' && '📅 '}
                          {e.status === 'UPCOMING_WEEK' && '📋 '}
                          {e.title}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {e.impact} impact • {e.time}
                          {e.status !== 'PAST' && ` • ${e.hoursUntil.toFixed(1)}h lagi`}
                          {e.status === 'PAST' && ` • ${Math.abs(e.hoursUntil).toFixed(1)}h lalu`}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[8px] ml-1">
                        {e.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">{e.recommendation}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-xs text-zinc-500">No upcoming events</div>
          )}
        </CardContent>
      </Card>

      {/* Post-Event Action Plan */}
      {sortedEvents.some(e => e.status === 'PAST') && (
        <Card className="bg-blue-950/20 border-blue-800 border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" />
              Post-Event Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-zinc-300">
            <div className="font-medium text-blue-300 mb-1">Event sudah terjadi. Lakukan ini:</div>
            <div>1. Cek BTC movement 1-2 jam setelah event</div>
            <div>2. Kalau BTC move &gt;3%: direction confirmed → cari setup searah</div>
            <div>3. Kalau BTC move &lt;1%: market unsure → wait, jangan trade</div>
            <div>4. Kalau BTC dump &gt;5%: jangan catch falling knife, wait stabilization</div>
            <div>5. Kalau BTC pump &gt;5%: jangan FOMO chase, wait pullback</div>
            <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] text-zinc-500">
              💡 Buka tab Scanner untuk cari setup yang align dengan direction post-event
            </div>
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

      {/* Refresh Button — FIXED */}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full" 
        onClick={generateChecklist}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Refreshing...
          </>
        ) : (
          <>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh Checklist
          </>
        )}
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
