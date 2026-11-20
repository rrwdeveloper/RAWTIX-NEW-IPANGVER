-- Add a dedicated Coming Soon product status while preserving draft as a legacy fallback.
ALTER TYPE public.product_status ADD VALUE IF NOT EXISTS 'coming_soon';
