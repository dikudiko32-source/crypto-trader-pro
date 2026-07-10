'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Bell, BellRing, Plus, Trash2, BellOff, CheckCircle2, Wifi, WifiOff, Zap } from 'lucide-react'
import { useAppStore, formatNumber } from '@/store/app-store'
import { useNotifications, usePriceAlertMonitor } from '@/hooks/use-price-alerts'
import { useBinanceWS } from '@/hooks/use-binance-ws'
import type { AlertCondition, PriceAlert } from '@/lib/types'

const CONDITIONS: { value: AlertCondition; label: string; description: string }[] = [
  { value: 'ABOVE', label: 'Above Price', description: 'Trigger saat harga ≥ target' },
  { value: 'BELOW', label: 'Below Price', description: 'Trigger saat harga ≤ target' },
  { value: 'CROSS_UP', label: 'Cross Up', description: 'Trigger saat harga naik menembus target' },
  { value: 'CROSS_DOWN', label: 'Cross Down', description: 'Trigger saat harga turun menembus target' },
  { value: 'PCT_CHANGE_5M', label: '% Change (5m proxy)', description: 'Trigger saat perubahan ≥ threshold%' },
  { value: 'PCT_CHANGE_1H', label: '% Change (24h)', description: 'Trigger saat 24h change ≥ threshold%' },
]

export function PriceAlertManager() {
  const { priceAlerts, addPriceAlert, removePriceAlert, settings } = useAppStore()
  const { notificationsEnabled, requestPermission, showNotification } = useNotifications()
  const { connected, error, activeAlertsCount } = usePriceAlertMonitor()

  const [symbol, setSymbol] = useState('BTCUSDT')
  const [condition, setCondition] = useState<AlertCondition>('ABOVE')
  const [targetPrice, setTargetPrice] = useState(0)
  const [pctThreshold, setPctThreshold] = useState(5)
  const [note, setNote] = useState('')

  // Subscribe to WebSocket for live prices of alert symbols
  const alertSymbols = Array.from(new Set(priceAlerts.map(a => a.symbol)))
  const { prices, connected: wsConnected } = useBinanceWS({
    symbols: alertSymbols,
    enabled: alertSymbols.length > 0,
  })

  function addAlert() {
    if (!symbol) return
    if ((condition === 'ABOVE' || condition === 'BELOW' || condition === 'CROSS_UP' || condition === 'CROSS_DOWN') && targetPrice <= 0) {
      alert('Masukkan target price yang valid')
      return
    }
    if ((condition === 'PCT_CHANGE_5M' || condition === 'PCT_CHANGE_1H') && pctThreshold <= 0) {
      alert('Masukkan threshold % yang valid')
      return
    }

    const newAlert: PriceAlert = {
      id: Math.random().toString(36).slice(2),
      symbol: symbol.toUpperCase(),
      condition,
      targetPrice: condition.includes('PCT') ? undefined : targetPrice,
      pctThreshold: condition.includes('PCT') ? pctThreshold : undefined,
      note,
      createdAt: new Date().toISOString(),
      triggered: false,
      triggeredAt: null,
      active: true,
    }
    addPriceAlert(newAlert)
    setNote('')
    setTargetPrice(0)
    setPctThreshold(5)
  }

  function testNotification() {
    showNotification('🔔 Test Notification', 'CryptoTrader Pro alerts are working!', 'test')
  }

  const activeAlerts = priceAlerts.filter(a => a.active && !a.triggered)
  const triggeredAlerts = priceAlerts.filter(a => a.triggered)

  return (
    <div className="space-y-3">
      {/* Notification Permission Banner */}
      {!notificationsEnabled && (
        <Card className="bg-yellow-950/30 border-yellow-800">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <BellOff className="h-4 w-4 text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-yellow-300">Notifications Disabled</div>
                <div className="text-xs text-yellow-500 mt-1">
                  Aktifkan notifikasi browser untuk menerima alert push saat harga tercapai.
                  Aplikasi harus tetap terbuka (tab aktif atau background) untuk menerima alert.
                </div>
                <Button size="sm" className="mt-2" onClick={requestPermission}>
                  <BellRing className="h-3 w-3 mr-1" />
                  Enable Notifications
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Bar */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1 text-xs ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
                {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                WebSocket {connected ? 'Connected' : 'Disconnected'}
              </div>
              {notificationsEnabled && (
                <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-400">
                  <Bell className="h-2.5 w-2.5 mr-1" />
                  Notifications On
                </Badge>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={testNotification} disabled={!notificationsEnabled}>
              Test
            </Button>
          </div>
          {error && (
            <div className="text-xs text-red-400 mt-2">{error}</div>
          )}
          <div className="text-xs text-zinc-500 mt-1">
            Monitoring {activeAlertsCount} active alert{activeAlertsCount !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Add Alert Form */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Price Alert
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Symbol</Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="BTCUSDT"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Condition</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as AlertCondition)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(condition === 'ABOVE' || condition === 'BELOW' || condition === 'CROSS_UP' || condition === 'CROSS_DOWN') ? (
            <div>
              <Label className="text-xs">Target Price (USD)</Label>
              <Input
                type="number"
                step="any"
                value={targetPrice || ''}
                onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          ) : (
            <div>
              <Label className="text-xs">Threshold (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={pctThreshold}
                onChange={(e) => setPctThreshold(parseFloat(e.target.value) || 0)}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Entry zone hit, prepare to execute"
              className="bg-zinc-950 border-zinc-700 text-sm"
            />
          </div>

          <div className="text-[10px] text-zinc-500">
            {CONDITIONS.find(c => c.value === condition)?.description}
          </div>

          <Button onClick={addAlert} size="sm" className="w-full">
            <Plus className="h-3 w-3 mr-1" />
            Add Alert
          </Button>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              Active Alerts ({activeAlerts.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No active alerts. Create one above.
            </div>
          ) : (
            <div className="space-y-2">
              {activeAlerts.map(alert => {
                const livePrice = prices[alert.symbol]?.price
                const targetLabel = alert.targetPrice 
                  ? `$${alert.targetPrice}` 
                  : `${alert.pctThreshold}%`
                return (
                  <div key={alert.id} className="p-2 rounded border border-zinc-800 bg-zinc-950/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{alert.symbol}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {alert.condition.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-emerald-400 font-mono">{targetLabel}</span>
                        </div>
                        {livePrice && (
                          <div className="text-xs text-zinc-400 mt-1">
                            Live: <span className="font-mono text-zinc-300">${formatNumber(livePrice)}</span>
                            {alert.targetPrice && (
                              <span className="ml-2 text-zinc-500">
                                ({((alert.targetPrice - livePrice) / livePrice * 100).toFixed(2)} to target)
                              </span>
                            )}
                          </div>
                        )}
                        {alert.note && (
                          <div className="text-xs text-zinc-500 mt-1">{alert.note}</div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-red-400 hover:text-red-300"
                        onClick={() => removePriceAlert(alert.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Triggered Alerts History */}
      {triggeredAlerts.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Triggered ({triggeredAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {triggeredAlerts.slice(0, 20).map(alert => (
                  <div key={alert.id} className="p-2 rounded border border-zinc-800 bg-zinc-950/30 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{alert.symbol}</span>
                      <span className="text-zinc-500">
                        {alert.triggeredAt && new Date(alert.triggeredAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="text-zinc-400 mt-0.5">
                      {alert.condition.replace(/_/g, ' ')} • {alert.targetPrice ? `$${alert.targetPrice}` : `${alert.pctThreshold}%`}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-zinc-900/30 border-zinc-800/50">
        <CardContent className="p-3 text-xs text-zinc-500 space-y-1">
          <div className="font-semibold text-zinc-400 mb-1">Cara kerja alert:</div>
          <div>• WebSocket connect ke Binance (real-time, &lt;1s delay)</div>
          <div>• Alert cek setiap price update (otomatis)</div>
          <div>• Notifikasi browser muncul bahkan saat tab di background</div>
          <div>• ⚠️ App harus tetap terbuka. Close browser = alert berhenti</div>
          <div className="mt-2 pt-2 border-t border-zinc-800">
            <strong>Tip:</strong> Untuk alert "selalu aktif", tambahkan ke Home Screen Android (PWA) dan biarkan terbuka di background.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
