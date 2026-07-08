// =====================================================
// COINGECKO API INTEGRATION (via Next.js proxy to avoid CORS)
// =====================================================

const PROXY = '/api/proxy/coingecko'

export interface CoinMarketData {
  id: string
  symbol: string
  name: string
  image: string
  currentPrice: number
  marketCap: number
  marketCapRank: number
  totalVolume: number
  priceChangePercentage24h: number
  priceChangePercentage7d: number
  circulatingSupply: number
  totalSupply: number | null
  ath: number
  athChangePercentage: number
  atl: number
  high24h: number
  low24h: number
}

// ---- Get top coins by market cap ----
const FALLBACK_COINS: CoinMarketData[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', image: '', currentPrice: 67000, marketCap: 1300e9, marketCapRank: 1, totalVolume: 25e9, priceChangePercentage24h: 2.1, priceChangePercentage7d: 5.4, circulatingSupply: 19.7e6, totalSupply: 21e6, ath: 73750, athChangePercentage: -9, atl: 67.81, high24h: 67800, low24h: 65800 },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', image: '', currentPrice: 3500, marketCap: 420e9, marketCapRank: 2, totalVolume: 15e9, priceChangePercentage24h: 1.8, priceChangePercentage7d: 4.2, circulatingSupply: 120e6, totalSupply: null, ath: 4878, athChangePercentage: -28, atl: 0.43, high24h: 3550, low24h: 3450 },
  { id: 'solana', symbol: 'SOL', name: 'Solana', image: '', currentPrice: 165, marketCap: 75e9, marketCapRank: 5, totalVolume: 3.5e9, priceChangePercentage24h: 4.5, priceChangePercentage7d: 12.3, circulatingSupply: 455e6, totalSupply: null, ath: 259, athChangePercentage: -36, atl: 0.5, high24h: 168, low24h: 158 },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', image: '', currentPrice: 600, marketCap: 88e9, marketCapRank: 4, totalVolume: 1.5e9, priceChangePercentage24h: 0.5, priceChangePercentage7d: 1.2, circulatingSupply: 145e6, totalSupply: 200e6, ath: 720, athChangePercentage: -17, atl: 0.0398, high24h: 605, low24h: 595 },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', image: '', currentPrice: 0.52, marketCap: 28e9, marketCapRank: 7, totalVolume: 1.2e9, priceChangePercentage24h: -1.2, priceChangePercentage7d: -2.5, circulatingSupply: 55e9, totalSupply: 100e9, ath: 3.4, athChangePercentage: -85, atl: 0.0028, high24h: 0.53, low24h: 0.51 },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', image: '', currentPrice: 0.42, marketCap: 15e9, marketCapRank: 9, totalVolume: 350e6, priceChangePercentage24h: 0.8, priceChangePercentage7d: 2.1, circulatingSupply: 35e9, totalSupply: 45e9, ath: 3.1, athChangePercentage: -86, atl: 0.017, high24h: 0.43, low24h: 0.41 },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', image: '', currentPrice: 28, marketCap: 11e9, marketCapRank: 12, totalVolume: 400e6, priceChangePercentage24h: 2.5, priceChangePercentage7d: 5.8, circulatingSupply: 400e6, totalSupply: 720e6, ath: 144, athChangePercentage: -80, atl: 2.8, high24h: 28.5, low24h: 27.5 },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', image: '', currentPrice: 14, marketCap: 8.5e9, marketCapRank: 14, totalVolume: 450e6, priceChangePercentage24h: 3.2, priceChangePercentage7d: 7.8, circulatingSupply: 600e6, totalSupply: 1e9, ath: 52, athChangePercentage: -73, atl: 0.148, high24h: 14.5, low24h: 13.8 },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', image: '', currentPrice: 6.5, marketCap: 9e9, marketCapRank: 13, totalVolume: 250e6, priceChangePercentage24h: 1.1, priceChangePercentage7d: 3.2, circulatingSupply: 1.4e9, totalSupply: null, ath: 55, athChangePercentage: -88, atl: 2.7, high24h: 6.6, low24h: 6.4 },
  { id: 'polygon', symbol: 'MATIC', name: 'Polygon', image: '', currentPrice: 0.72, marketCap: 7e9, marketCapRank: 16, totalVolume: 350e6, priceChangePercentage24h: -0.8, priceChangePercentage7d: -1.5, circulatingSupply: 9.8e9, totalSupply: 10e9, ath: 2.92, athChangePercentage: -75, atl: 0.003, high24h: 0.73, low24h: 0.71 },
  { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum', image: '', currentPrice: 0.95, marketCap: 4e9, marketCapRank: 22, totalVolume: 280e6, priceChangePercentage24h: 4.2, priceChangePercentage7d: 9.1, circulatingSupply: 4e9, totalSupply: 10e9, ath: 2.42, athChangePercentage: -60, atl: 0.75, high24h: 0.97, low24h: 0.92 },
  { id: 'optimism', symbol: 'OP', name: 'Optimism', image: '', currentPrice: 1.85, marketCap: 2.5e9, marketCapRank: 30, totalVolume: 220e6, priceChangePercentage24h: 3.5, priceChangePercentage7d: 8.2, circulatingSupply: 1.35e9, totalSupply: 4.3e9, ath: 4.85, athChangePercentage: -62, atl: 0.4, high24h: 1.9, low24h: 1.82 },
]

export async function getTopCoins(limit = 100): Promise<CoinMarketData[]> {
  try {
    const url = `${PROXY}?path=coins/markets&vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h,7d`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) {
      console.warn('Top coins API failed, using fallback data:', res.status)
      return FALLBACK_COINS.slice(0, limit)
    }
    const data = await res.json()
    if (!Array.isArray(data)) return FALLBACK_COINS.slice(0, limit)
    return data.map((c: Record<string, unknown>): CoinMarketData => ({
      id: c.id as string,
      symbol: (c.symbol as string).toUpperCase(),
      name: c.name as string,
      image: c.image as string,
      currentPrice: c.current_price as number,
      marketCap: c.market_cap as number,
      marketCapRank: c.market_cap_rank as number,
      totalVolume: c.total_volume as number,
      priceChangePercentage24h: c.price_change_percentage_24h_in_currency as number,
      priceChangePercentage7d: c.price_change_percentage_7d_in_currency as number,
      circulatingSupply: c.circulating_supply as number,
      totalSupply: c.total_supply as number | null,
      ath: c.ath as number,
      athChangePercentage: c.ath_change_percentage as number,
      atl: c.atl as number,
      high24h: c.high_24h as number,
      low24h: c.low_24h as number,
    }))
  } catch (err) {
    console.error('getTopCoins error:', err)
    return FALLBACK_COINS
  }
}

// ---- Get categories / narratives ----
export interface Category {
  id: string
  name: string
  marketCap: number
  marketCapChange24h: number
  volume24h: number
  topCoins: string[]
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'artificial-intelligence', name: 'AI & Big Data', marketCap: 25e9, marketCapChange24h: 12.5, volume24h: 2.5e9, topCoins: ['FET', 'RNDR', 'AGIX', 'OCEAN', 'TAO'] },
  { id: 'memes', name: 'Meme Coins', marketCap: 18e9, marketCapChange24h: 8.2, volume24h: 3.1e9, topCoins: ['DOGE', 'SHIB', 'PEPE', 'WIF', 'BONK'] },
  { id: 'depin', name: 'DePIN', marketCap: 12e9, marketCapChange24h: 6.8, volume24h: 850e6, topCoins: ['FIL', 'AR', 'THETA', 'STORJ', 'SC'] },
  { id: 'rwa', name: 'Real World Assets', marketCap: 8e9, marketCapChange24h: 4.5, volume24h: 450e6, topCoins: ['ONDO', 'MKR', 'PENDLE', 'RIO', 'TOKEN'] },
  { id: 'layer-1', name: 'Layer 1', marketCap: 850e9, marketCapChange24h: 2.1, volume24h: 15e9, topCoins: ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX'] },
  { id: 'liquid-staking', name: 'Liquid Staking', marketCap: 22e9, marketCapChange24h: 3.2, volume24h: 380e6, topCoins: ['LDO', 'WBETH', 'CBETH', 'RPL', 'ANKR'] },
  { id: 'gaming', name: 'Gaming & Metaverse', marketCap: 9e9, marketCapChange24h: -1.5, volume24h: 420e6, topCoins: ['IMX', 'SAND', 'AXS', 'MANA', 'GALA'] },
  { id: 'defi', name: 'DeFi', marketCap: 78e9, marketCapChange24h: 1.8, volume24h: 2.8e9, topCoins: ['UNI', 'AAVE', 'MKR', 'CAKE', 'CRV'] },
  { id: 'payments', name: 'Payments', marketCap: 6e9, marketCapChange24h: -2.1, volume24h: 280e6, topCoins: ['XLM', 'XRP', 'ADA', 'ALGO', 'HBAR'] },
  { id: 'storage', name: 'Storage', marketCap: 5e9, marketCapChange24h: 0.5, volume24h: 180e6, topCoins: ['FIL', 'AR', 'STORJ', 'SC', 'BTFS'] },
]

export async function getCategories(): Promise<Category[]> {
  try {
    const url = `${PROXY}?path=coins/categories`
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('Categories API failed, using fallback data:', res.status)
      return FALLBACK_CATEGORIES
    }
    const data = await res.json()
    if (!Array.isArray(data)) return FALLBACK_CATEGORIES
    return data
      .filter((c: Record<string, unknown>) => (c.market_cap as number) > 100000000)
      .map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        marketCap: c.market_cap as number,
        marketCapChange24h: c.market_cap_change_24h as number,
        volume24h: c.volume_24h as number,
        topCoins: c.top_3_coins as string[] || [],
      }))
      .sort((a: Category, b: Category) => b.marketCapChange24h - a.marketCapChange24h)
      .slice(0, 30)
  } catch (err) {
    console.error('getCategories error:', err)
    return FALLBACK_CATEGORIES
  }
}

// ---- Get global data ----
export interface GlobalData {
  totalMarketCap: number
  totalVolume: number
  marketCapChange24h: number
  btcDominance: number
  ethDominance: number
  activeCryptos: number
}

const FALLBACK_GLOBAL: GlobalData = {
  totalMarketCap: 2.4e12,
  totalVolume: 95e9,
  marketCapChange24h: 1.5,
  btcDominance: 54.2,
  ethDominance: 17.5,
  activeCryptos: 13000,
}

export async function getGlobalData(): Promise<GlobalData | null> {
  try {
    const url = `${PROXY}?path=global`
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('Global API failed, using fallback data:', res.status)
      return FALLBACK_GLOBAL
    }
    const data = await res.json()
    return {
      totalMarketCap: data.data.total_market_cap.usd,
      totalVolume: data.data.total_volume.usd,
      marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
      btcDominance: data.data.market_cap_percentage.btc,
      ethDominance: data.data.market_cap_percentage.eth,
      activeCryptos: data.data.active_cryptocurrencies,
    }
  } catch (err) {
    console.error('getGlobalData error:', err)
    return FALLBACK_GLOBAL
  }
}
