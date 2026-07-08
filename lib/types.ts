// =====================================================
// CORE TYPES — Crypto Trading Analysis System
// =====================================================

export type Timeframe = '15m' | '1H' | '4H' | '1D' | '1W'
export type Bias = 'LONG' | 'SHORT' | 'NEUTRAL'
export type SetupType = 'TREND_PULLBACK' | 'MEAN_REVERSION' | 'BREAKOUT' | 'SMC'
export type TradeStatus = 'WAIT_TRIGGER' | 'READY' | 'INVALID' | 'ACTIVE' | 'CLOSED'

// ---- Layer 1: Macro ----
export interface MacroData {
  btcDominance: number
  btcDominanceTrend: 'UP' | 'DOWN' | 'FLAT'
  usdtDominance: number
  usdtDominanceTrend: 'UP' | 'DOWN' | 'FLAT'
  otherBtcRatio: number
  otherBtcTrend: 'UP' | 'DOWN' | 'FLAT'
  fearGreed: number
  fearGreedLabel: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
  fundingAggregate: number
  openInterestBtc: number
  longShortRatio: number
  moonPhase: {
    phase: string
    emoji: string
    bullBearBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    daysToNext: number
  }
  economicEvents: EconomicEvent[]
  macroVerdict: Bias
}

export interface EconomicEvent {
  time: string
  title: string
  impact: 'LOW' | 'MEDIUM' | 'HIGH'
  currency: string
}

// ---- Layer 2: Narrative ----
export interface Narrative {
  id: string
  name: string
  category: string
  strength: number // 0-100
  weekOfRotation: number
  volumeChange7d: number // percentage
  topPerformers: NarrativeCoin[]
  catalysts: string[]
  isActive: boolean
}

export interface NarrativeCoin {
  symbol: string
  name: string
  change7d: number
  change24h: number
  price: number
  marketCap: number
}

// ---- Layer 3: Coin Fundamental ----
export interface CoinFundamental {
  symbol: string
  name: string
  marketCap: number
  marketCapRank: number
  volume24h: number
  volToMcap: number
  exchangeListings: number
  tokenomics: {
    circulating: number
    total: number
    fdv: number
    fdvToMcap: number
    nextUnlock: {
      date: string
      amount: number
      percentOfCirc: number
    } | null
  }
  activeAddresses30d: number
  activeAddressesTrend: 'UP' | 'DOWN' | 'FLAT'
  tvl?: number
  tvlTrend?: 'UP' | 'DOWN' | 'FLAT'
  devActivity: number // 0-100 percentile
  newsSentiment: number // 0-100
  verdict: 'PASS' | 'CAUTION' | 'FAIL'
}

// ---- Layer 4: Technical ----
export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TechnicalAnalysis {
  timeframe: Timeframe
  trend: 'BULLISH' | 'BEARISH' | 'RANGING'
  ema20: number
  ema50: number
  ema200: number
  price: number
  adx: number
  rsi: number
  macd: {
    macd: number
    signal: number
    histogram: number
    cross: 'BULLISH' | 'BEARISH' | 'NONE'
  }
  bollinger: {
    upper: number
    middle: number
    lower: number
    squeeze: boolean
  }
  volume: number
  volumeAvg20: number
  volumeTrend: 'UP' | 'DOWN' | 'FLAT'
  keySupport: number[]
  keyResistance: number[]
  smc: {
    orderBlocks: { price: number; type: 'BULLISH' | 'BEARISH' }[]
    fvgs: { lower: number; upper: number; filled: boolean }[]
    liquidityAbove: number | null
    liquidityBelow: number | null
    bos: boolean // break of structure
    choch: boolean // change of character
  }
  candlestickPattern: string | null
  verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
}

export interface FibonacciLevels {
  swingLow: number
  swingHigh: number
  levels: {
    '0.236': number
    '0.382': number
    '0.500': number
    '0.618': number
    '0.786': number
  }
  extensions: {
    '1.272': number
    '1.414': number
    '1.618': number
  }
}

// ---- Trade Setup ----
export interface TradeSetup {
  id: string
  symbol: string
  bias: Bias
  setupType: SetupType
  confidence: number // 0-100
  createdAt: string
  status: TradeStatus
  timeframeAnalysis: Record<Timeframe, TechnicalAnalysis>
  fibonacci: FibonacciLevels
  entry: {
    zone: { lower: number; upper: number }
    trigger: string
    triggerPrice: number
  }
  stopLoss: {
    price: number
    reason: string
  }
  takeProfits: {
    tp1: { price: number; percent: number; rr: number }
    tp2: { price: number; percent: number; rr: number }
    tp3: { price: number; percent: number; rr: number }
  }
  rrAverage: number
  positionSize: {
    capital: number
    riskPercent: number
    riskAmount: number
    quantity: number
    nominalValue: number
  }
  invalidityConditions: string[]
  checklist: { item: string; checked: boolean; required: boolean }[]
  alerts: AlertConfig[]
  coinFundamental: CoinFundamental
  narrative: Narrative | null
}

export interface AlertConfig {
  id: string
  type: 'INFO' | 'ACTION' | 'WARNING' | 'CRITICAL'
  condition: string
  triggered: boolean
}

// ---- Journal ----
export interface JournalEntry {
  id: string
  date: string
  symbol: string
  bias: Bias
  setupType: SetupType
  entryPrice: number
  exitPrice: number | null
  stopLoss: number
  takeProfit: number | null
  quantity: number
  pnl: number | null
  pnlPercent: number | null
  rr: number | null
  duration: string
  setupReason: string
  exitReason: string
  emotion: 'CALM' | 'FOMO' | 'FEAR' | 'GREED' | 'REVENGE'
  screenshot: string | null
  lessonsLearned: string
  rating: number // 1-5
}

// ---- Portfolio ----
export interface Portfolio {
  totalValue: number
  totalPnl: number
  totalPnlPercent: number
  dayPnl: number
  dayPnlPercent: number
  allocations: {
    symbol: string
    name: string
    quantity: number
    value: number
    valuePercent: number
    pnl: number
    pnlPercent: number
  }[]
}

// ---- Settings ----
export interface UserSettings {
  capital: number
  riskPerTrade: number // percent
  maxConcurrentPositions: number
  dailyDrawdownLimit: number // percent
  weeklyDrawdownLimit: number // percent
  binanceApiKey: string | null
  binanceApiSecret: string | null
  coinglassApiKey: string | null
  quietHours: { start: string; end: string } | null
  alertThreshold: number // 60-100, minimum score to alert
  moonPhaseWeight: boolean
  tradingPairs: string[] // watchlist
}

// ---- 6-Layer Score ----
export interface LayerScore {
  layer1Macro: number
  layer2Narrative: number
  layer3Fundamental: number
  layer4Technical: number
  layer5Checklist: number
  layer6Risk: number
  totalScore: number
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH'
}

// =====================================================
// PHASE 2 TYPES — Real-time, Backtest, Tokenomics, Auth
// =====================================================

// ---- Price Alert ----
export type AlertCondition = 'ABOVE' | 'BELOW' | 'CROSS_UP' | 'CROSS_DOWN' | 'PCT_CHANGE_5M' | 'PCT_CHANGE_1H'

export interface PriceAlert {
  id: string
  symbol: string
  condition: AlertCondition
  targetPrice?: number
  pctThreshold?: number
  note: string
  createdAt: string
  triggered: boolean
  triggeredAt: string | null
  active: boolean
}

// ---- Real-time price data ----
export interface RealtimePrice {
  symbol: string
  price: number
  change24h: number
  high24h: number
  low24h: number
  volume24h: number
  timestamp: number
}

// ---- Backtest ----
export type BacktestStrategy = 'TREND_PULLBACK' | 'MEAN_REVERSION' | 'BREAKOUT'

export interface BacktestConfig {
  symbol: string
  strategy: BacktestStrategy
  timeframe: Timeframe
  startDate: string
  endDate: string
  initialCapital: number
  riskPerTrade: number
  slippagePct: number      // default 0.2
  feePct: number           // default 0.1 per side
  emaFast?: number
  emaSlow?: number
  rsiPeriod?: number
  rsiOversold?: number
  rsiOverbought?: number
}

export interface BacktestTrade {
  entryDate: string
  entryPrice: number
  exitDate: string
  exitPrice: number
  side: 'LONG' | 'SHORT'
  quantity: number
  pnl: number
  pnlPercent: number
  rr: number
  reason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL_EXIT' | 'END_OF_DATA'
  bars: number
}

export interface BacktestMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalReturn: number
  totalReturnPct: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  maxDrawdown: number
  maxDrawdownPct: number
  sharpeRatio: number
  avgRr: number
  longestWinStreak: number
  longestLossStreak: number
  finalCapital: number
  fees: number
  slippageCost: number
}

export interface BacktestResult {
  trades: BacktestTrade[]
  metrics: BacktestMetrics
  equityCurve: { date: string; value: number }[]
  config: BacktestConfig
  warnings: string[]
}

// ---- Tokenomics / Unlock ----
export interface TokenomicsData {
  symbol: string
  name: string
  circulatingSupply: number
  totalSupply: number | null
  maxSupply: number | null
  marketCap: number
  fdv: number
  inflationRate: number        // (total - circulating) / circulating
  unlockRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  estimatedAnnualInflation: number
  warning: string | null
}

// ---- Binance Account (authenticated) ----
export interface BinanceBalance {
  asset: string
  free: number
  locked: number
  usdValue: number
}

export interface BinanceAccount {
  balances: BinanceBalance[]
  totalUsdValue: number
  canTrade: boolean
  canDeposit: boolean
  canWithdraw: boolean
  updateTime: number
}

// =====================================================
// PHASE 3 TYPES — Advanced Indicators & System Features
// =====================================================

// ---- VWAP ----
export interface VWAPData {
  value: number
  upperBand: number  // +1 std
  lowerBand: number  // -1 std
  distance: number   // % price dari VWAP
  signal: 'ABOVE' | 'BELOW' | 'AT'
}

// ---- Volume Profile ----
export interface VolumeProfile {
  poc: number                  // Point of Control (highest volume price)
  vah: number                  // Value Area High (70% area)
  val: number                  // Value Area Low (70% area)
  nodes: { price: number; volume: number; isHigh: boolean }[]
}

// ---- Ichimoku ----
export interface IchimokuData {
  tenkanSen: number   // Conversion line (9)
  kijunSen: number    // Base line (26)
  senkouA: number     // Leading Span A
  senkouB: number     // Leading Span B (52)
  chikouSpan: number  // Lagging Span
  cloudColor: 'GREEN' | 'RED' | 'NEUTRAL'
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
}

// ---- Stochastic RSI ----
export interface StochRSI {
  k: number
  d: number
  signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' | 'BULL_CROSS' | 'BEAR_CROSS'
}

// ---- Williams %R ----
export interface WilliamsR {
  value: number     // -100 to 0
  signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL'
}

// ---- CVD (Cumulative Volume Delta) ----
export interface CVDData {
  value: number
  trend: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL'
  divergence: 'BULLISH' | 'BEARISH' | 'NONE'
}

// ---- Order Book ----
export interface OrderBookData {
  symbol: string
  bids: { price: number; quantity: number; total: number }[]
  asks: { price: number; quantity: number; total: number }[]
  bidImbalance: number  // -1 to 1
  spread: number
  spreadPct: number
  liquidityAbovePrice: number  // USD value within 1%
  liquidityBelowPrice: number
  signal: 'BUY_PRESSURE' | 'SELL_PRESSURE' | 'BALANCED'
}

// ---- Liquidations ----
export interface LiquidationData {
  symbol: string
  longLiquidations: number   // USD
  shortLiquidations: number  // USD
  totalLong24h: number
  totalShort24h: number
  heatmap: { price: number; longLiq: number; shortLiq: number }[]
  signal: 'LONG_SQUEEZE_RISK' | 'SHORT_SQUEEZE_RISK' | 'NEUTRAL'
}

// ---- Funding Heatmap ----
export interface FundingHeatmapItem {
  symbol: string
  fundingRate: number
  annualized: number
  trend: 'INCREASING' | 'DECREASING' | 'FLAT'
  signal: 'OVERLEVERAGED_LONG' | 'OVERLEVERAGED_SHORT' | 'NEUTRAL'
}

// ---- Sentiment ----
export interface SentimentData {
  symbol: string
  socialVolume24h: number
  socialScore: number       // 0-100
  sentimentScore: number    // -100 to 100
  dominance: number         // 0-100 (% positive)
  correlation: number       // -1 to 1 (with price)
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
}

// ---- Whale Alert ----
export interface WhaleTransaction {
  blockchain: string
  symbol: string
  amount: number
  usdValue: number
  from: string
  to: string
  timestamp: number
  type: 'TRANSFER' | 'EXCHANGE_IN' | 'EXCHANGE_OUT' | 'LARGE_TRANSFER'
}

// ---- Multi-TF Alignment ----
export interface MultiTFAlignment {
  weekly: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  daily: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  h4: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  h1: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  alignmentScore: number    // 0-100
  bias: 'STRONG_LONG' | 'LONG' | 'NEUTRAL' | 'SHORT' | 'STRONG_SHORT'
  conflict: boolean
}

// ---- Risk Recovery Protocol ----
export interface RiskState {
  consecutiveLosses: number
  dailyDrawdown: number
  weeklyDrawdown: number
  status: 'NORMAL' | 'CAUTION' | 'WARNING' | 'COOLDOWN'
  recommendedSizeMultiplier: number  // 1.0 normal, 0.5 reduce, 0.0 stop
  cooldownUntil: string | null
  reasons: string[]
}

// ---- Position Correlation ----
export interface PositionCorrelation {
  symbols: string[]
  matrix: { from: string; to: string; coefficient: number }[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  recommendation: string
  totalExposurePct: number
}

// ---- Paper Trade ----
export interface PaperTrade {
  id: string
  symbol: string
  side: 'LONG' | 'SHORT'
  entryPrice: number
  entryDate: string
  quantity: number
  stopLoss: number
  takeProfits: number[]
  exitPrice: number | null
  exitDate: string | null
  pnl: number | null
  pnlPercent: number | null
  status: 'OPEN' | 'CLOSED'
  reason: string
  currentPrice: number | null
  unrealizedPnl: number | null
}

// ---- Strategy Optimizer ----
export interface OptimizationResult {
  parameters: { name: string; value: number }[]
  metrics: BacktestMetrics
  score: number  // composite score (Sharpe + Profit Factor - Max DD)
  isOverfit: boolean
  warnings: string[]
}

// ---- Daily Checklist ----
export interface DailyChecklist {
  date: string
  macroBias: 'LONG' | 'SHORT' | 'NEUTRAL'
  activeNarratives: string[]
  highImpactEvents: string[]
  btcTrend: string
  fearGreed: number
  tradePlan: string
  riskBudget: number  // % available today
  status: 'READY' | 'WAIT' | 'NO_TRADE'
  notes: string
}

// =====================================================
// PHASE 5 — Auto Scanner & Notification
// =====================================================

// ---- Scanner Config ----
export interface ScannerConfig {
  topPairsLimit: number       // 10, 20, 50, 100
  minVolume24h: number        // USD minimum 24h volume
  minConfidence: number       // 0-100, only show setups above this
  timeRangeHours: number      // 24, 168 (7d), 720 (30d)
  styles: ('TREND_FOLLOWING' | 'MEAN_REVERSION' | 'VOLUME_BREAKOUT' | 'SMART_MONEY')[]
  excludeStablecoins: boolean
  autoScheduleHours: number   // 0 = manual, 1, 4, 12, 24
  notifyTelegram: boolean
  notifyBrowserPush: boolean
  notifyWhatsApp: boolean     // pakai wa.me link
  notifyEmail: boolean        // butuh setup SMTP
}

// ---- Scanner Result ----
export interface ScannerResult {
  symbol: string
  name: string
  price: number
  change24h: number
  volume24h: number
  marketCapRank?: number
  signals: ScannerSignal[]
  bestSignal: ScannerSignal | null
  deepAnalysis?: DeepAnalysisResult  // Phase 2: only for top 5
  lastScannedAt: string
}

export interface ScannerSignal {
  style: 'TREND_FOLLOWING' | 'MEAN_REVERSION' | 'VOLUME_BREAKOUT' | 'SMART_MONEY'
  styleName: string
  bias: 'LONG' | 'SHORT' | 'NEUTRAL'
  confidence: number
  marketRegime: string
  entry: number
  stopLoss: number
  takeProfits: { tp1: number; tp2: number; tp3: number }
  rr: number
  reasons: string[]
  warnings: string[]
}

// ---- Scan Summary ----
export interface ScanSummary {
  totalScanned: number
  totalWithSignals: number
  longSignals: number
  shortSignals: number
  topPicks: ScannerResult[]
  scannedAt: string
  duration: number  // seconds
  errors: string[]
}

// ---- Notification Channel ----
export interface NotificationChannel {
  telegram: { enabled: boolean; botToken?: string; chatId?: string }
  browserPush: { enabled: boolean }
  whatsapp: { enabled: boolean; phoneNumber?: string }  // pakai wa.me link
  email: { enabled: boolean; address?: string }
}

// ---- Scheduled Scan State ----
export interface ScheduledScanState {
  enabled: boolean
  intervalHours: number
  lastScanAt: string | null
  nextScanAt: string | null
  totalScansRun: number
  totalAlertsSent: number
}

// =====================================================
// PHASE 5.5 — Deep Analysis & Confluence
// =====================================================

// ---- Confluence Level ----
export type ConfluenceLevel = 'NONE' | 'SINGLE' | 'STRONG' | 'MEGA'

// ---- Deep Analysis Result ----
export interface DeepAnalysisResult {
  // Layer 1: Macro
  macroScore: number                    // 0-100
  macroAligned: boolean
  macroNotes: string[]
  
  // Layer 3: Fundamental
  fundamentalScore: number              // 0-100
  fundamentalPass: boolean
  fundamentalNotes: string[]
  unlockRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  inflationRate?: number
  
  // Layer 5: Checklist (auto-verifiable)
  checklistScore: number                // 0-100
  checklistPassed: boolean
  checklistItems: { item: string; checked: boolean; auto: boolean }[]
  
  // 6-Layer Total
  totalLayerScore: number               // 0-100
  passedDeepAnalysis: boolean           // true = worth sending to Telegram
  
  // Confluence
  confluence: ConfluenceLevel
  confluenceStyles: string[]            // which styles agreed
  
  // Final recommendation
  recommendation: 'STRONG_BUY' | 'BUY' | 'WATCH' | 'AVOID'
  recommendationReason: string
}

// ---- Macro Data (cached during scan) ----
export interface ScanMacroData {
  fearGreed: number
  fearGreedLabel: string
  btcDominance: number
  btcDominanceTrend: 'UP' | 'DOWN' | 'FLAT'
  usdtDominanceTrend: 'UP' | 'DOWN' | 'FLAT'
  fundingAggregate: number
  highImpactEventsToday: number
  macroBias: 'LONG' | 'SHORT' | 'NEUTRAL'
}

// =====================================================
// PHASE 6 — Multi-Timeframe + Event Intelligence + Smart Recommendation
// =====================================================

// ---- Multi-Timeframe Config ----
export type ScanTimeframe = '5m' | '15m' | '30m' | '1H' | '4H' | '12H' | '1D'

export interface MTFScannerConfig {
  timeframes: ScanTimeframe[]           // which timeframes to analyze
  htfTimeframe: ScanTimeframe           // Higher Timeframe for bias (default 1D)
  ltfTimeframe: ScanTimeframe           // Lower Timeframe for entry (default 1H)
  requireHTFAlignment: boolean          // HTF must agree with signal
  requireMTFAgreement: number           // min timeframes that must agree (e.g., 4 of 7)
}

// ---- Multi-Timeframe Analysis Result ----
export interface MTFAnalysisResult {
  analyses: {
    timeframe: ScanTimeframe
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    rsi: number
    adx: number
    emaAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    signal: 'LONG' | 'SHORT' | 'NEUTRAL'
    confidence: number
  }[]
  alignmentScore: number                // 0-100, how aligned all TFs are
  bullishCount: number
  bearishCount: number
  neutralCount: number
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  ltfSignal: 'LONG' | 'SHORT' | 'NEUTRAL'
  conflict: boolean                     // HTF vs LTF disagree
  conflictDescription: string
  recommendation: 'PROCEED' | 'WAIT' | 'AVOID'
}

// ---- Event Intelligence ----
export interface CryptoEvent {
  id: string
  title: string
  type: 'FOMC' | 'CPI' | 'NFP' | 'PPI' | 'GDP' | 'ECB' | 'FED_SPEECH' | 'GEOPOLITICAL' | 'REGULATORY' | 'EXCHANGE_LISTING' | 'MAINNET' | 'AIRDROP' | 'FORK' | 'TOKEN_BURN' | 'PARTNERSHIP'
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  scheduledAt: string                   // ISO datetime
  hoursUntil: number                    // calculated
  affectedAssets: 'ALL' | 'BTC' | 'ETH' | string[]
  description: string
  recommendedAction: 'AVOID_TRADING' | 'REDUCE_SIZE' | 'SWING_ONLY' | 'MONITOR' | 'NORMAL'
  reasonForAction: string
}

export interface EventIntelligence {
  upcomingEvents: CryptoEvent[]
  criticalEventsNext24h: CryptoEvent[]
  highImpactEventsNext48h: CryptoEvent[]
  marketRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tradingRecommendation: 'NORMAL' | 'CAUTIOUS' | 'DEFENSIVE' | 'HALT'
  recommendationReason: string
}

// ---- Smart Recommendation ----
export type TradeType = 'SWING' | 'DAY_TRADE' | 'SCALP' | 'AVOID'
export type HoldDuration = 'HOURS' | 'DAYS' | 'WEEKS'

export interface SmartRecommendation {
  tradeType: TradeType
  tradeTypeLabel: string                // "Swing Trade (2-7 days)"
  holdDuration: HoldDuration
  estimatedHoldTime: string             // "2-7 days" / "4-12 hours" / "15-60 min"
  
  // Entry strategy
  entryStrategy: 'LIMIT' | 'MARKET' | 'WAIT_PULLBACK' | 'WAIT_BREAKOUT'
  entryZone: { lower: number; upper: number }
  entryTrigger: string                  // "Wait for 1H close above $X"
  
  // Stop loss
  stopLoss: number
  stopLossType: 'STRUCTURE' | 'ATR' | 'PERCENTAGE' | 'TIME_BASED'
  stopLossReason: string
  stopLossPercentage: number
  
  // Take profits (detailed)
  takeProfits: {
    tp1: { price: number; percentage: number; rr: number; reason: string }
    tp2: { price: number; percentage: number; rr: number; reason: string }
    tp3: { price: number; percentage: number; rr: number; reason: string }
    tp4?: { price: number; percentage: number; rr: number; reason: string }  // runner
  }
  
  // Risk management
  riskPercent: number                   // recommended % of capital
  positionSize: string                  // "0.5% (conservative)" / "1.5% (aggressive)"
  maxLossUSD: number
  
  // Trade management rules
  rules: string[]                       // "Move SL to BE after TP1" etc.
  
  // Confidence & final score
  finalScore: number                    // 0-100
  finalRecommendation: 'STRONG_BUY' | 'BUY' | 'WATCH' | 'AVOID'
  recommendationReason: string
}

// ---- Enhanced Scanner Result (Phase 6) ----
export interface EnhancedScannerResult extends ScannerResult {
  mtfAnalysis?: MTFAnalysisResult
  eventIntelligence?: EventIntelligence
  smartRecommendation?: SmartRecommendation
}

// ---- Enhanced Scan Summary ----
export interface EnhancedScanSummary extends ScanSummary {
  topPicks: EnhancedScannerResult[]
  marketRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tradingMode: 'NORMAL' | 'CAUTIOUS' | 'DEFENSIVE' | 'HALT'
}
