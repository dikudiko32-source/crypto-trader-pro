'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Download, FileText, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react'

export function DownloadCenter() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <Card className="bg-zinc-900/50 border-zinc-800 border-l-4 border-l-emerald-500">
        <CardContent className="p-3">
          <div className="text-sm font-bold mb-1">📦 Download Center</div>
          <div className="text-xs text-zinc-400">
            Download source code & dokumentasi untuk deploy ke Vercel (gratis, permanen).
          </div>
        </CardContent>
      </Card>

      {/* Main Download */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-400" />
            Source Code (ZIP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-zinc-400">
            File ZIP berisi semua source code aplikasi (367KB). Extract lalu upload ke GitHub untuk deploy ke Vercel.
          </p>
          <Button asChild className="w-full">
            <a href="/crypto-trader-pro.zip" download>
              <Download className="h-4 w-4 mr-2" />
              Download crypto-trader-pro.zip (367KB)
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            Dokumentasi & Tutorial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button asChild variant="outline" className="w-full border-emerald-700 text-emerald-300">
            <a href="/TUTORIAL-DEPLOY-PC.md" download>
              <Download className="h-3 w-3 mr-2" />
              🚀 TUTORIAL-DEPLOY-PC.md (14KB) — Paling Lengkap!
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href="/QUICK-START.md" download>
              <Download className="h-3 w-3 mr-2" />
              QUICK-START.md (2KB) — Panduan ringkas 10 menit
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href="/DEPLOY-VERCEL-README.md" download>
              <Download className="h-3 w-3 mr-2" />
              DEPLOY-VERCEL-README.md (10KB) — Panduan lengkap + troubleshooting
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Steps Overview */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📋 Langkah Deploy (10 menit)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex gap-2">
            <span className="text-emerald-400 font-bold">1.</span>
            <span>Download ZIP di atas & extract di HP/komputer</span>
          </div>
          <div className="flex gap-2">
            <span className="text-emerald-400 font-bold">2.</span>
            <span>Upload ke GitHub (buat repo private, drag-drop file)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-emerald-400 font-bold">3.</span>
            <span>Deploy ke Vercel (import repo, 1 klik)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-emerald-400 font-bold">4.</span>
            <span>Add to Home Screen di Android Chrome</span>
          </div>
          <div className="flex gap-2">
            <span className="text-emerald-400 font-bold">5.</span>
            <span>Migrasi data: backup di app lama → import di app baru</span>
          </div>
        </CardContent>
      </Card>

      {/* Important Warning */}
      <Alert className="border-yellow-800 bg-yellow-950/30">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <AlertTitle className="text-xs text-yellow-300">⚠️ Penting Diketahui</AlertTitle>
        <AlertDescription className="text-xs text-yellow-200 space-y-1">
          <div>• <strong>Sandbox ini sementara</strong> — bisa reset/expire kapan saja</div>
          <div>• <strong>Vercel free tier</strong> = gratis selamanya untuk personal use</div>
          <div>• <strong>Data Anda</strong> tetap di localStorage browser (private)</div>
          <div>• <strong>Backup berkala</strong> lewat tab Migration (jangan sampai hilang)</div>
        </AlertDescription>
      </Alert>

      {/* Can't deploy for you */}
      <Alert className="border-red-800 bg-red-950/30">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <AlertTitle className="text-xs text-red-300">🚫 Kenapa Saya Tidak Bisa Deploy untuk Anda?</AlertTitle>
        <AlertDescription className="text-xs text-red-200 space-y-1">
          <div>• Saya tidak punya akses ke akun Vercel/GitHub Anda</div>
          <div>• Kalau saya deploy pakai akun saya, Anda tidak bisa update/kontrol</div>
          <div>• Sandbox ini ephemeral — deployment saya juga bisa hilang</div>
          <div>• Untuk kepemilikan penuh, Anda harus deploy sendiri (10 menit, gratis)</div>
        </AlertDescription>
      </Alert>

      {/* Help */}
      <Card className="bg-zinc-900/30 border-zinc-800/50">
        <CardContent className="p-3 text-xs space-y-2">
          <div className="font-semibold text-zinc-400">Butuh Bantuan?</div>
          <div>📖 Baca <strong>DEPLOY-VERCEL-README.md</strong> untuk troubleshooting lengkap</div>
          <div>⚡ Ikuti <strong>QUICK-START.md</strong> untuk deploy cepat 10 menit</div>
          <div>💬 Kalau ada error, kasih saya screenshot/pesan errornya</div>
        </CardContent>
      </Card>

      {/* What's included */}
      <Card className="bg-zinc-900/30 border-zinc-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📦 Isi Package</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">Total modul</span>
            <span className="font-mono">27 tabs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Source files</span>
            <span className="font-mono">155 files</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Ukuran ZIP</span>
            <span className="font-mono">328 KB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Framework</span>
            <span className="font-mono">Next.js 16</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">License</span>
            <span className="font-mono">Personal use</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
