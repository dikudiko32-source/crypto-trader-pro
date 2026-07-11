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

// Binance Futures mirrors
const FUTURES_BASES = [
  'https://fapi.binance.com',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
  'https://fapi3.binance.com',
  'https://fapi-gcp.binance.com',
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
      
      if (res.status === 451 || res.status === 403) continue
      
      return NextResponse.json(
        { error: `Binance Futures API error: ${res.status}` },
        { status: res.status }
      )
    } catch {
      continue
    }
  }
  
  const stale = cache.get(cacheKey)
  if (stale) return NextResponse.json(stale.data, { headers: { 'X-Cache': 'STALE' } })
  
  return NextResponse.json({ error: 'All Futures API mirrors failed' }, { status: 502 })
}
