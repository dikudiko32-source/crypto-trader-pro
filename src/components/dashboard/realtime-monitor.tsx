'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Activity } from 'lucide-react'
import { useAppStore, formatNumber, formatPercent } from '@/store/app-store'
import { useBinanceWS } from '@/hooks/use-binance-ws'

export function RealtimeMonitor() {
  const { settings } = useAppStore()
  const symbols = settings.tradingPairs.length > 0 
    ? settings.tradingPairs 
    : ['BTCUSDT', 'ETHUSDT']
  
  const { prices, connected, error } = useBinanceWS({ symbols })

  const sortedPrices = Object.values(prices).sort((a, b) => {
    // Sort by absolute 24h change descending
    return Math.abs(b.change24h) - Math.abs(a.change24h)
  })

  return (
    <div className="space-y-3">
      {/* Status */}
      <Card className={`bg-zinc-900/50 border-zinc-800 ${connected ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-red-500'}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi className="h-4 w-4 text-emerald-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-400" />
              )}
              <div>
                <div className="text-sm font-medium">
                  {connected ? 'Connected to Binance' : 'Disconnected'}
                </div>
                <div className="text-xs text-zinc-500">
                  {connected 
                    ? `Streaming ${symbols.length} pairs real-time (<1s delay)` 
                    : error || 'Reconnecting...'
                  }
                </div>
              </div>
            </div>
            <Badge variant={connected ? 'default' : 'destructive'} className={connected ? 'bg-emerald-600' : ''}>
              <Activity className="h-3 w-3 mr-1" />
              {connected ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Watchlist Prices */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Watchlist (sorted by volatility)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {sortedPrices.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              {connected ? 'Waiting for price data...' : 'Cannot connect to Binance'}
            </div>
          )}
          {sortedPrices.map(p => (
            <div 
              key={p.symbol}
              className="flex items-center justify-between p-2 rounded hover:bg-zinc-800/50 transition-colors"
            >
              <div>
                <div className="font-medium text-sm">{p.symbol.replace('USDT', '')}</div>
                <div className="text-[10px] text-zinc-500">
                  H: ${formatNumber(p.high24h)} L: ${formatNumber(p.low24h)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-medium">
                  ${p.price < 1 ? p.price.toFixed(5) : p.price < 100 ? p.price.toFixed(3) : formatNumber(p.price)}
                </div>
                <div className={`text-xs font-medium ${p.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(p.change24h)}
                </div>
              </div>
            </div>
          ))}
          
          {/* Show pairs without price data yet */}
          {symbols.filter(s => !prices[s]).map(symbol => (
            <div key={symbol} className="flex items-center justify-between p-2 rounded opacity-50">
              <div className="font-medium text-sm">{symbol.replace('USDT', '')}</div>
              <div className="text-xs text-zinc-500">Loading...</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {sortedPrices.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3">
              <div className="text-xs text-zinc-400">Top Gainer</div>
              {(() => {
                const top = [...sortedPrices].sort((a, b) => b.change24h - a.change24h)[0]
                return top ? (
                  <>
                    <div className="text-sm font-bold">{top.symbol.replace('USDT', '')}</div>
                    <div className="text-xs text-emerald-400">{formatPercent(top.change24h)}</div>
                  </>
                ) : null
              })()}
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3">
              <div className="text-xs text-zinc-400">Top Loser</div>
              {(() => {
                const bottom = [...sortedPrices].sort((a, b) => a.change24h - b.change24h)[0]
                return bottom ? (
                  <>
                    <div className="text-sm font-bold">{bottom.symbol.replace('USDT', '')}</div>
                    <div className="text-xs text-red-400">{formatPercent(bottom.change24h)}</div>
                  </>
                ) : null
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
