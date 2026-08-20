# ⛅ Dashboard Pelayanan Data BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)

Website resmi pelayanan permohonan data cuaca, iklim, dan geofisika BMKG yang dibangun menggunakan **React 18**, **Vite**, dan **Supabase Auth & Storage**. Didesain dengan antarmuka modern, responsif, dan siap untuk penggunaan skala komersial/produksi.

---

## ✨ Fitur Utama

1. **Sistem Autentikasi Multi-Akun**:
   - **Google OAuth Direct**: Login instan menggunakan berbagai macam akun Google tanpa hambatan batas kirim email.
   - **Email OTP 6-Digit**: Alternatif login via kode OTP ke email pengguna.
2. **Splash Screen Animasi Logo BMKG**:
   - Animasi transisi 5 detik (*Fade In ➔ Glow Pulse ➔ Fade Out*) yang elegan dan profesional saat pengguna berhasil login.
3. **Antarmuka Friendly & Responsif (Screen Fitting)**:
   - Header terpisah: Sisi Kiri khusus Logo & Judul BMKG dengan teks subtitle berwarna **putih murni (`#ffffff`)**, Sisi Kanan khusus Pengaturan Akun & Tombol Keluar.
   - Hero Greeting Card dengan jaminan verifikasi **1 Hari Kerja** untuk semua jalur permohonan (Mahasiswa Rp 0 & PNBP Umum).
4. **Formulir Interaktif 3 Langkah (Stepper Form)**:
   - **Langkah 1**: Identitas Diri Pemohon (Nama, WhatsApp, Instansi).
   - **Langkah 2**: Detail & Jenis Data (Iklim, Cuaca, Gempa Bumi).
   - **Langkah 3**: Upload Berkas Persyaratan (KTP, KTM, Surat Permohonan) dengan validasi otomatis (Format PDF/JPG/PNG, Maksimal 5MB).
5. **Riwayat Permohonan Real-Time**:
   - Tab khusus untuk melihat daftar dan status permohonan data yang telah dikirim langsung dari database.

---

## 🚀 Panduan Memulai untuk Tim Pengembang (Quick Start)

### 1. Prasyarat Sistem
- **Node.js**: versi 18.0 atau yang lebih baru.
- **npm** atau **yarn**.

### 2. Instalasi Dependensi
Buka terminal/command prompt di folder repositori ini dan jalankan:
```bash
npm install
```

### 3. Konfigurasi Variabel Lingkungan (.env)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi kredensial Supabase Anda di file `.env`:
```env
VITE_SUPABASE_URL=https://pmzqdbfhtqkqxbthmkzv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_kSYUavnacZZNcQj5-ZLi1A_R36G9tdJ
```

### 4. Setup Database & Storage Supabase
1. Buka [Supabase Dashboard](https://supabase.com/dashboard) proyek Anda.
2. Masuk ke **SQL Editor** -> **New Query**.
3. Salin dan jalankan seluruh isi skrip [`supabase_setup.sql`](./supabase_setup.sql).
4. Di menu **Storage**, pastikan Bucket bernama `berkas-pelayanan-bmkg` telah dibuat.

### 5. Jalankan Server Pengembang
```bash
npm run dev
```
Buka `http://localhost:5173` di browser Anda.

### 6. Build untuk Produksi / Deployment
```bash
npm run build
```
Hasil kompilasi siap rilis akan berada di folder `dist/`.

---

## 📁 Struktur Folder Project

```
github_repository/
├── src/
│   ├── app.jsx              # Komponen Utama Dashboard & Logika Autentikasi/Form
│   ├── main.jsx             # Entry point React DOM
│   └── supabaseClient.js    # Konfigurasi Supabase Client & Environment Variable
├── .env.example             # Template variabel lingkungan
├── .gitignore               # Konfigurasi ignore file untuk Git
├── index.html               # Template HTML utama
├── package.json             # Manajer dependensi & skrip npm
├── supabase_setup.sql       # Skrip DDL Database, RLS Policy, & Storage Setup
└── README.md                # Dokumentasi proyek untuk pengembang
```

---

## 🔒 Hak Cipta & Lisensi
Dilindungi oleh Badan Meteorologi, Klimatologi, dan Geofisika (BMKG).
