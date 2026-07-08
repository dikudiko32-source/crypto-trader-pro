'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calculator, Percent, Receipt, Info, ExternalLink } from 'lucide-react'
import { useAppStore, formatIDR } from '@/store/app-store'

interface Trade {
  buyValue: number
  sellValue: number
}

export function TaxCalculator() {
  const { journal } = useAppStore()
  const [trades, setTrades] = useState<Trade[]>([
    { buyValue: 1000000, sellValue: 1100000 },
  ])
  const [buyValue, setBuyValue] = useState(0)
  const [sellValue, setSellValue] = useState(0)

  // Indonesia crypto tax (Bappebti regulation, effective 2022)
  // PPN (Pajak Pertambahan Nilai): 0.1% on transaction value (buy + sell)
  // PPh Final: 0.1% on transaction value (gross, not profit-based)
  // Total: 0.2% on each transaction value
  const PPN_RATE = 0.001   // 0.1%
  const PPH_RATE = 0.001   // 0.1%
  const TOTAL_TAX_RATE = PPN_RATE + PPH_RATE // 0.2%

  function addTrade() {
    if (buyValue <= 0 || sellValue <= 0) return
    setTrades([...trades, { buyValue, sellValue }])
    setBuyValue(0)
    setSellValue(0)
  }

  function removeTrade(idx: number) {
    setTrades(trades.filter((_, i) => i !== idx))
  }

  const totalBuyValue = trades.reduce((sum, t) => sum + t.buyValue, 0)
  const totalSellValue = trades.reduce((sum, t) => sum + t.sellValue, 0)
  const totalTransaction = totalBuyValue + totalSellValue
  
  // Tax = 0.2% on EACH transaction (buy + sell)
  const buyTax = totalBuyValue * TOTAL_TAX_RATE
  const sellTax = totalSellValue * TOTAL_TAX_RATE
  const totalTax = buyTax + sellTax
  
  // Profit (untuk informasi, tax bukan berbasis profit)
  const grossProfit = totalSellValue - totalBuyValue
  const netProfit = grossProfit - totalTax
  
  // Import from journal (closed trades with P&L)
  const closedTrades = journal.filter(t => t.pnl !== null)
  const journalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)

  return (
    <div className="space-y-3">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Pajak Crypto Indonesia (Bappebti):</strong><br/>
          • PPN 0.1% + PPh Final 0.1% = <strong>0.2% total</strong> per transaksi<br/>
          • Dikenakan pada <strong>nilai transaksi</strong> (bukan profit)<br/>
          • Beli + Jual = kena 0.2% x 2 sisi = 0.4% total round-trip<br/>
          • Exchange (Binance/Indodax) biasanya sudah auto-deduct
        </AlertDescription>
      </Alert>

      {/* Add Trade */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Tambah Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nilai Beli (IDR)</Label>
              <Input
                type="number"
                value={buyValue || ''}
                onChange={(e) => setBuyValue(parseFloat(e.target.value) || 0)}
                placeholder="1000000"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Nilai Jual (IDR)</Label>
              <Input
                type="number"
                value={sellValue || ''}
                onChange={(e) => setSellValue(parseFloat(e.target.value) || 0)}
                placeholder="1100000"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          </div>
          <Button size="sm" onClick={addTrade} className="w-full">Tambah Transaksi</Button>
        </CardContent>
      </Card>

      {/* Trades List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Transaksi ({trades.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {trades.map((t, i) => {
                const profit = t.sellValue - t.buyValue
                const tax = (t.buyValue + t.sellValue) * TOTAL_TAX_RATE
                return (
                  <div key={i} className="flex items-center justify-between p-2 rounded border border-zinc-800 text-xs">
                    <div>
                      <div className="font-mono">Beli: {formatIDR(t.buyValue)} → Jual: {formatIDR(t.sellValue)}</div>
                      <div className="text-zinc-500">
                        Profit: <span className={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {profit >= 0 ? '+' : ''}{formatIDR(profit)}
                        </span>
                        {' • '}Tax: <span className="text-yellow-400">{formatIDR(tax)}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-red-400" onClick={() => removeTrade(i)}>
                      Hapus
                    </Button>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Tax Summary */}
      <Card className="bg-zinc-900/50 border-zinc-800 border-l-4 border-l-yellow-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Ringkasan Pajak
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Total Nilai Beli</span>
            <span className="font-mono">{formatIDR(totalBuyValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Total Nilai Jual</span>
            <span className="font-mono">{formatIDR(totalSellValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Total Transaksi (2 sisi)</span>
            <span className="font-mono">{formatIDR(totalTransaction)}</span>
          </div>
          <div className="border-t border-zinc-800 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-zinc-500">PPN 0.1% (beli)</span>
              <span className="font-mono text-yellow-400">{formatIDR(totalBuyValue * PPN_RATE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">PPh Final 0.1% (beli)</span>
              <span className="font-mono text-yellow-400">{formatIDR(totalBuyValue * PPH_RATE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">PPN 0.1% (jual)</span>
              <span className="font-mono text-yellow-400">{formatIDR(totalSellValue * PPN_RATE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">PPh Final 0.1% (jual)</span>
              <span className="font-mono text-yellow-400">{formatIDR(totalSellValue * PPH_RATE)}</span>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-2 mt-2 flex justify-between">
            <span className="font-medium">TOTAL PAJAK</span>
            <span className="font-mono font-bold text-yellow-400 text-base">{formatIDR(totalTax)}</span>
          </div>
          <div className="border-t border-zinc-800 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-zinc-500">Gross Profit</span>
              <span className={`font-mono ${grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {grossProfit >= 0 ? '+' : ''}{formatIDR(grossProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Net Profit (after tax)</span>
              <span className={`font-mono font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {netProfit >= 0 ? '+' : ''}{formatIDR(netProfit)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import from Journal */}
      {closedTrades.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400 mb-1">Dari Journal (P&L)</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">{closedTrades.length} closed trades</div>
                <div className="text-xs text-zinc-500">
                  Catatan: Tax di Indonesia berbasis transaksi, bukan P&L
                </div>
              </div>
              <div className={`text-lg font-bold ${journalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {journalPnl >= 0 ? '+' : ''}{formatIDR(journalPnl * 15800)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertDescription className="text-xs">
          ⚠️ <strong>Disclaimer:</strong> Kalkulator ini estimasi berdasarkan regulasi Bappebti per 2024. 
          Untuk laporan pajak resmi, konsultasi dengan konsultan pajak crypto Indonesia.
          <br/><br/>
          📚 Sumber: <a href="https://www.bappebti.go.id" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline inline-flex items-center gap-1">
            Bappebti.go.id <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>
    </div>
  )
}
