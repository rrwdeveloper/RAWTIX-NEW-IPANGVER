-- =============================================================================
-- RAWTIX — Role Hierarchy: Owner & Admin (Owner > Admin)
-- Migration: 20261117000000_add_owner_role_hierarchy.sql
-- =============================================================================

-- 1. Tambah value 'owner' ke enum app_role jika belum ada
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- 2. Update fungsi has_role dengan hierarki: owner > admin
-- Jika dicek 'admin', user dengan role 'owner' otomatis bernilai true
-- Jika dicek 'owner', hanya user dengan role 'owner' yang bernilai true
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (role = 'owner' AND _role = 'admin')
      )
  );
$$;

-- 3. Kebijakan RLS agar Owner memiliki hak penuh mengelola tabel user_roles
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;
CREATE POLICY "Owners can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));
