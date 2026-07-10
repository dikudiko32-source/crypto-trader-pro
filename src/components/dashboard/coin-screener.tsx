'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Search, Filter, ArrowUpDown } from 'lucide-react'
import { getTopCoins, type CoinMarketData } from '@/lib/coingecko'
import { formatNumber, formatPercent } from '@/store/app-store'

interface Filters {
  minMarketCap: number
  minVolume: number
  minVolToMcap: number
  sortBy: 'marketCap' | 'volume' | 'change24h' | 'change7d'
}

const DEFAULT_FILTERS: Filters = {
  minMarketCap: 100_000_000, // $100M
  minVolume: 10_000_000, // $10M
  minVolToMcap: 0.05, // 5%
  sortBy: 'volume',
}

export function CoinScreener({ onSelectCoin }: { onSelectCoin?: (symbol: string) => void }) {
  const [coins, setCoins] = useState<CoinMarketData[]>([])
  const [filtered, setFiltered] = useState<CoinMarketData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const data = await getTopCoins(100)
        if (mounted) {
          setCoins(data)
          applyFilters(data, filters, search)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 120000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  function applyFilters(data: CoinMarketData[], f: Filters, q: string) {
    let result = data.filter(c => 
      c.marketCap >= f.minMarketCap &&
      c.totalVolume >= f.minVolume &&
      (c.totalVolume / c.marketCap) >= f.minVolToMcap
    )
    
    if (q) {
      const lq = q.toLowerCase()
      result = result.filter(c => 
        c.symbol.toLowerCase().includes(lq) || 
        c.name.toLowerCase().includes(lq)
      )
    }

    result.sort((a, b) => {
      switch (f.sortBy) {
        case 'marketCap': return b.marketCap - a.marketCap
        case 'volume': return b.totalVolume - a.totalVolume
        case 'change24h': return b.priceChangePercentage24h - a.priceChangePercentage24h
        case 'change7d': return b.priceChangePercentage7d - a.priceChangePercentage7d
        default: return 0
      }
    })

    setFiltered(result)
  }

  useEffect(() => {
    applyFilters(coins, filters, search)
  }, [coins, filters, search])

  function getFundamentalScore(c: CoinMarketData): { score: number; label: string; color: string } {
    let score = 50
    if (c.marketCapRank < 50) score += 15
    else if (c.marketCapRank < 200) score += 8
    else score -= 5

    const volRatio = c.totalVolume / c.marketCap
    if (volRatio > 0.15) score += 15
    else if (volRatio > 0.08) score += 8
    else if (volRatio < 0.02) score -= 10

    const fdvToMcap = c.totalSupply ? (c.totalSupply * c.currentPrice) / c.marketCap : 1
    if (fdvToMcap < 1.3) score += 8
    else if (fdvToMcap > 2.5) score -= 10

    let label = 'PASS'
    let color = 'text-emerald-400'
    if (score < 50) {
      label = 'CAUTION'
      color = 'text-yellow-400'
    }
    if (score < 35) {
      label = 'FAIL'
      color = 'text-red-400'
    }
    return { score, label, color }
  }

  return (
    <div className="space-y-3">
      {/* Search & Filters Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coin or symbol..."
            className="pl-8 bg-zinc-950 border-zinc-700 text-sm"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-zinc-500">Min Market Cap</label>
                <Input
                  type="number"
                  value={filters.minMarketCap}
                  onChange={(e) => setFilters({ ...filters, minMarketCap: parseFloat(e.target.value) || 0 })}
                  className="bg-zinc-950 border-zinc-700 text-xs"
                />
              </div>
              <div>
                <label className="text-zinc-500">Min 24h Volume</label>
                <Input
                  type="number"
                  value={filters.minVolume}
                  onChange={(e) => setFilters({ ...filters, minVolume: parseFloat(e.target.value) || 0 })}
                  className="bg-zinc-950 border-zinc-700 text-xs"
                />
              </div>
              <div>
                <label className="text-zinc-500">Min Vol/MCap ratio</label>
                <Input
                  type="number"
                  step="0.01"
                  value={filters.minVolToMcap}
                  onChange={(e) => setFilters({ ...filters, minVolToMcap: parseFloat(e.target.value) || 0 })}
                  className="bg-zinc-950 border-zinc-700 text-xs"
                />
              </div>
              <div>
                <label className="text-zinc-500">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as Filters['sortBy'] })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
                >
                  <option value="marketCap">Market Cap</option>
                  <option value="volume">Volume 24h</option>
                  <option value="change24h">Change 24h</option>
                  <option value="change7d">Change 7d</option>
                </select>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="w-full text-xs"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              Reset to defaults
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{filtered.length} coins match filters</span>
        <span className="flex items-center gap-1">
          <ArrowUpDown className="h-3 w-3" />
          Sorted by {filters.sortBy}
        </span>
      </div>

      {/* Coins List */}
      {loading && coins.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {filtered.map((coin) => {
              const volRatio = coin.totalVolume / coin.marketCap
              const fdv = coin.totalSupply ? coin.totalSupply * coin.currentPrice : null
              const fdvToMcap = fdv ? fdv / coin.marketCap : 1
              const score = getFundamentalScore(coin)
              
              return (
                <Card 
                  key={coin.id}
                  className="bg-zinc-900/50 border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all"
                  onClick={() => onSelectCoin?.(coin.symbol + 'USDT')}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {coin.image && (
                          <img src={coin.image} alt={coin.symbol} className="w-6 h-6 rounded-full" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{coin.symbol}</div>
                          <div className="text-xs text-zinc-500">{coin.name}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${score.color}`}>
                        {score.label} ({score.score})
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div>
                        <span className="text-zinc-500">Rank:</span> <span className="text-zinc-300">#{coin.marketCapRank}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Price:</span> <span className="font-mono text-zinc-300">
                          ${coin.currentPrice < 1 ? coin.currentPrice.toFixed(5) : coin.currentPrice.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">MCap:</span> <span className="text-zinc-300">${formatNumber(coin.marketCap)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Vol:</span> <span className="text-zinc-300">${formatNumber(coin.totalVolume)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Vol/MCap:</span>{' '}
                        <span className={volRatio > 0.1 ? 'text-emerald-400' : volRatio < 0.03 ? 'text-red-400' : 'text-zinc-300'}>
                          {(volRatio * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">FDV/MCap:</span>{' '}
                        <span className={fdvToMcap < 1.3 ? 'text-emerald-400' : fdvToMcap > 2.5 ? 'text-red-400' : 'text-zinc-300'}>
                          {fdvToMcap.toFixed(2)}x
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">24h:</span>{' '}
                        <span className={coin.priceChangePercentage24h >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {formatPercent(coin.priceChangePercentage24h)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">7d:</span>{' '}
                        <span className={coin.priceChangePercentage7d >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {formatPercent(coin.priceChangePercentage7d)}
                        </span>
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectCoin?.(coin.symbol + 'USDT')
                      }}
                    >
                      Analyze in Setup Finder →
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
