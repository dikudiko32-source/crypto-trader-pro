import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Binance Futures proxy: /api/proxy/futures?path=premiumIndex&symbol=BTCUSDT
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const searchParams = url.searchParams
  const path = searchParams.get('path') || ''
  const fapiBase = 'https://fapi.binance.com'
  
  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== 'path') params.append(key, value)
  })
  
  const targetUrl = `${fapiBase}/fapi/v1/${path}?${params.toString()}`
  
  try {
    const res = await fetch(targetUrl, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Binance Futures API error: ${res.status}` }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch Binance Futures' }, { status: 500 })
  }
}
