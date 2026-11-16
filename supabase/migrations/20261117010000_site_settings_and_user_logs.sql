-- =============================================================================
-- RAWTIX — Site Settings (Customizer) and User Logs (Audit Trail)
-- Migration: 20261117010000_site_settings_and_user_logs.sql
-- =============================================================================

-- 1. Tabel site_settings (Pengaturan Layout, Background Hero, & Web Customizer)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Publik bisa melihat site_settings (dibutuhkan frontend storefront)
DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view site settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (true);

-- Hanya Owner yang berhak mengedit / menambah / menghapus site_settings
DROP POLICY IF EXISTS "Owners can manage site settings" ON public.site_settings;
CREATE POLICY "Owners can manage site settings"
ON public.site_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- 2. Tabel user_logs (Audit Trail aktivitas staf Admin dan Owner)
CREATE TABLE IF NOT EXISTS public.user_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  role app_role NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_logs ENABLE ROW LEVEL SECURITY;

-- Admin dan Owner dapat membaca user_logs
DROP POLICY IF EXISTS "Admins and Owners can read user logs" ON public.user_logs;
CREATE POLICY "Admins and Owners can read user logs"
ON public.user_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Pengguna terautentikasi (Admin/Owner) dapat mencatat log aktivitas
DROP POLICY IF EXISTS "Staff can insert user logs" ON public.user_logs;
CREATE POLICY "Staff can insert user logs"
ON public.user_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
