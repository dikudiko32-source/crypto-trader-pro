import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// In-memory cache (resets on server restart, but solves 429 rate limit)
// TTL: 5 minutes for most data, 1 minute for price data
const cache = new Map<string, { data: unknown; expiry: number }>()

function getCached(key: string): unknown | null {
  const entry = cache.get(key)
  if (entry && entry.expiry > Date.now()) {
    return entry.data
  }
  if (entry) cache.delete(key)
  return null
}

function setCached(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs })
  // Cleanup old entries
  if (cache.size > 50) {
    const now = Date.now()
    for (const [k, v] of cache.entries()) {
      if (v.expiry < now) cache.delete(k)
    }
  }
}

// CoinGecko proxy with caching
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const searchParams = url.searchParams
  const path = searchParams.get('path') || ''
  const cgBase = 'https://api.coingecko.com/api/v3'
  
  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== 'path') params.append(key, value)
  })
  
  const targetUrl = `${cgBase}/${path}?${params.toString()}`
  
  // Cache key: targetUrl
  // TTL: 5 min for markets/categories, 1 min for global
  const ttlMs = path.includes('global') ? 60000 : 
                path.includes('markets') ? 120000 : 
                path.includes('categories') ? 300000 : 60000
  
  const cached = getCached(targetUrl)
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Cache': 'HIT',
      },
    })
  }
  
  try {
    const res = await fetch(targetUrl, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'CryptoTraderPro/1.0',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      // If rate limited, try to return stale cache
      if (res.status === 429) {
        const staleEntry = cache.get(targetUrl)
        if (staleEntry) {
          return NextResponse.json(staleEntry.data, {
            headers: { 'X-Cache': 'STALE', 'X-RateLimit': '429-fallback' },
          })
        }
      }
      return NextResponse.json({ error: `CoinGecko API error: ${res.status}` }, { status: res.status })
    }
    const data = await res.json()
    setCached(targetUrl, data, ttlMs)
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Cache': 'MISS',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch CoinGecko' }, { status: 500 })
  }
}
