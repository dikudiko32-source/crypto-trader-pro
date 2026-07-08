import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Binance authenticated account endpoint
// Requires API key + secret in headers (sent from client localStorage)
// Performs HMAC SHA256 signing server-side for security

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const apiKey = request.headers.get('x-binance-api-key')
  const apiSecret = request.headers.get('x-binance-api-secret')
  
  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Missing API key/secret in headers' }, 
      { status: 401 }
    )
  }

  const timestamp = Date.now()
  const queryString = `timestamp=${timestamp}&recvWindow=5000`
  
  // HMAC SHA256 signing using Web Crypto API
  const encoder = new TextEncoder()
  const keyData = encoder.encode(apiSecret)
  const msgData = encoder.encode(queryString)
  
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    const binanceUrl = `https://api.binance.com/api/v3/account?${queryString}&signature=${signatureHex}`
    
    const res = await fetch(binanceUrl, {
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
      cache: 'no-store',
    })
    
    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: `Binance API error: ${res.status}`, details: errText },
        { status: res.status }
      )
    }
    
    const data = await res.json()
    
    // Filter out zero balances to reduce payload
    const nonZeroBalances = (data.balances || [])
      .filter((b: { free: string; locked: string }) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: { asset: string; free: string; locked: string }) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
      }))
    
    return NextResponse.json({
      balances: nonZeroBalances,
      canTrade: data.canTrade,
      canDeposit: data.canDeposit,
      canWithdraw: data.canWithdraw,
      updateTime: data.updateTime,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Binance account fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to authenticate with Binance' },
      { status: 500 }
    )
  }
}
