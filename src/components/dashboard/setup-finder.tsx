'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Search, AlertTriangle, CheckCircle2, XCircle, Zap } from 'lucide-react'
import { getKlines, getTicker24h, getFundingRate, getOpenInterest, getLongShortRatio } from '@/lib/binance'
import { getTopCoins, type CoinMarketData } from '@/lib/coingecko'
import { analyzeTimeframe, fibonacci } from '@/lib/indicators'
import { 
  scoreMacro, scoreNarrative, scoreFundamental, scoreTechnical, 
  scoreChecklist, scoreRisk, calculateTotalScore, defaultChecklist 
} from '@/lib/scoring'
import type { Candle, Timeframe, TechnicalAnalysis, Bias, TradeSetup, SetupType, LayerScore, CoinFundamental } from '@/lib/types'
import { useAppStore, formatIDR, formatNumber } from '@/store/app-store'
import { CandlestickChart } from '@/components/charts/candlestick-chart'
// MacroDashboard import removed (unused)

interface SetupResult {
  setup: TradeSetup
  score: LayerScore
  candles4H: Candle[]
  scoreNotes: {
    macro: string[]
    narrative: string[]
    fundamental: string[]
    technical: string[]
    checklist: string[]
    risk: string[]
  }
}

const TIMEFRAMES: Timeframe[] = ['1W', '1D', '4H', '1H']

export function SetupFinder() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [bias, setBias] = useState<Bias>('LONG')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SetupResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [allCoins, setAllCoins] = useState<CoinMarketData[]>([])
  const [checklist, setChecklist] = useState(defaultChecklist())
  const [openPositions, setOpenPositions] = useState(0)
  const [dailyDD, setDailyDD] = useState(0)

  const { settings, addSetup, pushAlert, setups } = useAppStore()

  // Load top coins for autocomplete
  useEffect(() => {
    async function loadCoins() {
      const coins = await getTopCoins(100)
      setAllCoins(coins)
    }
    loadCoins()
  }, [])

  async function analyze() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      // Fetch data for all timeframes
      const timeframeData: Record<Timeframe, TechnicalAnalysis> = {} as Record<Timeframe, TechnicalAnalysis>
      const candlesByTf: Record<Timeframe, Candle[]> = {} as Record<Timeframe, Candle[]>
      
      await Promise.all(
        TIMEFRAMES.map(async (tf) => {
          const candles = await getKlines(symbol, tf, 300)
          candlesByTf[tf] = candles
          // Always analyze, even with few candles (analyzeTimeframe handles edge cases)
          timeframeData[tf] = analyzeTimeframe(candles, tf)
        })
      )

      // Check we have at least 1H and 4H data (the entry timeframes)
      if (!timeframeData['1H'] || !timeframeData['4H'] || candlesByTf['4H'].length < 20 || candlesByTf['1H'].length < 20) {
        throw new Error('Insufficient candle data for 1H/4H. Check symbol.')
      }

      // Fetch additional data
      const [ticker, funding, oi, lsr] = await Promise.all([
        getTicker24h(symbol),
        getFundingRate(symbol),
        getOpenInterest(symbol.replace('USDT', '') + 'USDT'),
        getLongShortRatio(symbol.replace('USDT', '') + 'USDT'),
      ])

      // Find coin fundamental (from CoinGecko)
      const coinData = allCoins.find(c => 
        c.symbol + 'USDT' === symbol || c.symbol === symbol.replace('USDT', '')
      )
      
      const fundamental: CoinFundamental = {
        symbol: symbol.replace('USDT', ''),
        name: coinData?.name || symbol,
        marketCap: coinData?.marketCap || 0,
        marketCapRank: coinData?.marketCapRank || 999,
        volume24h: ticker?.quoteVolume || coinData?.totalVolume || 0,
        volToMcap: coinData ? (ticker?.quoteVolume || coinData.totalVolume) / coinData.marketCap : 0,
        exchangeListings: 8,
        tokenomics: {
          circulating: coinData?.circulatingSupply || 0,
          total: coinData?.totalSupply || 0,
          fdv: coinData && coinData.totalSupply ? coinData.currentPrice * coinData.totalSupply : 0,
          fdvToMcap: coinData && coinData.totalSupply && coinData.marketCap > 0 
            ? (coinData.currentPrice * coinData.totalSupply) / coinData.marketCap 
            : 1,
          nextUnlock: null,
        },
        activeAddresses30d: 0,
        activeAddressesTrend: 'FLAT',
        devActivity: 50,
        newsSentiment: 50,
        verdict: 'PASS',
      }

      // Determine setup type based on technical analysis
      const daily = timeframeData['1D']
      const h4 = timeframeData['4H']
      
      let setupType: SetupType = 'TREND_PULLBACK'
      if (daily.adx < 20) setupType = 'MEAN_REVERSION'
      else if (h4.bollinger.squeeze && daily.bollinger.squeeze) setupType = 'BREAKOUT'

      // Calculate Fibonacci levels
      const recentCandles = candlesByTf['4H'].slice(-50)
      const swingLow = Math.min(...recentCandles.map(c => c.low))
      const swingHigh = Math.max(...recentCandles.map(c => c.high))
      const fib = fibonacci(swingLow, swingHigh)

      // Calculate entry zone, SL, TP based on bias
      const currentPrice = timeframeData['1H'].price
      let entryZone: { lower: number; upper: number }
      let stopLoss: number
      let tps: { tp1: number; tp2: number; tp3: number }
      let entryTrigger: string

      if (bias === 'NEUTRAL') {
        setError('Pilih LONG atau SHORT — NEUTRAL tidak bisa dianalisis')
        return
      }
      if (bias === 'LONG') {
        // Long setup: entry at pullback to fib 0.5-0.618 + EMA50 confluence
        const fib618 = fib.levels['0.618']
        const fib500 = fib.levels['0.500']
        const ema50_4h = h4.ema50
        entryZone = {
          lower: Math.min(fib618, ema50_4h * 0.99),
          upper: Math.max(fib500, ema50_4h * 1.01),
        }
        // SL below fib 0.786 or recent swing low
        stopLoss = Math.min(fib.levels['0.786'], swingLow * 0.98)
        // TPs at previous high + fib extensions
        tps = {
          tp1: swingHigh,
          tp2: fib.extensions['1.272'],
          tp3: fib.extensions['1.618'],
        }
        entryTrigger = `1H close above ${((entryZone.lower + entryZone.upper) / 2 * 1.005).toFixed(currentPrice < 1 ? 5 : 2)} with volume 1.5x avg`
      } else if (bias === 'SHORT') {
        // Short setup: entry at pullback to fib 0.5-0.618 (from highs)
        const fib618 = fib.levels['0.618']
        const fib500 = fib.levels['0.500']
        const ema50_4h = h4.ema50
        entryZone = {
          lower: Math.min(fib500, ema50_4h * 0.99),
          upper: Math.max(fib618, ema50_4h * 1.01),
        }
        stopLoss = Math.max(fib.levels['0.786'], swingHigh * 1.02)
        tps = {
          tp1: swingLow,
          tp2: swingLow - (swingHigh - swingLow) * 0.272,
          tp3: swingLow - (swingHigh - swingLow) * 0.618,
        }
        entryTrigger = `1H close below ${((entryZone.lower + entryZone.upper) / 2 * 0.995).toFixed(currentPrice < 1 ? 5 : 2)} with volume 1.5x avg`
      }

      const entryMid = (entryZone.lower + entryZone.upper) / 2
      const risk = Math.abs(entryMid - stopLoss)
      const tp1Rr = Math.abs(tps.tp1 - entryMid) / risk
      const tp2Rr = Math.abs(tps.tp2 - entryMid) / risk
      const tp3Rr = Math.abs(tps.tp3 - entryMid) / risk
      const avgRr = (tp1Rr * 0.5 + tp2Rr * 0.3 + tp3Rr * 0.2)

      // Position size
      const riskAmount = settings.capital * (settings.riskPerTrade / 100)
      const usdToIdr = 15800 // approximate
      const usdRisk = riskAmount / usdToIdr
      const quantity = usdRisk / risk
      const nominalValue = quantity * entryMid

      // Score all 6 layers
      // Macro: build macro data from real fetched data (fearGreed, funding, etc.)
      // Import macro functions for real data
      const { getFearGreedIndex, getMoonPhase, getEconomicEvents } = await import('@/lib/macro')
      const { getGlobalData } = await import('@/lib/coingecko')
      const [fearGreedData, globalData] = await Promise.all([
        getFearGreedIndex(),
        getGlobalData(),
      ])
      const moonPhase = getMoonPhase()
      const economicEvents = getEconomicEvents()
      
      const fgValue = fearGreedData?.value || 50
      const btcDom = globalData?.btcDominance || 54
      const btcDomTrend: 'UP' | 'DOWN' | 'FLAT' = btcDom > 52 ? 'UP' : 'DOWN'
      const usdtTrend: 'UP' | 'DOWN' | 'FLAT' = fgValue < 40 ? 'UP' : 'DOWN'
      
      let fgLabel: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed' = 'Neutral'
      if (fgValue < 25) fgLabel = 'Extreme Fear'
      else if (fgValue < 45) fgLabel = 'Fear'
      else if (fgValue < 55) fgLabel = 'Neutral'
      else if (fgValue < 75) fgLabel = 'Greed'
      else fgLabel = 'Extreme Greed'
      
      const macroData = {
        btcDominance: btcDom,
        btcDominanceTrend: btcDomTrend,
        usdtDominance: 100 - btcDom - (globalData?.ethDominance || 17),
        usdtDominanceTrend: usdtTrend,
        otherBtcRatio: btcDom > 0 ? (100 - btcDom) / btcDom : 0.5,
        otherBtcTrend: 'UP' as const,
        fearGreed: fgValue,
        fearGreedLabel: fgLabel,
        fundingAggregate: funding?.fundingRate || 0.0008,
        openInterestBtc: oi?.openInterestValue || 18e9,
        longShortRatio: lsr?.longShortRatio || 1.0,
        moonPhase,
        economicEvents,
        macroVerdict: 'NEUTRAL' as Bias, // Will be set from scoreMacro result below
      }
      const macroScore = scoreMacro(macroData)
      // Use the real macro verdict from scoreMacro, not user's bias
      macroData.macroVerdict = macroScore.bias
      const narrativeScore = scoreNarrative(null) // No narrative context in this MVP
      const fundamentalScore = scoreFundamental(fundamental)
      const technicalScore = scoreTechnical(timeframeData, bias)
      const checklistScore = scoreChecklist(checklist)
      const riskScore = scoreRisk(avgRr, settings.riskPerTrade, openPositions, settings.maxConcurrentPositions, dailyDD, settings.dailyDrawdownLimit)

      const totalScore = calculateTotalScore({
        macro: macroScore,
        narrative: narrativeScore,
        fundamental: fundamentalScore,
        technical: technicalScore,
        checklist: checklistScore,
        risk: riskScore,
      })

      // Build the trade setup object
      const setup: TradeSetup = {
        id: Math.random().toString(36).slice(2),
        symbol,
        bias,
        setupType,
        confidence: totalScore.totalScore,
        createdAt: new Date().toISOString(),
        status: checklistScore.allRequiredChecked && totalScore.totalScore >= 70 ? 'READY' : 'WAIT_TRIGGER',
        timeframeAnalysis: timeframeData,
        fibonacci: fib,
        entry: {
          zone: entryZone,
          trigger: entryTrigger,
          triggerPrice: entryMid,
        },
        stopLoss: {
          price: stopLoss,
          reason: bias === 'LONG' 
            ? 'Below Fib 0.786 + structure invalidation' 
            : 'Above Fib 0.786 + structure invalidation',
        },
        takeProfits: {
          tp1: { price: tps.tp1, percent: 50, rr: tp1Rr },
          tp2: { price: tps.tp2, percent: 30, rr: tp2Rr },
          tp3: { price: tps.tp3, percent: 20, rr: tp3Rr },
        },
        rrAverage: avgRr,
        positionSize: {
          capital: settings.capital,
          riskPercent: settings.riskPerTrade,
          riskAmount,
          quantity,
          nominalValue,
        },
        invalidityConditions: [
          `4H close ${bias === 'LONG' ? 'below' : 'above'} ${stopLoss.toFixed(currentPrice < 1 ? 5 : 2)} (structure broken)`,
          funding && Math.abs(funding.fundingRate) > 0.0005 ? `Funding rate spikes > |0.05%|` : 'Funding rate stays neutral',
          'Narrative dies (top 5 narrative coins all -10% in 24h)',
          'BTC drops >5% in 24h (macro invalidation)',
        ],
        checklist,
        alerts: [
          { id: '1', type: 'INFO', condition: `Price enters entry zone (${entryZone.lower.toFixed(currentPrice < 1 ? 5 : 2)} - ${entryZone.upper.toFixed(currentPrice < 1 ? 5 : 2)})`, triggered: false },
          { id: '2', type: 'ACTION', condition: entryTrigger, triggered: false },
          { id: '3', type: 'WARNING', condition: `Price approaches SL (${stopLoss.toFixed(currentPrice < 1 ? 5 : 2)})`, triggered: false },
          { id: '4', type: 'CRITICAL', condition: `SL hit`, triggered: false },
          { id: '5', type: 'INFO', condition: `TP1 hit (${tps.tp1.toFixed(currentPrice < 1 ? 5 : 2)}) → move SL to BE`, triggered: false },
          { id: '6', type: 'INFO', condition: `TP2 hit → trailing stop active`, triggered: false },
          { id: '7', type: 'CRITICAL', condition: `Invalidity condition triggered → EXIT`, triggered: false },
        ],
        coinFundamental: fundamental,
        narrative: null,
      }

      setResult({
        setup,
        score: totalScore,
        candles4H: candlesByTf['4H'] || [],
        scoreNotes: {
          macro: macroScore.notes,
          narrative: narrativeScore.notes,
          fundamental: fundamentalScore.notes,
          technical: technicalScore.notes,
          checklist: checklistScore.notes,
          risk: riskScore.notes,
        },
      })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const [savedSetupId, setSavedSetupId] = useState<string | null>(null)
  
  function saveSetup() {
    if (!result) return
    if (savedSetupId === result.setup.id) return // Prevent duplicate save
    addSetup(result.setup)
    setSavedSetupId(result.setup.id)
    pushAlert({
      type: 'INFO',
      title: 'Setup Saved',
      message: `${result.setup.symbol} ${result.setup.bias} setup saved with confidence ${result.score.totalScore.toFixed(1)}`,
    })
  }

  function toggleChecklist(idx: number) {
    setChecklist(prev => prev.map((item, i) => 
      i === idx ? { ...item, checked: !item.checked } : item
    ))
  }

  const formatPrice = (p: number) => p < 1 ? p.toFixed(5) : p < 100 ? p.toFixed(2) : p.toFixed(0)

  return (
    <div className="space-y-4">
      {/* Input Form */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4" />
            Coin Analysis Input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="symbol" className="text-xs text-zinc-400">Symbol (Binance)</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="BTCUSDT"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Trade Bias</Label>
              <Select value={bias} onValueChange={(v) => setBias(v as Bias)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LONG">🟢 LONG</SelectItem>
                  <SelectItem value="SHORT">🔴 SHORT</SelectItem>
                  <SelectItem value="NEUTRAL">⚪ NEUTRAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-zinc-400">Open Positions</Label>
              <Input
                type="number"
                value={openPositions}
                onChange={(e) => setOpenPositions(parseInt(e.target.value) || 0)}
                min="0"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Daily DD (%)</Label>
              <Input
                type="number"
                value={dailyDD}
                onChange={(e) => setDailyDD(parseFloat(e.target.value) || 0)}
                step="0.1"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          </div>

          <Button 
            onClick={analyze} 
            disabled={loading}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing 4 timeframes...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run 6-Layer Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-950/30 border-red-800">
          <CardContent className="p-3 text-sm text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-8">
            <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
            <TabsTrigger value="technical" className="text-xs">Technical</TabsTrigger>
            <TabsTrigger value="chart" className="text-xs">Chart</TabsTrigger>
            <TabsTrigger value="checklist" className="text-xs">Checklist</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
          </TabsList>

          {/* SUMMARY TAB */}
          <TabsContent value="summary" className="space-y-3 mt-2">
            {/* Confidence Badge */}
            <Card className={`border-l-4 ${
              result.score.totalScore >= 80 ? 'border-l-emerald-500 bg-emerald-950/30' :
              result.score.totalScore >= 70 ? 'border-l-yellow-500 bg-yellow-950/20' :
              result.score.totalScore >= 60 ? 'border-l-orange-500 bg-orange-950/20' :
              'border-l-red-500 bg-red-950/20'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs text-zinc-400">Setup Confidence</div>
                    <div className="text-2xl font-bold">{result.score.totalScore.toFixed(1)}/100</div>
                    <div className="text-xs text-zinc-500">{result.score.confidence}</div>
                  </div>
                  <Badge variant={result.setup.status === 'READY' ? 'default' : 'secondary'} className={
                    result.setup.status === 'READY' ? 'bg-emerald-600' : ''
                  }>
                    {result.setup.status === 'READY' ? '✅ READY' : '⏳ WAIT'}
                  </Badge>
                </div>
                
                {/* Layer scores */}
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <LayerScoreCard label="L1 Macro" score={result.score.layer1Macro} notes={result.scoreNotes.macro} />
                  <LayerScoreCard label="L2 Narrative" score={result.score.layer2Narrative} notes={result.scoreNotes.narrative} />
                  <LayerScoreCard label="L3 Fund" score={result.score.layer3Fundamental} notes={result.scoreNotes.fundamental} />
                  <LayerScoreCard label="L4 Technical" score={result.score.layer4Technical} notes={result.scoreNotes.technical} />
                  <LayerScoreCard label="L5 Checklist" score={result.score.layer5Checklist} notes={result.scoreNotes.checklist} />
                  <LayerScoreCard label="L6 Risk" score={result.score.layer6Risk} notes={result.scoreNotes.risk} />
                </div>
              </CardContent>
            </Card>

            {/* Trade Plan */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">💰 Trade Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-zinc-500">Setup Type</div>
                    <div className="font-medium">{result.setup.setupType.replace(/_/g, ' ')}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Avg R:R</div>
                    <div className="font-medium text-emerald-400">1:{result.setup.rrAverage.toFixed(2)}</div>
                  </div>
                </div>
                <Separator className="my-2" />
                <div>
                  <div className="text-zinc-500">Entry Zone</div>
                  <div className="font-mono text-blue-400">
                    {formatPrice(result.setup.entry.zone.lower)} - {formatPrice(result.setup.entry.zone.upper)}
                  </div>
                  <div className="text-zinc-500 mt-1">Trigger</div>
                  <div className="text-zinc-300">{result.setup.entry.trigger}</div>
                </div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-zinc-500">Stop Loss</div>
                    <div className="font-mono text-red-400">{formatPrice(result.setup.stopLoss.price)}</div>
                    <div className="text-zinc-600 text-[10px]">{result.setup.stopLoss.reason}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Take Profits</div>
                    <div className="font-mono text-emerald-400">
                      TP1: {formatPrice(result.setup.takeProfits.tp1.price)} (50%, 1:{result.setup.takeProfits.tp1.rr.toFixed(2)})
                    </div>
                    <div className="font-mono text-emerald-400">
                      TP2: {formatPrice(result.setup.takeProfits.tp2.price)} (30%, 1:{result.setup.takeProfits.tp2.rr.toFixed(2)})
                    </div>
                    <div className="font-mono text-emerald-400">
                      TP3: {formatPrice(result.setup.takeProfits.tp3.price)} (20%, 1:{result.setup.takeProfits.tp3.rr.toFixed(2)})
                    </div>
                  </div>
                </div>
                <Separator className="my-2" />
                <div>
                  <div className="text-zinc-500">Position Size</div>
                  <div className="font-mono">
                    Capital: {formatIDR(result.setup.positionSize.capital)} • Risk: {result.setup.positionSize.riskPercent}% = {formatIDR(result.setup.positionSize.riskAmount)}
                  </div>
                  <div className="font-mono">
                    Quantity: {result.setup.positionSize.quantity.toFixed(4)} • Nominal: ${formatNumber(result.setup.positionSize.nominalValue)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invalidity Conditions */}
            <Card className="bg-red-950/20 border-red-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  Invalidity Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {result.setup.invalidityConditions.map((c, i) => (
                  <div key={i} className="text-xs text-red-300 flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>{c}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button 
              onClick={saveSetup} 
              className="w-full"
              disabled={savedSetupId === result?.setup.id}
              variant={savedSetupId === result?.setup.id ? "outline" : "default"}
            >
              {savedSetupId === result?.setup.id ? '✓ Setup Saved' : 'Save Setup to Tracker'}
            </Button>
          </TabsContent>

          {/* TECHNICAL TAB */}
          <TabsContent value="technical" className="space-y-3 mt-2">
            {TIMEFRAMES.map(tf => {
              const ta = result.setup.timeframeAnalysis[tf]
              if (!ta) return null
              return (
                <Card key={tf} className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{tf} Timeframe</CardTitle>
                      <Badge variant="outline" className={
                        ta.verdict === 'BULLISH' ? 'border-emerald-500 text-emerald-400' :
                        ta.verdict === 'BEARISH' ? 'border-red-500 text-red-400' : ''
                      }>
                        {ta.verdict}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <div>Trend: <span className="text-zinc-300">{ta.trend}</span></div>
                      <div>ADX: <span className="text-zinc-300">{ta.adx.toFixed(1)}</span></div>
                      <div>RSI: <span className="text-zinc-300">{ta.rsi.toFixed(1)}</span></div>
                      <div>Price: <span className="text-zinc-300 font-mono">{formatPrice(ta.price)}</span></div>
                      <div>EMA20: <span className="text-amber-400 font-mono">{formatPrice(ta.ema20)}</span></div>
                      <div>EMA50: <span className="text-blue-400 font-mono">{formatPrice(ta.ema50)}</span></div>
                      <div>EMA200: <span className="text-purple-400 font-mono">{formatPrice(ta.ema200)}</span></div>
                      <div>MACD: <span className={ta.macd.histogram > 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {ta.macd.histogram > 0 ? '+' : ''}{ta.macd.histogram.toFixed(4)}
                      </span></div>
                      <div>Vol vs Avg: <span className="text-zinc-300">{ta.volumeTrend}</span></div>
                      <div>BB Squeeze: <span className={ta.bollinger.squeeze ? 'text-yellow-400' : 'text-zinc-500'}>
                        {ta.bollinger.squeeze ? 'YES' : 'NO'}
                      </span></div>
                    </div>
                    {ta.candlestickPattern && (
                      <div className="mt-2 pt-2 border-t border-zinc-800">
                        Last pattern: <Badge variant="outline">{ta.candlestickPattern}</Badge>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-zinc-800">
                      <div className="text-zinc-500 mb-1">Key Levels:</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        <div>Supports: <span className="text-emerald-400 font-mono">
                          {ta.keySupport.map(s => formatPrice(s)).join(', ')}
                        </span></div>
                        <div>Resistances: <span className="text-red-400 font-mono">
                          {ta.keyResistance.map(r => formatPrice(r)).join(', ')}
                        </span></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Fibonacci */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">📐 Fibonacci Levels</CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-zinc-500 mb-1">Retracement</div>
                    {Object.entries(result.setup.fibonacci.levels).map(([k, v]) => (
                      <div key={k} className="font-mono">
                        <span className="text-zinc-500">{k}:</span> <span className="text-zinc-300">{formatPrice(v)}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-zinc-500 mb-1">Extension (TP targets)</div>
                    {Object.entries(result.setup.fibonacci.extensions).map(([k, v]) => (
                      <div key={k} className="font-mono">
                        <span className="text-zinc-500">{k}:</span> <span className="text-emerald-400">{formatPrice(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHART TAB */}
          <TabsContent value="chart" className="mt-2">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-2">
                <CandlestickChart
                  candles={result.candles4H}
                  symbol={symbol}
                  height={400}
                  showFib
                  fibLevels={{ swingLow: result.setup.fibonacci.swingLow, swingHigh: result.setup.fibonacci.swingHigh }}
                  entry={(result.setup.entry.zone.lower + result.setup.entry.zone.upper) / 2}
                  stopLoss={result.setup.stopLoss.price}
                  takeProfits={[
                    result.setup.takeProfits.tp1.price,
                    result.setup.takeProfits.tp2.price,
                    result.setup.takeProfits.tp3.price,
                  ]}
                />
                <div className="text-xs text-zinc-500 mt-2 px-2">
                  Showing 4H chart with Fibonacci levels, entry zone, stop loss, and take profit targets.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHECKLIST TAB */}
          <TabsContent value="checklist" className="space-y-3 mt-2">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pre-Trade Checklist (Layer 5)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {checklist.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded hover:bg-zinc-800/50">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggleChecklist(i)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-1">
                        {item.checked ? 
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : 
                          <XCircle className="h-3 w-3 text-zinc-600" />
                        }
                        <span className={item.checked ? 'text-emerald-300 line-through' : 'text-zinc-300'}>
                          {item.item}
                        </span>
                      </div>
                    </div>
                    {item.required && (
                      <Badge variant="outline" className="text-[9px] border-red-500/50 text-red-400">
                        REQUIRED
                      </Badge>
                    )}
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <div className="text-xs text-zinc-400">
                    Required: {checklist.filter(c => c.required && c.checked).length}/{checklist.filter(c => c.required).length}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Optional: {checklist.filter(c => !c.required && c.checked).length}/{checklist.filter(c => !c.required).length}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={analyze} variant="outline" className="w-full" size="sm">
              Re-calculate Score
            </Button>
          </TabsContent>

          {/* ALERTS TAB */}
          <TabsContent value="alerts" className="space-y-2 mt-2">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">🔔 Alert Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.setup.alerts.map(a => (
                  <div key={a.id} className="flex items-start gap-2 p-2 rounded border border-zinc-800">
                    <Badge variant={
                      a.type === 'CRITICAL' ? 'destructive' :
                      a.type === 'WARNING' ? 'default' :
                      a.type === 'ACTION' ? 'default' : 'secondary'
                    } className={`text-[9px] ${a.type === 'ACTION' ? 'bg-blue-600' : ''}`}>
                      {a.type}
                    </Badge>
                    <span className="text-xs text-zinc-300 flex-1">{a.condition}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Active Setups List */}
      {setups.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Saved Setups ({setups.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {setups.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded border border-zinc-800 text-xs">
                    <div>
                      <div className="font-medium">
                        {s.symbol} <Badge variant={s.bias === 'LONG' ? 'default' : 'destructive'} className="ml-1 text-[9px]">
                          {s.bias}
                        </Badge>
                      </div>
                      <div className="text-zinc-500">{new Date(s.createdAt).toLocaleString('id-ID')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{s.confidence.toFixed(0)}/100</div>
                      <div className="text-zinc-500">1:{s.rrAverage.toFixed(1)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function LayerScoreCard({ label, score, notes }: { label: string; score: number; notes: string[] }) {
  const color = score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="bg-zinc-950/50 p-2 rounded">
      <div className="flex items-center justify-between">
        <span className="text-zinc-500">{label}</span>
        <span className={`font-mono ${color}`}>{score.toFixed(0)}</span>
      </div>
      <div className="text-[9px] text-zinc-600 mt-0.5 truncate" title={notes.join('; ')}>
        {notes[0] || '—'}
      </div>
    </div>
  )
}
