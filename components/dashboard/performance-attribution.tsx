'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TrendingUp, TrendingDown, Award, AlertTriangle, BarChart3 } from 'lucide-react'
import { useAppStore, formatIDR } from '@/store/app-store'
import type { JournalEntry } from '@/lib/types'

export function PerformanceAttribution() {
  const { journal } = useAppStore()
  
  const closedTrades = journal.filter(t => t.pnl !== null) as (JournalEntry & { pnl: number; pnlPercent: number })[]
  
  const analysis = useMemo(() => {
    if (closedTrades.length === 0) return null
    
    // Group by setup type
    const bySetupType = groupBy(closedTrades, t => t.setupType)
    const byBias = groupBy(closedTrades, t => t.bias)
    const byEmotion = groupBy(closedTrades, t => t.emotion)
    const bySymbol = groupBy(closedTrades, t => t.symbol)
    
    const calcStats = (trades: (JournalEntry & { pnl: number; pnlPercent: number })[]) => {
      const wins = trades.filter(t => t.pnl > 0)
      const losses = trades.filter(t => t.pnl < 0)
      const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
      const avgRr = trades.length > 0 ? trades.reduce((sum, t) => sum + (t.rr || 0), 0) / trades.length : 0
      return {
        count: trades.length,
        winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
        totalPnl,
        avgRr,
        wins: wins.length,
        losses: losses.length,
      }
    }
    
    const setupStats = Object.entries(bySetupType).map(([key, trades]) => ({
      key: key.replace(/_/g, ' '),
      ...calcStats(trades as (JournalEntry & { pnl: number; pnlPercent: number })[]),
    })).sort((a, b) => b.totalPnl - a.totalPnl)
    
    const biasStats = Object.entries(byBias).map(([key, trades]) => ({
      key,
      ...calcStats(trades as (JournalEntry & { pnl: number; pnlPercent: number })[]),
    }))
    
    const emotionStats = Object.entries(byEmotion).map(([key, trades]) => ({
      key,
      ...calcStats(trades as (JournalEntry & { pnl: number; pnlPercent: number })[]),
    })).sort((a, b) => a.totalPnl - b.totalPnl) // worst emotions first
    
    const symbolStats = Object.entries(bySymbol).map(([key, trades]) => ({
      key,
      ...calcStats(trades as (JournalEntry & { pnl: number; pnlPercent: number })[]),
    })).sort((a, b) => b.totalPnl - a.totalPnl)
    
    // Best & worst
    const bestSetup = setupStats[0]
    const worstSetup = setupStats[setupStats.length - 1]
    const bestSymbol = symbolStats[0]
    const worstSymbol = symbolStats[symbolStats.length - 1]
    const worstEmotion = emotionStats[0]
    
    // Recommendations
    const recommendations: string[] = []
    if (bestSetup && bestSetup.totalPnl > 0) {
      recommendations.push(`✅ Focus strategi: ${bestSetup.key} (${bestSetup.winRate.toFixed(0)}% win rate, +${formatIDR(bestSetup.totalPnl * 15800)})`)
    }
    if (worstSetup && worstSetup.totalPnl < 0) {
      recommendations.push(`❌ Avoid strategi: ${worstSetup.key} (${worstSetup.winRate.toFixed(0)}% win rate, ${formatIDR(worstSetup.totalPnl * 15800)})`)
    }
    if (worstEmotion && worstEmotion.key !== 'CALM' && worstEmotion.totalPnl < 0) {
      recommendations.push(`🧠 Stop trading saat emosi: ${worstEmotion.key} (${worstEmotion.count} trades, ${formatIDR(worstEmotion.totalPnl * 15800)} loss)`)
    }
    if (bestSymbol && bestSymbol.totalPnl > 0) {
      recommendations.push(`💎 Coin terbaik: ${bestSymbol.key} (+${formatIDR(bestSymbol.totalPnl * 15800)})`)
    }
    
    // Bias analysis
    const longStats = biasStats.find(b => b.key === 'LONG')
    const shortStats = biasStats.find(b => b.key === 'SHORT')
    if (longStats && shortStats && longStats.totalPnl > shortStats.totalPnl * 2) {
      recommendations.push(`📈 Anda lebih baik di LONG. Pertimbangkan fokus LONG saja.`)
    } else if (shortStats && longStats && shortStats.totalPnl > longStats.totalPnl * 2) {
      recommendations.push(`📉 Anda lebih baik di SHORT. Pertimbangkan fokus SHORT saja.`)
    }
    
    return { setupStats, biasStats, emotionStats, symbolStats, recommendations, totalTrades: closedTrades.length }
  }, [closedTrades])
  
  if (!analysis) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
          <div className="text-sm text-zinc-400">No closed trades yet</div>
          <div className="text-xs text-zinc-500 mt-1">Add journal entries dengan P&L untuk lihat performance analysis</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-400">Analyzed Trades</div>
              <div className="text-2xl font-bold">{analysis.totalTrades}</div>
            </div>
            <BarChart3 className="h-8 w-8 text-emerald-400" />
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {analysis.recommendations.length > 0 && (
        <Card className="bg-emerald-950/20 border-emerald-800 border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-400" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.recommendations.map((rec, i) => (
              <div key={i} className="text-xs text-zinc-300 bg-zinc-950/50 p-2 rounded border border-zinc-800">
                {rec}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Setup Type Breakdown */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">By Setup Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analysis.setupStats.map(s => (
            <div key={s.key} className="flex items-center justify-between p-2 rounded border border-zinc-800 text-xs">
              <div>
                <div className="font-medium">{s.key}</div>
                <div className="text-zinc-500">{s.wins}W / {s.losses}L • WR {s.winRate.toFixed(0)}% • Avg R:R 1:{s.avgRr.toFixed(2)}</div>
              </div>
              <div className={`font-mono font-bold ${s.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {s.totalPnl >= 0 ? '+' : ''}{formatIDR(s.totalPnl * 15800)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* By Bias (Long vs Short) */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">LONG vs SHORT Performance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {analysis.biasStats.map(b => (
            <div key={b.key} className="bg-zinc-950/50 p-2 rounded text-xs">
              <div className="flex items-center gap-1">
                {b.key === 'LONG' ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
                <span className="font-medium">{b.key}</span>
              </div>
              <div className="font-mono mt-1">{b.wins}W / {b.losses}L</div>
              <div className={`font-mono ${b.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {b.totalPnl >= 0 ? '+' : ''}{formatIDR(b.totalPnl * 15800)}
              </div>
              <div className="text-zinc-500">WR {b.winRate.toFixed(0)}% • 1:{b.avgRr.toFixed(2)}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* By Emotion */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            Performance by Emotional State
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analysis.emotionStats.map(e => (
            <div key={e.key} className={`flex items-center justify-between p-2 rounded border text-xs ${
              e.key === 'CALM' ? 'border-emerald-800 bg-emerald-950/20' : 
              e.totalPnl < 0 ? 'border-red-800 bg-red-950/20' : 'border-zinc-800'
            }`}>
              <div>
                <div className="font-medium">{e.key}</div>
                <div className="text-zinc-500">{e.count} trades</div>
              </div>
              <div className="text-right">
                <div className={`font-mono font-bold ${e.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {e.totalPnl >= 0 ? '+' : ''}{formatIDR(e.totalPnl * 15800)}
                </div>
                <div className="text-zinc-500">WR {e.winRate.toFixed(0)}%</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* By Symbol */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">By Symbol (top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-1">
              {analysis.symbolStats.slice(0, 10).map(s => (
                <div key={s.key} className="flex items-center justify-between p-2 rounded border border-zinc-800 text-xs">
                  <div>
                    <span className="font-medium">{s.key}</span>
                    <span className="text-zinc-500 ml-2">{s.wins}W / {s.losses}L</span>
                  </div>
                  <div className={`font-mono ${s.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {s.totalPnl >= 0 ? '+' : ''}{formatIDR(s.totalPnl * 15800)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of arr) {
    const key = fn(item)
    if (!result[key]) result[key] = []
    result[key].push(item)
  }
  return result
}
