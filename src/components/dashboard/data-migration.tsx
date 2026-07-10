'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Upload, Database, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '@/store/app-store'

export function DataMigration() {
  const { settings, journal, setups, priceAlerts, paperTrades, updateSettings, addJournalEntry, addSetup, addPriceAlert, addPaperTrade } = useAppStore()
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  function exportData() {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings,
      journal,
      setups,
      priceAlerts,
      paperTrades,
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crypto-trader-pro-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setImportStatus('✅ Backup berhasil didownload')
    setTimeout(() => setImportStatus(null), 3000)
  }

  function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    
    setImportError(null)
    setImportStatus('⏳ Mengimpor data...')
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        if (!data.version) {
          throw new Error('File backup tidak valid')
        }
        
        let count = 0
        
        // Import settings
        if (data.settings) {
          updateSettings(data.settings)
          count++
        }
        
        // Import journal
        if (Array.isArray(data.journal)) {
          data.journal.forEach((entry: never) => {
            addJournalEntry(entry)
            count++
          })
        }
        
        // Import setups
        if (Array.isArray(data.setups)) {
          data.setups.forEach((setup: never) => {
            addSetup(setup)
            count++
          })
        }
        
        // Import price alerts
        if (Array.isArray(data.priceAlerts)) {
          data.priceAlerts.forEach((alert: never) => {
            addPriceAlert(alert)
            count++
          })
        }
        
        // Import paper trades
        if (Array.isArray(data.paperTrades)) {
          data.paperTrades.forEach((trade: never) => {
            addPaperTrade(trade)
            count++
          })
        }
        
        setImportStatus(`✅ ${count} item berhasil diimpor! Refresh halaman untuk melihat semua data.`)
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Gagal impor file')
        setImportStatus(null)
      }
    }
    reader.readAsText(file)
  }

  const totalItems = journal.length + setups.length + priceAlerts.length + paperTrades.length

  return (
    <div className="space-y-3">
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Backup & Migrasi Data</strong><br/>
          Semua data Anda (settings, journal, setups, alerts, paper trades) disimpan di localStorage browser.
          Gunakan fitur ini untuk backup atau pindah ke deployment lain (misal: dari sandbox ke Vercel).
        </AlertDescription>
      </Alert>

      {/* Current Data Stats */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Data Saat Ini</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between p-2 bg-zinc-950/50 rounded">
            <span className="text-zinc-500">Journal entries:</span>
            <span className="font-mono">{journal.length}</span>
          </div>
          <div className="flex justify-between p-2 bg-zinc-950/50 rounded">
            <span className="text-zinc-500">Saved setups:</span>
            <span className="font-mono">{setups.length}</span>
          </div>
          <div className="flex justify-between p-2 bg-zinc-950/50 rounded">
            <span className="text-zinc-500">Price alerts:</span>
            <span className="font-mono">{priceAlerts.length}</span>
          </div>
          <div className="flex justify-between p-2 bg-zinc-950/50 rounded">
            <span className="text-zinc-500">Paper trades:</span>
            <span className="font-mono">{paperTrades.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="bg-zinc-900/50 border-zinc-800 border-l-4 border-l-emerald-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-400" />
            Export / Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-zinc-400">
            Download semua data Anda sebagai file JSON. Simpan file ini di tempat aman.
          </p>
          <Button onClick={exportData} className="w-full" disabled={totalItems === 0 && !settings.binanceApiKey}>
            <Download className="h-4 w-4 mr-2" />
            Download Backup ({totalItems} items)
          </Button>
          {totalItems === 0 && !settings.binanceApiKey && (
            <p className="text-[10px] text-zinc-500">Belum ada data untuk di-backup.</p>
          )}
        </CardContent>
      </Card>

      {/* Import */}
      <Card className="bg-zinc-900/50 border-zinc-800 border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-400" />
            Import / Restore
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-zinc-400">
            Restore data dari file backup JSON. Data akan ditambahkan ke data yang sudah ada.
          </p>
          <label className="block">
            <input
              type="file"
              accept=".json,application/json"
              onChange={importData}
              className="hidden"
              id="import-file"
            />
            <Button asChild variant="outline" className="w-full cursor-pointer">
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Pilih File Backup JSON
              </span>
            </Button>
          </label>
          
          {importStatus && (
            <div className="flex items-start gap-2 p-2 rounded bg-emerald-950/30 border border-emerald-800 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}
          
          {importError && (
            <div className="flex items-start gap-2 p-2 rounded bg-red-950/30 border border-red-800 text-xs text-red-300">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>{importError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert className="border-yellow-800 bg-yellow-950/30">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <AlertDescription className="text-xs text-yellow-200">
          <strong>⚠️ Cara Migrasi ke Vercel:</strong><br/>
          1. Klik "Download Backup" di atas (di sandbox ini)<br/>
          2. Deploy aplikasi ke Vercel (lihat README)<br/>
          3. Buka aplikasi Vercel → buka tab Settings → Migration<br/>
          4. Klik "Pilih File Backup JSON" → upload file backup Anda<br/>
          5. Refresh halaman — semua data sudah pindah!
        </AlertDescription>
      </Alert>
    </div>
  )
}
