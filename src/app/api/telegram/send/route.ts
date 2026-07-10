import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Telegram Bot API - send message with HTML formatting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { botToken, chatId, message } = body
    
    if (!botToken || !chatId || !message) {
      return NextResponse.json(
        { error: 'Missing botToken, chatId, or message' },
        { status: 400 }
      )
    }
    
    // Telegram message limit: 4096 chars
    const truncatedMsg = message.length > 4000 
      ? message.slice(0, 4000) + '\n\n[message truncated]'
      : message
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: truncatedMsg,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    
    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: `Telegram API error: ${res.status}`, details: errText },
        { status: res.status }
      )
    }
    
    const data = await res.json()
    return NextResponse.json({ success: true, messageId: data.message_id })
  } catch (err) {
    console.error('Telegram send error:', err)
    return NextResponse.json(
      { error: 'Failed to send Telegram message' },
      { status: 500 }
    )
  }
}

// GET endpoint to test bot connection
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const botToken = url.searchParams.get('botToken')
  const chatId = url.searchParams.get('chatId')
  
  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: 'Missing botToken or chatId' },
      { status: 400 }
    )
  }
  
  try {
    // Test by getting bot info
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Invalid bot token' },
        { status: 400 }
      )
    }
    
    const botInfo = await res.json()
    return NextResponse.json({ 
      success: true, 
      bot: botInfo.result 
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to verify bot' },
      { status: 500 }
    )
  }
}
