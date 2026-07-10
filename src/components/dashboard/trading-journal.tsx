'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, BookOpen, Star, TrendingUp, TrendingDown } from 'lucide-react'
import { useAppStore, formatIDR } from '@/store/app-store'
import type { JournalEntry, Bias, SetupType } from '@/lib/types'

const EMPTY_ENTRY: Omit<JournalEntry, 'id'> = {
  date: new Date().toISOString(),
  symbol: '',
  bias: 'LONG',
  setupType: 'TREND_PULLBACK',
  entryPrice: 0,
  exitPrice: null,
  stopLoss: 0,
  takeProfit: null,
  quantity: 0,
  pnl: null,
  pnlPercent: null,
  rr: null,
  duration: '',
  setupReason: '',
  exitReason: '',
  emotion: 'CALM',
  screenshot: null,
  lessonsLearned: '',
  rating: 3,
}

export function TradingJournal() {
  const { journal, addJournalEntry, deleteJournalEntry } = useAppStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_ENTRY)

  function submit() {
    if (!form.symbol || form.entryPrice <= 0) return
    // Calculate P&L if exit provided
    let pnl: number | null = null
    let pnlPercent: number | null = null
    let rr: number | null = null
    if (form.exitPrice && form.exitPrice > 0) {
      const direction = form.bias === 'LONG' ? 1 : -1
      pnl = (form.exitPrice - form.entryPrice) * form.quantity * direction
      pnlPercent = ((form.exitPrice - form.entryPrice) / form.entryPrice) * 100 * direction
      const risk = Math.abs(form.entryPrice - form.stopLoss)
      if (risk > 0) {
        rr = Math.abs(form.exitPrice - form.entryPrice) / risk
      }
    }
    addJournalEntry({
      ...form,
      id: Math.random().toString(36).slice(2),
      pnl,
      pnlPercent,
      rr,
    })
    setForm(EMPTY_ENTRY)
    setOpen(false)
  }

  // Stats
  const totalTrades = journal.length
  const winningTrades = journal.filter(j => (j.pnl || 0) > 0).length
  const losingTrades = journal.filter(j => (j.pnl || 0) < 0).length
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
  const totalPnl = journal.reduce((sum, j) => sum + (j.pnl || 0), 0)
  const avgRr = journal.length > 0 ? journal.reduce((sum, j) => sum + (j.rr || 0), 0) / journal.length : 0

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Win Rate</div>
            <div className="text-xl font-bold">{winRate.toFixed(1)}%</div>
            <div className="text-xs text-zinc-500">
              {winningTrades}W / {losingTrades}L / {totalTrades} total
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Total P&L</div>
            <div className={`text-xl font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{formatIDR(totalPnl * 15800)}
            </div>
            <div className="text-xs text-zinc-500">Avg R:R {avgRr.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Entry Button */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Journal Entry
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Trade Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Symbol</Label>
                <Input
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                  placeholder="BTCUSDT"
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-xs">Bias</Label>
                <Select
                  value={form.bias}
                  onValueChange={(v) => setForm({ ...form, bias: v as Bias })}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LONG">LONG</SelectItem>
                    <SelectItem value="SHORT">SHORT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Entry Price</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.entryPrice || ''}
                  onChange={(e) => setForm({ ...form, entryPrice: parseFloat(e.target.value) || 0 })}
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-xs">Exit Price (optional)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.exitPrice || ''}
                  onChange={(e) => setForm({ ...form, exitPrice: parseFloat(e.target.value) || null })}
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Stop Loss</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.stopLoss || ''}
                  onChange={(e) => setForm({ ...form, stopLoss: parseFloat(e.target.value) || 0 })}
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.quantity || ''}
                  onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                  className="bg-zinc-950 border-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Setup Type</Label>
                <Select
                  value={form.setupType}
                  onValueChange={(v) => setForm({ ...form, setupType: v as SetupType })}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TREND_PULLBACK">Trend Pullback</SelectItem>
                    <SelectItem value="MEAN_REVERSION">Mean Reversion</SelectItem>
                    <SelectItem value="BREAKOUT">Breakout</SelectItem>
                    <SelectItem value="SMC">SMC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Emotion</Label>
                <Select
                  value={form.emotion}
                  onValueChange={(v) => setForm({ ...form, emotion: v as JournalEntry['emotion'] })}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALM">😌 Calm</SelectItem>
                    <SelectItem value="FOMO">😰 FOMO</SelectItem>
                    <SelectItem value="FEAR">😨 Fear</SelectItem>
                    <SelectItem value="GREED">🤑 Greed</SelectItem>
                    <SelectItem value="REVENGE">😠 Revenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Duration</Label>
              <Input
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="2h 30min / 3 days"
                className="bg-zinc-950 border-zinc-700"
              />
            </div>

            <div>
              <Label className="text-xs">Setup Reason</Label>
              <Textarea
                value={form.setupReason}
                onChange={(e) => setForm({ ...form, setupReason: e.target.value })}
                placeholder="Why did you enter this trade?"
                className="bg-zinc-950 border-zinc-700 text-sm"
                rows={2}
              />
            </div>

            <div>
              <Label className="text-xs">Exit Reason</Label>
              <Textarea
                value={form.exitReason}
                onChange={(e) => setForm({ ...form, exitReason: e.target.value })}
                placeholder="Why did you exit?"
                className="bg-zinc-950 border-zinc-700 text-sm"
                rows={2}
              />
            </div>

            <div>
              <Label className="text-xs">Lessons Learned</Label>
              <Textarea
                value={form.lessonsLearned}
                onChange={(e) => setForm({ ...form, lessonsLearned: e.target.value })}
                placeholder="What would you do differently?"
                className="bg-zinc-950 border-zinc-700 text-sm"
                rows={2}
              />
            </div>

            <div>
              <Label className="text-xs">Rating: {form.rating}/5</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n}
                    className={`h-5 w-5 cursor-pointer ${n <= form.rating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-700'}`}
                    onClick={() => setForm({ ...form, rating: n })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Journal List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Trade History ({journal.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {journal.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No journal entries yet. Start documenting your trades!
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {journal.map(entry => (
                  <div key={entry.id} className="p-3 rounded border border-zinc-800 bg-zinc-950/50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{entry.symbol}</span>
                          <Badge variant={entry.bias === 'LONG' ? 'default' : 'destructive'} className="text-[9px]">
                            {entry.bias === 'LONG' ? <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
                            {entry.bias}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]">
                            {entry.setupType.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]">
                            {entry.emotion}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date(entry.date).toLocaleString('id-ID')}
                          {entry.duration && ` • ${entry.duration}`}
                        </div>
                      </div>
                      <div className="text-right">
                        {entry.pnl !== null && (
                          <>
                            <div className={`text-sm font-bold ${entry.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {entry.pnl >= 0 ? '+' : ''}{formatIDR(entry.pnl * 15800)}
                            </div>
                            <div className={`text-xs ${entry.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {entry.pnlPercent && entry.pnlPercent >= 0 ? '+' : ''}{entry.pnlPercent?.toFixed(2)}%
                              {entry.rr && ` • 1:${entry.rr.toFixed(2)}`}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {entry.setupReason && (
                      <div className="text-xs text-zinc-400 mt-1">
                        <span className="text-zinc-500">Entry:</span> {entry.setupReason}
                      </div>
                    )}
                    {entry.exitReason && (
                      <div className="text-xs text-zinc-400">
                        <span className="text-zinc-500">Exit:</span> {entry.exitReason}
                      </div>
                    )}
                    {entry.lessonsLearned && (
                      <div className="text-xs text-yellow-400 mt-1">
                        <span className="text-yellow-600">Lesson:</span> {entry.lessonsLearned}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star
                            key={n}
                            className={`h-3 w-3 ${n <= entry.rating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-700'}`}
                          />
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-red-400 hover:text-red-300"
                        onClick={() => deleteJournalEntry(entry.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
