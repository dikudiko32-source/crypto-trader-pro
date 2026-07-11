// =====================================================
// ZUSTAND STORE — Global app state
// =====================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserSettings, JournalEntry, TradeSetup, AlertConfig, PriceAlert, PaperTrade, ScannerConfig, ScanSummary, ScheduledScanState, NotificationChannel } from '@/lib/types'

interface AppState {
  // ---- Settings ----
  settings: UserSettings
  updateSettings: (partial: Partial<UserSettings>) => void

  // ---- Journal ----
  journal: JournalEntry[]
  addJournalEntry: (entry: JournalEntry) => void
  updateJournalEntry: (id: string, partial: Partial<JournalEntry>) => void
  deleteJournalEntry: (id: string) => void

  // ---- Active setups ----
  setups: TradeSetup[]
  addSetup: (setup: TradeSetup) => void
  updateSetup: (id: string, partial: Partial<TradeSetup>) => void
  removeSetup: (id: string) => void

  // ---- Alert log ----
  alerts: Array<{
    id: string
    timestamp: string
    type: AlertConfig['type']
    title: string
    message: string
    read: boolean
  }>
  pushAlert: (alert: { type: AlertConfig['type']; title: string; message: string }) => void
  markAlertRead: (id: string) => void
  clearAlerts: () => void

  // ---- Price Alerts (Phase 2) ----
  priceAlerts: PriceAlert[]
  addPriceAlert: (alert: PriceAlert) => void
  updatePriceAlert: (id: string, partial: Partial<PriceAlert>) => void
  removePriceAlert: (id: string) => void

  // ---- Notification permission ----
  notificationsEnabled: boolean
  setNotificationsEnabled: (enabled: boolean) => void

  // ---- Binance API auto-sync (Phase 2) ----
  autoSyncEnabled: boolean
  setAutoSyncEnabled: (enabled: boolean) => void

  // ---- Paper Trading (Phase 3) ----
  paperTrades: PaperTrade[]
  addPaperTrade: (trade: PaperTrade) => void
  updatePaperTrade: (id: string, partial: Partial<PaperTrade>) => void
  closePaperTrade: (id: string, exitPrice: number, reason: string) => void
  deletePaperTrade: (id: string) => void
  paperBalance: number
  setPaperBalance: (balance: number) => void

  // ---- Risk Recovery State (Phase 3) ----
  cooldownActive: boolean
  cooldownUntil: string | null
  setCooldown: (until: string | null) => void

  // ---- Auto Scanner (Phase 5) ----
  scannerConfig: ScannerConfig
  updateScannerConfig: (partial: Partial<ScannerConfig>) => void
  lastScanSummary: ScanSummary | null
  setLastScanSummary: (summary: ScanSummary | null) => void
  scheduledScan: ScheduledScanState
  updateScheduledScan: (partial: Partial<ScheduledScanState>) => void
  
  // ---- Notification Channels ----
  notificationChannels: NotificationChannel
  updateNotificationChannels: (partial: Partial<NotificationChannel>) => void

  // ---- UI State ----
  activeTab: string
  setActiveTab: (tab: string) => void

  // ---- Open positions count ----
  openPositionsCount: number
  setOpenPositionsCount: (n: number) => void

  // ---- Daily/weekly drawdown tracking ----
  dailyDrawdown: number
  weeklyDrawdown: number
  setDrawdown: (daily: number, weekly: number) => void
}

const defaultSettings: UserSettings = {
  capital: 15000000,
  riskPerTrade: 1.5,
  maxConcurrentPositions: 5,
  dailyDrawdownLimit: 5,
  weeklyDrawdownLimit: 10,
  binanceApiKey: null,
  binanceApiSecret: null,
  coinglassApiKey: null,
  quietHours: null,
  alertThreshold: 70,
  moonPhaseWeight: true,
  tradingPairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'AVAXUSDT', 'LINKUSDT', 'ARBUSDT', 'OPUSDT'],
  telegramBotToken: null,
  telegramChatId: null,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, _get) => ({
      settings: defaultSettings,
      updateSettings: (partial) => set((state) => ({ settings: { ...state.settings, ...partial } })),

      journal: [],
      addJournalEntry: (entry) => set((state) => ({ journal: [entry, ...state.journal] })),
      updateJournalEntry: (id, partial) => set((state) => ({
        journal: state.journal.map(e => e.id === id ? { ...e, ...partial } : e)
      })),
      deleteJournalEntry: (id) => set((state) => ({
        journal: state.journal.filter(e => e.id !== id)
      })),

      setups: [],
      addSetup: (setup) => set((state) => ({ setups: [setup, ...state.setups] })),
      updateSetup: (id, partial) => set((state) => ({
        setups: state.setups.map(s => s.id === id ? { ...s, ...partial } : s)
      })),
      removeSetup: (id) => set((state) => ({
        setups: state.setups.filter(s => s.id !== id)
      })),

      alerts: [],
      pushAlert: (alert) => set((state) => ({
        alerts: [{
          id: Math.random().toString(36).slice(2),
          timestamp: new Date().toISOString(),
          read: false,
          ...alert,
        }, ...state.alerts].slice(0, 100)
      })),
      markAlertRead: (id) => set((state) => ({
        alerts: state.alerts.map(a => a.id === id ? { ...a, read: true } : a)
      })),
      clearAlerts: () => set({ alerts: [] }),

      priceAlerts: [],
      addPriceAlert: (alert) => set((state) => ({ priceAlerts: [alert, ...state.priceAlerts] })),
      updatePriceAlert: (id, partial) => set((state) => ({
        priceAlerts: state.priceAlerts.map(a => a.id === id ? { ...a, ...partial } : a)
      })),
      removePriceAlert: (id) => set((state) => ({
        priceAlerts: state.priceAlerts.filter(a => a.id !== id)
      })),

      notificationsEnabled: false,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      autoSyncEnabled: false,
      setAutoSyncEnabled: (enabled) => set({ autoSyncEnabled: enabled }),

      paperTrades: [],
      addPaperTrade: (trade) => set((state) => ({ paperTrades: [trade, ...state.paperTrades] })),
      updatePaperTrade: (id, partial) => set((state) => ({
        paperTrades: state.paperTrades.map(t => t.id === id ? { ...t, ...partial } : t)
      })),
      closePaperTrade: (id, exitPrice, reason) => set((state) => ({
        paperTrades: state.paperTrades.map(t => {
          if (t.id !== id) return t
          const direction = t.side === 'LONG' ? 1 : -1
          const pnl = (exitPrice - t.entryPrice) * t.quantity * direction
          const pnlPercent = ((exitPrice - t.entryPrice) / t.entryPrice) * 100 * direction
          return {
            ...t,
            exitPrice,
            exitDate: new Date().toISOString(),
            pnl,
            pnlPercent,
            status: 'CLOSED' as const,
            reason,
          }
        })
      })),
      deletePaperTrade: (id) => set((state) => ({
        paperTrades: state.paperTrades.filter(t => t.id !== id)
      })),
      paperBalance: 15000000,
      setPaperBalance: (balance) => set({ paperBalance: balance }),

      cooldownActive: false,
      cooldownUntil: null,
      setCooldown: (until) => set({ 
        cooldownUntil: until,
        cooldownActive: until !== null,
      }),

      scannerConfig: {
        topPairsLimit: 30,
        minVolume24h: 10000000,  // $10M
        minConfidence: 65,
        timeRangeHours: 168,  // 7 days
        styles: ['TREND_FOLLOWING', 'MEAN_REVERSION', 'VOLUME_BREAKOUT', 'SMART_MONEY'],
        excludeStablecoins: true,
        autoScheduleHours: 0,  // manual
        notifyTelegram: true,
        notifyBrowserPush: true,
        notifyWhatsApp: false,
        notifyEmail: false,
      },
      updateScannerConfig: (partial) => set((state) => ({ 
        scannerConfig: { ...state.scannerConfig, ...partial } 
      })),
      lastScanSummary: null,
      setLastScanSummary: (summary) => set({ lastScanSummary: summary }),
      scheduledScan: {
        enabled: false,
        intervalHours: 0,
        lastScanAt: null,
        nextScanAt: null,
        totalScansRun: 0,
        totalAlertsSent: 0,
      },
      updateScheduledScan: (partial) => set((state) => ({ 
        scheduledScan: { ...state.scheduledScan, ...partial } 
      })),
      notificationChannels: {
        telegram: { enabled: false },
        browserPush: { enabled: false },
        whatsapp: { enabled: false },
        email: { enabled: false },
      },
      updateNotificationChannels: (partial) => set((state) => ({ 
        notificationChannels: { ...state.notificationChannels, ...partial } 
      })),

      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),

      openPositionsCount: 0,
      setOpenPositionsCount: (n) => set({ openPositionsCount: n }),

      dailyDrawdown: 0,
      weeklyDrawdown: 0,
      setDrawdown: (daily, weekly) => set({ dailyDrawdown: daily, weeklyDrawdown: weekly }),
    }),
    {
      name: 'crypto-trader-pro',
      partialize: (state) => ({
        settings: state.settings,
        journal: state.journal,
        setups: state.setups,
        priceAlerts: state.priceAlerts,
        notificationsEnabled: state.notificationsEnabled,
        autoSyncEnabled: state.autoSyncEnabled,
        paperTrades: state.paperTrades,
        paperBalance: state.paperBalance,
        cooldownUntil: state.cooldownUntil,
        scannerConfig: state.scannerConfig,
        notificationChannels: state.notificationChannels,
        scheduledScan: state.scheduledScan,
      }),
    }
  )
)

// ---- Helpers ----
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return value.toFixed(decimals)
}
