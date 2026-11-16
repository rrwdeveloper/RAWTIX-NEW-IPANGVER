-- =============================================================================
-- RAWTIX — Human-Readable User Logs & Strict Role Visibility
-- Migration: 20261117020000_human_logs_and_role_visibility.sql
-- =============================================================================

-- 1. Tambahkan kolom description (keterangan bahasa manusia) ke tabel user_logs jika belum ada
ALTER TABLE public.user_logs 
ADD COLUMN IF NOT EXISTS description text;

-- 2. Update deskripsi pada log-log sebelumnya agar ramah dibaca manusia
UPDATE public.user_logs 
SET description = 'Memperbarui konfigurasi tampilan Hero: Judul diatur ke "Designed in Jakarta, Worn Beyond Borders.", tingkat kegelapan overlay 60%, menggunakan latar belakang standar.'
WHERE id = 'd88f5e15-eabe-4c44-a528-56211e3dc991';

UPDATE public.user_logs 
SET description = 'Memperbarui konfigurasi tampilan Hero: Judul diatur ke "Designed in Jakarta, Worn Beyond Borders.", tingkat kegelapan overlay 60%, mengaktifkan gambar latar belakang kustom.'
WHERE id = '8032150e-98fe-49c0-89a2-6ab652ce0c25';

UPDATE public.user_logs 
SET description = 'Memperbarui status pesanan dari "Sudah Bayar (paid)" menjadi "Sedang Diproses (processing)".'
WHERE id = 'fcd3af4e-31b3-4da4-b454-bc4f1d44034c';

UPDATE public.user_logs 
SET description = 'Memverifikasi bukti transfer pembayaran pesanan sebesar Rp 1.299.000 dan mengubah status menjadi "Lunas (paid)".'
WHERE id = 'eab93aac-ee35-4aca-8618-26c58ac339e5';

UPDATE public.user_logs 
SET description = 'Berhasil login ke dalam Portal Operasional Staff via Desktop Chrome (IP: 127.0.0.1).'
WHERE id = '1c02c881-a896-4788-91d7-f450450fe4a8';

UPDATE public.user_logs 
SET description = 'Menetapkan hak akses (role) sebagai Admin kepada admin@rawtix.com oleh Owner.'
WHERE id = '75760531-0ab0-4588-9482-6cf14fefc5a0';

UPDATE public.user_logs 
SET description = 'Inisialisasi sistem, migrasi basis data ke server baru, dan registrasi akun Owner utama.'
WHERE id = '54ded712-ccbb-4bda-8eb7-2d6cc9a671cc';

-- 3. Perbarui RLS Policy:
-- Owner dapat melihat SEMUA log (baik aktivitas Admin maupun aktivitas Owner)
-- Admin HANYA dapat melihat log aktivitas Admin lain / sesama Admin, dan TIDAK BISA melihat log Owner!
DROP POLICY IF EXISTS "Admins and Owners can read user logs" ON public.user_logs;
DROP POLICY IF EXISTS "User logs read policy by role" ON public.user_logs;

CREATE POLICY "User logs read policy by role"
ON public.user_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner')
  OR (public.has_role(auth.uid(), 'admin') AND role = 'admin')
);
