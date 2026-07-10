'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calculator, AlertTriangle } from 'lucide-react'
import { useAppStore, formatIDR } from '@/store/app-store'

export function RiskCalculator() {
  const { settings } = useAppStore()
  const [capital, setCapital] = useState(settings.capital)
  const [riskPercent, setRiskPercent] = useState(settings.riskPerTrade)
  const [entryPrice, setEntryPrice] = useState(0)
  const [stopLoss, setStopLoss] = useState(0)
  const [takeProfit1, setTakeProfit1] = useState(0)
  const [takeProfit2, setTakeProfit2] = useState(0)
  const [takeProfit3, setTakeProfit3] = useState(0)
  const [usdToIdr, setUsdToIdr] = useState(15800)

  const riskAmount = capital * (riskPercent / 100)
  const risk = Math.abs(entryPrice - stopLoss)
  const quantity = risk > 0 && entryPrice > 0 ? (riskAmount / usdToIdr) / risk : 0
  const nominalValue = quantity * entryPrice
  const leverage = nominalValue > 0 ? (nominalValue / (capital / usdToIdr)) : 0
  
  const tp1Rr = risk > 0 && entryPrice > 0 ? Math.abs(takeProfit1 - entryPrice) / risk : 0
  const tp2Rr = risk > 0 && entryPrice > 0 ? Math.abs(takeProfit2 - entryPrice) / risk : 0
  const tp3Rr = risk > 0 && entryPrice > 0 ? Math.abs(takeProfit3 - entryPrice) / risk : 0
  
  const avgRr = tp1Rr * 0.5 + tp2Rr * 0.3 + tp3Rr * 0.2
  
  const tp1Pnl = quantity * Math.abs(takeProfit1 - entryPrice) * usdToIdr
  const tp2Pnl = quantity * Math.abs(takeProfit2 - entryPrice) * usdToIdr
  const tp3Pnl = quantity * Math.abs(takeProfit3 - entryPrice) * usdToIdr

  const meetsMinimum = avgRr >= 2
  const riskSafe = riskPercent <= 2

  return (
    <div className="space-y-3">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Position Size & R:R Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Capital (IDR)</Label>
              <Input
                type="number"
                value={capital}
                onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Risk per Trade (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Entry Price (USD)</Label>
              <Input
                type="number"
                step="any"
                value={entryPrice || ''}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Stop Loss (USD)</Label>
              <Input
                type="number"
                step="any"
                value={stopLoss || ''}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="bg-zinc-950 border-zinc-700 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">TP1 (50%)</Label>
              <Input
                type="number"
                step="any"
                value={takeProfit1 || ''}
                onChange={(e) => setTakeProfit1(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="bg-zinc-950 border-zinc-700 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">TP2 (30%)</Label>
              <Input
                type="number"
                step="any"
                value={takeProfit2 || ''}
                onChange={(e) => setTakeProfit2(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="bg-zinc-950 border-zinc-700 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">TP3 (20%)</Label>
              <Input
                type="number"
                step="any"
                value={takeProfit3 || ''}
                onChange={(e) => setTakeProfit3(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="bg-zinc-950 border-zinc-700 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">USD to IDR rate</Label>
            <Input
              type="number"
              value={usdToIdr}
              onChange={(e) => setUsdToIdr(parseFloat(e.target.value) || 0)}
              className="bg-zinc-950 border-zinc-700 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Calculation Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Risk Amount</span>
            <span className="font-mono font-bold">{formatIDR(riskAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Risk per unit</span>
            <span className="font-mono">${risk.toFixed(risk < 1 ? 5 : 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Position Quantity</span>
            <span className="font-mono">{quantity.toFixed(4)} units</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Nominal Value</span>
            <span className="font-mono">${nominalValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Effective Leverage</span>
            <span className={`font-mono ${leverage > 5 ? 'text-red-400' : 'text-zinc-300'}`}>
              {leverage.toFixed(2)}x
            </span>
          </div>
        </CardContent>
      </Card>

      {/* R:R Analysis */}
      <Card className={`border-l-4 ${meetsMinimum ? 'border-l-emerald-500' : 'border-l-red-500'} bg-zinc-900/50 border-zinc-800`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">R:R Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-950/50 p-2 rounded">
              <div className="text-zinc-500">TP1 (50%)</div>
              <div className="font-mono text-emerald-400">1:{tp1Rr.toFixed(2)}</div>
              <div className="text-zinc-600">+{formatIDR(tp1Pnl)}</div>
            </div>
            <div className="bg-zinc-950/50 p-2 rounded">
              <div className="text-zinc-500">TP2 (30%)</div>
              <div className="font-mono text-emerald-400">1:{tp2Rr.toFixed(2)}</div>
              <div className="text-zinc-600">+{formatIDR(tp2Pnl)}</div>
            </div>
            <div className="bg-zinc-950/50 p-2 rounded">
              <div className="text-zinc-500">TP3 (20%)</div>
              <div className="font-mono text-emerald-400">1:{tp3Rr.toFixed(2)}</div>
              <div className="text-zinc-600">+{formatIDR(tp3Pnl)}</div>
            </div>
          </div>
          <div className="flex justify-between pt-2 border-t border-zinc-800">
            <span className="text-zinc-400">Average R:R (weighted)</span>
            <Badge variant={meetsMinimum ? 'default' : 'destructive'} className={meetsMinimum ? 'bg-emerald-600' : ''}>
              1:{avgRr.toFixed(2)} {meetsMinimum ? '✓' : '✗'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Validation Warnings */}
      {(!meetsMinimum || !riskSafe) && (
        <Card className="bg-red-950/30 border-red-800">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
              <div className="text-xs space-y-1 text-red-300">
                {!meetsMinimum && (
                  <div>⚠️ R:R below 1:2 minimum. Consider tighter SL or higher TP targets.</div>
                )}
                {!riskSafe && (
                  <div>⚠️ Risk per trade exceeds 2% rule. Reduce position size.</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Reference Card */}
      <Card className="bg-zinc-900/30 border-zinc-800/50">
        <CardContent className="p-3 text-xs space-y-1">
          <div className="font-semibold text-zinc-400 mb-1">Risk Management Rules:</div>
          <div>• Max risk per trade: 1-2% of capital</div>
          <div>• Max concurrent positions: {settings.maxConcurrentPositions}</div>
          <div>• Daily drawdown limit: {settings.dailyDrawdownLimit}%</div>
          <div>• Weekly drawdown limit: {settings.weeklyDrawdownLimit}%</div>
          <div>• Min R:R: 1:2 (target 1:3+)</div>
          <div>• Trailing stop: activate at +1R</div>
          <div>• Partial TP: 50% at TP1, 30% at TP2, 20% runner</div>
        </CardContent>
      </Card>
    </div>
  )
}
