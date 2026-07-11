import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

// API bases to try in order (Binance international → Binance.US → fallbacks)
const BINANCE_BASES = [
  'https://api.binance.com',
  'https://api-gcp.binance.com',
  'https://api.binance.us',  // US-legal, no geo-block
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
  
  const ttl = path.includes('klines') ? 10000 : path.includes('ticker') ? 5000 : path.includes('depth') ? 2000 : 3000
  const cached = getCached(cacheKey)
  if (cached) {
    return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } })
  }
  
  // Try each base
  for (const base of BINANCE_BASES) {
    try {
      const targetUrl = `${base}${targetPath}`
      const res = await fetch(targetUrl, {
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; CryptoTraderPro/1.0)',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })
      
      if (res.ok) {
        const data = await res.json()
        setCached(cacheKey, data, ttl)
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
            'X-Cache': 'MISS',
            'X-Source': base.includes('binance.us') ? 'binance-us' : 'binance',
          },
        })
      }
      
      if (res.status === 451 || res.status === 403 || res.status === 418) {
        continue
      }
      
      // Other errors
      return NextResponse.json(
        { error: `API error: ${res.status}` },
        { status: res.status }
      )
    } catch {
      continue
    }
  }
  
  // All bases failed — return stale cache if available
  const stale = cache.get(cacheKey)
  if (stale) {
    return NextResponse.json(stale.data, { headers: { 'X-Cache': 'STALE' } })
  }
  
  return NextResponse.json({ error: 'All API mirrors failed' }, { status: 502 })
}
