'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, MessageCircle, Waves, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { useAppStore, formatNumber } from '@/store/app-store'
import { getTicker24h } from '@/lib/binance'
import { getTopCoins, type CoinMarketData } from '@/lib/coingecko'
import { getSentiment, estimateSentiment, estimateWhaleActivity } from '@/lib/sentiment'
import type { SentimentData, WhaleTransaction } from '@/lib/types'

export function SentimentWhale() {
  const { settings } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [sentiments, setSentiments] = useState<SentimentData[]>([])
  const [whales, setWhales] = useState<Record<string, WhaleTransaction[]>>({})
  const [coins, setCoins] = useState<CoinMarketData[]>([])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Get top coins from CoinGecko (for market cap + volume)
        const topCoins = await getTopCoins(50)
        setCoins(topCoins)
        
        // Build symbol -> coin map
        const coinMap = new Map<string, CoinMarketData>()
        topCoins.forEach(c => coinMap.set(c.symbol, c))
        
        // Get sentiment for watchlist (limited to top 5 to avoid rate limit)
        const sentimentPromises = settings.tradingPairs.slice(0, 5).map(async (pair) => {
          const symbol = pair.replace('USDT', '')
          const coin = coinMap.get(symbol)
          
          if (coin) {
            // Try CoinGecko first
            const sentiment = await getSentiment(symbol)
            if (sentiment) return sentiment
            
            // Fallback: estimate from price action
            return estimateSentiment(
              symbol,
              coin.priceChangePercentage24h,
              coin.totalVolume,
              coin.marketCap
            )
          }
          return null
        })
        
        const sentimentResults = await Promise.all(sentimentPromises)
        const valid = sentimentResults.filter((s): s is SentimentData => s !== null)
        setSentiments(valid)
        
        // Generate whale activity estimates
        const whaleMap: Record<string, WhaleTransaction[]> = {}
        for (const s of valid) {
          const coin = coinMap.get(s.symbol)
          if (coin) {
            whaleMap[s.symbol] = estimateWhaleActivity(s.symbol, coin.totalVolume, coin.marketCap)
          }
        }
        setWhales(whaleMap)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
    const interval = setInterval(loadData, 120000) // 2 min refresh
    return () => clearInterval(interval)
  }, [settings.tradingPairs])

  if (loading && sentiments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Alert>
        <MessageCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          ⚠️ Sentiment data adalah estimasi berdasarkan price action & volume (bukan API premium LunarCrush).
          Whale alert juga simulasi — untuk data real perlu API key berbayar. Pakai sebagai confluence saja.
        </AlertDescription>
      </Alert>

      {/* Sentiment Cards */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Market Sentiment (watchlist)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sentiments.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm">No sentiment data available</div>
          ) : (
            <div className="space-y-2">
              {sentiments.map(s => (
                <div key={s.symbol} className={`p-2 rounded border border-zinc-800 bg-zinc-950/50 border-l-2 ${
                  s.signal === 'BULLISH' ? 'border-l-emerald-500' :
                  s.signal === 'BEARISH' ? 'border-l-red-500' : 'border-l-zinc-500'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{s.symbol}</span>
                      <Badge variant="outline" className={`text-[9px] ${
                        s.signal === 'BULLISH' ? 'border-emerald-500 text-emerald-400' :
                        s.signal === 'BEARISH' ? 'border-red-500 text-red-400' : ''
                      }`}>
                        {s.signal === 'BULLISH' ? <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : 
                         s.signal === 'BEARISH' ? <TrendingDown className="h-2.5 w-2.5 mr-0.5" /> : null}
                        {s.signal}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500">Sentiment Score</div>
                      <div className={`font-mono font-bold ${
                        s.sentimentScore > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {s.sentimentScore > 0 ? '+' : ''}{s.sentimentScore.toFixed(0)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <span className="text-zinc-500">Social Vol:</span>{' '}
                      <span className="font-mono">{formatNumber(s.socialVolume24h)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Social Score:</span>{' '}
                      <span className="font-mono">{s.socialScore.toFixed(0)}/100</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Dominance:</span>{' '}
                      <span className={`font-mono ${s.dominance > 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {s.dominance.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Whale Activity */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Waves className="h-4 w-4" />
            Whale Activity (estimated)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(whales).map(([symbol, txs]) => (
              <div key={symbol}>
                <div className="text-xs font-medium text-zinc-400 mb-1">{symbol}</div>
                <div className="space-y-1">
                  {txs.slice(0, 3).map((tx, i) => (
                    <div key={i} className={`flex items-center justify-between p-1.5 rounded text-[10px] border ${
                      tx.type === 'EXCHANGE_IN' ? 'border-red-800 bg-red-950/20' :
                      tx.type === 'EXCHANGE_OUT' ? 'border-emerald-800 bg-emerald-950/20' :
                      'border-zinc-800'
                    }`}>
                      <div className="flex items-center gap-1">
                        <Activity className={`h-2.5 w-2.5 ${
                          tx.type === 'EXCHANGE_IN' ? 'text-red-400' : 'text-emerald-400'
                        }`} />
                        <span>{tx.type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">${formatNumber(tx.usdValue)}</div>
                        <div className="text-zinc-500">{new Date(tx.timestamp).toLocaleTimeString('id-ID')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-[10px] text-zinc-500 mt-3 pt-2 border-t border-zinc-800">
            💡 EXCHANGE_OUT = whale tarik dari exchange (bullish, akumulasi). 
            EXCHANGE_IN = whale kirim ke exchange (bearish, siap jual).
            ⚠️ Data ini estimasi simulasi — bukan transaksi real.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
