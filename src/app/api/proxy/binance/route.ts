import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Cache for klines (10s) and ticker (5s)
const cache = new Map<string, { data: unknown; expiry: number }>()

function getCached(key: string): unknown | null {
  const entry = cache.get(key)
  if (entry && entry.expiry > Date.now()) return entry.data
  if (entry) cache.delete(key)
  return null
}

function setCached(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs })
  if (cache.size > 100) {
    const now = Date.now()
    for (const [k, v] of cache.entries()) {
      if (v.expiry < now) cache.delete(k)
    }
  }
}

// Binance API mirrors — try multiple to bypass 451 geo-restriction
const BINANCE_BASES = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api-gcp.binance.com',
  'https://data-api.binance.vision',  // Public data endpoint, no geo-block
]

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const searchParams = url.searchParams
  const path = searchParams.get('path') || ''
  
  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== 'path') params.append(key, value)
  })
  
  const targetPath = `/api/v3/${path}?${params.toString()}`
  const cacheKey = targetPath
  
  // Check cache first (klines: 10s, ticker: 5s, depth: 2s)
  const ttl = path.includes('klines') ? 10000 : path.includes('ticker') ? 5000 : path.includes('depth') ? 2000 : 3000
  const cached = getCached(cacheKey)
  if (cached) {
    return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } })
  }
  
  // Try each Binance base until one works
  for (const base of BINANCE_BASES) {
    try {
      const targetUrl = `${base}${targetPath}`
      const res = await fetch(targetUrl, {
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; CryptoTraderPro/1.0)',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000), // 5s timeout per attempt
      })
      
      if (res.ok) {
        const data = await res.json()
        setCached(cacheKey, data, ttl)
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
            'X-Cache': 'MISS',
            'X-Binance-Base': base.split('//')[1].split('.')[0],
          },
        })
      }
      
      // If 451, try next base. If 400, return error (bad request).
      if (res.status === 451 || res.status === 403) {
        continue // Try next mirror
      }
      
      // Other errors (400, 404, etc.) — return immediately
      const errText = await res.text()
      return NextResponse.json(
        { error: `Binance API error: ${res.status}`, details: errText },
        { status: res.status }
      )
    } catch {
      // Network error, try next base
      continue
    }
  }
  
  // All bases failed — return stale cache if available, else error
  const stale = cache.get(cacheKey)
  if (stale) {
    return NextResponse.json(stale.data, { headers: { 'X-Cache': 'STALE' } })
  }
  
  return NextResponse.json(
    { error: 'All Binance API mirrors failed' },
    { status: 502 }
  )
}
