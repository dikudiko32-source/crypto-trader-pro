'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Database, TrendingUp, Activity, Layers } from 'lucide-react'
import { formatNumber } from '@/store/app-store'

interface OnChainData {
  totalSupply: number
  circulatingSupply: number
  maxSupply: number
  price: number
  marketCap: number
  ath: number
  mvrvProxy: number
  cycle: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN'
  cycleColor: string
  inflationRate: number
  blockReward: number
  annualNewSupply: number
  lastUpdated: string
}

export function OnChainData() {
  const [data, setData] = useState<OnChainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch('/api/proxy/onchain')
        if (!res.ok) throw new Error('Failed to fetch')
        const d = await res.json()
        if (d.error) throw new Error(d.error)
        setData(d)
      } catch (err) {
        console.error(err)
        setError('Gagal load on-chain data')
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 300000) // 5 min refresh
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4 text-sm text-zinc-400">{error || 'No data'}</CardContent>
      </Card>
    )
  }

  const supplyProgress = (data.circulatingSupply / data.maxSupply) * 100
  const priceVsAth = data.ath > 0 ? (data.price / data.ath) * 100 : 0

  return (
    <div className="space-y-3">
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription className="text-xs">
          On-chain metrics BTC dari blockchain.info (free, no API key). 
          MVRV proxy diestimasi — untuk MVRV real perlu Glassnode/CryptoQuant premium.
        </AlertDescription>
      </Alert>

      {/* Market Cycle */}
      <Card className={`bg-zinc-900/50 border-zinc-800 border-l-4 ${
        data.cycle === 'ACCUMULATION' ? 'border-l-emerald-500' :
        data.cycle === 'MARKUP' ? 'border-l-blue-500' :
        data.cycle === 'DISTRIBUTION' ? 'border-l-yellow-500' :
        'border-l-red-500'
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Market Cycle Phase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-2xl font-bold ${data.cycleColor}`}>{data.cycle}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {data.cycle === 'ACCUMULATION' && '🟢 Smart money akumulasi. Good buy zone.'}
                {data.cycle === 'MARKUP' && '🔵 Bull market. Hold / trail stops.'}
                {data.cycle === 'DISTRIBUTION' && '🟡 Smart money distribusi. Caution.'}
                {data.cycle === 'MARKDOWN' && '🔴 Bear market. Wait for accumulation.'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-400">MVRV Proxy</div>
              <div className="text-xl font-bold font-mono">{data.mvrvProxy.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supply Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Circulating Supply</div>
            <div className="text-lg font-bold">{formatNumber(data.circulatingSupply)} BTC</div>
            <div className="text-xs text-zinc-500">{supplyProgress.toFixed(2)}% of max</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="text-xs text-zinc-400">Max Supply</div>
            <div className="text-lg font-bold">21M BTC</div>
            <div className="text-xs text-zinc-500">Hard cap</div>
          </CardContent>
        </Card>
      </div>

      {/* Supply Progress Bar */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="text-xs text-zinc-400 mb-2">Supply Mined Progress</div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
              style={{ width: `${supplyProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
            <span>0 BTC</span>
            <span>{supplyProgress.toFixed(2)}% mined</span>
            <span>21M BTC</span>
          </div>
        </CardContent>
      </Card>

      {/* Inflation */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Inflation Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Block Reward</span>
            <span className="font-mono">{data.blockReward.toFixed(4)} BTC/block</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Annual New Supply</span>
            <span className="font-mono">{formatNumber(data.annualNewSupply)} BTC/yr</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Inflation Rate</span>
            <span className="font-mono text-emerald-400">{data.inflationRate.toFixed(2)}%/yr</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
            💡 BTC inflation rate turun setiap halving (next: 2028). Saat ini &lt;1%, lebih rendah dari fiat (~5-7%).
          </div>
        </CardContent>
      </Card>

      {/* Market Data */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Market vs ATH
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Current Price</span>
            <span className="font-mono">${formatNumber(data.price)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">All-Time High</span>
            <span className="font-mono">${formatNumber(data.ath)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">% from ATH</span>
            <span className={`font-mono ${priceVsAth > 80 ? 'text-emerald-400' : priceVsAth > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {priceVsAth.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Market Cap</span>
            <span className="font-mono">${formatNumber(data.marketCap)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="text-[10px] text-zinc-500 text-center">
        Last updated: {new Date(data.lastUpdated).toLocaleString('id-ID')}
      </div>
    </div>
  )
}
