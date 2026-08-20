-- ====================================================================
-- SKRIP SETUP DATABASE & STORAGE SUPABASE UNTUK PELAYANAN DATA BMKG
-- ====================================================================
-- Jalankan skrip SQL ini di Supabase Dashboard -> SQL Editor

-- 1. Skema Tabel Permohonan Data BMKG
CREATE TABLE IF NOT EXISTS public.permohonan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nama_lengkap TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    instansi TEXT NOT NULL,
    jenis_data TEXT NOT NULL,
    jalur TEXT NOT NULL,
    url_nik TEXT,
    url_ktm TEXT,
    url_surat TEXT,
    status TEXT DEFAULT 'MENUNGGU_VERIFIKASI' NOT NULL
);

-- 2. Aktifkan Row Level Security (RLS) pada Tabel permohonan
ALTER TABLE public.permohonan ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS 1: Pengguna hanya dapat membaca permohonan milik mereka sendiri
CREATE POLICY "Pengguna hanya dapat melihat permohonan milik sendiri" 
ON public.permohonan 
FOR SELECT 
USING (auth.jwt() ->> 'email' = email);

-- Kebijakan RLS 2: Pengguna terotentikasi dapat membuat permohonan baru
CREATE POLICY "Pengguna terotentikasi dapat membuat permohonan" 
ON public.permohonan 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 3. Setup Storage Bucket Supabase
-- Di Supabase Dashboard -> Storage -> Create new bucket:
-- Bucket Name: berkas-pelayanan-bmkg
-- Public bucket: Nonaktifkan (Private Bucket demi keamanan data pribadi / KTP pemohon)

-- 4. Kebijakan Storage RLS (Bucket berkas-pelayanan-bmkg)
-- Pengguna hanya dapat mengunggah ke folder ID mereka sendiri (auth.uid())
CREATE POLICY "Pengguna dapat mengunggah berkas sendiri"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'berkas-pelayanan-bmkg' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Pengguna dapat melihat berkas sendiri"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'berkas-pelayanan-bmkg' AND (storage.foldername(name))[1] = auth.uid()::text);
