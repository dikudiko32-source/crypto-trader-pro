'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Plus, TrendingUp, TrendingDown, X, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAppStore, formatIDR } from '@/store/app-store'
import { useBinancePrice } from '@/hooks/use-binance-ws'
import type { PaperTrade as PT } from '@/lib/types'

export function PaperTrading() {
  const { paperTrades, addPaperTrade, closePaperTrade, deletePaperTrade, paperBalance, setPaperBalance, settings } = useAppStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    symbol: 'BTCUSDT',
    side: 'LONG' as 'LONG' | 'SHORT',
    entryPrice: 0,
    quantity: 0,
    stopLoss: 0,
    tp1: 0,
    tp2: 0,
    tp3: 0,
    reason: '',
  })
  
  const openTrades = paperTrades.filter(t => t.status === 'OPEN')
  const closedTrades = paperTrades.filter(t => t.status === 'CLOSED')
  
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length
  const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0

  function submit() {
    if (form.entryPrice <= 0 || form.quantity <= 0) return
    const trade: PT = {
      id: Math.random().toString(36).slice(2),
      symbol: form.symbol.toUpperCase(),
      side: form.side,
      entryPrice: form.entryPrice,
      entryDate: new Date().toISOString(),
      quantity: form.quantity,
      stopLoss: form.stopLoss,
      takeProfits: [form.tp1, form.tp2, form.tp3].filter(p => p > 0),
      exitPrice: null,
      exitDate: null,
      pnl: null,
      pnlPercent: null,
      status: 'OPEN',
      reason: form.reason,
      currentPrice: null,
      unrealizedPnl: null,
    }
    addPaperTrade(trade)
    setForm({
      symbol: 'BTCUSDT', side: 'LONG', entryPrice: 0, quantity: 0,
      stopLoss: 0, tp1: 0, tp2: 0, tp3: 0, reason: '',
    })
    setOpen(false)
  }

  return (
    <div className="space-y-3">
      {/* Warning */}
      <Alert className="border-yellow-800 bg-yellow-950/30">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <AlertTitle className="text-xs text-yellow-300">⚠️ Paper Trading Reality Check</AlertTitle>
        <AlertDescription className="text-xs text-yellow-200">
          Paper trading bagus untuk test sistem, TAPI tidak menguji psikologi. Loss di paper trading tidak terasa sakit seperti real money.
          Jangan terlalu percaya diri setelah paper profit — real market berbeda.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Paper Balance</div>
            <div className="text-lg font-bold">{formatIDR(paperBalance)}</div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-5 text-[10px] text-zinc-500"
              onClick={() => setPaperBalance(settings.capital)}
            >
              Reset to capital
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Total P&L (closed)</div>
            <div className={`text-lg font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{formatIDR(totalPnl * 15800)}
            </div>
            <div className="text-xs text-zinc-500">
              {closedTrades.length} trades • WR {winRate.toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Trade Button */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Open Paper Trade
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Open Paper Trade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Symbol</Label>
                <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} className="bg-zinc-950 border-zinc-700" />
              </div>
              <div>
                <Label className="text-xs">Side</Label>
                <Select value={form.side} onValueChange={(v) => setForm({ ...form, side: v as 'LONG' | 'SHORT' })}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LONG">LONG</SelectItem>
                    <SelectItem value="SHORT">SHORT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Entry Price</Label>
                <Input type="number" step="any" value={form.entryPrice || ''} onChange={(e) => setForm({ ...form, entryPrice: parseFloat(e.target.value) || 0 })} className="bg-zinc-950 border-zinc-700" />
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input type="number" step="any" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} className="bg-zinc-950 border-zinc-700" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Stop Loss</Label>
              <Input type="number" step="any" value={form.stopLoss || ''} onChange={(e) => setForm({ ...form, stopLoss: parseFloat(e.target.value) || 0 })} className="bg-zinc-950 border-zinc-700" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">TP1</Label>
                <Input type="number" step="any" value={form.tp1 || ''} onChange={(e) => setForm({ ...form, tp1: parseFloat(e.target.value) || 0 })} className="bg-zinc-950 border-zinc-700 text-xs" />
              </div>
              <div>
                <Label className="text-xs">TP2</Label>
                <Input type="number" step="any" value={form.tp2 || ''} onChange={(e) => setForm({ ...form, tp2: parseFloat(e.target.value) || 0 })} className="bg-zinc-950 border-zinc-700 text-xs" />
              </div>
              <div>
                <Label className="text-xs">TP3</Label>
                <Input type="number" step="any" value={form.tp3 || ''} onChange={(e) => setForm({ ...form, tp3: parseFloat(e.target.value) || 0 })} className="bg-zinc-950 border-zinc-700 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Setup Reason</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Trend pullback at EMA50..." className="bg-zinc-950 border-zinc-700" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={submit}>Open Trade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Trades */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Open Trades ({openTrades.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {openTrades.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm">No open trades</div>
          ) : (
            <div className="space-y-2">
              {openTrades.map(t => (
                <OpenTradeCard key={t.id} trade={t} onClose={closePaperTrade} onDelete={deletePaperTrade} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Closed Trades */}
      {closedTrades.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Closed Trades ({closedTrades.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-1">
                {closedTrades.map(t => (
                  <div key={t.id} className="p-2 rounded border border-zinc-800 text-xs">
                    <div className="flex justify-between">
                      <div>
                        <Badge variant={t.side === 'LONG' ? 'default' : 'destructive'} className="text-[9px] mr-1">{t.side}</Badge>
                        <span className="font-medium">{t.symbol}</span>
                        <span className="text-zinc-500 ml-2">{new Date(t.entryDate).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className={`font-mono font-bold ${(t.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(t.pnl || 0) >= 0 ? '+' : ''}{formatIDR((t.pnl || 0) * 15800)}
                      </div>
                    </div>
                    <div className="text-zinc-500 mt-0.5">{t.reason}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function OpenTradeCard({ 
  trade, 
  onClose, 
  onDelete 
}: { 
  trade: PT
  onClose: (id: string, exitPrice: number, reason: string) => void
  onDelete: (id: string) => void
}) {
  const { price, connected } = useBinancePrice(trade.symbol)
  const [exitPrice, setExitPrice] = useState(0)
  const [showClose, setShowClose] = useState(false)
  
  const currentPrice = price?.price || trade.entryPrice
  const direction = trade.side === 'LONG' ? 1 : -1
  const unrealizedPnl = (currentPrice - trade.entryPrice) * trade.quantity * direction
  const unrealizedPnlPct = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100 * direction
  
  return (
    <div className="p-2 rounded border border-zinc-800 bg-zinc-950/50 text-xs">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1">
            <Badge variant={trade.side === 'LONG' ? 'default' : 'destructive'} className="text-[9px]">
              {trade.side === 'LONG' ? <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
              {trade.side}
            </Badge>
            <span className="font-medium">{trade.symbol}</span>
            <span className={`text-[9px] ${connected ? 'text-emerald-400' : 'text-zinc-500'}`}>●</span>
          </div>
          <div className="text-zinc-500 mt-0.5 font-mono">
            Entry: ${trade.entryPrice.toFixed(2)} • Qty: {trade.quantity.toFixed(4)}
          </div>
          {trade.stopLoss > 0 && (
            <div className="text-zinc-500 font-mono">SL: ${trade.stopLoss.toFixed(2)}</div>
          )}
        </div>
        <div className="text-right">
          <div className="font-mono text-zinc-300">Now: ${currentPrice.toFixed(2)}</div>
          <div className={`font-mono font-bold ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)} ({unrealizedPnlPct >= 0 ? '+' : ''}{unrealizedPnlPct.toFixed(2)}%)
          </div>
        </div>
      </div>
      
      {trade.reason && (
        <div className="text-zinc-500 mt-1 italic">"{trade.reason}"</div>
      )}
      
      {showClose ? (
        <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1">
          <Input
            type="number"
            step="any"
            placeholder={`Exit price (default: ${currentPrice.toFixed(2)})`}
            value={exitPrice || ''}
            onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
            className="bg-zinc-950 border-zinc-700 text-xs h-7"
          />
          <div className="flex gap-1">
            <Button 
              size="sm" 
              className="h-6 text-xs flex-1"
              onClick={() => onClose(trade.id, exitPrice || currentPrice, 'Manual close')}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Confirm Close
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowClose(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-1 mt-2 pt-2 border-t border-zinc-800">
          <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={() => setShowClose(true)}>
            Close Trade
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs text-red-400" onClick={() => onDelete(trade.id)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
