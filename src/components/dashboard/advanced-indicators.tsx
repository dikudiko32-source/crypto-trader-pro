'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Activity, Layers, TrendingUp } from 'lucide-react'
import { getKlines } from '@/lib/binance'
import { isAbortError } from '@/hooks/use-safe-async'
import { vwap, volumeProfile, ichimoku, stochasticRSI, williamsR, cvd } from '@/lib/indicators'
import { calculateMultiTFAlignment } from '@/lib/scoring'
import { analyzeTimeframe } from '@/lib/indicators'
import type { Timeframe, VWAPData, VolumeProfile, IchimokuData, StochRSI, WilliamsR, CVDData, MultiTFAlignment } from '@/lib/types'

export function AdvancedIndicators() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{
    vwap: VWAPData | null
    volProfile: VolumeProfile | null
    ichimoku: IchimokuData | null
    stochRsi: StochRSI | null
    williamsR: WilliamsR | null
    cvd: CVDData | null
    alignment: MultiTFAlignment | null
  }>({
    vwap: null, volProfile: null, ichimoku: null,
    stochRsi: null, williamsR: null, cvd: null, alignment: null,
  })

  const isMountedRef = useRef(true)
  
  async function analyze() {
    setLoading(true)
    try {
      const candles4H = await getKlines(symbol, '4H', 200)
      const candles1D = await getKlines(symbol, '1D', 200)
      const candles1W = await getKlines(symbol, '1W', 200)
      const candles1H = await getKlines(symbol, '1H', 200)
      
      if (!isMountedRef.current) return
      
      if (candles4H.length === 0) {
        console.warn('No candle data returned')
        return
      }
      
      const closes4H = candles4H.map(c => c.close)
      
      // Calculate all indicators on 4H
      const vwapData = vwap(candles4H)
      const vpData = volumeProfile(candles4H, 30)
      const ichiData = ichimoku(candles4H)
      const stochRsiData = stochasticRSI(closes4H)
      const wrData = williamsR(candles4H)
      const cvdData = cvd(candles4H)
      
      // Multi-TF alignment
      const tfAnalysis = {
        '1W': analyzeTimeframe(candles1W, '1W' as Timeframe),
        '1D': analyzeTimeframe(candles1D, '1D' as Timeframe),
        '4H': analyzeTimeframe(candles4H, '4H' as Timeframe),
        '1H': analyzeTimeframe(candles1H, '1H' as Timeframe),
      }
      const alignment = calculateMultiTFAlignment(tfAnalysis)
      
      setData({
        vwap: vwapData,
        volProfile: vpData,
        ichimoku: ichiData,
        stochRsi: stochRsiData,
        williamsR: wrData,
        cvd: cvdData,
        alignment,
      })
    } catch (err) {
      if (isAbortError(err) || !isMountedRef.current) return
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    analyze()
    return () => { isMountedRef.current = false }
  }, [])

  const fmt = (n: number, d = 2) => n < 1 ? n.toFixed(5) : n.toFixed(d)
  const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`

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
            <Button size="sm" onClick={analyze} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Multi-TF Alignment (most important) */}
      {data.alignment && (
        <Card className={`bg-zinc-900/50 border-zinc-800 border-l-4 ${
          data.alignment.alignmentScore > 60 ? 'border-l-emerald-500' :
          data.alignment.alignmentScore < 40 ? 'border-l-red-500' : 'border-l-yellow-500'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Multi-Timeframe Alignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xl font-bold">
                {data.alignment.alignmentScore.toFixed(0)}/100
              </div>
              <Badge variant="outline" className={
                data.alignment.bias === 'STRONG_LONG' ? 'border-emerald-500 text-emerald-400' :
                data.alignment.bias === 'LONG' ? 'border-emerald-600 text-emerald-500' :
                data.alignment.bias === 'STRONG_SHORT' ? 'border-red-500 text-red-400' :
                data.alignment.bias === 'SHORT' ? 'border-red-600 text-red-500' : ''
              }>
                {data.alignment.bias.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {(['1W', '1D', '4H', '1H'] as Timeframe[]).map(tf => {
                const v = data.alignment![tf === '1W' ? 'weekly' : tf === '1D' ? 'daily' : tf === '4H' ? 'h4' : 'h1']
                return (
                  <div key={tf} className="text-center">
                    <div className="text-zinc-500">{tf}</div>
                    <Badge variant="outline" className={
                      v === 'BULLISH' ? 'border-emerald-500 text-emerald-400 text-[9px]' :
                      v === 'BEARISH' ? 'border-red-500 text-red-400 text-[9px]' : 'text-[9px]'
                    }>
                      {v}
                    </Badge>
                  </div>
                )
              })}
            </div>
            {data.alignment.conflict && (
              <div className="mt-2 text-xs text-yellow-400 bg-yellow-950/30 p-2 rounded border border-yellow-900">
                ⚠️ HTF/LTF conflict detected. Wait for alignment before entry.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* VWAP */}
      {data.vwap && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">VWAP (4H)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-zinc-500">VWAP</span><span className="font-mono">{fmt(data.vwap.value)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Upper Band (+1σ)</span><span className="font-mono text-red-400">{fmt(data.vwap.upperBand)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Lower Band (-1σ)</span><span className="font-mono text-emerald-400">{fmt(data.vwap.lowerBand)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Price vs VWAP</span><span className={`font-mono ${data.vwap.signal === 'ABOVE' ? 'text-emerald-400' : data.vwap.signal === 'BELOW' ? 'text-red-400' : ''}`}>{fmtPct(data.vwap.distance)}</span></div>
            <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
              💡 Entry di atas VWAP = bullish, di bawah = bearish. Band = volatility zone.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Volume Profile */}
      {data.volProfile && data.volProfile.poc > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Volume Profile & POC (4H)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-zinc-500">POC (Point of Control)</span><span className="font-mono text-yellow-400 font-bold">{fmt(data.volProfile.poc)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">VAH (Value Area High)</span><span className="font-mono text-red-400">{fmt(data.volProfile.vah)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">VAL (Value Area Low)</span><span className="font-mono text-emerald-400">{fmt(data.volProfile.val)}</span></div>
            <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
              💡 POC = magnet harga. SL di luar VAL/VAH = struktur valid.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ichimoku */}
      {data.ichimoku && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Ichimoku Cloud (4H)</CardTitle>
              <Badge variant="outline" className={`text-[9px] ${
                data.ichimoku.signal === 'BULLISH' ? 'border-emerald-500 text-emerald-400' :
                data.ichimoku.signal === 'BEARISH' ? 'border-red-500 text-red-400' : ''
              }`}>
                {data.ichimoku.signal}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-zinc-500">Tenkan-sen (9)</span><span className="font-mono">{fmt(data.ichimoku.tenkanSen)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Kijun-sen (26)</span><span className="font-mono">{fmt(data.ichimoku.kijunSen)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Senkou A</span><span className="font-mono">{fmt(data.ichimoku.senkouA)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Senkou B</span><span className="font-mono">{fmt(data.ichimoku.senkouB)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Cloud</span><span className={data.ichimoku.cloudColor === 'GREEN' ? 'text-emerald-400' : data.ichimoku.cloudColor === 'RED' ? 'text-red-400' : ''}>{data.ichimoku.cloudColor}</span></div>
            <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
              💡 Price above green cloud + Tenkan &gt; Kijun = strong bullish.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stoch RSI + Williams %R */}
      <div className="grid grid-cols-2 gap-3">
        {data.stochRsi && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3">
              <div className="text-xs text-zinc-400 mb-1">Stochastic RSI</div>
              <div className="text-base font-bold font-mono">
                K: {data.stochRsi.k.toFixed(1)} / D: {data.stochRsi.d.toFixed(1)}
              </div>
              <Badge variant="outline" className={`text-[9px] mt-1 ${
                data.stochRsi.signal === 'OVERSOLD' || data.stochRsi.signal === 'BULL_CROSS' ? 'border-emerald-500 text-emerald-400' :
                data.stochRsi.signal === 'OVERBOUGHT' || data.stochRsi.signal === 'BEAR_CROSS' ? 'border-red-500 text-red-400' : ''
              }`}>
                {data.stochRsi.signal.replace(/_/g, ' ')}
              </Badge>
            </CardContent>
          </Card>
        )}
        {data.williamsR && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3">
              <div className="text-xs text-zinc-400 mb-1">Williams %R</div>
              <div className="text-base font-bold font-mono">
                {data.williamsR.value.toFixed(1)}
              </div>
              <Badge variant="outline" className={`text-[9px] mt-1 ${
                data.williamsR.signal === 'OVERSOLD' ? 'border-emerald-500 text-emerald-400' :
                data.williamsR.signal === 'OVERBOUGHT' ? 'border-red-500 text-red-400' : ''
              }`}>
                {data.williamsR.signal}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* CVD */}
      {data.cvd && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                CVD (Cumulative Volume Delta)
              </CardTitle>
              <Badge variant="outline" className={`text-[9px] ${
                data.cvd.trend === 'ACCUMULATION' ? 'border-emerald-500 text-emerald-400' :
                data.cvd.trend === 'DISTRIBUTION' ? 'border-red-500 text-red-400' : ''
              }`}>
                {data.cvd.trend}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-zinc-500">CVD Value</span><span className="font-mono">{data.cvd.value.toFixed(0)}</span></div>
            {data.cvd.divergence !== 'NONE' && (
              <div className={`text-xs mt-2 p-2 rounded border ${
                data.cvd.divergence === 'BULLISH' ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' :
                'bg-red-950/30 border-red-800 text-red-300'
              }`}>
                ⚠️ {data.cvd.divergence} divergence: price & CVD disagree. Potential reversal.
              </div>
            )}
            <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
              💡 CVD menunjukkan buying/selling pressure. Divergence = early reversal signal.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
