'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Send, Check, MessageCircle, ExternalLink } from 'lucide-react'
import { useAppStore } from '@/store/app-store'

export function TelegramIntegration() {
  const { settings, updateSettings, pushAlert, priceAlerts } = useAppStore()
  const [botToken, setBotToken] = useState(settings.telegramBotToken || '')
  const [chatId, setChatId] = useState(settings.telegramChatId || '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  // Save to store when user types (debounced via onBlur)
  function saveToken() {
    updateSettings({ 
      telegramBotToken: botToken || null,
      telegramChatId: chatId || null,
    })
  }

  async function testMessage() {
    if (!botToken || !chatId) {
      setTestResult('❌ Bot token dan Chat ID wajib diisi')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken,
          chatId,
          message: '🤖 <b>CryptoTrader Pro Test</b>\n\nTelegram integration berhasil! Alert trading akan dikirim ke chat ini.',
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTestResult('✅ Test berhasil! Cek Telegram Anda.')
        // Save to store on successful test
        saveToken()
        pushAlert({
          type: 'INFO',
          title: 'Telegram Connected',
          message: 'Alert akan dikirim ke Telegram',
        })
      } else {
        setTestResult(`❌ Gagal: ${data.error || data.details}`)
      }
    } catch (err) {
      setTestResult('❌ Network error')
    } finally {
      setTesting(false)
    }
  }

  const activePriceAlerts = priceAlerts.filter(a => a.active && !a.triggered).length

  return (
    <div className="space-y-3">
      <Alert>
        <MessageCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Kenapa Telegram?</strong> Push notification browser bisa miss (especially di Android background). 
          Telegram lebih reliable — message masuk walau browser tertutup. Cocok untuk alert critical.
        </AlertDescription>
      </Alert>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Setup Telegram Bot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Bot Token (dari @BotFather)</Label>
            <Input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              onBlur={saveToken}
              placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
              className="bg-zinc-950 border-zinc-700 text-sm font-mono"
            />
          </div>
          <div>
            <Label className="text-xs">Chat ID (dari @userinfobot)</Label>
            <Input
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              onBlur={saveToken}
              placeholder="123456789"
              className="bg-zinc-950 border-zinc-700 text-sm font-mono"
            />
          </div>
          
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
            onClick={() => setShowGuide(!showGuide)}
          >
            {showGuide ? 'Sembunyikan' : 'Tampilkan'} Setup Guide
          </Button>

          {showGuide && (
            <div className="bg-zinc-950/50 border border-zinc-800 rounded p-3 text-xs space-y-2">
              <div className="font-semibold text-zinc-300">Cara Setup (5 menit):</div>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                <li>
                  Buka Telegram, cari <strong>@BotFather</strong>
                  <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer" className="text-blue-400 inline-flex items-center gap-0.5 ml-1">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Kirim <code className="bg-zinc-800 px-1">/newbot</code></li>
                <li>Kasih nama bot (misal: "My Crypto Alert")</li>
                <li>Kasih username (misal: "my_crypto_alert_bot")</li>
                <li>BotFather kasih <strong>Bot Token</strong> → copy ke field atas</li>
                <li>
                  Cari <strong>@userinfobot</strong>, kirim <code className="bg-zinc-800 px-1">/start</code>
                </li>
                <li>Dia akan kasih <strong>Chat ID</strong> (angka) → copy ke field atas</li>
                <li>
                  Kirim <code className="bg-zinc-800 px-1">/start</code> ke bot baru Anda (penting!)
                </li>
                <li>Klik "Test Message" di bawah</li>
              </ol>
              <Alert className="mt-2 border-red-800 bg-red-950/30">
                <AlertDescription className="text-[10px] text-red-200">
                  ⚠️ <strong>Privacy:</strong> Bot Token = akses penuh ke bot. Jangan share. 
                  Disimpan lokal di browser Anda (tidak dikirim ke server kecuali saat kirim message).
                </AlertDescription>
              </Alert>
            </div>
          )}

          <Button 
            onClick={testMessage} 
            disabled={testing || !botToken || !chatId}
            className="w-full"
            size="sm"
          >
            {testing ? (
              'Mengirim test...'
            ) : (
              <>
                <Send className="h-3 w-3 mr-1" />
                Test Message
              </>
            )}
          </Button>

          {testResult && (
            <div className={`text-xs p-2 rounded border ${
              testResult.startsWith('✅') 
                ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
                : 'bg-red-950/30 border-red-800 text-red-300'
            }`}>
              {testResult}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-400">Telegram Status</div>
              <div className="flex items-center gap-2">
                {testResult?.startsWith('✅') ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Connected</span>
                  </>
                ) : (
                  <>
                    <span className="h-3 w-3 rounded-full bg-zinc-600" />
                    <span className="text-sm font-medium text-zinc-400">Not Connected</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-400">Active Alerts</div>
              <div className="text-sm font-bold">{activePriceAlerts}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/30 border-zinc-800/50">
        <CardContent className="p-3 text-xs space-y-1">
          <div className="font-semibold text-zinc-400 mb-1">Yang akan dikirim ke Telegram:</div>
          <div>🔔 Price alert triggered (symbol, condition, price)</div>
          <div>🚨 Cooldown activated (risk recovery)</div>
          <div>⚠️ Daily drawdown warning</div>
          <div>📊 Setup saved (symbol, bias, confidence)</div>
          <div className="mt-2 pt-2 border-t border-zinc-800 text-zinc-500">
            ⚠️ Saat ini Telegram integration belum otomatis. Untuk aktivasi penuh, 
            Anda perlu setup Bot Token + Chat ID, lalu system akan route alert ke Telegram.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
