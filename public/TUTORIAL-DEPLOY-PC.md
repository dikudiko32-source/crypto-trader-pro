# 🚀 Tutorial Lengkap Deploy CryptoTrader Pro ke Vercel (via PC)

## 📋 Yang Anda Butuhkan
- ✅ File `crypto-trader-pro.zip` (sudah Anda download dari HP)
- ✅ PC/Laptop dengan browser (Chrome/Firefox/Edge)
- ✅ Koneksi internet
- ✅ Akun GitHub (gratis, daftar di github.com)
- ✅ Akun Vercel (gratis, login pakai GitHub)

**Tidak butuh:**
- ❌ Install software apapun di PC
- ❌ Coding knowledge
- ❌ Credit card

---

## 📦 Step 1: Transfer ZIP ke PC (2 menit)

### Opsi A: Kirim via WhatsApp/Telegram
1. Di HP, buka chat WhatsApp/Telegram Anda sendiri (Saved Messages)
2. Attach file → pilih `crypto-trader-pro.zip` dari folder Downloads
3. Kirim ke diri sendiri
4. Di PC, buka WhatsApp Web / Telegram Web
5. Download file ke Desktop

### Opsi B: Upload ke Google Drive
1. Di HP, buka Google Drive app
2. Tap **+** → Upload → pilih `crypto-trader-pro.zip`
3. Tunggu upload selesai
4. Di PC, buka drive.google.com → download file

### Opsi C: Kabel USB
1. Sambungkan HP ke PC pakai kabel USB
2. Di HP, pilih "File Transfer" / "MTP"
3. Di PC, buka File Explorer → HP → Downloads
4. Copy `crypto-trader-pro.zip` ke Desktop

---

## 📂 Step 2: Extract ZIP di PC (1 menit)

### Windows:
1. Klik kanan `crypto-trader-pro.zip` di Desktop
2. Pilih **"Extract All..."**
3. Destination: `Desktop` → klik **Extract**
4. Muncul folder `crypto-trader-pro` di Desktop

### Mac:
1. Klik dua kali `crypto-trader-pro.zip`
2. Folder `crypto-trader-pro` muncul otomatis

### Verifikasi isi folder:
Buka folder `crypto-trader-pro`, Anda harus lihat:
```
crypto-trader-pro/
├── package.json          ← PALING PENTING
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json
├── bun.lock
├── src/                  ← Folder source code
├── public/               ← Folder assets
├── prisma/
├── examples/
├── scripts/
└── ... (config files)
```

**⚠️ PENTING**: 
- File `package.json` HARUS ada di root folder
- Tidak boleh ada folder `node_modules` (akan di-install Vercel)
- Kalau ada `node_modules`, HAPUS folder tersebut

---

## 🐙 Step 3: Upload ke GitHub (3 menit)

### 3a. Buat Akun GitHub (kalau belum punya)
1. Buka https://github.com/signup di PC
2. Isi: username, email, password
3. Verify email (cek inbox, masukkan kode)
4. Pilih "Skip personalization"
5. Selesai!

### 3b. Buat Repository Baru
1. Buka https://github.com/new
2. Isi:
   - **Repository name**: `crypto-trader-pro`
   - **Description** (opsional): `Crypto Trading Analysis System`
   - **Visibility**: ⚠️ **Private** (recommended — hanya Anda yang bisa akses)
   - **JANGAN centang**: "Add README", ".gitignore", "license"
3. Klik **"Create repository"**

### 3c. Upload File
1. Di repo baru (kosong), cari link **"uploading an existing file"** → klik
2. **Drag SELURUH ISI folder `crypto-trader-pro`** ke browser
   - Buka folder `crypto-trader-pro` di File Explorer
   - Select ALL (Ctrl+A)
   - Drag ke area "drag files here" di GitHub
3. Tunggu upload (30 detik - 2 menit, tergantung koneksi)
4. Pastikan semua file ter-upload (cek ada `package.json`, `src/`, `public/`)
5. Commit message: `Initial commit - CryptoTrader Pro`
6. Klik **"Commit changes"** (tombol hijau)

### 3d. Verifikasi Upload
1. Refresh halaman GitHub repo
2. Anda harus lihat struktur file:
   - `package.json` di root
   - Folder `src/` (klik untuk lihat isinya)
   - Folder `public/`
   - File config lainnya
3. **Kalau `package.json` tidak ada** → upload ulang, pastikan file dari root folder

---

## ▲ Step 4: Deploy ke Vercel (3 menit)

### 4a. Login Vercel
1. Buka https://vercel.com
2. Klik **"Log In"** → **"Continue with GitHub"**
3. Authorize Vercel (klik "Authorize Vercel")
4. Setelah login, Anda diarahkan ke dashboard

### 4b. Import Repository
1. Klik **"Add New..."** → **"Project"**
2. Di bagian "Import Git Repository", cari `crypto-trader-pro`
3. Klik **"Import"** di repo tersebut

### 4c. Configure & Deploy
**PENTING — Pastikan setting berikut:**
- **Framework Preset**: Next.js (auto-detect, jangan ubah)
- **Root Directory**: `./` (default, jangan ubah)
- **Build Command**: `next build` (default, jangan ubah)
- **Output Directory**: `.next` (default, jangan ubah)
- **Install Command**: `npm install` (default, jangan ubah)
- **Environment Variables**: KOSONG (tidak perlu)

4. Klik **"Deploy"** 🎉

### 4d. Tunggu Build (2-3 menit)
Vercel akan:
1. Install dependencies (~1-2 menit)
2. Build aplikasi (~1 menit)
3. Deploy ke edge network (~30 detik)

**Status yang harus muncul:**
```
✅ Building... (1-2 menit)
✅ Deploying... (30 detik)
✅ Ready! 🎉
```

Kalau sukses, Anda lihat:
```
Congratulations! Your project has been deployed.
Visit: https://crypto-trader-pro-xxxxx.vercel.app
```

**Copy URL ini** — ini adalah URL aplikasi Anda selamanya!

---

## 📱 Step 5: Add to Home Screen di HP (1 menit)

1. Buka URL Vercel (`crypto-trader-pro-xxxxx.vercel.app`) di **Chrome Android**
2. Tunggu halaman load
3. Tap menu browser (⋮) → **"Add to Home Screen"**
4. Nama: `CryptoTrader Pro` (atau sesuka Anda)
5. Tap **"Add"**
6. ✅ Icon muncul di home screen HP!
7. Tap icon → aplikasi terbuka fullscreen seperti app native

---

## 🔄 Step 6: Migrasi Data dari Sandbox (Opsional, 2 menit)

Kalau Anda sudah pakai app di sandbox dan ada data (paper trades, journal, settings):

### Di App Lama (Sandbox):
1. Buka tab **"Migration"** (scroll nav ke kanan)
2. Klik **"Download Backup"**
3. File JSON tersimpan di HP

### Di App Baru (Vercel):
1. Buka URL Vercel di HP
2. Buka tab **"Migration"**
3. Klik **"Pilih File Backup JSON"**
4. Upload file backup dari HP
5. Tunggu sampai muncul "✅ X item berhasil diimpor"
6. Refresh halaman → semua data pindah!

---

## 🔧 Step 7: Setup Binance API (Opsional, 5 menit)

Untuk auto-sync portfolio real-time:

### 7a. Generate Binance API Key
1. Buka https://api.binance.com → login
2. Klik **"API Management"** → **"Create API"**
3. Pilih **"System Generated"** → label: `CryptoTracker-ReadOnly`
4. **SET PERMISSIONS** (SANGAT PENTING):
   - ✅ Enable Reading
   - ❌ Enable Spot Trading (DISABLE)
   - ❌ Enable Futures Trading (DISABLE)
   - ❌ **Enable Withdrawals** (NEVER! BAHAYA!)
5. Save API Key + Secret Key
6. Optional: Enable **IP Whitelist** (recommended)

### 7b. Input ke App
1. Di app → tab **"Settings"**
2. Input API Key + Secret di bagian "Binance API Integration"
3. Klik **"Show API Setup Guide"** untuk tutorial lengkap
4. Buka tab **"Portfolio"** → klik **"Enable Auto-Sync"**
5. Centang 4 acknowledgment (read-only, no withdraw, IP whitelist, risk accepted)
6. Klik **"Enable Auto-Sync"**
7. Portfolio Anda auto-sync setiap 60 detik!

---

## 🔔 Step 8: Setup Telegram Bot (Opsional, 5 menit)

Untuk alert trading yang reliable (lebih baik dari browser push):

### 8a. Buat Telegram Bot
1. Buka Telegram, cari **@BotFather**
2. Kirim `/newbot`
3. Kasih nama: `My Crypto Alert`
4. Kasih username: `my_crypto_alert_bot` (harus unik, ends with `_bot`)
5. BotFather kasih **Bot Token** → copy

### 8b. Dapatkan Chat ID
1. Cari **@userinfobot** di Telegram
2. Kirim `/start`
3. Dapat **Chat ID** (angka) → copy

### 8c. Aktifkan Bot
1. Cari bot baru Anda di Telegram
2. Kirim `/start` (PENTING — bot tidak bisa kirim pesan kalau belum di-/start)

### 8d. Input ke App
1. Di app → tab **"Telegram"**
2. Input Bot Token + Chat ID
3. Klik **"Test Message"**
4. Cek Telegram Anda → harus ada test message
5. ✅ Selesai! Scanner akan kirim alert ke Telegram

---

## 🔍 Step 9: Setup Scanner (Opsional, 2 menit)

Untuk auto-scan dan alert otomatis:

1. Buka tab **"Scanner"**
2. Klik **"Setup"** di Notification Channels
3. Pastikan Telegram + Browser Push aktif
4. Config:
   - **Top Pairs**: 30 (recommended)
   - **Min Confidence**: 65% (recommended)
   - **Styles**: semua 4 (Trend Following, Mean Reversion, Volume Breakout, Smart Money)
   - **Auto-Schedule**: Every 4 hours
5. Klik **"Run Scan Now"** untuk test
6. ✅ Setiap 4 jam, scanner akan auto-scan dan kirim alert kalau ada setup ideal!

---

## 🚨 Troubleshooting

### Error: "Build failed" di Vercel
**Solusi:**
1. Cek Vercel deployment logs (di Vercel dashboard → deployment → "Logs")
2. Pastikan `package.json` ada di root folder GitHub repo
3. Pastikan tidak ada folder `node_modules` yang ter-upload
4. Kalau masih gagal, hapus repo, upload ulang dengan benar

### Error: "Module not found"
**Solusi:**
- Cek di GitHub repo, file `package.json` harus ada
- Kalau hilang, upload ulang

### Aplikasi blank/white screen
**Solusi:**
1. Buka browser console (F12 → Console tab)
2. Cek error message
3. Kalau "Failed to fetch" → API proxy bermasalah, tunggu 1-2 menit lalu refresh
4. Kalau "Module not found" → masalah build, cek Vercel logs

### CoinGecko API error (429)
**Solusi:**
- Sudah ada caching server-side + fallback data
- Kalau masih 429, tunggu 1-2 menit lalu refresh
- Tidak critical — app tetap jalan dengan fallback data

### WebSocket tidak connect (tab Live)
**Solusi:**
- Cek koneksi internet
- Refresh halaman
- Vercel support WebSocket, harusnya tidak ada masalah

### Alert Telegram tidak masuk
**Solusi:**
1. Pastikan Bot Token + Chat ID benar
2. Pastikan Anda sudah `/start` bot Anda
3. Cek tab "Telegram" → klik "Test Message"
4. Kalau gagal, cek error message di UI

### Scanner tidak menemukan setup
**Solusi:**
- Market sideways = wajar (tidak ada setup ideal)
- Turunkan min confidence ke 50% untuk lihat lebih banyak kandidat
- Tapi ingat: confidence rendah = false signal lebih banyak

---

## 📊 Vercel Free Tier Limits (Cukup untuk Anda)

| Resource | Limit | Pemakaian Anda (estimasi) | Status
|---------|-------|---------------------------|--------
| Bandwidth | 100 GB/bulan | ~5-10 GB | ✅ Aman
| Build time | 6000 menit/bulan | ~5 menit/build | ✅ Aman
| Serverless calls | 100K/bulan | ~30-50K | ✅ Aman
| Deployments | Unlimited | Sesuai kebutuhan | ✅ Aman
| Custom domain | Perlu Pro ($20/bln) | Pakai `*.vercel.app` | ✅ Gratis

**Kesimpulan: Free tier SANGAT cukup untuk personal use.**

---

## 🆙 Cara Update Aplikasi Kalau Ada Versi Baru

Kalau ada update source code baru:

1. Download ZIP baru dari saya
2. Extract, replace file lama di folder `crypto-trader-pro`
3. Upload ulang ke GitHub:
   - Buka repo GitHub
   - Klik "Add file" → "Upload files"
   - Drag file baru → commit
4. Vercel akan auto-deploy (~2-3 menit)
5. Aplikasi ter-update otomatis!

**Atau** edit langsung di GitHub web (klik file → pencil icon → edit → commit)

---

## 🔒 Privacy & Security

### Data Anda:
- ✅ Semua data (settings, journal, trades) tersimpan di **localStorage browser HP Anda**
- ✅ Tidak ada data yang dikirim ke server Vercel (kecuali API proxy calls)
- ✅ Binance API key disimpan lokal, hanya dikirim saat sync (dengan HMAC signing server-side)

### API Keys:
- ✅ Binance API key: read-only, disimpan di localStorage
- ✅ Telegram Bot Token: disimpan di localStorage
- ⚠️ **JANGAN enable Withdrawal permission di Binance API!**

### Backup:
- Tab **"Migration"** → download backup JSON secara berkala
- Simpan di cloud (Google Drive) atau local
- Backup minimal 1x/minggu kalau aktif trading

---

## ❓ FAQ

**Q: Berapa lama Vercel free tier berlaku?**
A: Selamanya untuk personal use. Tidak ada expiry.

**Q: Kalau saya hapus repo GitHub, aplikasi masih jalan?**
A: Tidak. Vercel butuh akses ke repo. Kalau repo dihapus, deploy berhenti.

**Q: Bisa pakai domain sendiri?**
A: Bisa, tapi perlu Vercel Pro ($20/bulan). Untuk pemula, pakai `*.vercel.app` dulu.

**Q: Aplikasi lambat di Vercel?**
A: Vercel deploy ke edge network global. Kalau lambat, kemungkinan API Binance/CoinGecko yang lambat.

**Q: Kalau Vercel down, data saya hilang?**
A: Tidak. Data di localStorage browser. Tapi Anda tidak bisa akses app sampai Vercel up lagi. **Selalu backup!**

**Q: Bisa dipakai bersama (multi-user)?**
A: Tidak. Setiap deployment = 1 user (data di localStorage masing-masing browser).

---

## 🎉 Checklist Akhir

Setelah semua selesai, pastikan:

- [ ] ZIP ter-transfer ke PC
- [ ] ZIP ter-extract (folder `crypto-trader-pro` ada di Desktop)
- [ ] File ter-upload ke GitHub repo private
- [ ] `package.json` ada di root repo GitHub
- [ ] Vercel deploy sukses (dapat URL `*.vercel.app`)
- [ ] URL dibuka di Chrome Android
- [ ] Add to Home Screen berhasil
- [ ] Data di-migrate dari sandbox (kalau ada)
- [ ] Binance API setup (opsional)
- [ ] Telegram bot setup (opsional)
- [ ] Scanner config + test run (opsional)

---

## 📞 Butuh Bantuan?

Kalau ada masalah:
1. **Vercel deployment logs** — di Vercel dashboard → deployment → "Logs"
2. **Browser console** — F12 → Console tab
3. **GitHub repo** — pastikan semua file ter-upload dengan benar

Error umum dan solusi ada di section **Troubleshooting** di atas.

---

## 🎯 Selamat!

Setelah semua step berhasil, Anda punya:
- ✅ Aplikasi crypto trading analysis lengkap (28 modul)
- ✅ URL permanen (tidak expire)
- ✅ Add to Home Screen di Android (seperti app native)
- ✅ Gratis selamanya (Vercel free tier)
- ✅ Data private (localStorage, tidak di server)
- ✅ Auto-scanner dengan multi-timeframe + event intelligence + smart recommendation
- ✅ Telegram alerts untuk setup high-quality

**Selamat trading! Tetap disiplin dengan risk management.** 📈
