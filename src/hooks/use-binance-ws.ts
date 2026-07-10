'use client'

// =====================================================
// BINANCE WEBSOCKET CLIENT — Real-time price stream
// =====================================================

import { useEffect, useRef, useState, useCallback } from 'react'
import type { RealtimePrice } from '@/lib/types'

interface UseBinanceWSOptions {
  symbols: string[]
  onUpdate?: (price: RealtimePrice) => void
  enabled?: boolean
}

export function useBinanceWS({ symbols, onUpdate, enabled = true }: UseBinanceWSOptions) {
  const [prices, setPrices] = useState<Record<string, RealtimePrice>>({})
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onUpdateRef = useRef(onUpdate)
  const symbolsRef = useRef(symbols)
  const enabledRef = useRef(enabled)
  const connectRef = useRef<() => void>(() => {})

  // Update refs in effects (React 19 strict)
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])
  useEffect(() => { symbolsRef.current = symbols }, [symbols])
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const connect = useCallback(() => {
    if (!enabledRef.current || symbolsRef.current.length === 0) return

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const streams = symbolsRef.current
      .map(s => s.toLowerCase() + '@miniTicker')
      .join('/')
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.stream && msg.data) {
            const data = msg.data
            const symbol = data.s
            const price = parseFloat(data.c)
            const open = parseFloat(data.o)
            const high = parseFloat(data.h)
            const low = parseFloat(data.l)
            const volume = parseFloat(data.v)
            const change24h = open > 0 ? ((price - open) / open) * 100 : 0

            const rtPrice: RealtimePrice = {
              symbol, price, change24h, high24h: high, low24h: low, volume24h: volume, timestamp: Date.now(),
            }

            setPrices(prev => ({ ...prev, [symbol]: rtPrice }))
            onUpdateRef.current?.(rtPrice)
          }
        } catch (err) {
          console.error('WS parse error:', err)
        }
      }

      ws.onerror = () => {
        setError('WebSocket connection failed')
        setConnected(false)
      }

      ws.onclose = () => {
        setConnected(false)
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current()
        }, 5000)
      }
    } catch (err) {
      console.error('WS connect failed:', err)
      setError(err instanceof Error ? err.message : 'Connection failed')
    }
  }, [])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    // Defer connect to avoid setState in effect (React 19 strict)
    const timer = setTimeout(() => connect(), 0)
    return () => {
      clearTimeout(timer)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect, symbols.join(','), enabled])

  return { prices, connected, error }
}

export function useBinancePrice(symbol: string, enabled = true) {
  const [price, setPrice] = useState<RealtimePrice | null>(null)
  const { prices, connected } = useBinanceWS({
    symbols: [symbol],
    enabled,
    onUpdate: (p) => {
      if (p.symbol === symbol) setPrice(p)
    }
  })
  return { price: price || prices[symbol] || null, connected }
}
