'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Search, AlertTriangle, Coins, TrendingDown, ShieldCheck, RefreshCw } from 'lucide-react'
import { useAppStore, formatNumber } from '@/store/app-store'
import { getTopCoins } from '@/lib/coingecko'
import { getTokenomics, riskColor, riskBadge } from '@/lib/tokenomics'
import type { TokenomicsData } from '@/lib/types'

// Fallback tokenomics data (used when CoinGecko API rate-limited)
const FALLBACK_TOKENOMICS: TokenomicsData[] = [
  {
    symbol: 'BTC', name: 'Bitcoin',
    circulatingSupply: 19700000, totalSupply: 19700000, maxSupply: 21000000,
    marketCap: 1300000000000, fdv: 1390000000000,
    inflationRate: 6.6, unlockRisk: 'LOW', estimatedAnnualInflation: 0.8,
    warning: null,
  },
  {
    symbol: 'ETH', name: 'Ethereum',
    circulatingSupply: 120000000, totalSupply: 120000000, maxSupply: null,
    marketCap: 420000000000, fdv: 420000000000,
    inflationRate: 0, unlockRisk: 'LOW', estimatedAnnualInflation: -2,
    warning: 'ETH deflationary (post-merge). Supply bisa berkurang via burning.',
  },
  {
    symbol: 'SOL', name: 'Solana',
    circulatingSupply: 455000000, totalSupply: 580000000, maxSupply: null,
    marketCap: 75000000000, fdv: 96000000000,
    inflationRate: 27.5, unlockRisk: 'MEDIUM', estimatedAnnualInflation: 6.8,
    warning: '27.5% inflation pending. Monitor unlock schedule.',
  },
  {
    symbol: 'BNB', name: 'BNB',
    circulatingSupply: 145000000, totalSupply: 200000000, maxSupply: 200000000,
    marketCap: 88000000000, fdv: 120000000000,
    inflationRate: 37.9, unlockRisk: 'MEDIUM', estimatedAnnualInflation: 9.5,
    warning: '37.9% pending. BNB burn mengurangi supply tapi slowly.',
  },
  {
    symbol: 'AVAX', name: 'Avalanche',
    circulatingSupply: 400000000, totalSupply: 720000000, maxSupply: 720000000,
    marketCap: 11000000000, fdv: 20000000000,
    inflationRate: 80, unlockRisk: 'HIGH', estimatedAnnualInflation: 20,
    warning: '⚠️ 80% inflation pending. Significant unlock risk. Reduce position before unlocks.',
  },
  {
    symbol: 'LINK', name: 'Chainlink',
    circulatingSupply: 600000000, totalSupply: 1000000000, maxSupply: 1000000000,
    marketCap: 8500000000, fdv: 14000000000,
    inflationRate: 66.7, unlockRisk: 'MEDIUM', estimatedAnnualInflation: 16.7,
    warning: '66.7% inflation pending. Monitor unlock schedule.',
  },
  {
    symbol: 'ARB', name: 'Arbitrum',
    circulatingSupply: 4000000000, totalSupply: 10000000000, maxSupply: 10000000000,
    marketCap: 4000000000, fdv: 10000000000,
    inflationRate: 150, unlockRisk: 'CRITICAL', estimatedAnnualInflation: 37.5,
    warning: '⚠️ 150% inflation pending. FDV is 2.5x current market cap. MAJOR sell pressure risk.',
  },
  {
    symbol: 'OP', name: 'Optimism',
    circulatingSupply: 1350000000, totalSupply: 4300000000, maxSupply: 4300000000,
    marketCap: 2500000000, fdv: 8000000000,
    inflationRate: 218, unlockRisk: 'CRITICAL', estimatedAnnualInflation: 54.5,
    warning: '⚠️ 218% inflation pending. FDV is 3.2x current market cap. MAJOR sell pressure risk.',
  },
]

export function TokenomicsScanner() {
  const { settings } = useAppStore()
  const [search, setSearch] = useState('BTC')
  const [results, setResults] = useState<TokenomicsData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)

  // Auto-load watchlist on mount
  async function loadWatchlist() {
    setLoading(true)
    setError(null)
    setUsingFallback(false)
    try {
      // Use getTopCoins which has fallback built in
      const coins = await getTopCoins(200)
      
      if (coins.length === 0) {
        throw new Error('No coins data')
      }
      
      const symbolToId = new Map<string, { id: string; name: string }>()
      coins.forEach((c: { symbol: string; id: string; name: string }) => {
        symbolToId.set(c.symbol.toUpperCase(), { id: c.id, name: c.name })
      })
      
      // For each watchlist symbol, get tokenomics
      const symbolsToCheck = settings.tradingPairs.slice(0, 8).map(p => p.replace('USDT', ''))
      const tokenomicsResults: TokenomicsData[] = []
      
      for (const sym of symbolsToCheck) {
        const mapping = symbolToId.get(sym.toUpperCase())
        if (mapping) {
          const t = await getTokenomics(mapping.id)
          if (t) tokenomicsResults.push(t)
        }
      }
      
      if (tokenomicsResults.length === 0) {
        // Use fallback data
        const fallbackFiltered = FALLBACK_TOKENOMICS.filter(ft => 
          symbolsToCheck.some(s => s.toUpperCase() === ft.symbol)
        )
        setResults(fallbackFiltered.length > 0 ? fallbackFiltered : FALLBACK_TOKENOMICS.slice(0, 5))
        setUsingFallback(true)
        setError('CoinGecko API rate-limited. Menampilkan data estimasi. Klik Refresh untuk coba lagi.')
      } else {
        setResults(tokenomicsResults)
      }
    } catch (err) {
      console.error(err)
      // Use fallback on any error
      const symbolsToCheck = settings.tradingPairs.slice(0, 8).map(p => p.replace('USDT', ''))
      const fallbackFiltered = FALLBACK_TOKENOMICS.filter(ft => 
        symbolsToCheck.some(s => s.toUpperCase() === ft.symbol)
      )
      setResults(fallbackFiltered.length > 0 ? fallbackFiltered : FALLBACK_TOKENOMICS.slice(0, 5))
      setUsingFallback(true)
      setError('Gagal load dari CoinGecko. Menampilkan data estimasi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWatchlist()
  }, [settings.tradingPairs])

  async function searchCoin() {
    if (!search) return
    setLoading(true)
    setError(null)
    try {
      // First check fallback data
      const fallbackMatch = FALLBACK_TOKENOMICS.find(ft => 
        ft.symbol.toUpperCase() === search.toUpperCase() || 
        ft.name.toUpperCase().includes(search.toUpperCase())
      )
      
      // Try search via CoinGecko
      const searchRes = await fetch(`/api/proxy/coingecko?path=search?query=${encodeURIComponent(search)}`)
      if (!searchRes.ok) {
        // Use fallback if API fails
        if (fallbackMatch) {
          setResults(prev => {
            const filtered = prev.filter(r => r.symbol !== fallbackMatch.symbol)
            return [fallbackMatch, ...filtered]
          })
          setUsingFallback(true)
          setError('CoinGecko rate-limited. Menampilkan data estimasi.')
          return
        }
        setError(`Gagal cari "${search}". CoinGecko rate-limited. Coba lagi nanti.`)
        return
      }
      const searchData = await searchRes.json()
      const coin = searchData.coins?.[0]
      if (!coin) {
        if (fallbackMatch) {
          setResults(prev => {
            const filtered = prev.filter(r => r.symbol !== fallbackMatch.symbol)
            return [fallbackMatch, ...filtered]
          })
          setUsingFallback(true)
          return
        }
        setError(`Coin "${search}" tidak ditemukan`)
        return
      }
      
      const t = await getTokenomics(coin.id)
      if (t) {
        setResults(prev => {
          const filtered = prev.filter(r => r.symbol !== t.symbol)
          return [t, ...filtered]
        })
      } else if (fallbackMatch) {
        setResults(prev => {
          const filtered = prev.filter(r => r.symbol !== fallbackMatch.symbol)
          return [fallbackMatch, ...filtered]
        })
        setUsingFallback(true)
      }
    } catch (err) {
      console.error(err)
      const fallbackMatch = FALLBACK_TOKENOMICS.find(ft => 
        ft.symbol.toUpperCase() === search.toUpperCase()
      )
      if (fallbackMatch) {
        setResults(prev => {
          const filtered = prev.filter(r => r.symbol !== fallbackMatch.symbol)
          return [fallbackMatch, ...filtered]
        })
        setUsingFallback(true)
        setError('Menggunakan data estimasi (API rate-limited)')
      } else {
        setError('Gagal cari coin')
      }
    } finally {
      setLoading(false)
    }
  }

  // Sort by inflation rate descending (highest risk first)
  const sorted = [...results].sort((a, b) => b.inflationRate - a.inflationRate)

  return (
    <div className="space-y-3">
      {/* Info Card */}
      <Alert>
        <Coins className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Token unlock analyzer menggunakan data CoinGecko (free tier). Menghitung inflation rate = (total_supply - circulating) / circulating.
          ⚠️ Data unlock schedule detail butuh TokenUnlocks.app (paid). Ini estimasi kasar berdasarkan supply ratio.
        </AlertDescription>
      </Alert>

      {/* Search */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari coin (mis. SOL, ARB, OP)..."
                className="pl-8 bg-zinc-950 border-zinc-700 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && searchCoin()}
              />
            </div>
            <Button size="sm" onClick={searchCoin} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-yellow-950/30 border-yellow-800">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-yellow-300">{error}</div>
                {usingFallback && (
                  <div className="text-[10px] text-yellow-500 mt-1">
                    📊 Data estimasi ditampilkan. Nilai mungkin tidak real-time.
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" className="h-6 text-xs border-yellow-700 text-yellow-300" onClick={loadWatchlist}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading && results.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {sorted.map((t) => (
              <Card key={t.symbol} className={`bg-zinc-900/50 border-zinc-800 ${
                t.unlockRisk === 'CRITICAL' || t.unlockRisk === 'HIGH' ? 'border-l-2 border-l-red-500' :
                t.unlockRisk === 'MEDIUM' ? 'border-l-2 border-l-yellow-500' : ''
              }`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">{t.symbol}</div>
                      <div className="text-xs text-zinc-500">{t.name}</div>
                    </div>
                    <Badge variant={riskBadge(t.unlockRisk)} className="text-[10px]">
                      {t.unlockRisk} RISK
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <span className="text-zinc-500">Circulating:</span>{' '}
                      <span className="font-mono">{formatNumber(t.circulatingSupply)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Total:</span>{' '}
                      <span className="font-mono">{t.totalSupply ? formatNumber(t.totalSupply) : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Max:</span>{' '}
                      <span className="font-mono">{t.maxSupply ? formatNumber(t.maxSupply) : '∞ (mintable)'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">MCap:</span>{' '}
                      <span className="font-mono">${formatNumber(t.marketCap)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">FDV:</span>{' '}
                      <span className="font-mono">${formatNumber(t.fdv)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">FDV/MCap:</span>{' '}
                      <span className={`font-mono ${t.fdv / t.marketCap > 2 ? 'text-red-400' : t.fdv / t.marketCap > 1.3 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                        {(t.fdv / t.marketCap).toFixed(2)}x
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-zinc-800">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Pending Inflation:</span>
                      <span className={`text-sm font-bold ${riskColor(t.unlockRisk)}`}>
                        {t.inflationRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-xs text-zinc-500">Est. Annual Inflation:</span>
                      <span className="text-xs text-zinc-300 font-mono">
                        {t.estimatedAnnualInflation.toFixed(1)}%/year
                      </span>
                    </div>
                  </div>

                  {t.warning && (
                    <div className="mt-2 text-[10px] text-yellow-400 bg-yellow-950/20 border border-yellow-900/50 rounded p-2">
                      {t.warning}
                    </div>
                  )}

                  <div className="mt-2 text-[10px] text-zinc-500">
                    {t.unlockRisk === 'CRITICAL' && '🚨 Hindari atau keluar sebelum unlock'}
                    {t.unlockRisk === 'HIGH' && '⚠️ Reduce position sebelum unlock besar'}
                    {t.unlockRisk === 'MEDIUM' && '📊 Monitor unlock schedule'}
                    {t.unlockRisk === 'LOW' && '✅ Tokenomics relatif sehat'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Legend */}
      <Card className="bg-zinc-900/30 border-zinc-800/50">
        <CardContent className="p-3 text-xs space-y-1">
          <div className="font-semibold text-zinc-400 mb-1">Risk Level Guide:</div>
          <div className="flex items-center gap-2"><span className="text-red-500">●</span> <strong>CRITICAL</strong> &gt;200% inflation — Hindari</div>
          <div className="flex items-center gap-2"><span className="text-red-400">●</span> <strong>HIGH</strong> 100-200% — Reduce position</div>
          <div className="flex items-center gap-2"><span className="text-yellow-400">●</span> <strong>MEDIUM</strong> 50-100% — Monitor</div>
          <div className="flex items-center gap-2"><span className="text-emerald-400">●</span> <strong>LOW</strong> &lt;50% — Sehat</div>
        </CardContent>
      </Card>
    </div>
  )
}
