'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Shield, AlertTriangle, TrendingDown, Clock, Activity } from 'lucide-react'
import { useAppStore, formatIDR } from '@/store/app-store'
import { assessRiskState, getConsecutiveLosses } from '@/lib/scoring'
import type { RiskState } from '@/lib/types'

export function RiskRecovery() {
  const { journal, settings, cooldownUntil, setCooldown, pushAlert } = useAppStore()
  const [manualDailyDD, setManualDailyDD] = useState(0)
  const [manualWeeklyDD, setManualWeeklyDD] = useState(0)
  
  // Calculate consecutive losses from journal
  const consecutiveLosses = useMemo(() => getConsecutiveLosses(journal), [journal])
  
  // Calculate today's loss
  const today = new Date().toDateString()
  const todayTrades = journal.filter(e => 
    e.pnl !== null && new Date(e.date).toDateString() === today
  )
  const todayLoss = todayTrades
    .filter(t => (t.pnl || 0) < 0)
    .reduce((sum, t) => sum + (t.pnl || 0), 0)
  const todayLossPct = (Math.abs(todayLoss) * 15800 / settings.capital) * 100
  
  // Calculate week's loss
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const weekTrades = journal.filter(e => 
    e.pnl !== null && new Date(e.date) > weekAgo
  )
  const weekLoss = weekTrades
    .filter(t => (t.pnl || 0) < 0)
    .reduce((sum, t) => sum + (t.pnl || 0), 0)
  const weekLossPct = (Math.abs(weekLoss) * 15800 / settings.capital) * 100
  
  // Use manual input if provided, else use calculated
  const effectiveDailyDD = manualDailyDD || todayLossPct
  const effectiveWeeklyDD = manualWeeklyDD || weekLossPct
  
  const riskState: RiskState = assessRiskState(
    consecutiveLosses,
    effectiveDailyDD,
    effectiveWeeklyDD,
    settings.dailyDrawdownLimit,
    settings.weeklyDrawdownLimit,
    journal
  )
  
  // Check cooldown status
  const cooldownActive = cooldownUntil && new Date(cooldownUntil) > new Date()
  const cooldownRemaining = cooldownActive 
    ? Math.ceil((new Date(cooldownUntil).getTime() - Date.now()) / (1000 * 60 * 60))
    : 0

  // Auto-trigger cooldown if needed
  useEffect(() => {
    if (riskState.status === 'COOLDOWN' && !cooldownActive) {
      setCooldown(riskState.cooldownUntil)
      pushAlert({
        type: 'CRITICAL',
        title: '🚨 COOLDOWN ACTIVATED',
        message: `Trading stopped. Reason: ${riskState.reasons.join(', ')}`,
      })
    }
  }, [riskState.status, cooldownActive])

  function clearCooldown() {
    if (confirm('Yakin mau clear cooldown? Pastikan kondisi mental & market sudah better.')) {
      setCooldown(null)
    }
  }

  const statusColor = {
    NORMAL: 'border-l-emerald-500 bg-emerald-950/20',
    CAUTION: 'border-l-yellow-500 bg-yellow-950/20',
    WARNING: 'border-l-orange-500 bg-orange-950/20',
    COOLDOWN: 'border-l-red-500 bg-red-950/30',
  }

  const statusBadge = {
    NORMAL: { variant: 'default' as const, className: 'bg-emerald-600' },
    CAUTION: { variant: 'default' as const, className: 'bg-yellow-600' },
    WARNING: { variant: 'default' as const, className: 'bg-orange-600' },
    COOLDOWN: { variant: 'destructive' as const, className: '' },
  }

  return (
    <div className="space-y-3">
      {/* Cooldown Banner */}
      {cooldownActive && (
        <Card className="bg-red-950/40 border-red-700 animate-pulse">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-red-400" />
              <div className="flex-1">
                <div className="text-sm font-bold text-red-300">🚨 COOLDOWN ACTIVE</div>
                <div className="text-xs text-red-400">
                  Trading locked. {cooldownRemaining}h remaining (until {new Date(cooldownUntil!).toLocaleString('id-ID')})
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={clearCooldown} className="border-red-700 text-red-300">
                Force Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Status */}
      <Card className={`border-l-4 ${statusColor[riskState.status]}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Risk Recovery Status
            </CardTitle>
            <Badge variant={statusBadge[riskState.status].variant} className={statusBadge[riskState.status].className}>
              {riskState.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Recommended Size */}
          <div className="bg-zinc-950/50 p-3 rounded">
            <div className="text-xs text-zinc-400">Recommended Position Size Multiplier</div>
            <div className="text-2xl font-bold">
              {riskState.recommendedSizeMultiplier === 0 ? (
                <span className="text-red-400">STOP TRADING</span>
              ) : (
                <span className={riskState.recommendedSizeMultiplier < 1 ? 'text-yellow-400' : 'text-emerald-400'}>
                  {(riskState.recommendedSizeMultiplier * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {riskState.recommendedSizeMultiplier === 1 
                ? 'Normal size allowed'
                : riskState.recommendedSizeMultiplier === 0
                ? 'All trading locked'
                : `Reduce size from ${settings.riskPerTrade}% to ${(settings.riskPerTrade * riskState.recommendedSizeMultiplier).toFixed(2)}% risk per trade`
              }
            </div>
          </div>

          {/* Reasons */}
          {riskState.reasons.length > 0 ? (
            <div className="space-y-1">
              <div className="text-xs font-medium text-zinc-400">Triggers:</div>
              {riskState.reasons.map((reason, i) => (
                <div key={i} className="text-xs text-yellow-300 bg-yellow-950/20 border border-yellow-900/50 p-2 rounded">
                  {reason}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <Activity className="h-3 w-3" />
              All clear. Trade normally.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Loss Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Today's Loss</div>
            <div className="text-xl font-bold text-red-400">
              -{formatIDR(Math.abs(todayLoss) * 15800)}
            </div>
            <div className="text-xs text-zinc-500">{todayLossPct.toFixed(2)}% of capital</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Week's Loss</div>
            <div className="text-xl font-bold text-red-400">
              -{formatIDR(Math.abs(weekLoss) * 15800)}
            </div>
            <div className="text-xs text-zinc-500">{weekLossPct.toFixed(2)}% of capital</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-400">Consecutive Losses</div>
              <div className={`text-2xl font-bold ${consecutiveLosses >= 3 ? 'text-red-400' : consecutiveLosses >= 2 ? 'text-yellow-400' : 'text-zinc-300'}`}>
                {consecutiveLosses}
              </div>
            </div>
            <TrendingDown className={`h-8 w-8 ${consecutiveLosses >= 3 ? 'text-red-500' : 'text-zinc-700'}`} />
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {consecutiveLosses === 0 && 'No active loss streak'}
            {consecutiveLosses === 1 && '1 loss — minor, trade normally'}
            {consecutiveLosses === 2 && '2 losses — reduce size to 75%'}
            {consecutiveLosses === 3 && '⚠️ 3 losses — reduce size to 50%'}
            {consecutiveLosses === 4 && '⚠️ 4 losses — reduce size to 50%'}
            {consecutiveLosses >= 5 && '🚨 5+ losses — mandatory 48h cooldown'}
          </div>
        </CardContent>
      </Card>

      {/* Manual Override */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Manual DD Override (jika hitung sendiri)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400">Daily DD (%)</label>
              <input
                type="number"
                step="0.1"
                value={manualDailyDD || ''}
                onChange={(e) => setManualDailyDD(parseFloat(e.target.value) || 0)}
                placeholder="auto"
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Weekly DD (%)</label>
              <input
                type="number"
                step="0.1"
                value={manualWeeklyDD || ''}
                onChange={(e) => setManualWeeklyDD(parseFloat(e.target.value) || 0)}
                placeholder="auto"
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Reference */}
      <Card className="bg-zinc-900/30 border-zinc-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Risk Recovery Rules</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <div className="flex justify-between"><span>2 consecutive losses</span><span className="text-yellow-400">Size 75%</span></div>
          <div className="flex justify-between"><span>3 consecutive losses</span><span className="text-orange-400">Size 50%</span></div>
          <div className="flex justify-between"><span>5 consecutive losses</span><span className="text-red-400">48h cooldown</span></div>
          <div className="flex justify-between"><span>Daily DD hit limit ({settings.dailyDrawdownLimit}%)</span><span className="text-red-400">Stop 24h</span></div>
          <div className="flex justify-between"><span>Weekly DD hit limit ({settings.weeklyDrawdownLimit}%)</span><span className="text-red-400">7d cooldown</span></div>
          <div className="flex justify-between"><span>4+ trades/day after loss</span><span className="text-yellow-400">Overtrading warning</span></div>
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-xs">⚠️ Why This Matters</AlertTitle>
        <AlertDescription className="text-xs">
          Trader pemula paling sering blow up karena revenge trading setelah loss. 
          Sistem ini memaksa Anda untuk reduce size atau stop trading saat kondisi mental & akun tidak optimal.
          <strong> Jangan force-clear cooldown</strong> kecuali Anda yakin sudah reset psikologis.
        </AlertDescription>
      </Alert>
    </div>
  )
}
