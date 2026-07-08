'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getCategories, type Category } from '@/lib/coingecko'
import { formatNumber } from '@/store/app-store'
import { Loader2, TrendingUp, TrendingDown, Flame } from 'lucide-react'

export function NarrativeScanner({ onSelectCategory }: { onSelectCategory?: (catId: string, catName: string) => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const cats = await getCategories()
        if (mounted) setCategories(cats)
      } catch (err) {
        console.error(err)
        // Fallback data
        const fallback: Category[] = [
          { id: 'artificial-intelligence', name: 'AI & Big Data', marketCap: 25e9, marketCapChange24h: 12.5, volume24h: 2.5e9, topCoins: ['FET', 'RNDR', 'AGIX'] },
          { id: 'memes', name: 'Meme Coins', marketCap: 18e9, marketCapChange24h: 8.2, volume24h: 3.1e9, topCoins: ['DOGE', 'SHIB', 'PEPE'] },
          { id: 'depin', name: 'DePIN', marketCap: 12e9, marketCapChange24h: 6.8, volume24h: 850e6, topCoins: ['FIL', 'AR', 'THETA'] },
          { id: 'rwa', name: 'Real World Assets', marketCap: 8e9, marketCapChange24h: 4.5, volume24h: 450e6, topCoins: ['ONDO', 'MKR', 'PENDLE'] },
          { id: 'layer-1', name: 'Layer 1', marketCap: 850e9, marketCapChange24h: 2.1, volume24h: 15e9, topCoins: ['BTC', 'ETH', 'SOL'] },
        ]
        if (mounted) setCategories(fallback)
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

  // Calculate narrative strength
  const getNarrativeStrength = (cat: Category): number => {
    let score = 50
    if (cat.marketCapChange24h > 10) score += 30
    else if (cat.marketCapChange24h > 5) score += 20
    else if (cat.marketCapChange24h > 2) score += 10
    else if (cat.marketCapChange24h < -5) score -= 20
    else if (cat.marketCapChange24h < 0) score -= 10
    
    const volRatio = cat.volume24h / cat.marketCap
    if (volRatio > 0.15) score += 15
    else if (volRatio > 0.08) score += 8
    else if (volRatio < 0.02) score -= 10
    
    return Math.max(0, Math.min(100, score))
  }

  // Get estimated week of rotation (heuristic)
  const getWeekOfRotation = (cat: Category): number => {
    if (cat.marketCapChange24h > 15) return 1
    if (cat.marketCapChange24h > 8) return 2
    if (cat.marketCapChange24h > 3) return 3
    if (cat.marketCapChange24h > 0) return 5
    return 8
  }

  const getStrengthColor = (strength: number) => {
    if (strength >= 70) return 'text-emerald-400'
    if (strength >= 50) return 'text-yellow-400'
    if (strength >= 30) return 'text-orange-400'
    return 'text-red-400'
  }

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-zinc-400 mb-2">
        Top narratives ranked by 24h market cap change. Strength score considers price action + volume ratio.
      </div>

      {categories.slice(0, 15).map((cat) => {
        const strength = getNarrativeStrength(cat)
        const week = getWeekOfRotation(cat)
        const isActive = strength >= 60 && week <= 6
        const isSelected = selectedCategory === cat.id

        return (
          <Card 
            key={cat.id} 
            className={`bg-zinc-900/50 border-zinc-800 cursor-pointer transition-all hover:border-zinc-700 ${
              isSelected ? 'border-emerald-500/50 bg-emerald-950/20' : ''
            }`}
            onClick={() => {
              setSelectedCategory(isSelected ? null : cat.id)
              onSelectCategory?.(cat.id, cat.name)
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{cat.name}</span>
                    {isActive && (
                      <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
                        <Flame className="h-2.5 w-2.5 mr-1" />ACTIVE
                      </Badge>
                    )}
                    {week > 7 && (
                      <Badge variant="outline" className="text-[10px] text-zinc-500">
                        DECLINING
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    MCap ${formatNumber(cat.marketCap)} • Vol ${formatNumber(cat.volume24h)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-base font-bold flex items-center gap-1 ${
                    cat.marketCapChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {cat.marketCapChange24h >= 0 ? 
                      <TrendingUp className="h-3.5 w-3.5" /> : 
                      <TrendingDown className="h-3.5 w-3.5" />
                    }
                    {cat.marketCapChange24h >= 0 ? '+' : ''}{cat.marketCapChange24h.toFixed(2)}%
                  </div>
                  <div className="text-xs text-zinc-500">Week {week}</div>
                </div>
              </div>

              {/* Strength bar */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-16">Strength</span>
                <Progress value={strength} className="h-1.5 flex-1" />
                <span className={`text-xs font-mono w-8 text-right ${getStrengthColor(strength)}`}>
                  {strength}
                </span>
              </div>

              {/* Top coins preview */}
              {cat.topCoins && cat.topCoins.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {cat.topCoins.slice(0, 5).map((coin, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {coin}
                    </Badge>
                  ))}
                </div>
              )}

              {isSelected && (
                <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
                  <div className="text-xs text-zinc-400">Catalyst checklist:</div>
                  <ul className="text-xs space-y-1 text-zinc-500">
                    <li>✅ Volume 24h ratio: {((cat.volume24h / cat.marketCap) * 100).toFixed(1)}%</li>
                    <li>{strength >= 60 ? '✅' : '❌'} Strength ≥ 60</li>
                    <li>{week <= 6 ? '✅' : '❌'} Within 6-week rotation window</li>
                    <li>📊 Suggested action: {isActive ? 'Drill into coins →' : 'Skip / monitor'}</li>
                  </ul>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full mt-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectCategory?.(cat.id, cat.name)
                    }}
                  >
                    Drill into coins →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
