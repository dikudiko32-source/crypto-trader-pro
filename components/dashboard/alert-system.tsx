'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, BellRing, AlertTriangle, Zap, Info, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/app-store'

export function AlertSystem() {
  const { alerts, markAlertRead, clearAlerts, pushAlert, setups, settings } = useAppStore()
  const [enabled, setEnabled] = useState(true)

  // Simulate alert generation (in production: WebSocket-based)
  useEffect(() => {
    if (!enabled) return
    
    // Check setups for entry zone hits (simulated with random check)
    const interval = setInterval(() => {
      setups.forEach(setup => {
        if (setup.status === 'WAIT_TRIGGER' && Math.random() < 0.02) {
          pushAlert({
            type: 'INFO',
            title: `${setup.symbol} approaching entry zone`,
            message: `Price near ${setup.entry.zone.lower} - ${setup.entry.zone.upper}. Watch for trigger.`,
          })
        }
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [enabled, setups, pushAlert])

  function testAlert() {
    pushAlert({
      type: 'ACTION',
      title: 'Test Alert',
      message: `Alert system is working. Threshold: ${settings.alertThreshold}/100`,
    })
  }

  const unreadCount = alerts.filter(a => !a.read).length
  const criticalCount = alerts.filter(a => a.type === 'CRITICAL' && !a.read).length

  return (
    <div className="space-y-3">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-400">Alert Status</div>
              <div className="text-base font-semibold flex items-center gap-2">
                {enabled ? <BellRing className="h-4 w-4 text-emerald-400" /> : <Bell className="h-4 w-4 text-zinc-500" />}
                {enabled ? 'Active' : 'Disabled'}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Threshold: {settings.alertThreshold}/100 • {alerts.length} total
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={enabled ? 'default' : 'outline'}
                onClick={() => setEnabled(!enabled)}
              >
                {enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button size="sm" variant="outline" onClick={testAlert}>
                Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {criticalCount > 0 && (
        <Card className="bg-red-950/30 border-red-800 animate-pulse">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-300">
              {criticalCount} critical alert{criticalCount > 1 ? 's' : ''} requiring attention!
            </span>
          </CardContent>
        </Card>
      )}

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Alert History {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-600 hover:bg-red-600">{unreadCount} new</Badge>
              )}
            </CardTitle>
            {alerts.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearAlerts} className="h-7 text-xs">
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No alerts yet. System will notify you when setups trigger.
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    onClick={() => markAlertRead(alert.id)}
                    className={`p-2 rounded border cursor-pointer transition-all ${
                      alert.read ? 'border-zinc-800 bg-zinc-900/30' :
                      alert.type === 'CRITICAL' ? 'border-red-700 bg-red-950/30' :
                      alert.type === 'WARNING' ? 'border-yellow-700 bg-yellow-950/20' :
                      alert.type === 'ACTION' ? 'border-blue-700 bg-blue-950/20' :
                      'border-zinc-700 bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {alert.type === 'CRITICAL' && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
                        {alert.type === 'WARNING' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />}
                        {alert.type === 'ACTION' && <Zap className="h-3.5 w-3.5 text-blue-400" />}
                        {alert.type === 'INFO' && <Info className="h-3.5 w-3.5 text-zinc-400" />}
                        <Badge variant="outline" className="text-[9px]">
                          {alert.type}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(alert.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-medium text-zinc-200">{alert.title}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{alert.message}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/30 border-zinc-800/50">
        <CardContent className="p-3 text-xs text-zinc-500 space-y-1">
          <div className="font-semibold text-zinc-400 mb-1">How alerts work:</div>
          <div>🔴 <strong>CRITICAL</strong> — SL hit, invalidity condition, must act immediately</div>
          <div>🟡 <strong>WARNING</strong> — Price approaching SL, monitor closely</div>
          <div>🔵 <strong>ACTION</strong> — Entry/exit trigger confirmed, ready to execute</div>
          <div>⚪ <strong>INFO</strong> — Setup forming, heads up only</div>
          <div className="mt-2 pt-2 border-t border-zinc-800">
            Score-based filtering: Alerts only fire when setup score ≥ {settings.alertThreshold}/100.
            Anti-fatigue: Max 5 alerts/hour, batched if exceeded.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
