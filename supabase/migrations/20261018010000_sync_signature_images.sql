-- Synchronize signature catalogue images with the product-images bucket.
-- This does not delete files from Storage or affect orders.

DELETE FROM public.product_images
WHERE product_id::text LIKE '33333333-0000-0000-0000-0000000000%';

INSERT INTO public.product_images (product_id, url, alt_text, is_primary, sort_order)
VALUES
('33333333-0000-0000-0000-000000000001', 'https://kfzjviclsplcmwdvyvuq.supabase.co/storage/v1/object/public/product-images/Artboard%201.png', 'Javas Fireman Clasp', true, 0),
('33333333-0000-0000-0000-000000000002', 'https://kfzjviclsplcmwdvyvuq.supabase.co/storage/v1/object/public/product-images/Artboard%202.png', 'Green Javas Fireman Clasp', true, 0),
('33333333-0000-0000-0000-000000000003', 'https://kfzjviclsplcmwdvyvuq.supabase.co/storage/v1/object/public/product-images/Artboard%203.png', 'Phoenix Fireman Clasp', true, 0),
('33333333-0000-0000-0000-000000000004', 'https://kfzjviclsplcmwdvyvuq.supabase.co/storage/v1/object/public/product-images/Artboard%204.png', 'Dragon Fireman Clasp', true, 0),
('33333333-0000-0000-0000-000000000005', 'https://kfzjviclsplcmwdvyvuq.supabase.co/storage/v1/object/public/product-images/Artboard%205.png', 'White Phoenix Fireman Clasp', true, 0),
('33333333-0000-0000-0000-000000000006', 'https://kfzjviclsplcmwdvyvuq.supabase.co/storage/v1/object/public/product-images/Artboard%206.png', 'Blue Phoenix Fireman Clasp', true, 0),
('33333333-0000-0000-0000-000000000007', 'https://kfzjviclsplcmwdvyvuq.supabase.co/storage/v1/object/public/product-images/Artboard%207.png', 'Suryanila Phoenix Fireman Clasp', true, 0),
('33333333-0000-0000-0000-000000000008', 'https://kfzjviclsplcmwdvyvuq.supabase.co/storage/v1/object/public/product-images/Artboard%208.png', 'Sutra ATBM Fireman Clasp Brown', true, 0),
('33333333-0000-0000-0000-000000000009', 'https://kfzjviclsplcmwdvyvuq.supabase.co/storage/v1/object/public/product-images/Artboard%209.png', 'Sutra ATBM Fireman Clasp Black', true, 0),
('33333333-0000-0000-0000-000000000010', 'https://kfzjviclsplcmwdvyvuq.supabase.co/storage/v1/object/public/product-images/Artboard%2010.png', 'Swarna Ananta Fireman Clasp Long Sleeve', true, 0),
('33333333-0000-0000-0000-000000000011', 'https://kfzjviclsplcmwdvyvuq.supabase.co/storage/v1/object/public/product-images/Artboard%2011.png', 'Swarna Ananta Fireman Clasp Short Sleeve', true, 0);
