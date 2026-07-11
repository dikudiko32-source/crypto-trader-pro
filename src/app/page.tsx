'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/app-store'
import { MacroDashboard } from '@/components/dashboard/macro-dashboard'
import { NarrativeScanner } from '@/components/dashboard/narrative-scanner'
import { CoinScreener } from '@/components/dashboard/coin-screener'
import { SetupFinder } from '@/components/dashboard/setup-finder'
import { AlertSystem } from '@/components/dashboard/alert-system'
import { TradingJournal } from '@/components/dashboard/trading-journal'
import { PortfolioTracker, SettingsPanel, BinanceAutoSync } from '@/components/dashboard/portfolio-settings'
import { RiskCalculator } from '@/components/dashboard/risk-calculator'
import { PriceAlertManager } from '@/components/dashboard/price-alert-manager'
import { RealtimeMonitor } from '@/components/dashboard/realtime-monitor'
import { Backtesting } from '@/components/dashboard/backtesting'
import { TokenomicsScanner } from '@/components/dashboard/tokenomics-scanner'
import { AdvancedIndicators } from '@/components/dashboard/advanced-indicators'
import { MarketDepth } from '@/components/dashboard/market-depth'
import { DailyChecklist } from '@/components/dashboard/daily-checklist'
import { RiskRecovery } from '@/components/dashboard/risk-recovery'
import { PerformanceAttribution } from '@/components/dashboard/performance-attribution'
import { PaperTrading } from '@/components/dashboard/paper-trading'
import { StrategyOptimizer } from '@/components/dashboard/strategy-optimizer'
import { SentimentWhale } from '@/components/dashboard/sentiment-whale'
import { PositionCorrelation } from '@/components/dashboard/position-correlation'
import { TradingStyles } from '@/components/dashboard/trading-styles'
import { TaxCalculator } from '@/components/dashboard/tax-calculator'
import { TelegramIntegration } from '@/components/dashboard/telegram-integration'
import { OnChainData } from '@/components/dashboard/onchain-data'
import { DataMigration } from '@/components/dashboard/data-migration'
import { DownloadCenter } from '@/components/dashboard/download-center'
import { AutoScanner } from '@/components/dashboard/auto-scanner'
import { usePriceAlertMonitor } from '@/hooks/use-price-alerts'
import { 
  Globe, BookOpen, Coins, Crosshair, Bell, NotebookPen, 
  Wallet, Calculator, Settings as SettingsIcon, TrendingUp,
  Activity, Beaker, Unlock, Layers, BookMarked, Shield, Calendar,
  Award, PenTool, Waves, Link2, Target, Send, Database, Receipt,
  Download, Radar
} from 'lucide-react'

const TABS = [
  { id: 'daily', label: 'Daily', icon: Calendar },
  { id: 'styles', label: 'Styles', icon: Target },
  { id: 'scanner', label: 'Scanner', icon: Radar },
  { id: 'macro', label: 'Macro', icon: Globe },
  { id: 'onchain', label: 'OnChain', icon: Database },
  { id: 'realtime', label: 'Live', icon: Activity },
  { id: 'narrative', label: 'Narrative', icon: BookOpen },
  { id: 'screener', label: 'Screener', icon: Coins },
  { id: 'unlocks', label: 'Unlocks', icon: Unlock },
  { id: 'advanced', label: 'Indicators', icon: Layers },
  { id: 'depth', label: 'Depth', icon: BookMarked },
  { id: 'sentiment', label: 'Social', icon: Waves },
  { id: 'setup', label: 'Setup', icon: Crosshair },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'pricealerts', label: 'Price', icon: Bell },
  { id: 'telegram', label: 'Telegram', icon: Send },
  { id: 'backtest', label: 'Backtest', icon: Beaker },
  { id: 'optimizer', label: 'Optimizer', icon: Beaker },
  { id: 'paper', label: 'Paper', icon: PenTool },
  { id: 'journal', label: 'Journal', icon: NotebookPen },
  { id: 'attribution', label: 'Attribution', icon: Award },
  { id: 'correlation', label: 'Correlation', icon: Link2 },
  { id: 'risk', label: 'Risk', icon: Calculator },
  { id: 'recovery', label: 'Recovery', icon: Shield },
  { id: 'tax', label: 'Tax', icon: Receipt },
  { id: 'migration', label: 'Migration', icon: Download },
  { id: 'download', label: 'Download', icon: Download },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function Home() {
  const { activeTab, setActiveTab, alerts, setups, priceAlerts, cooldownActive } = useAppStore()
  const unreadAlerts = alerts.filter(a => !a.read).length
  const activePriceAlerts = priceAlerts.filter(a => a.active && !a.triggered).length

  // Background monitor for price alerts
  usePriceAlertMonitor()

  // Set dark theme + register service worker with auto-update
  useEffect(() => {
    document.documentElement.classList.add('dark')
    document.body.style.backgroundColor = '#0a0a0a'
    document.body.style.color = '#e4e4e7'

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        // Check for updates every 10 minutes
        setInterval(() => {
          registration.update()
        }, 600000)
        
        // If new SW found, activate immediately
        if (registration.waiting) {
          registration.waiting.postMessage('SKIP_WAITING')
        }
        
        // Listen for new SW taking over
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // Reload page when new SW activated
          window.location.reload()
        })
      }).catch(err => {
        console.error('SW registration failed:', err)
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">CryptoTrader Pro</div>
              <div className="text-[10px] text-zinc-500 leading-tight">6-Layer Analysis System</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {cooldownActive && (
              <div className="flex items-center gap-1 bg-red-950/50 border border-red-800 px-2 py-1 rounded-full animate-pulse">
                <Shield className="h-3 w-3 text-red-400" />
                <span className="text-xs text-red-300 font-medium">COOLDOWN</span>
              </div>
            )}
            {unreadAlerts > 0 && (
              <div className="flex items-center gap-1 bg-red-950/50 border border-red-800 px-2 py-1 rounded-full">
                <Bell className="h-3 w-3 text-red-400" />
                <span className="text-xs text-red-300 font-medium">{unreadAlerts}</span>
              </div>
            )}
            {activePriceAlerts > 0 && (
              <div className="flex items-center gap-1 bg-blue-950/50 border border-blue-800 px-2 py-1 rounded-full">
                <Activity className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-blue-300 font-medium">{activePriceAlerts}</span>
              </div>
            )}
            {setups.length > 0 && (
              <div className="flex items-center gap-1 bg-emerald-950/50 border border-emerald-800 px-2 py-1 rounded-full">
                <Crosshair className="h-3 w-3 text-emerald-400" />
                <span className="text-xs text-emerald-300 font-medium">{setups.length}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-3 py-3 pb-20 max-w-2xl mx-auto w-full">
        {activeTab === 'daily' && <DailyChecklist />}
        {activeTab === 'styles' && <TradingStyles />}
        {activeTab === 'scanner' && <AutoScanner />}
        {activeTab === 'macro' && <MacroDashboard />}
        {activeTab === 'onchain' && <OnChainData />}
        {activeTab === 'realtime' && <RealtimeMonitor />}
        {activeTab === 'narrative' && <NarrativeScanner />}
        {activeTab === 'screener' && <CoinScreener />}
        {activeTab === 'unlocks' && <TokenomicsScanner />}
        {activeTab === 'advanced' && <AdvancedIndicators />}
        {activeTab === 'depth' && <MarketDepth />}
        {activeTab === 'sentiment' && <SentimentWhale />}
        {activeTab === 'setup' && <SetupFinder />}
        {activeTab === 'alerts' && <AlertSystem />}
        {activeTab === 'pricealerts' && <PriceAlertManager />}
        {activeTab === 'telegram' && <TelegramIntegration />}
        {activeTab === 'backtest' && <Backtesting />}
        {activeTab === 'optimizer' && <StrategyOptimizer />}
        {activeTab === 'paper' && <PaperTrading />}
        {activeTab === 'journal' && <TradingJournal />}
        {activeTab === 'attribution' && <PerformanceAttribution />}
        {activeTab === 'correlation' && <PositionCorrelation />}
        {activeTab === 'risk' && <RiskCalculator />}
        {activeTab === 'recovery' && <RiskRecovery />}
        {activeTab === 'tax' && <TaxCalculator />}
        {activeTab === 'migration' && <DataMigration />}
        {activeTab === 'download' && <DownloadCenter />}
        {activeTab === 'portfolio' && (
          <>
            <BinanceAutoSync />
            <div className="mt-3">
              <PortfolioTracker />
            </div>
          </>
        )}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      {/* Bottom Tab Bar - Scrollable */}
      <nav className="sticky bottom-0 z-50 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 pb-safe">
        <div className="flex gap-0.5 px-1 py-1 overflow-x-auto no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const showBadge = (tab.id === 'alerts' && unreadAlerts > 0) || (tab.id === 'pricealerts' && activePriceAlerts > 0)
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-2.5 rounded transition-all flex-shrink-0 ${
                  isActive 
                    ? 'bg-emerald-950/50 text-emerald-400' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-medium leading-none">{tab.label}</span>
                {showBadge && (
                  <span className="absolute top-0.5 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                )}
                {tab.id === 'recovery' && cooldownActive && (
                  <span className="absolute top-0.5 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
