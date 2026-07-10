'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, BookOpen, Flame, AlertTriangle } from 'lucide-react'
import { useAppStore, formatNumber, formatPercent } from '@/store/app-store'
import { analyzeOrderBook, getLiquidationEstimate, getFundingHeatmap } from '@/lib/binance'
import type { OrderBookData, LiquidationData, FundingHeatmapItem } from '@/lib/types'

export function MarketDepth() {
  const { settings } = useAppStore()
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [loading, setLoading] = useState(false)
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [liquidations, setLiquidations] = useState<LiquidationData | null>(null)
  const [fundingHeatmap, setFundingHeatmap] = useState<FundingHeatmapItem[]>([])

  async function fetchData() {
    setLoading(true)
    try {
      const [ob, liq, funding] = await Promise.all([
        analyzeOrderBook(symbol),
        getLiquidationEstimate(symbol),
        getFundingHeatmap(settings.tradingPairs),
      ])
      setOrderBook(ob)
      setLiquidations(liq)
      setFundingHeatmap(funding)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // 30s refresh
    return () => clearInterval(interval)
  }, [symbol, settings.tradingPairs])

  const fmt = (n: number, d = 2) => n < 1 ? n.toFixed(5) : n < 100 ? n.toFixed(3) : n.toFixed(d)

  return (
    <div className="space-y-3">
      {/* Input */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTCUSDT"
              className="bg-zinc-950 border-zinc-700 text-sm"
            />
            <Button size="sm" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Order Book */}
      {orderBook && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Order Book Depth
              </CardTitle>
              <Badge variant="outline" className={`text-[9px] ${
                orderBook.signal === 'BUY_PRESSURE' ? 'border-emerald-500 text-emerald-400' :
                orderBook.signal === 'SELL_PRESSURE' ? 'border-red-500 text-red-400' : ''
              }`}>
                {orderBook.signal.replace(/_/g, ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-950/50 p-2 rounded">
                <div className="text-zinc-500">Spread</div>
                <div className="font-mono">{fmt(orderBook.spread)} ({orderBook.spreadPct.toFixed(3)}%)</div>
              </div>
              <div className="bg-zinc-950/50 p-2 rounded">
                <div className="text-zinc-500">Bid Imbalance</div>
                <div className={`font-mono ${(orderBook.bidImbalance * 100).toFixed(0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(orderBook.bidImbalance * 100).toFixed(0)}%
                </div>
              </div>
              <div className="bg-zinc-950/50 p-2 rounded">
                <div className="text-zinc-500">Liquidity Above (+1%)</div>
                <div className="font-mono text-red-400">${formatNumber(orderBook.liquidityAbovePrice)}</div>
              </div>
              <div className="bg-zinc-950/50 p-2 rounded">
                <div className="text-zinc-500">Liquidity Below (-1%)</div>
                <div className="font-mono text-emerald-400">${formatNumber(orderBook.liquidityBelowPrice)}</div>
              </div>
            </div>

            {/* Order book visualization */}
            <div className="space-y-0.5 mt-2">
              <div className="text-[10px] text-zinc-500 mb-1">Top 5 Asks (sellers)</div>
              {orderBook.asks.slice(0, 5).reverse().map((a, i) => (
                <div key={i} className="flex justify-between text-[10px] font-mono relative">
                  <div className="absolute right-0 top-0 h-full bg-red-900/20" style={{ width: `${Math.min(100, a.quantity / orderBook.asks[0].quantity * 30)}%` }} />
                  <span className="text-red-400 relative">{fmt(a.price)}</span>
                  <span className="text-zinc-400 relative">{a.quantity.toFixed(3)}</span>
                </div>
              ))}
              <div className="border-t border-zinc-700 my-1" />
              <div className="text-[10px] text-zinc-500 mb-1">Top 5 Bids (buyers)</div>
              {orderBook.bids.slice(0, 5).map((b, i) => (
                <div key={i} className="flex justify-between text-[10px] font-mono relative">
                  <div className="absolute right-0 top-0 h-full bg-emerald-900/20" style={{ width: `${Math.min(100, b.quantity / orderBook.bids[0].quantity * 30)}%` }} />
                  <span className="text-emerald-400 relative">{fmt(b.price)}</span>
                  <span className="text-zinc-400 relative">{b.quantity.toFixed(3)}</span>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
              💡 Imbalance &gt;20% = strong pressure. Thin liquidity = false breakout risk.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liquidation Estimate */}
      {liquidations && (
        <Card className={`bg-zinc-900/50 border-zinc-800 border-l-4 ${
          liquidations.signal === 'LONG_SQUEEZE_RISK' ? 'border-l-red-500' :
          liquidations.signal === 'SHORT_SQUEEZE_RISK' ? 'border-l-emerald-500' : 'border-l-zinc-500'
        }`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Liquidation Heatmap (estimated)
              </CardTitle>
              <Badge variant={liquidations.signal === 'NEUTRAL' ? 'secondary' : 'destructive'}>
                {liquidations.signal.replace(/_/g, ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-red-950/20 p-2 rounded">
                <div className="text-zinc-500">Long Liq (est.)</div>
                <div className="font-mono text-red-400">${formatNumber(liquidations.longLiquidations)}</div>
              </div>
              <div className="bg-emerald-950/20 p-2 rounded">
                <div className="text-zinc-500">Short Liq (est.)</div>
                <div className="font-mono text-emerald-400">${formatNumber(liquidations.shortLiquidations)}</div>
              </div>
            </div>

            {/* Heatmap visualization */}
            <div className="space-y-1 mt-2">
              <div className="text-[10px] text-zinc-500 mb-1">Liquidation zones</div>
              {liquidations.heatmap.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono w-20 text-zinc-400">{fmt(h.price)}</span>
                  <div className="flex-1 flex gap-0.5">
                    <div className="h-2 bg-red-500/50" style={{ width: `${Math.min(100, h.longLiq / 1000)}%` }} />
                    <div className="h-2 bg-emerald-500/50" style={{ width: `${Math.min(100, h.shortLiq / 1000)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
              ⚠️ Estimasi kasar berdasarkan funding rate + volatility. Bukan data real liquidations.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funding Rate Heatmap */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Funding Rate Heatmap ({settings.tradingPairs.length} pairs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fundingHeatmap.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm">Loading funding data...</div>
          ) : (
            <div className="space-y-1">
              {fundingHeatmap.map(f => (
                <div key={f.symbol} className="flex items-center justify-between p-2 rounded border border-zinc-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium w-20">{f.symbol.replace('USDT', '')}</span>
                    <Badge variant="outline" className={`text-[9px] ${
                      f.signal === 'OVERLEVERAGED_LONG' ? 'border-red-500 text-red-400' :
                      f.signal === 'OVERLEVERAGED_SHORT' ? 'border-emerald-500 text-emerald-400' : ''
                    }`}>
                      {f.signal.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono ${(f.fundingRate * 100).toFixed(4) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {(f.fundingRate * 100).toFixed(4)}%
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {(f.annualized).toFixed(1)}%/yr
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
                💡 Funding positif tinggi = overleveraged long (squeeze risk). Negatif = short squeeze risk.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
