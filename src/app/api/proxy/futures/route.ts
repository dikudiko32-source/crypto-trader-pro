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
}

// Futures API bases — Binance.US doesn't have futures, so try international first
const FUTURES_BASES = [
  'https://fapi.binance.com',
  'https://fapi-gcp.binance.com',
  'https://fapi1.binance.com',
]

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const searchParams = url.searchParams
  const path = searchParams.get('path') || ''
  
  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== 'path') params.append(key, value)
  })
  
  const targetPath = `/fapi/v1/${path}?${params.toString()}`
  const cacheKey = targetPath
  
  const ttl = path.includes('premiumIndex') ? 15000 : path.includes('openInterest') ? 10000 : 5000
  const cached = getCached(cacheKey)
  if (cached) {
    return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } })
  }
  
  for (const base of FUTURES_BASES) {
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
          headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' },
        })
      }
      
      if (res.status === 451 || res.status === 403 || res.status === 418) continue
      
      return NextResponse.json(
        { error: `Futures API error: ${res.status}` },
        { status: res.status }
      )
    } catch {
      continue
    }
  }
  
  // Return empty/neutral data for futures if all fail (non-critical for spot trading)
  if (path.includes('premiumIndex')) {
    return NextResponse.json({ lastFundingRate: '0', symbol: params.get('symbol') || '' })
  }
  if (path.includes('openInterest')) {
    return NextResponse.json({ openInterest: '0', symbol: params.get('symbol') || '' })
  }
  if (path.includes('topLongShortAccountRatio')) {
    return NextResponse.json([{ longShortRatio: '1', longAccount: '0.5', shortAccount: '0.5' }])
  }
  
  return NextResponse.json({ error: 'All Futures API failed' }, { status: 502 })
}
