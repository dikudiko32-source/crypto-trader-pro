# 🚀 CryptoTrader Pro — Deploy ke Vercel (Step by Step)

## ⚠️ SEBELUKUM MULAI

Aplikasi ini sudah lengkap dengan **27 modul** trading analysis system.
Total ukuran: ~50MB (setelah install dependencies).

**Yang Anda butuhkan:**
- ✅ Akun GitHub (gratis) — daftar di github.com
- ✅ Akun Vercel (gratis) — daftar di vercel.com (login pakai GitHub)
- ✅ File ZIP aplikasi (sudah Anda download)

**Tidak butuh:**
- ❌ Coding knowledge
- ❌ Server/VPS
- ❌ Credit card (Vercel free tier cukup untuk personal use)

---

## 📦 STEP 1: Download & Extract ZIP

1. Download file `crypto-trader-pro.zip` yang sudah disediakan
2. Extract ke folder di komputer Anda (misal: `Desktop/crypto-trader-pro/`)
3. Pastikan folder berisi file seperti: `package.json`, `src/`, `public/`, `next.config.ts`, dll

---

## 🐙 STEP 2: Upload ke GitHub

### Opsi A: Via GitHub Web (Paling Mudah)

1. Buka https://github.com/new
2. **Repository name**: `crypto-trader-pro`
3. **Visibility**: Private (recommended — hanya Anda yang bisa akses)
4. **Jangan centang** "Add README", ".gitignore", atau "license"
5. Klik **"Create repository"**
6. Di halaman repo, klik **"uploading an existing file"** (link kecil di bagian "…or push an existing repository")
7. **Drag & drop SEMUA file** dari folder extract ke browser
   - ⚠️ **PENTING**: Jangan upload folder `node_modules/` dan `.next/` (sangat besar, tidak perlu)
   - Kalau ada folder `node_modules`, hapus dulu sebelum upload
8. Tunggu sampai semua file ter-upload
9. Tulis commit message: "Initial commit - CryptoTrader Pro"
10. Klik **"Commit changes"**

### Opsi B: Via GitHub Desktop (Lebih Cepat)

1. Download GitHub Desktop: https://desktop.github.com/
2. Login dengan akun GitHub Anda
3. Klik **"Add a repository"** → **"Create new repository"**
4. Name: `crypto-trader-pro`, Local path: pilih folder extract
5. Klik **"Create repository"**
6. Hapus folder `node_modules/` dan `.next/` dari folder (kalau ada)
7. Klik **"Commit to main"** dengan message "Initial commit"
8. Klik **"Publish repository"** (pilih Private)

---

## ▲ STEP 3: Deploy ke Vercel

1. Buka https://vercel.com → klik **"Sign Up"** atau **"Log In"**
2. Pilih **"Continue with GitHub"** → authorize Vercel
3. Setelah login, klik **"Add New..."** → **"Project"**
4. Di bagian "Import Git Repository", cari `crypto-trader-pro`
5. Klik **"Import"**
6. **PENTING — Framework Preset**: Vercel biasanya auto-detect "Next.js". Kalau tidak, pilih manual:
   - Framework Preset: **Next.js**
7. **Root Directory**: biarkan default (`./`)
8. **Build Command**: biarkan default (`next build`)
9. **Output Directory**: biarkan default
10. **Environment Variables**: kosong (tidak perlu)
11. Klik **"Deploy"** 🎉

### Tunggu 2-5 menit

Vercel akan:
- Install dependencies (~1-2 menit)
- Build aplikasi (~1-2 menit)
- Deploy ke edge network (~30 detik)

Kalau sukses, Anda lihat:
```
✅ Congratulations! Your project has been deployed.
URL: https://crypto-trader-pro-xxxxx.vercel.app
```

---

## 📱 STEP 4: Add to Home Screen (Android)

1. Buka URL Vercel Anda di **Chrome Android**
2. Tunggu halaman load
3. Menu browser (⋮) → **"Add to Home Screen"**
4. Nama: `CryptoTrader Pro` (atau sesuka Anda)
5. Klik **"Add"**
6. ✅ Icon muncul di home screen → buka seperti app native!

### Tips:
- Saat dibuka dari home screen, app jadi **fullscreen** (no browser UI)
- Bisa di-switch dengan app lain seperti app biasa
- Data tersimpan lokal di HP (localStorage)

---

## 🔄 STEP 5: Migrasi Data dari Sandbox

Kalau Anda sudah pakai aplikasi di sandbox dan mau pindah ke Vercel:

### Di Sandbox (aplikasi lama):
1. Buka tab **"Migration"**
2. Klik **"Download Backup"**
3. Simpan file JSON di HP/komputer

### Di Vercel (aplikasi baru):
1. Buka tab **"Migration"**
2. Klik **"Pilih File Backup JSON"**
3. Upload file backup tadi
4. Tunggu sampai muncul "✅ X item berhasil diimpor"
5. Refresh halaman → semua data sudah pindah!

---

## 🔧 STEP 6: Setup Binance API (Opsional tapi Recommended)

Untuk auto-sync portfolio real-time:

1. Login ke Binance web → https://api.binance.com
2. **API Management** → **"Create API"**
3. Pilih **"System Generated"** → label: `CryptoTracker-ReadOnly`
4. **SET PERMISSIONS**:
   - ✅ Enable Reading
   - ❌ Enable Spot Trading (DISABLE)
   - ❌ Enable Futures Trading (DISABLE)
   - ❌ **Enable Withdrawals** (NEVER! Bahaya!)
5. Save API Key + Secret Key
6. Optional: Enable **IP Whitelist** (cuma IP Vercel yang bisa akses)
   - Cek IP Vercel Anda di: https://vercel.com/dashboard/settings → "IP Address"
7. Di aplikasi CryptoTrader Pro → tab **Settings**:
   - Input API Key + Secret
   - Buka tab **Portfolio** → enable Auto-Sync (dengan acknowledgment)

---

## 🔔 STEP 7: Setup Telegram Bot (Opsional untuk Alert Reliable)

1. Buka Telegram, cari **@BotFather**
2. Kirim `/newbot`
3. Kasih nama: "My Crypto Alert"
4. Kasih username: `my_crypto_alert_bot` (harus unik, ends with `_bot`)
5. BotFather kasih **Bot Token** → copy
6. Cari **@userinfobot**, kirim `/start`
7. Dapat **Chat ID** (angka) → copy
8. Kirim `/start` ke bot baru Anda (PENTING!)
9. Di aplikasi → tab **Telegram**:
   - Input Bot Token + Chat ID
   - Klik **"Test Message"**
   - Cek Telegram Anda → harus ada test message

---

## 🚨 Troubleshooting

### Error: "Build failed"
- Pastikan tidak ada folder `node_modules/` atau `.next/` yang ter-upload ke GitHub
- Hapus, commit, push ulang
- Vercel akan auto-install dependencies saat build

### Error: "Module not found"
- Pastikan `package.json` ter-upload dengan benar
- Cek di GitHub repo, file `package.json` harus ada di root

### Aplikasi blank/white screen
- Buka browser console (F12) → cek error
- Kemungkinan: API proxy tidak jalan → cek tab "Macro" atau "Live"

### CoinGecko API error (429)
- Sudah ada caching server-side, tapi kalau masih 429, tunggu 1-2 menit lalu refresh
- Vercel free tier IP mungkin kena rate limit kalau trafik tinggi

### WebSocket tidak connect
- Vercel support WebSocket (HMR), tapi kalau ada masalah:
- Cek tab "Live" → harus muncul "Connected to Binance"
- Kalau disconnect terus, coba refresh

### Alert tidak muncul saat app tertutup
- Browser push notification hanya jalan kalau tab terbuka (background tetap OK)
- Untuk alert 24/7: pakai Telegram bot (lebih reliable)
- Atau biarkan app terbuka di tab background

---

## 📊 Vercel Free Tier Limits

| Resource | Limit | Cukup untuk?
|---------|-------|------------
| Bandwidth | 100 GB/bulan | ✅ Personal use (1 user) |
| Build time | 6000 menit/bulan | ✅ Cukup (1 build = ~2 menit) |
| Serverless function calls | 100K/bulan | ✅ Cukup (API proxy calls) |
| Deployment | Unlimited | ✅ |
| Custom domain | Perlu upgrade | ❌ Pakai `*.vercel.app` dulu |

**Estimasi pemakaian Anda (1 user aktif):**
- Bandwidth: ~5-10 GB/bulan (jauh di bawah limit)
- Function calls: ~30-50K/bulan (Binance + CoinGecko API)
- Build: 2-3x/bulan (kalau ada update)

**Kesimpulan: Free tier SANGAT cukup untuk Anda.**

---

## 🆙 Cara Update Aplikasi

Kalau ada update source code baru:

### Opsi A: Re-upload ke GitHub
1. Download ZIP update baru
2. Extract, replace file lama
3. Upload ulang ke GitHub (atau git push kalau pakai GitHub Desktop)
4. Vercel auto-deploy (~2-3 menit)

### Opsi B: Edit langsung di GitHub
1. Buka repo GitHub
2. Klik file yang mau edit → pencil icon
3. Edit → commit
4. Vercel auto-deploy

---

## 🔒 Privacy & Security

### Data Anda:
- ✅ Semua data (settings, journal, trades) tersimpan di **localStorage browser Anda**
- ✅ Tidak ada data yang dikirim ke server Vercel (kecuali API proxy calls)
- ✅ Binance API key disimpan lokal, hanya dikirim saat sync (dengan HMAC signing)

### API Keys:
- ✅ Binance API key: read-only, disimpan di localStorage
- ✅ Telegram Bot Token: disimpan di localStorage
- ⚠️ **JANGAN enable Withdrawal permission di Binance API!**

### Backup:
- Tab **Migration** → download backup JSON secara berkala
- Simpan di cloud (Google Drive/Dropbox) atau local
- Backup minimal 1x/minggu kalau aktif trading

---

## ❓ FAQ

**Q: Berapa lama Vercel free tier berlaku?**
A: Selamanya untuk personal use. Tidak ada expiry.

**Q: Kalau saya hapus repo GitHub, aplikasi masih jalan?**
A: Tidak. Vercel butuh akses ke repo untuk deploy. Kalau repo dihapus, deploy berhenti.

**Q: Bisa pakai domain sendiri (misal: cryptotrader.mydomain.com)?**
A: Bisa, tapi perlu Vercel Pro ($20/bulan). Untuk pemula, pakai `*.vercel.app` dulu.

**Q: Aplikasi lambat di Vercel?**
A: Vercel deploy ke edge network global. Should be fast. Kalau lambat, kemungkinan API Binance/CoinGecko yang lambat, bukan Vercel.

**Q: Bisa dipakai bersama (multi-user)?**
A: Tidak. Setiap deployment = 1 user (data di localStorage masing-masing browser). Kalau mau multi-user, perlu tambahan backend + auth.

**Q: Kalau Vercel down, data saya hilang?**
A: Tidak. Data di localStorage browser Anda, bukan di Vercel. Vercel hanya host aplikasinya. Tapi kalau Vercel down, Anda tidak bisa akses aplikasi sampai Vercel up lagi. **Selalu backup data!**

---

## 📞 Butuh Bantuan?

Kalau ada masalah saat deploy, cek:
1. **Vercel deployment logs** — di Vercel dashboard, klik deployment → "Logs"
2. **Browser console** — F12 → Console tab
3. **GitHub repo** — pastikan semua file ter-upload dengan benar

Error umum dan solusi ada di section **Troubleshooting** di atas.

---

## 🎉 Selamat!

Kalau semua step berhasil, Anda sekarang punya:
- ✅ Aplikasi crypto trading analysis lengkap (27 modul)
- ✅ URL permanen (tidak expire)
- ✅ Add to Home Screen di Android (seperti app native)
- ✅ Gratis selamanya (Vercel free tier)
- ✅ Data private (localStorage, tidak di server)

**Selamat trading! Tetap disiplin dengan risk management.** 📈
