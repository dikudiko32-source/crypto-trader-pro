'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Wallet, KeyRound, Shield, Settings as SettingsIcon, AlertTriangle, CheckCircle2, Info, RefreshCw, Lock, Zap } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { getTicker24h } from '@/lib/binance'
import type { BinanceBalance } from '@/lib/types'

export function PortfolioTracker() {
  const { settings } = useAppStore()
  const [newSymbol, setNewSymbol] = useState('')
  const [newQty, setNewQty] = useState(0)
  const [newEntry, setNewEntry] = useState(0)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  // Load saved holdings from localStorage (lazy init via useState)
  const [holdings, setHoldings] = useState<Array<{ symbol: string; quantity: number; entryPrice: number }>>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('crypto-holdings')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return []
      }
    }
    return []
  })

  // Save holdings
  useEffect(() => {
    localStorage.setItem('crypto-holdings', JSON.stringify(holdings))
  }, [holdings])

  // Fetch prices for holdings
  useEffect(() => {
    async function fetchPrices() {
      if (holdings.length === 0) return
      setLoading(true)
      const newPrices: Record<string, number> = {}
      for (const h of holdings) {
        const ticker = await getTicker24h(h.symbol.endsWith('USDT') ? h.symbol : h.symbol + 'USDT')
        if (ticker) newPrices[h.symbol] = ticker.lastPrice
      }
      setPrices(newPrices)
      setLoading(false)
    }
    fetchPrices()
    const interval = setInterval(fetchPrices, 30000)
    return () => clearInterval(interval)
  }, [holdings])

  function addHolding() {
    if (!newSymbol || newQty <= 0) return
    setHoldings(prev => [...prev, { 
      symbol: newSymbol.toUpperCase(), 
      quantity: newQty, 
      entryPrice: newEntry 
    }])
    setNewSymbol('')
    setNewQty(0)
    setNewEntry(0)
  }

  function removeHolding(symbol: string) {
    setHoldings(prev => prev.filter(h => h.symbol !== symbol))
  }

  // Calculate portfolio stats
  const portfolioValue = holdings.reduce((sum, h) => {
    const price = prices[h.symbol] || h.entryPrice
    return sum + h.quantity * price
  }, 0)
  
  const portfolioCost = holdings.reduce((sum, h) => sum + h.quantity * h.entryPrice, 0)
  const totalPnl = portfolioValue - portfolioCost
  const totalPnlPercent = portfolioCost > 0 ? (totalPnl / portfolioCost) * 100 : 0

  const usdToIdr = 15800
  const portfolioValueIdr = portfolioValue * usdToIdr

  return (
    <div className="space-y-3">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Manual portfolio entry. To sync with Binance automatically, add your API key in Settings (read-only permission).
        </AlertDescription>
      </Alert>

      {/* Portfolio Summary */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Portfolio Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-zinc-500">Total Value</div>
              <div className="text-lg font-bold">${portfolioValue.toFixed(2)}</div>
              <div className="text-zinc-500">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(portfolioValueIdr)}</div>
            </div>
            <div>
              <div className="text-zinc-500">Total P&L</div>
              <div className={`text-lg font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </div>
              <div className={totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                {totalPnl >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
            Cost Basis: ${portfolioCost.toFixed(2)} • {holdings.length} holdings
          </div>
        </CardContent>
      </Card>

      {/* Add Holding */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Add Holding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Symbol</Label>
              <Input
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="BTC"
                className="bg-zinc-950 border-zinc-700 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                step="any"
                value={newQty || ''}
                onChange={(e) => setNewQty(parseFloat(e.target.value) || 0)}
                placeholder="0.5"
                className="bg-zinc-950 border-zinc-700 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Entry $</Label>
              <Input
                type="number"
                step="any"
                value={newEntry || ''}
                onChange={(e) => setNewEntry(parseFloat(e.target.value) || 0)}
                placeholder="45000"
                className="bg-zinc-950 border-zinc-700 text-xs"
              />
            </div>
          </div>
          <Button onClick={addHolding} size="sm" className="w-full">
            Add Holding
          </Button>
        </CardContent>
      </Card>

      {/* Holdings List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Holdings ({holdings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No holdings added yet.
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {holdings.map(h => {
                  const currentPrice = prices[h.symbol] || h.entryPrice
                  const value = h.quantity * currentPrice
                  const cost = h.quantity * h.entryPrice
                  const pnl = value - cost
                  const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0
                  return (
                    <div key={h.symbol} className="p-2 rounded border border-zinc-800 bg-zinc-950/50 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{h.symbol}</div>
                          <div className="text-zinc-500">
                            {h.quantity} @ ${h.entryPrice.toFixed(2)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-red-400 hover:text-red-300"
                          onClick={() => removeHolding(h.symbol)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="flex justify-between mt-1 pt-1 border-t border-zinc-800">
                        <div>
                          <span className="text-zinc-500">Now:</span> <span className="font-mono">${currentPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Value:</span> <span className="font-mono">${value.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <div>
                          <span className="text-zinc-500">P&L:</span>{' '}
                          <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="text-center text-xs text-zinc-500">Updating prices...</div>
      )}
    </div>
  )
}

// ---- Binance Auto-Sync Component (Phase 2) ----
export function BinanceAutoSync() {
  const { settings, updateSettings, autoSyncEnabled, setAutoSyncEnabled } = useAppStore()
  const [balances, setBalances] = useState<BinanceBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [showEnableDialog, setShowEnableDialog] = useState(false)
  const [acknowledged, setAcknowledged] = useState({
    read_only: false,
    no_withdraw: false,
    ip_whitelist: false,
    risk_accepted: false,
  })

  async function syncBalances() {
    if (!settings.binanceApiKey || !settings.binanceApiSecret) {
      setError('API key/secret belum di-set di Settings')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/binance/account', {
        headers: {
          'x-binance-api-key': settings.binanceApiKey,
          'x-binance-api-secret': settings.binanceApiSecret,
        },
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.details || errData.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      
      // Get current prices for all assets
      const nonBtcBalances = data.balances.filter((b: BinanceBalance) => b.asset !== 'BTC')
      const pricePromises = nonBtcBalances.map(async (b: BinanceBalance) => {
        if (b.asset === 'USDT' || b.asset === 'BUSD' || b.asset === 'USDC') {
          return { ...b, usdValue: b.free + b.locked }
        }
        const ticker = await getTicker24h(`${b.asset}USDT`)
        const price = ticker?.lastPrice || 0
        return { ...b, usdValue: (b.free + b.locked) * price }
      })
      
      const btcBalance = data.balances.find((b: BinanceBalance) => b.asset === 'BTC')
      if (btcBalance) {
        const btcTicker = await getTicker24h('BTCUSDT')
        const btcPrice = btcTicker?.lastPrice || 0
        pricePromises.push(Promise.resolve({
          ...btcBalance,
          usdValue: (btcBalance.free + btcBalance.locked) * btcPrice,
        }))
      }
      
      const balancesWithUsd = await Promise.all(pricePromises)
      setBalances(balancesWithUsd)
      setLastSync(new Date().toISOString())
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setLoading(false)
    }
  }

  // Auto-sync every 60 seconds when enabled
  useEffect(() => {
    if (!autoSyncEnabled) return
    syncBalances()
    const interval = setInterval(syncBalances, 60000)
    return () => clearInterval(interval)
  }, [autoSyncEnabled, settings.binanceApiKey, settings.binanceApiSecret])

  const totalUsd = balances.reduce((sum, b) => sum + b.usdValue, 0)

  function tryEnable() {
    // Check all acknowledgements
    if (!acknowledged.read_only || !acknowledged.no_withdraw || !acknowledged.ip_whitelist || !acknowledged.risk_accepted) {
      return
    }
    if (!settings.binanceApiKey || !settings.binanceApiSecret) {
      setError('Set API key/secret di Settings dulu')
      return
    }
    setAutoSyncEnabled(true)
    setShowEnableDialog(false)
  }

  if (!autoSyncEnabled) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800 border-l-2 border-l-yellow-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4 text-yellow-400" />
            Binance Auto-Sync (DISABLED)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="border-yellow-800 bg-yellow-950/30">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-xs text-yellow-200">
              <strong>⚠️ Risiko aktifasi auto-sync:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>API key bocor = hacker bisa lihat balance Anda</li>
                <li>Privacy: data portfolio ter-expose di server Vercel</li>
                <li>False sense of security — tetap cek manual</li>
                <li>Binance bisa flag account untuk "suspicious API usage"</li>
              </ul>
            </AlertDescription>
          </Alert>

          {settings.binanceApiKey ? (
            <Dialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Zap className="h-3 w-3 mr-1" />
                  Enable Auto-Sync
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-sm">⚠️ Acknowledge Risks</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-xs">
                  <p className="text-zinc-400">Centang SEMUA untuk konfirmasi Anda paham risiko:</p>
                  <label className="flex items-start gap-2 p-2 rounded hover:bg-zinc-800/50 cursor-pointer">
                    <Checkbox
                      checked={acknowledged.read_only}
                      onCheckedChange={(v) => setAcknowledged({ ...acknowledged, read_only: v === true })}
                      className="mt-0.5"
                    />
                    <span>API key saya sudah <strong>READ-ONLY</strong> (tidak enable trading/withdrawal)</span>
                  </label>
                  <label className="flex items-start gap-2 p-2 rounded hover:bg-zinc-800/50 cursor-pointer">
                    <Checkbox
                      checked={acknowledged.no_withdraw}
                      onCheckedChange={(v) => setAcknowledged({ ...acknowledged, no_withdraw: v === true })}
                      className="mt-0.5"
                    />
                    <span>Saya TIDAK PERNAH enable Withdrawal permission</span>
                  </label>
                  <label className="flex items-start gap-2 p-2 rounded hover:bg-zinc-800/50 cursor-pointer">
                    <Checkbox
                      checked={acknowledged.ip_whitelist}
                      onCheckedChange={(v) => setAcknowledged({ ...acknowledged, ip_whitelist: v === true })}
                      className="mt-0.5"
                    />
                    <span>Saya sudah aktifkan IP Whitelist di Binance API settings</span>
                  </label>
                  <label className="flex items-start gap-2 p-2 rounded hover:bg-zinc-800/50 cursor-pointer">
                    <Checkbox
                      checked={acknowledged.risk_accepted}
                      onCheckedChange={(v) => setAcknowledged({ ...acknowledged, risk_accepted: v === true })}
                      className="mt-0.5"
                    />
                    <span>Saya paham risiko & akan rotate API key tiap 90 hari</span>
                  </label>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    onClick={tryEnable}
                    disabled={!acknowledged.read_only || !acknowledged.no_withdraw || !acknowledged.ip_whitelist || !acknowledged.risk_accepted}
                  >
                    Enable Auto-Sync
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Set Binance API key & secret di tab Settings dulu, lalu kembali ke sini untuk enable auto-sync.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 border-l-2 border-l-emerald-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Binance Auto-Sync (ACTIVE)
          </CardTitle>
          <Button size="sm" variant="ghost" className="text-xs text-red-400 h-6" onClick={() => setAutoSyncEnabled(false)}>
            Disable
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={syncBalances} disabled={loading}>
              {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Sync Now
            </Button>
            {lastSync && (
              <span className="text-xs text-zinc-500">
                Last: {new Date(lastSync).toLocaleTimeString('id-ID')}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Total Value</div>
            <div className="text-lg font-bold">${totalUsd.toFixed(2)}</div>
            <div className="text-xs text-zinc-500">
              Rp {new Intl.NumberFormat('id-ID').format(totalUsd * 15800)}
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-64">
          <div className="space-y-1">
            {balances.map(b => (
              <div key={b.asset} className="flex items-center justify-between p-2 rounded border border-zinc-800 text-xs">
                <div>
                  <div className="font-medium">{b.asset}</div>
                  <div className="text-zinc-500 font-mono">
                    {b.free.toFixed(b.free < 1 ? 6 : 4)} free
                    {b.locked > 0 && ` + ${b.locked.toFixed(4)} locked`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono">${b.usdValue.toFixed(2)}</div>
                  <div className="text-zinc-500 text-[10px]">
                    {((b.usdValue / totalUsd) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
            {balances.length === 0 && !loading && (
              <div className="text-center py-6 text-zinc-500 text-xs">
                No balances. Click "Sync Now" to fetch.
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="text-[10px] text-zinc-500">
          🔒 API calls di-sign dengan HMAC SHA256 server-side. Keys tidak pernah dikirim ke Binance dari browser langsung.
          Auto-sync setiap 60 detik. Disable kapan saja.
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Settings Component ----
export function SettingsPanel() {
  const { settings, updateSettings } = useAppStore()
  const [showApiGuide, setShowApiGuide] = useState(false)

  return (
    <div className="space-y-3">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Trading Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Capital (IDR)</Label>
              <Input
                type="number"
                value={settings.capital}
                onChange={(e) => updateSettings({ capital: parseFloat(e.target.value) || 0 })}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Risk per Trade (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.riskPerTrade}
                onChange={(e) => updateSettings({ riskPercent: parseFloat(e.target.value) || 0 })}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Max Concurrent Positions</Label>
              <Input
                type="number"
                value={settings.maxConcurrentPositions}
                onChange={(e) => updateSettings({ maxConcurrentPositions: parseInt(e.target.value) || 1 })}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Alert Threshold (60-100)</Label>
              <Input
                type="number"
                min="60"
                max="100"
                value={settings.alertThreshold}
                onChange={(e) => updateSettings({ alertThreshold: parseInt(e.target.value) || 70 })}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Daily DD Limit (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={settings.dailyDrawdownLimit}
                onChange={(e) => updateSettings({ dailyDrawdownLimit: parseFloat(e.target.value) || 5 })}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Weekly DD Limit (%)</Label>
              <Input
                type="number"
                step="0.5"
                value={settings.weeklyDrawdownLimit}
                onChange={(e) => updateSettings({ weeklyDrawdownLimit: parseFloat(e.target.value) || 10 })}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Setup */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Binance API Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              API key is stored locally on your device only. Use READ-ONLY permission — never enable Withdrawal.
            </AlertDescription>
          </Alert>

          <div>
            <Label className="text-xs">API Key</Label>
            <Input
              type="password"
              value={settings.binanceApiKey || ''}
              onChange={(e) => updateSettings({ binanceApiKey: e.target.value })}
              placeholder="Enter Binance API Key"
              className="bg-zinc-950 border-zinc-700 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">API Secret</Label>
            <Input
              type="password"
              value={settings.binanceApiSecret || ''}
              onChange={(e) => updateSettings({ binanceApiSecret: e.target.value })}
              placeholder="Enter Binance API Secret"
              className="bg-zinc-950 border-zinc-700 text-sm"
            />
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setShowApiGuide(!showApiGuide)}
          >
            {showApiGuide ? 'Hide' : 'Show'} API Setup Guide
          </Button>

          {showApiGuide && (
            <div className="bg-zinc-950/50 border border-zinc-800 rounded p-3 text-xs space-y-2">
              <div className="font-semibold text-zinc-300">How to Generate Binance API Key (Read-Only):</div>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                <li>Login to Binance web (api.binance.com)</li>
                <li>Click "API Management" → "Create API"</li>
                <li>Select "System Generated" → Label: "CryptoTracker-ReadOnly"</li>
                <li>Set permissions:
                  <ul className="list-disc list-inside ml-3 mt-1">
                    <li className="text-emerald-400">✅ Enable Reading</li>
                    <li className="text-red-400">❌ Enable Spot Trading</li>
                    <li className="text-red-400">❌ Enable Futures Trading</li>
                    <li className="text-red-400 font-bold">❌ Enable Withdrawals (NEVER!)</li>
                  </ul>
                </li>
                <li>Save API Key + Secret Key in secure place</li>
                <li>Optional: Enable IP Whitelist (recommended)</li>
                <li>Verify via email/SMS</li>
                <li>Done. Copy keys to fields above.</li>
              </ol>
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-[10px]">
                  NEVER share API keys. NEVER enable Withdrawal permission. If leaked, immediately delete & recreate.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {settings.binanceApiKey && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              API key configured
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trading Pairs */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Watchlist (Trading Pairs)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1 mb-2">
            {settings.tradingPairs.map(pair => (
              <Badge key={pair} variant="outline" className="text-[10px]">
                {pair}
                <button
                  onClick={() => updateSettings({ 
                    tradingPairs: settings.tradingPairs.filter(p => p !== pair) 
                  })}
                  className="ml-1 text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
          <AddPairInput />
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-zinc-900/30 border-zinc-800/50">
        <CardContent className="p-3 text-xs text-zinc-500 space-y-1">
          <div className="font-semibold text-zinc-400 mb-1">About This App:</div>
          <div>• 6-Layer Crypto Trading Analysis System</div>
          <div>• Real-time data: Binance + CoinGecko + Alternative.me</div>
          <div>• All data stored locally (privacy-first)</div>
          <div>• No registration required</div>
          <div>• PWA — add to home screen for app-like experience</div>
          <div className="mt-2 pt-2 border-t border-zinc-800 text-zinc-600">
            ⚠️ Educational tool only. Not financial advice. Always do your own research.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AddPairInput() {
  const { settings, updateSettings } = useAppStore()
  const [value, setValue] = useState('')
  
  function add() {
    if (!value) return
    const pair = value.toUpperCase().endsWith('USDT') ? value.toUpperCase() : value.toUpperCase() + 'USDT'
    if (!settings.tradingPairs.includes(pair)) {
      updateSettings({ tradingPairs: [...settings.tradingPairs, pair] })
    }
    setValue('')
  }
  
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="SOLUSDT"
        className="bg-zinc-950 border-zinc-700 text-xs"
        onKeyDown={(e) => e.key === 'Enter' && add()}
      />
      <Button size="sm" onClick={add}>Add</Button>
    </div>
  )
}
