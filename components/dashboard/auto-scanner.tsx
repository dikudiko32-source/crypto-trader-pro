'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Loader2, Search, Zap, Bell, MessageCircle, Send, Mail, 
  Smartphone, TrendingUp, TrendingDown, Activity, Clock,
  CheckCircle2, AlertTriangle, Settings as SettingsIcon
} from 'lucide-react'
import { useAppStore, formatNumber, formatIDR } from '@/store/app-store'
import { scanMultipleCoinsEnhanced, formatEnhancedAlertMessage, formatAlertMessage, formatWhatsAppMessage } from '@/lib/scanner'
import { formatDeepAlertMessage } from '@/lib/deep-analysis'
import { useNotifications } from '@/hooks/use-price-alerts'
import type { ScannerResult, ScannerSignal, DeepAnalysisResult, EnhancedScannerResult, EnhancedScanSummary, ScanTimeframe } from '@/lib/types'

const STYLE_OPTIONS = [
  { value: 'TREND_FOLLOWING' as const, label: 'Trend Following', desc: 'Donchian + ATR + ADX' },
  { value: 'MEAN_REVERSION' as const, label: 'Mean Reversion', desc: 'Bollinger + RSI' },
  { value: 'VOLUME_BREAKOUT' as const, label: 'Volume Breakout', desc: 'S/R + Volume + VWAP' },
  { value: 'SMART_MONEY' as const, label: 'Smart Money', desc: 'OB + FVG + BOS' },
]

export function AutoScanner() {
  const { 
    scannerConfig, updateScannerConfig, 
    lastScanSummary, setLastScanSummary,
    scheduledScan, updateScheduledScan,
    notificationChannels, updateNotificationChannels,
    settings,
    pushAlert,
  } = useAppStore()
  
  const { notificationsEnabled, showNotification } = useNotifications()
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ scanned: 0, total: 0, found: 0 })
  const [telegramBotToken, setTelegramBotToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const scheduleRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Telegram bot token dari localStorage (kalau pernah diset di tab Telegram)
  useEffect(() => {
    const stored = localStorage.getItem('telegram-bot-token')
    if (stored) setTelegramBotToken(stored)
    const storedChat = localStorage.getItem('telegram-chat-id')
    if (storedChat) setTelegramChatId(storedChat)
  }, [])

  // ---- Run scan (ENHANCED Phase 6) ----
  const runScan = useCallback(async () => {
    setScanning(true)
    setProgress({ scanned: 0, total: 0, found: 0 })
    
    try {
      // MTF config (all 7 timeframes)
      const mtfConfig = {
        timeframes: ['5m', '15m', '30m', '1H', '4H', '12H', '1D'] as ScanTimeframe[],
        htfTimeframe: '1D' as ScanTimeframe,
        ltfTimeframe: '1H' as ScanTimeframe,
        requireHTFAlignment: false,
        requireMTFAgreement: 4,
      }
      
      const summary = await scanMultipleCoinsEnhanced(
        scannerConfig,
        mtfConfig,
        settings.capital,
        settings.riskPerTrade,
        (scanned, total, found) => {
          setProgress({ scanned, total, found })
        }
      )
      
      setLastScanSummary(summary)
      updateScheduledScan({
        lastScanAt: summary.scannedAt,
        totalScansRun: scheduledScan.totalScansRun + 1,
      })
      
      pushAlert({
        type: 'INFO',
        title: '🔍 Enhanced Scan Complete',
        message: `${summary.totalScanned} coins scanned, ${summary.totalWithSignals} setups found (${summary.longSignals}L / ${summary.shortSignals}S) | Market: ${summary.marketRiskLevel} | Mode: ${summary.tradingMode}`,
      })
      
      // Send notifications for top picks
      if (summary.topPicks.length > 0) {
        await sendNotifications(summary.topPicks.slice(0, 3))
      }
    } catch (err) {
      console.error('Scan failed:', err)
      pushAlert({
        type: 'CRITICAL',
        title: 'Scan Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setScanning(false)
    }
  }, [scannerConfig, scheduledScan, pushAlert, setLastScanSummary, updateScheduledScan, settings])

  // ---- Send notifications ----
  // Logic:
  // - Telegram: ONLY for setups that passed deep analysis (6-layer validated) + smart recommendation BUY/STRONG_BUY
  // - Browser Push: for all setups with confidence > threshold (broader)
  // - WhatsApp/Email: for deep-passed only (semi-manual)
  async function sendNotifications(picks: EnhancedScannerResult[]) {
    let alertsSent = 0
    let telegramSent = 0
    let browserPushSent = 0
    
    for (const pick of picks) {
      const deep = pick.deepAnalysis
      const rec = pick.smartRecommendation
      const isDeepPassed = deep?.passedDeepAnalysis === true
      const isStrongConfluence = deep?.confluence === 'STRONG' || deep?.confluence === 'MEGA'
      const isRecommended = rec?.finalRecommendation === 'STRONG_BUY' || rec?.finalRecommendation === 'BUY'
      
      // Telegram: ONLY for deep-passed + recommended (Phase 6: also check smart recommendation)
      if (scannerConfig.notifyTelegram && telegramBotToken && telegramChatId && isDeepPassed && isRecommended) {
        try {
          // Use enhanced alert format (ultra detailed) if available
          const message = rec && pick.mtfAnalysis && pick.eventIntelligence
            ? formatEnhancedAlertMessage(pick)
            : deep 
            ? formatDeepAlertMessage(pick, deep, await getScanMacroData())
            : formatAlertMessage(pick)
          
          const res = await fetch('/api/telegram/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              botToken: telegramBotToken,
              chatId: telegramChatId,
              message,
            }),
          })
          if (res.ok) {
            alertsSent++
            telegramSent++
            console.log(`Telegram alert sent for ${pick.symbol} (score ${rec?.finalScore.toFixed(0)}, rec ${rec?.finalRecommendation})`)
          }
        } catch (err) {
          console.error('Telegram send failed:', err)
        }
      }
      
      // Browser Push: for ALL setups with confidence > threshold (broader)
      if (scannerConfig.notifyBrowserPush && notificationsEnabled) {
        let title = `🔔 ${pick.name} ${pick.bestSignal!.bias} Signal`
        let body = `${pick.bestSignal!.styleName} • Confidence ${pick.bestSignal!.confidence.toFixed(0)}%`
        
        if (rec?.finalRecommendation === 'STRONG_BUY') {
          title = `⭐ ${pick.name} ${pick.bestSignal!.bias} — STRONG BUY!`
          body = `${rec.tradeTypeLabel} • Score ${rec.finalScore.toFixed(0)}/100 • Hold: ${rec.estimatedHoldTime}`
        } else if (rec?.finalRecommendation === 'AVOID') {
          title = `⚠️ ${pick.name} — AVOID (event/conflict)`
          body = `${rec.recommendationReason}`
        } else if (isDeepPassed) {
          title = `✅ ${pick.name} ${pick.bestSignal!.bias} — 6-Layer Validated`
          body = `${pick.bestSignal!.styleName} • Score ${deep?.totalLayerScore.toFixed(0)}/100`
        } else if (isStrongConfluence) {
          title = `🔥 ${pick.name} ${pick.bestSignal!.bias} — Strong Confluence`
          body = `${pick.bestSignal!.styleName} • Confluence: ${deep?.confluence}`
        }
        
        showNotification(title, body, pick.symbol)
        alertsSent++
        browserPushSent++
      }
      
      // WhatsApp (semi-auto): for deep-passed + recommended only
      if (scannerConfig.notifyWhatsApp && whatsappPhone && isDeepPassed && isRecommended) {
        const waMessage = formatWhatsAppMessage(pick)
        const waUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(waMessage)}`
        window.open(waUrl, '_blank')
        alertsSent++
      }
      
      // Email (semi-auto): for deep-passed + recommended only
      if (scannerConfig.notifyEmail && emailAddress && isDeepPassed && isRecommended) {
        const subject = `🚨 ${pick.name} ${pick.bestSignal!.bias} — ${rec?.finalRecommendation || 'Signal'}`
        const body = formatWhatsAppMessage(pick)
        const mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        window.open(mailtoUrl, '_blank')
        alertsSent++
      }
    }
    
    if (alertsSent > 0) {
      updateScheduledScan({
        totalAlertsSent: scheduledScan.totalAlertsSent + alertsSent,
      })
      pushAlert({
        type: 'INFO',
        title: '📊 Notification Summary',
        message: `${telegramSent} Telegram (deep+recommended) + ${browserPushSent} Browser Push (all candidates)`,
      })
    }
  }

  // Helper to get macro data (cached in component)
  const [cachedMacro, setCachedMacro] = useState<{ fearGreed: number; fearGreedLabel: string } | null>(null)
  async function getScanMacroData() {
    if (cachedMacro) return cachedMacro
    try {
      const { getFearGreedIndex } = await import('@/lib/macro')
      const fg = await getFearGreedIndex()
      const data = { fearGreed: fg?.value || 50, fearGreedLabel: fg?.classification || 'Neutral' }
      setCachedMacro(data)
      return data
    } catch {
      return { fearGreed: 50, fearGreedLabel: 'Neutral' }
    }
  }

  // ---- Auto-schedule ----
  useEffect(() => {
    if (scheduleRef.current) {
      clearInterval(scheduleRef.current)
      scheduleRef.current = null
    }
    
    if (scannerConfig.autoScheduleHours > 0) {
      const intervalMs = scannerConfig.autoScheduleHours * 3600 * 1000
      updateScheduledScan({
        enabled: true,
        intervalHours: scannerConfig.autoScheduleHours,
        nextScanAt: new Date(Date.now() + intervalMs).toISOString(),
      })
      
      scheduleRef.current = setInterval(() => {
        console.log('Auto-scan triggered')
        runScan()
      }, intervalMs)
    } else {
      updateScheduledScan({
        enabled: false,
        intervalHours: 0,
        nextScanAt: null,
      })
    }
    
    return () => {
      if (scheduleRef.current) clearInterval(scheduleRef.current)
    }
  }, [scannerConfig.autoScheduleHours])

  const toggleStyle = (style: typeof STYLE_OPTIONS[number]['value']) => {
    const current = scannerConfig.styles
    if (current.includes(style)) {
      updateScannerConfig({ styles: current.filter(s => s !== style) })
    } else {
      updateScannerConfig({ styles: [...current, style] })
    }
  }

  const fmt = (n: number) => n < 1 ? n.toFixed(5) : n < 100 ? n.toFixed(3) : n.toFixed(2)
  const progressPct = progress.total > 0 ? (progress.scanned / progress.total) * 100 : 0

  return (
    <div className="space-y-3">
      {/* Warning */}
      <Alert className="border-yellow-800 bg-yellow-950/30">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <AlertTitle className="text-xs text-yellow-300">⚠️ Hybrid Scanner (6-Layer Validation)</AlertTitle>
        <AlertDescription className="text-xs text-yellow-200 space-y-1">
          <div><strong>Phase 1 (Fast):</strong> Scan 30 pairs × 4 styles → get all candidates (~1-2 min)</div>
          <div><strong>Phase 2 (Deep):</strong> Top 5 candidates → run Layer 1 (Macro) + Layer 3 (Fundamental) + Layer 5 (Checklist)</div>
          <div><strong>Telegram alerts:</strong> ONLY for 6-layer validated setups (high quality, low spam)</div>
          <div><strong>Browser push:</strong> For all candidates (broader, you filter manually)</div>
          <div><strong>Confluence:</strong> 2+ styles agree = STRONG, 3+ = MEGA (highest priority)</div>
        </AlertDescription>
      </Alert>

      {/* Notification Channels Setup */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notification Channels
            </CardTitle>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowSetup(!showSetup)}>
              <SettingsIcon className="h-3 w-3 mr-1" />
              {showSetup ? 'Hide' : 'Setup'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 p-2 rounded border border-zinc-800">
              <Checkbox
                checked={scannerConfig.notifyTelegram}
                onCheckedChange={(v) => updateScannerConfig({ notifyTelegram: v === true })}
              />
              <Send className="h-3 w-3 text-blue-400" />
              <span>Telegram</span>
            </label>
            <label className="flex items-center gap-2 p-2 rounded border border-zinc-800">
              <Checkbox
                checked={scannerConfig.notifyBrowserPush}
                onCheckedChange={(v) => updateScannerConfig({ notifyBrowserPush: v === true })}
              />
              <Bell className="h-3 w-3 text-emerald-400" />
              <span>Browser Push</span>
            </label>
            <label className="flex items-center gap-2 p-2 rounded border border-zinc-800">
              <Checkbox
                checked={scannerConfig.notifyWhatsApp}
                onCheckedChange={(v) => updateScannerConfig({ notifyWhatsApp: v === true })}
              />
              <MessageCircle className="h-3 w-3 text-emerald-500" />
              <span>WhatsApp (link)</span>
            </label>
            <label className="flex items-center gap-2 p-2 rounded border border-zinc-800">
              <Checkbox
                checked={scannerConfig.notifyEmail}
                onCheckedChange={(v) => updateScannerConfig({ notifyEmail: v === true })}
              />
              <Mail className="h-3 w-3 text-orange-400" />
              <span>Email (link)</span>
            </label>
          </div>

          {showSetup && (
            <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
              {scannerConfig.notifyTelegram && (
                <div className="space-y-1">
                  <Label className="text-xs">Telegram Bot Token</Label>
                  <Input
                    type="password"
                    value={telegramBotToken}
                    onChange={(e) => {
                      setTelegramBotToken(e.target.value)
                      localStorage.setItem('telegram-bot-token', e.target.value)
                    }}
                    placeholder="123456789:ABCdef..."
                    className="bg-zinc-950 border-zinc-700 text-xs font-mono"
                  />
                  <Label className="text-xs">Telegram Chat ID</Label>
                  <Input
                    value={telegramChatId}
                    onChange={(e) => {
                      setTelegramChatId(e.target.value)
                      localStorage.setItem('telegram-chat-id', e.target.value)
                    }}
                    placeholder="123456789"
                    className="bg-zinc-950 border-zinc-700 text-xs font-mono"
                  />
                  <div className="text-[10px] text-zinc-500">
                    Setup guide ada di tab "Telegram"
                  </div>
                </div>
              )}
              {scannerConfig.notifyWhatsApp && (
                <div className="space-y-1">
                  <Label className="text-xs">WhatsApp Number (intl format, no +)</Label>
                  <Input
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="6281234567890"
                    className="bg-zinc-950 border-zinc-700 text-xs font-mono"
                  />
                  <div className="text-[10px] text-zinc-500">
                    ⚠️ Pakai wa.me link — Anda klik untuk kirim manual (WhatsApp tidak bisa auto gratis)
                  </div>
                </div>
              )}
              {scannerConfig.notifyEmail && (
                <div className="space-y-1">
                  <Label className="text-xs">Email Address</Label>
                  <Input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="anda@email.com"
                    className="bg-zinc-950 border-zinc-700 text-xs"
                  />
                  <div className="text-[10px] text-zinc-500">
                    ⚠️ Pakai mailto link — email app terbuka, Anda klik send manual
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanner Config */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4" />
            Scanner Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Top Pairs</Label>
              <Select 
                value={String(scannerConfig.topPairsLimit)} 
                onValueChange={(v) => updateScannerConfig({ topPairsLimit: parseInt(v) })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 pairs</SelectItem>
                  <SelectItem value="20">20 pairs</SelectItem>
                  <SelectItem value="30">30 pairs (recommended)</SelectItem>
                  <SelectItem value="50">50 pairs (slow)</SelectItem>
                  <SelectItem value="100">100 pairs (very slow)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Min Confidence</Label>
              <Select 
                value={String(scannerConfig.minConfidence)} 
                onValueChange={(v) => updateScannerConfig({ minConfidence: parseInt(v) })}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50% (loose)</SelectItem>
                  <SelectItem value="60">60% (medium)</SelectItem>
                  <SelectItem value="65">65% (recommended)</SelectItem>
                  <SelectItem value="75">75% (strict)</SelectItem>
                  <SelectItem value="85">85% (very strict)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Min 24h Volume (USD)</Label>
            <Input
              type="number"
              value={scannerConfig.minVolume24h}
              onChange={(e) => updateScannerConfig({ minVolume24h: parseFloat(e.target.value) || 0 })}
              step="1000000"
              className="bg-zinc-950 border-zinc-700 text-sm"
            />
            <div className="text-[10px] text-zinc-500 mt-1">
              Default: $10M (filter low-liquidity coins)
            </div>
          </div>

          <div>
            <Label className="text-xs">Trading Styles to Scan</Label>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {STYLE_OPTIONS.map(s => (
                <label key={s.value} className="flex items-start gap-2 p-2 rounded border border-zinc-800 text-xs cursor-pointer">
                  <Checkbox
                    checked={scannerConfig.styles.includes(s.value)}
                    onCheckedChange={() => toggleStyle(s.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium">{s.label}</div>
                    <div className="text-[10px] text-zinc-500">{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Auto-Schedule (background scan)</Label>
            <Select 
              value={String(scannerConfig.autoScheduleHours)} 
              onValueChange={(v) => updateScannerConfig({ autoScheduleHours: parseInt(v) })}
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Manual only</SelectItem>
                <SelectItem value="1">Every 1 hour</SelectItem>
                <SelectItem value="4">Every 4 hours</SelectItem>
                <SelectItem value="12">Every 12 hours</SelectItem>
                <SelectItem value="24">Every 24 hours</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-[10px] text-zinc-500 mt-1">
              ⚠️ Tab harus tetap terbuka. Close browser = schedule stop.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Run Scan Button */}
      <Button 
        onClick={runScan} 
        disabled={scanning}
        className="w-full"
        size="lg"
      >
        {scanning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Scanning... {progress.scanned}/{progress.total} ({progress.found} found)
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Run Scan Now ({scannerConfig.topPairsLimit} pairs)
          </>
        )}
      </Button>

      {/* Progress bar */}
      {scanning && progress.total > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400 mb-1">Progress: {progressPct.toFixed(0)}%</div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              Found: {progress.found} setups so far
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Scan Summary */}
      {lastScanSummary && !scanning && (
        <>
          <Card className="bg-zinc-900/50 border-zinc-800 border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Last Scan Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-950/50 p-2 rounded">
                  <div className="text-zinc-500">Scanned</div>
                  <div className="font-mono font-bold">{lastScanSummary.totalScanned} pairs</div>
                </div>
                <div className="bg-zinc-950/50 p-2 rounded">
                  <div className="text-zinc-500">Setups Found</div>
                  <div className="font-mono font-bold text-emerald-400">{lastScanSummary.totalWithSignals}</div>
                </div>
                <div className="bg-emerald-950/30 p-2 rounded">
                  <div className="text-zinc-500">Long Signals</div>
                  <div className="font-mono font-bold text-emerald-400">{lastScanSummary.longSignals}</div>
                </div>
                <div className="bg-red-950/30 p-2 rounded">
                  <div className="text-zinc-500">Short Signals</div>
                  <div className="font-mono font-bold text-red-400">{lastScanSummary.shortSignals}</div>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>Duration: {lastScanSummary.duration.toFixed(1)}s</span>
                <span>{new Date(lastScanSummary.scannedAt).toLocaleString('id-ID')}</span>
              </div>
              {lastScanSummary.errors.length > 0 && (
                <div className="text-[10px] text-yellow-400">
                  ⚠️ {lastScanSummary.errors.length} errors (some pairs skipped)
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Picks */}
          {lastScanSummary.topPicks.length > 0 && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Top Picks ({lastScanSummary.topPicks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {lastScanSummary.topPicks.map((result, idx) => (
                      <ScannerResultCard 
                        key={result.symbol} 
                        result={result} 
                        rank={idx + 1}
                        onNotify={() => sendNotifications([result])}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Schedule Status */}
      {scheduledScan.enabled && (
        <Card className="bg-blue-950/20 border-blue-800 border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <div className="flex-1">
                <div className="text-xs font-medium text-blue-300">
                  Auto-Schedule Active
                </div>
                <div className="text-[10px] text-blue-400">
                  Every {scheduledScan.intervalHours}h • Next: {scheduledScan.nextScanAt ? new Date(scheduledScan.nextScanAt).toLocaleString('id-ID') : 'N/A'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-zinc-500">Total Scans</div>
                <div className="text-xs font-bold">{scheduledScan.totalScansRun}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Alerts Sent</div>
                <div className="text-xs font-bold text-emerald-400">{scheduledScan.totalAlertsSent}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="bg-zinc-900/30 border-zinc-800/50">
        <CardContent className="p-3 text-xs space-y-1 text-zinc-500">
          <div className="font-semibold text-zinc-400 mb-1">Cara Pakai:</div>
          <div>1. Set notification channels (Telegram recommended)</div>
          <div>2. Configure scanner (pairs, confidence, styles)</div>
          <div>3. Klik "Run Scan Now" untuk manual</div>
          <div>4. Atau set auto-schedule (1h/4h/12h/24h)</div>
          <div>5. Setups dengan confidence &gt; threshold akan dikirim ke channel aktif</div>
          <div className="mt-2 pt-2 border-t border-zinc-800">
            ⚠️ Filter confidence 65%+ untuk hindari alert spam. 50% = terlalu noisy.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Scanner Result Card ----
function ScannerResultCard({ 
  result, 
  rank,
  onNotify 
}: { 
  result: EnhancedScannerResult
  rank: number
  onNotify: () => void
}) {
  const sig = result.bestSignal!
  const deep = result.deepAnalysis
  const mtf = result.mtfAnalysis
  const events = result.eventIntelligence
  const rec = result.smartRecommendation
  const fmt = (n: number) => n < 1 ? n.toFixed(5) : n < 100 ? n.toFixed(3) : n.toFixed(2)
  
  // Determine card styling based on recommendation
  const cardBorder = rec?.finalRecommendation === 'STRONG_BUY' 
    ? 'border-l-emerald-500 bg-emerald-950/20'
    : rec?.finalRecommendation === 'AVOID'
    ? 'border-l-red-500 bg-red-950/20'
    : deep?.passedDeepAnalysis 
    ? 'border-l-emerald-500 bg-emerald-950/10'
    : deep?.confluence === 'MEGA' || deep?.confluence === 'STRONG'
    ? 'border-l-blue-500'
    : sig.bias === 'LONG' 
    ? 'border-l-emerald-500' 
    : 'border-l-red-500'
  
  return (
    <div className={`p-2 rounded border border-zinc-800 bg-zinc-950/50 border-l-4 ${cardBorder}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-zinc-500">#{rank}</span>
            <span className="font-bold text-sm">{result.name}</span>
            <Badge variant={sig.bias === 'LONG' ? 'default' : 'destructive'} className="text-[9px]">
              {sig.bias === 'LONG' ? <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
              {sig.bias}
            </Badge>
            <Badge variant="outline" className="text-[9px]">
              {sig.styleName}
            </Badge>
            {/* Confluence badge */}
            {deep?.confluence === 'MEGA' && (
              <Badge className="text-[9px] bg-purple-600 hover:bg-purple-600">
                🔥 MEGA ({deep.confluenceStyles.length} styles)
              </Badge>
            )}
            {deep?.confluence === 'STRONG' && (
              <Badge className="text-[9px] bg-blue-600 hover:bg-blue-600">
                ✅ STRONG (2 styles)
              </Badge>
            )}
            {/* 6-Layer validated badge */}
            {deep?.passedDeepAnalysis && (
              <Badge className="text-[9px] bg-emerald-600 hover:bg-emerald-600">
                ⭐ 6-LAYER VALIDATED
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            ${fmt(result.price)} • {result.change24h >= 0 ? '+' : ''}{result.change24h.toFixed(2)}% 24h • Vol ${formatNumber(result.volume24h)}
          </div>
        </div>
        <div className="text-right">
          {deep ? (
            <>
              <div className="text-base font-bold text-emerald-400">{deep.totalLayerScore.toFixed(0)}</div>
              <div className="text-[10px] text-zinc-500">6-layer score</div>
              <div className="text-[10px] text-zinc-400">conf: {sig.confidence.toFixed(0)}%</div>
            </>
          ) : (
            <>
              <div className="text-base font-bold">{sig.confidence.toFixed(0)}%</div>
              <div className="text-[10px] text-zinc-500">confidence</div>
            </>
          )}
          <div className="text-[10px] text-emerald-400">1:{sig.rr.toFixed(2)}</div>
        </div>
      </div>
      
      {/* Trade Plan */}
      <div className="grid grid-cols-4 gap-1 text-[10px]">
        <div>
          <span className="text-zinc-500">Entry:</span>
          <div className="font-mono text-blue-400">{fmt(sig.entry)}</div>
        </div>
        <div>
          <span className="text-zinc-500">SL:</span>
          <div className="font-mono text-red-400">{fmt(sig.stopLoss)}</div>
        </div>
        <div>
          <span className="text-zinc-500">TP1:</span>
          <div className="font-mono text-emerald-400">{fmt(sig.takeProfits.tp1)}</div>
        </div>
        <div>
          <span className="text-zinc-500">TP2:</span>
          <div className="font-mono text-emerald-400">{fmt(sig.takeProfits.tp2)}</div>
        </div>
      </div>
      
      {/* Deep Analysis Breakdown */}
      {deep && (
        <div className="mt-2 pt-2 border-t border-zinc-800">
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div className="bg-zinc-950/50 p-1 rounded">
              <div className="text-zinc-500">L1 Macro</div>
              <div className={`font-mono font-bold ${deep.macroAligned ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {deep.macroScore.toFixed(0)} {deep.macroAligned ? '✅' : '⚠️'}
              </div>
            </div>
            <div className="bg-zinc-950/50 p-1 rounded">
              <div className="text-zinc-500">L3 Fund</div>
              <div className={`font-mono font-bold ${deep.fundamentalPass ? 'text-emerald-400' : 'text-red-400'}`}>
                {deep.fundamentalScore.toFixed(0)} {deep.fundamentalPass ? '✅' : '❌'}
              </div>
            </div>
            <div className="bg-zinc-950/50 p-1 rounded">
              <div className="text-zinc-500">L5 Check</div>
              <div className={`font-mono font-bold ${deep.checklistPassed ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {deep.checklistScore.toFixed(0)} {deep.checklistPassed ? '✅' : '⚠️'}
              </div>
            </div>
          </div>
          
          {/* Recommendation */}
          <div className={`mt-1 p-1 rounded text-[10px] text-center font-medium ${
            deep.recommendation === 'STRONG_BUY' ? 'bg-emerald-900/50 text-emerald-300' :
            deep.recommendation === 'BUY' ? 'bg-blue-900/50 text-blue-300' :
            deep.recommendation === 'WATCH' ? 'bg-yellow-900/50 text-yellow-300' :
            'bg-red-900/50 text-red-300'
          }`}>
            {deep.recommendation === 'STRONG_BUY' && '⭐ STRONG BUY — '}
            {deep.recommendation === 'BUY' && '✅ BUY — '}
            {deep.recommendation === 'WATCH' && '👀 WATCH — '}
            {deep.recommendation === 'AVOID' && '❌ AVOID — '}
            {deep.recommendationReason}
          </div>
          
          {/* Confluence styles */}
          {deep.confluenceStyles.length > 1 && (
            <div className="mt-1 text-[10px] text-zinc-500">
              Styles agree: {deep.confluenceStyles.join(' + ')}
            </div>
          )}
          
          {/* Macro notes */}
          {deep.macroNotes.length > 0 && (
            <div className="mt-1">
              {deep.macroNotes.slice(0, 2).map((n, i) => (
                <div key={i} className="text-[9px] text-zinc-500">{n}</div>
              ))}
            </div>
          )}
          
          {/* Fundamental notes */}
          {deep.fundamentalNotes.length > 0 && (
            <div className="mt-1">
              {deep.fundamentalNotes.slice(0, 2).map((n, i) => (
                <div key={i} className="text-[9px] text-zinc-500">{n}</div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Style Reasons (if no deep analysis) */}
      {!deep && sig.reasons.length > 0 && (
        <div className="mt-2 pt-2 border-t border-zinc-800">
          <div className="text-[10px] text-zinc-500 mb-1">Reasons:</div>
          {sig.reasons.slice(0, 3).map((r, i) => (
            <div key={i} className="text-[10px] text-zinc-400">{r}</div>
          ))}
        </div>
      )}
      
      {/* Multi-Timeframe Analysis */}
      {mtf && (
        <div className="mt-2 pt-2 border-t border-zinc-800">
          <div className="text-[10px] text-zinc-500 mb-1">🕐 Multi-Timeframe ({mtf.alignmentScore.toFixed(0)}% aligned):</div>
          <div className="flex flex-wrap gap-1">
            {mtf.analyses.map(a => (
              <Badge key={a.timeframe} variant="outline" className={`text-[8px] ${
                a.signal === 'LONG' ? 'border-emerald-500 text-emerald-400' :
                a.signal === 'SHORT' ? 'border-red-500 text-red-400' : 'text-zinc-500'
              }`}>
                {a.timeframe}: {a.signal}
              </Badge>
            ))}
          </div>
          <div className="text-[9px] text-zinc-500 mt-1">
            {mtf.bullishCount}B / {mtf.bearishCount}B / {mtf.neutralCount}N
            {mtf.conflict && <span className="text-red-400 ml-1">⚠️ CONFLICT</span>}
          </div>
        </div>
      )}
      
      {/* Event Intelligence */}
      {events && events.marketRiskLevel !== 'LOW' && (
        <div className={`mt-2 pt-2 border-t border-zinc-800 p-1 rounded ${
          events.marketRiskLevel === 'CRITICAL' ? 'bg-red-950/30' :
          events.marketRiskLevel === 'HIGH' ? 'bg-orange-950/30' :
          'bg-yellow-950/30'
        }`}>
          <div className="text-[10px] font-medium text-zinc-400">
            📅 Event Risk: <span className={
              events.marketRiskLevel === 'CRITICAL' ? 'text-red-400' :
              events.marketRiskLevel === 'HIGH' ? 'text-orange-400' :
              'text-yellow-400'
            }>{events.marketRiskLevel}</span>
          </div>
          <div className="text-[9px] text-zinc-500 mt-0.5">{events.recommendationReason}</div>
        </div>
      )}
      
      {/* Smart Recommendation */}
      {rec && (
        <div className={`mt-2 pt-2 border-t border-zinc-800 p-2 rounded ${
          rec.finalRecommendation === 'STRONG_BUY' ? 'bg-emerald-950/40' :
          rec.finalRecommendation === 'BUY' ? 'bg-blue-950/40' :
          rec.finalRecommendation === 'WATCH' ? 'bg-yellow-950/40' :
          'bg-red-950/40'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold">
              🏆 {rec.finalRecommendation.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] font-mono">
              Score: {rec.finalScore.toFixed(0)}/100
            </span>
          </div>
          <div className="text-[9px] text-zinc-400 mb-1">
            📋 {rec.tradeTypeLabel} • ⏱️ {rec.estimatedHoldTime}
          </div>
          <div className="text-[9px] text-zinc-500">
            💡 {rec.recommendationReason}
          </div>
          
          {/* Detailed Trade Plan */}
          <div className="mt-2 pt-1 border-t border-zinc-800/50">
            <div className="text-[9px] text-zinc-400 mb-0.5">
              Entry: {rec.entryStrategy.replace(/_/g, ' ')}
            </div>
            <div className="text-[9px] text-zinc-500 mb-0.5">
              Trigger: {rec.entryTrigger}
            </div>
            <div className="grid grid-cols-4 gap-1 text-[9px] mt-1">
              <div>
                <span className="text-zinc-500">SL:</span>
                <div className="font-mono text-red-400">{fmt(rec.stopLoss)}</div>
                <div className="text-[8px] text-zinc-600">-{rec.stopLossPercentage.toFixed(1)}%</div>
              </div>
              <div>
                <span className="text-zinc-500">TP1:</span>
                <div className="font-mono text-emerald-400">{fmt(rec.takeProfits.tp1.price)}</div>
                <div className="text-[8px] text-zinc-600">1:{rec.takeProfits.tp1.rr.toFixed(1)}</div>
              </div>
              <div>
                <span className="text-zinc-500">TP2:</span>
                <div className="font-mono text-emerald-400">{fmt(rec.takeProfits.tp2.price)}</div>
                <div className="text-[8px] text-zinc-600">1:{rec.takeProfits.tp2.rr.toFixed(1)}</div>
              </div>
              <div>
                <span className="text-zinc-500">TP3:</span>
                <div className="font-mono text-emerald-400">{fmt(rec.takeProfits.tp3.price)}</div>
                <div className="text-[8px] text-zinc-600">1:{rec.takeProfits.tp3.rr.toFixed(1)}</div>
              </div>
            </div>
            
            {/* Risk */}
            <div className="mt-1 pt-1 border-t border-zinc-800/50">
              <div className="text-[9px] text-zinc-400">
                💰 Risk: <span className="font-mono">{rec.positionSize}</span>
                <span className="text-zinc-500 ml-1">(Max loss: ${rec.maxLossUSD.toFixed(2)})</span>
              </div>
            </div>
            
            {/* Rules */}
            <div className="mt-1 pt-1 border-t border-zinc-800/50">
              <div className="text-[9px] text-zinc-500 mb-0.5">📜 Rules:</div>
              {rec.rules.slice(0, 3).map((rule, i) => (
                <div key={i} className="text-[8px] text-zinc-500">• {rule}</div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <Button size="sm" variant="outline" className="w-full mt-2 text-xs h-6" onClick={onNotify}>
        <Send className="h-3 w-3 mr-1" />
        {rec?.finalRecommendation === 'STRONG_BUY' ? 'Send Alert (STRONG BUY)' :
         rec?.finalRecommendation === 'AVOID' ? 'Send Alert (AVOID warning)' :
         deep?.passedDeepAnalysis ? 'Send Alert (6-Layer Validated)' : 'Send Alert'}
      </Button>
    </div>
  )
}
