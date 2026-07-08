'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, TrendingUp, TrendingDown, Plus, X, Check } from 'lucide-react'
import { useAppStore, formatIDR, formatUSD } from '@/store/app-store'
import { analyzeCorrelation, correlationColor } from '@/lib/correlation'
import type { PositionCorrelation } from '@/lib/types'

interface Position {
  symbol: string
  value: number // USD
}

export function PositionCorrelation() {
  const { settings } = useAppStore()
  const [positions, setPositions] = useState<Position[]>([
    { symbol: 'BTCUSDT', value: 200 },
    { symbol: 'ETHUSDT', value: 150 },
    { symbol: 'SOLUSDT', value: 100 },
  ])
  const [newSymbol, setNewSymbol] = useState('')
  const [newValue, setNewValue] = useState(0)
  const [analysis, setAnalysis] = useState<PositionCorrelation | null>(null)
  const [loading, setLoading] = useState(false)

  async function analyze() {
    if (positions.length === 0) return
    setLoading(true)
    try {
      const result = await analyzeCorrelation(positions, settings.capital / 15800)
      setAnalysis(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    analyze()
  }, [positions])

  function addPosition() {
    if (!newSymbol || newValue <= 0) return
    setPositions(prev => [...prev, { symbol: newSymbol.toUpperCase(), value: newValue }])
    setNewSymbol('')
    setNewValue(0)
  }

  function removePosition(symbol: string) {
    setPositions(prev => prev.filter(p => p.symbol !== symbol))
  }

  const totalValue = positions.reduce((sum, p) => sum + p.value, 0)

  return (
    <div className="space-y-3">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-xs">Why Correlation Matters</AlertTitle>
        <AlertDescription className="text-xs">
          Jika semua posisi Anda berkorelasi tinggi (misal: 5 altcoin), maka 1 crash BTC = semua rugi.
          Diversifikasi yang sebenarnya = low correlation antar posisi.
        </AlertDescription>
      </Alert>

      {/* Add Position */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Add Open Position</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Symbol</Label>
              <Input
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="BTCUSDT"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Value (USD)</Label>
              <Input
                type="number"
                step="any"
                value={newValue || ''}
                onChange={(e) => setNewValue(parseFloat(e.target.value) || 0)}
                placeholder="200"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          </div>
          <Button size="sm" onClick={addPosition} className="w-full">
            <Plus className="h-3 w-3 mr-1" />
            Add Position
          </Button>
        </CardContent>
      </Card>

      {/* Positions List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Open Positions ({positions.length}) — Total: ${totalValue.toFixed(2)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm">No positions. Add some above.</div>
          ) : (
            <div className="space-y-1">
              {positions.map(p => (
                <div key={p.symbol} className="flex items-center justify-between p-2 rounded border border-zinc-800 text-xs">
                  <div>
                    <span className="font-medium">{p.symbol}</span>
                    <span className="text-zinc-500 ml-2">${p.value.toFixed(2)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs text-red-400"
                    onClick={() => removePosition(p.symbol)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Correlation Analysis */}
      {analysis && (
        <>
          <Card className={`bg-zinc-900/50 border-zinc-800 border-l-4 ${
            analysis.riskLevel === 'HIGH' ? 'border-l-red-500' :
            analysis.riskLevel === 'MEDIUM' ? 'border-l-yellow-500' : 'border-l-emerald-500'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Portfolio Risk</CardTitle>
                <Badge variant={analysis.riskLevel === 'HIGH' ? 'destructive' : 'outline'} className={
                  analysis.riskLevel === 'HIGH' ? '' :
                  analysis.riskLevel === 'MEDIUM' ? 'border-yellow-500 text-yellow-400' :
                  'border-emerald-500 text-emerald-400'
                }>
                  {analysis.riskLevel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-zinc-300">{analysis.recommendation}</div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div>
                  <span className="text-zinc-500">Total Exposure:</span>{' '}
                  <span className="font-mono">{analysis.totalExposurePct.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-zinc-500">Pairs Analyzed:</span>{' '}
                  <span className="font-mono">{analysis.matrix.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Correlation Matrix */}
          {analysis.matrix.length > 0 && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Correlation Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    {analysis.matrix.map((m, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border border-zinc-800 text-xs">
                        <div>
                          <span className="font-medium">{m.from.replace('USDT', '')}</span>
                          <span className="text-zinc-500 mx-1">↔</span>
                          <span className="font-medium">{m.to.replace('USDT', '')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${correlationColor(m.coefficient)}`}>
                            {m.coefficient.toFixed(2)}
                          </span>
                          <Badge variant="outline" className="text-[9px]">
                            {Math.abs(m.coefficient) > 0.7 ? 'HIGH' :
                             Math.abs(m.coefficient) > 0.4 ? 'MED' : 'LOW'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
                  💡 1.0 = perfect positive correlation, -1.0 = inverse, 0 = no correlation. Ideal portfolio &lt;0.5 average.
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Button variant="outline" size="sm" className="w-full" onClick={analyze} disabled={loading}>
        {loading ? 'Analyzing...' : 'Re-analyze'}
      </Button>
    </div>
  )
}
