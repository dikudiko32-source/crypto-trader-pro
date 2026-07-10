import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Generic Binance proxy: /api/proxy/binance?path=klines&symbol=BTCUSDT&interval=1h&limit=200
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const searchParams = url.searchParams
  const path = searchParams.get('path') || ''
  const binanceBase = 'https://api.binance.com'
  
  // Rebuild query without 'path'
  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== 'path') params.append(key, value)
  })
  
  const targetUrl = `${binanceBase}/api/v3/${path}?${params.toString()}`
  
  try {
    const res = await fetch(targetUrl, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Binance API error: ${res.status}` }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch Binance' }, { status: 500 })
  }
}
