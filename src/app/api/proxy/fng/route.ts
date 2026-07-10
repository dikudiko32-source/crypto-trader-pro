import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Fear & Greed Index proxy
export async function GET() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'F&G API error' }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch F&G' }, { status: 500 })
  }
}
