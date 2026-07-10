'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { useBinanceWS } from './use-binance-ws'
import type { PriceAlert, RealtimePrice } from '@/lib/types'

/**
 * Hook untuk manage browser notifications
 */
export function useNotifications() {
  const { notificationsEnabled, setNotificationsEnabled, pushAlert } = useAppStore()

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('Browser tidak mendukung notifikasi')
      return false
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setNotificationsEnabled(true)
      // Register service worker for PWA
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js')
        } catch (err) {
          console.error('SW registration failed:', err)
        }
      }
      return true
    } else {
      alert('Notifikasi ditolak. Anda tidak akan mendapat alert push.')
      return false
    }
  }, [setNotificationsEnabled])

  const showNotification = useCallback((title: string, body: string, tag?: string) => {
    if (!notificationsEnabled || Notification.permission !== 'granted') return

    try {
      const notif = new Notification(title, {
        body,
        tag,
        icon: '/logo.svg',
        badge: '/logo.svg',
        requireInteraction: false,
        silent: false,
      })

      // Auto close after 10 seconds
      setTimeout(() => notif.close(), 10000)

      notif.onclick = () => {
        window.focus()
        notif.close()
      }
    } catch (err) {
      console.error('Notification error:', err)
    }
  }, [notificationsEnabled])

  return { notificationsEnabled, requestPermission, showNotification }
}

/**
 * Hook untuk monitor price alerts via WebSocket
 * Triggers notification when alert condition met
 */
export function usePriceAlertMonitor() {
  const { priceAlerts, updatePriceAlert, pushAlert } = useAppStore()
  const { notificationsEnabled, showNotification } = useNotifications()
  const previousPricesRef = useRef<Record<string, number>>({})
  const triggeredAlertsRef = useRef<Set<string>>(new Set())

  // Get all unique symbols from active alerts
  const symbols = Array.from(new Set(
    priceAlerts
      .filter(a => a.active && !a.triggered)
      .map(a => a.symbol)
  ))

  const handlePriceUpdate = useCallback((price: RealtimePrice) => {
    const prevPrice = previousPricesRef.current[price.symbol]
    const activeAlerts = priceAlerts.filter(
      a => a.active && !a.triggered && a.symbol === price.symbol
    )

    for (const alert of activeAlerts) {
      // Skip if already triggered in this session (prevents spam)
      if (triggeredAlertsRef.current.has(alert.id)) continue

      let shouldTrigger = false
      let message = ''

      switch (alert.condition) {
        case 'ABOVE':
          if (alert.targetPrice && price.price >= alert.targetPrice) {
            shouldTrigger = true
            message = `${alert.symbol} mencapai ${price.price} (above ${alert.targetPrice})`
          }
          break
        case 'BELOW':
          if (alert.targetPrice && price.price <= alert.targetPrice) {
            shouldTrigger = true
            message = `${alert.symbol} turun ke ${price.price} (below ${alert.targetPrice})`
          }
          break
        case 'CROSS_UP':
          if (prevPrice && alert.targetPrice && prevPrice < alert.targetPrice && price.price >= alert.targetPrice) {
            shouldTrigger = true
            message = `${alert.symbol} CROSS UP ${alert.targetPrice}!`
          }
          break
        case 'CROSS_DOWN':
          if (prevPrice && alert.targetPrice && prevPrice > alert.targetPrice && price.price <= alert.targetPrice) {
            shouldTrigger = true
            message = `${alert.symbol} CROSS DOWN ${alert.targetPrice}!`
          }
          break
        case 'PCT_CHANGE_5M':
          // Simplified: check 5% change from previous (would need more sophisticated tracking)
          if (prevPrice && alert.pctThreshold) {
            const pctChange = Math.abs((price.price - prevPrice) / prevPrice) * 100
            if (pctChange >= alert.pctThreshold) {
              shouldTrigger = true
              message = `${alert.symbol} bergerak ${pctChange.toFixed(2)}% (>= ${alert.pctThreshold}%)`
            }
          }
          break
        case 'PCT_CHANGE_1H':
          // Use 24h change as proxy
          if (alert.pctThreshold && Math.abs(price.change24h) >= alert.pctThreshold) {
            shouldTrigger = true
            message = `${alert.symbol} 24h change ${price.change24h.toFixed(2)}% (>= ${alert.pctThreshold}%)`
          }
          break
      }

      if (shouldTrigger) {
        triggeredAlertsRef.current.add(alert.id)
        updatePriceAlert(alert.id, {
          triggered: true,
          triggeredAt: new Date().toISOString()
        })

        const fullMessage = `${message}${alert.note ? ' — ' + alert.note : ''}`

        pushAlert({
          type: 'ACTION',
          title: `🔔 Price Alert: ${alert.symbol}`,
          message: fullMessage,
        })

        if (notificationsEnabled) {
          showNotification(
            `🔔 ${alert.symbol} Alert`,
            fullMessage,
            alert.id
          )
        }
      }
    }

    previousPricesRef.current[price.symbol] = price.price
  }, [priceAlerts, updatePriceAlert, pushAlert, notificationsEnabled, showNotification])

  // Reset triggered alerts tracking when alerts are removed/updated
  useEffect(() => {
    const activeAlertIds = new Set(priceAlerts.filter(a => a.active).map(a => a.id))
    triggeredAlertsRef.current = new Set(
      Array.from(triggeredAlertsRef.current).filter(id => activeAlertIds.has(id))
    )
  }, [priceAlerts])

  const { connected, error } = useBinanceWS({
    symbols,
    onUpdate: handlePriceUpdate,
    enabled: symbols.length > 0,
  })

  return { connected, error, activeAlertsCount: symbols.length }
}
