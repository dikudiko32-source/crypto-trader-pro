'use client'

import { useEffect, useRef, useState } from 'react'
import type { Candle, TechnicalAnalysis } from '@/lib/types'

interface ChartProps {
  candles: Candle[]
  height?: number
  showVolume?: boolean
  showEMA?: boolean
  showBollinger?: boolean
  showFib?: boolean
  fibLevels?: { swingLow: number; swingHigh: number }
  entry?: number
  stopLoss?: number
  takeProfits?: number[]
  symbol?: string
}

export function CandlestickChart({
  candles,
  height = 320,
  showVolume = true,
  showEMA = true,
  showBollinger = false,
  showFib = false,
  fibLevels,
  entry,
  stopLoss,
  takeProfits = [],
  symbol,
}: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  useEffect(() => {
    const updateWidth = () => {
      if (canvasRef.current?.parentElement) {
        setContainerWidth(canvasRef.current.parentElement.clientWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    if (!candles.length || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = containerWidth
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // Clear
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    // Determine price range
    const visibleCandles = candles.slice(-60)
    const prices = visibleCandles.flatMap(c => [c.high, c.low])
    let minPrice = Math.min(...prices)
    let maxPrice = Math.max(...prices)
    const padding = (maxPrice - minPrice) * 0.1
    minPrice -= padding
    maxPrice += padding

    // Include entry/SL/TP in range
    if (entry) {
      minPrice = Math.min(minPrice, entry)
      maxPrice = Math.max(maxPrice, entry)
    }
    if (stopLoss) {
      minPrice = Math.min(minPrice, stopLoss)
      maxPrice = Math.max(maxPrice, stopLoss)
    }
    takeProfits.forEach(tp => {
      minPrice = Math.min(minPrice, tp)
      maxPrice = Math.max(maxPrice, tp)
    })

    const chartHeight = showVolume ? height * 0.75 : height
    const volumeHeight = showVolume ? height * 0.2 : 0
    const volumeTop = height * 0.78
    const rightMargin = 60
    const chartWidth = width - rightMargin

    // Price to Y
    const priceToY = (price: number) => {
      return ((maxPrice - price) / (maxPrice - minPrice)) * chartHeight
    }

    // Y to price (for hover)
    const yToPrice = (y: number) => {
      return maxPrice - (y / chartHeight) * (maxPrice - minPrice)
    }

    // Draw horizontal grid + price labels
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    ctx.fillStyle = '#666'
    ctx.font = '10px monospace'
    const gridLines = 6
    for (let i = 0; i <= gridLines; i++) {
      const y = (i / gridLines) * chartHeight
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(chartWidth, y)
      ctx.stroke()
      const price = yToPrice(y)
      ctx.fillText(price.toFixed(price < 1 ? 5 : 2), chartWidth + 4, y + 3)
    }

    // Calculate EMA20 and EMA50
    const calcEMA = (period: number) => {
      const result: number[] = []
      const k = 2 / (period + 1)
      let prev = visibleCandles[0].close
      result.push(prev)
      for (let i = 1; i < visibleCandles.length; i++) {
        const v = visibleCandles[i].close * k + prev * (1 - k)
        result.push(v)
        prev = v
      }
      return result
    }

    const ema20 = showEMA ? calcEMA(20) : []
    const ema50 = showEMA ? calcEMA(50) : []

    // Draw EMA lines
    if (showEMA) {
      const drawLine = (data: number[], color: string) => {
        if (data.length < 2) return
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        data.forEach((v, i) => {
          const x = (i / (visibleCandles.length - 1)) * chartWidth
          const y = priceToY(v)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()
      }
      drawLine(ema20, '#fbbf24')
      drawLine(ema50, '#3b82f6')
    }

    // Draw Bollinger Bands
    if (showBollinger && visibleCandles.length >= 20) {
      const calcBB = () => {
        const upper: number[] = []
        const lower: number[] = []
        for (let i = 0; i < visibleCandles.length; i++) {
          if (i < 19) {
            upper.push(visibleCandles[i].close)
            lower.push(visibleCandles[i].close)
            continue
          }
          const slice = visibleCandles.slice(i - 19, i + 1).map(c => c.close)
          const mean = slice.reduce((a, b) => a + b, 0) / 20
          const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20
          const std = Math.sqrt(variance)
          upper.push(mean + 2 * std)
          lower.push(mean - 2 * std)
        }
        return { upper, lower }
      }
      const bb = calcBB()
      ctx.strokeStyle = '#4b5563'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      bb.upper.forEach((v, i) => {
        const x = (i / (visibleCandles.length - 1)) * chartWidth
        const y = priceToY(v)
        if (i === 0) { ctx.moveTo(x, y) } else { ctx.lineTo(x, y) }
      })
      ctx.stroke()
      ctx.beginPath()
      bb.lower.forEach((v, i) => {
        const x = (i / (visibleCandles.length - 1)) * chartWidth
        const y = priceToY(v)
        if (i === 0) { ctx.moveTo(x, y) } else { ctx.lineTo(x, y) }
      })
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw Fibonacci levels
    if (showFib && fibLevels) {
      const diff = fibLevels.swingHigh - fibLevels.swingLow
      const levels = [
        { p: 0.236, color: '#ef4444' },
        { p: 0.382, color: '#f59e0b' },
        { p: 0.5, color: '#eab308' },
        { p: 0.618, color: '#22c55e' },
        { p: 0.786, color: '#3b82f6' },
      ]
      ctx.lineWidth = 1
      ctx.setLineDash([5, 3])
      levels.forEach(l => {
        const price = fibLevels.swingHigh - diff * l.p
        const y = priceToY(price)
        ctx.strokeStyle = l.color
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(chartWidth, y)
        ctx.stroke()
        ctx.fillStyle = l.color
        ctx.font = '9px monospace'
        ctx.fillText(`${(l.p * 100).toFixed(1)}%`, 4, y - 2)
      })
      ctx.setLineDash([])
    }

    // Draw candles
    const candleWidth = chartWidth / visibleCandles.length
    const bodyWidth = Math.max(2, candleWidth * 0.7)

    visibleCandles.forEach((c, i) => {
      const x = i * candleWidth + candleWidth / 2
      const openY = priceToY(c.open)
      const closeY = priceToY(c.close)
      const highY = priceToY(c.high)
      const lowY = priceToY(c.low)

      const isBull = c.close >= c.open
      const color = isBull ? '#22c55e' : '#ef4444'
      
      // Hover highlight
      if (hoveredCandle === i) {
        ctx.fillStyle = isBull ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'
        ctx.fillRect(i * candleWidth, 0, candleWidth, chartHeight)
      }

      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = 1

      // Wick
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      // Body
      const bodyTop = Math.min(openY, closeY)
      const bodyHeight = Math.max(1, Math.abs(closeY - openY))
      ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight)

      // Volume bar
      if (showVolume) {
        const maxVol = Math.max(...visibleCandles.map(c => c.volume))
        const volBarHeight = (c.volume / maxVol) * volumeHeight
        ctx.fillStyle = isBull ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'
        ctx.fillRect(x - bodyWidth / 2, volumeTop + volumeHeight - volBarHeight, bodyWidth, volBarHeight)
      }
    })

    // Draw entry/SL/TP lines
    const drawLevel = (price: number, color: string, label: string) => {
      const y = priceToY(price)
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(chartWidth, y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = color
      ctx.fillRect(chartWidth, y - 8, rightMargin, 16)
      ctx.fillStyle = '#fff'
      ctx.font = '9px monospace'
      ctx.fillText(label, chartWidth + 2, y + 3)
      ctx.fillText(price.toFixed(price < 1 ? 5 : 2), chartWidth + 2, y + 12)
    }

    if (entry) drawLevel(entry, '#3b82f6', 'E')
    if (stopLoss) drawLevel(stopLoss, '#ef4444', 'SL')
    takeProfits.forEach((tp, i) => drawLevel(tp, '#22c55e', `TP${i + 1}`))

    // Symbol label
    if (symbol) {
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(symbol, 8, 16)
    }

    // EMA legend
    if (showEMA) {
      ctx.font = '9px monospace'
      ctx.fillStyle = '#fbbf24'
      ctx.fillText('EMA20', 80, 16)
      ctx.fillStyle = '#3b82f6'
      ctx.fillText('EMA50', 130, 16)
    }

    // Mouse move handler is in the JSX overlay
    void yToPrice
  }, [candles, containerWidth, height, showVolume, showEMA, showBollinger, showFib, fibLevels, entry, stopLoss, takeProfits, symbol, hoveredCandle])

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const visibleCandles = candles.slice(-60)
          const candleWidth = (rect.width - 60) / visibleCandles.length
          const idx = Math.floor(x / candleWidth)
          if (idx >= 0 && idx < visibleCandles.length) {
            setHoveredCandle(idx)
          }
        }}
        onMouseLeave={() => setHoveredCandle(null)}
      />
      {hoveredCandle !== null && candles.length > 0 && (
        <div className="absolute top-2 right-16 bg-black/80 border border-zinc-700 rounded px-2 py-1 text-[10px] font-mono text-zinc-200 pointer-events-none">
          {(() => {
            const c = candles.slice(-60)[hoveredCandle]
            if (!c) return null
            const date = new Date(c.time).toLocaleString('id-ID', { 
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
            })
            return (
              <div>
                <div className="text-zinc-400">{date}</div>
                <div>O: {c.open.toFixed(c.open < 1 ? 5 : 2)} H: {c.high.toFixed(c.high < 1 ? 5 : 2)}</div>
                <div>L: {c.low.toFixed(c.low < 1 ? 5 : 2)} C: {c.close.toFixed(c.close < 1 ? 5 : 2)}</div>
                <div className="text-zinc-400">Vol: {c.volume.toFixed(0)}</div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
