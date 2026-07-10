# 🎯 Quick Start — Deploy CryptoTrader Pro ke Vercel (10 Menit)

## Apa yang Anda Butuhkan
- [ ] File `crypto-trader-pro.zip` (sudah di folder download)
- [ ] Akun GitHub (daftar gratis di github.com)
- [ ] Akun Vercel (login pakai GitHub di vercel.com)

---

## Langkah-Langkah

### 1️⃣ Extract ZIP (1 menit)
- Extract `crypto-trader-pro.zip` ke folder, misal: `Desktop/crypto-trader-pro/`
- Pastikan tidak ada folder `node_modules` di dalamnya (kalau ada, hapus)

### 2️⃣ Upload ke GitHub (3 menit)
1. Buka https://github.com/new
2. Repository name: `crypto-trader-pro`
3. Pilih **Private** (recommended)
4. Klik **Create repository**
5. Klik link **"uploading an existing file"**
6. **Drag semua file** dari folder extract ke browser
7. Klik **Commit changes**

### 3️⃣ Deploy ke Vercel (3 menit)
1. Buka https://vercel.com → Login dengan GitHub
2. Klik **Add New → Project**
3. Cari `crypto-trader-pro` → klik **Import**
4. Framework Preset: **Next.js** (auto-detect)
5. Klik **Deploy** 
6. Tunggu 2-3 menit → selesai! 🎉

### 4️⃣ Add to Home Screen di Android (1 menit)
1. Buka URL Vercel di Chrome Android
2. Menu (⋮) → **Add to Home Screen**
3. Beri nama: `CryptoTrader Pro`
4. Selesai! Icon muncul di home screen

### 5️⃣ Migrasi Data (kalau sudah pakai di sandbox)
1. Di sandbox (app lama) → tab **Migration** → **Download Backup**
2. Di Vercel (app baru) → tab **Migration** → **Pilih File Backup JSON**
3. Upload file backup → Refresh → data pindah!

---

## 📞 Butuh Detail Lengkap?
Buka file `DEPLOY-VERCEL-README.md` — ada troubleshooting, FAQ, dan setup Binance API + Telegram.

---

## ⚠️ Catatan Penting
- **Vercel free tier** cukup untuk personal use (selamanya gratis)
- **Data Anda** tersimpan di localStorage browser (privacy-first)
- **Backup berkala** lewat tab Migration (minimal 1x/minggu)
- **JANGAN enable Withdrawal** permission di Binance API key

Selamat trading! 📈
