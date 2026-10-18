-- RAWTIX signature catalogue: products used by the homepage and ready-stock shop.
-- Product images remain local fallbacks until they are uploaded to Supabase Storage.

INSERT INTO public.categories (id, name, slug, sort_order)
VALUES ('33333333-0000-0000-0000-000000000001', 'Signature Pieces', 'signature-pieces', 10)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

INSERT INTO public.products (id, name, slug, description, price, category_id, status, featured, sort_order)
VALUES
('33333333-0000-0000-0000-000000000001', 'Javas Fireman Clasp', 'javas-fireman-clasp', 'Kemeja long sleeve dengan motif flora Nusantara monokrom dan konstruksi Mandarin collar. Fireman clasp menjadi aksen utama pada siluet yang tegas dan elegan.', 1299000, '33333333-0000-0000-0000-000000000001', 'active', true, 1),
('33333333-0000-0000-0000-000000000002', 'Green Javas Fireman Clasp', 'green-javas-fireman-clasp', 'Interpretasi hijau emerald dari seri Javas dengan panel batik kontras, Mandarin collar, dan fireman clasp untuk karakter heritage yang modern.', 1299000, '33333333-0000-0000-0000-000000000001', 'active', true, 2),
('33333333-0000-0000-0000-000000000003', 'Phoenix Fireman Clasp', 'phoenix-fireman-clasp', 'Statement jacket dengan phoenix crimson dan motif ornamental yang berani. Dibuat untuk menjadi pusat perhatian dengan konstruksi collar yang rapi.', 1499000, '33333333-0000-0000-0000-000000000001', 'active', true, 3),
('33333333-0000-0000-0000-000000000004', 'Dragon Fireman Clasp', 'dragon-fireman-clasp', 'Jaket batik penuh warna dengan karakter naga yang kuat. Potongan terstruktur dan fireman clasp menjaga keseimbangan antara tradisi dan tailoring kontemporer.', 1499000, '33333333-0000-0000-0000-000000000001', 'active', true, 4),
('33333333-0000-0000-0000-000000000005', 'White Phoenix Fireman Clasp', 'white-phoenix-fireman-clasp', 'Kemeja putih dengan aksen phoenix dan detail batik yang memberikan kontras bersih. Siluet long sleeve dirancang untuk pemakaian formal maupun semi-formal.', 1299000, '33333333-0000-0000-0000-000000000001', 'active', true, 5),
('33333333-0000-0000-0000-000000000006', 'Blue Phoenix Fireman Clasp', 'blue-phoenix-fireman-clasp', 'Palet biru yang tenang dipadukan dengan motif phoenix dan fireman clasp. Konstruksi Mandarin collar memberi tampilan khas RAWTIX.', 1299000, '33333333-0000-0000-0000-000000000001', 'active', true, 6),
('33333333-0000-0000-0000-000000000007', 'Suryanila Phoenix Fireman Clasp', 'suryanila-phoenix-fireman-clasp', 'Jaket printed bernuansa biru dengan motif phoenix yang ekspresif. Dirancang sebagai signature piece dengan detail panel dan collar yang presisi.', 1499000, '33333333-0000-0000-0000-000000000001', 'active', true, 7),
('33333333-0000-0000-0000-000000000008', 'Sutra ATBM Fireman Clasp', 'sutra-atbm-brown-fireman-clasp', 'Jaket bermotif cokelat yang menonjolkan tekstur kain ATBM. Fireman clasp dan Mandarin collar membentuk tampilan heritage yang refined.', 1399000, '33333333-0000-0000-0000-000000000001', 'active', true, 8),
('33333333-0000-0000-0000-000000000009', 'Sutra ATBM Fireman Clasp', 'sutra-atbm-black-fireman-clasp', 'Versi hitam dari seri Sutra ATBM dengan motif yang dalam dan versatile. Siluetnya mudah dipadukan untuk acara siang maupun malam.', 1399000, '33333333-0000-0000-0000-000000000001', 'active', true, 9),
('33333333-0000-0000-0000-000000000010', 'Swarna Ananta Fireman Clasp', 'swarna-ananta-long-sleeve', 'Signature piece long sleeve dengan motif Swarna Ananta yang kaya simbol. Konstruksi collar dan clasp dibuat untuk tampilan berkarakter.', 1399000, '33333333-0000-0000-0000-000000000001', 'active', true, 10),
('33333333-0000-0000-0000-000000000011', 'Swarna Ananta Fireman Clasp', 'swarna-ananta-short-sleeve', 'Versi short sleeve yang lebih ringan dari seri Swarna Ananta. Motif heritage tetap menjadi fokus dengan potongan yang nyaman untuk iklim tropis.', 1199000, '33333333-0000-0000-0000-000000000001', 'active', true, 11)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description,
  price = EXCLUDED.price, category_id = EXCLUDED.category_id, status = EXCLUDED.status,
  featured = EXCLUDED.featured, sort_order = EXCLUDED.sort_order;

INSERT INTO public.product_variants (product_id, size, stock)
SELECT p.id, size_name, 10
FROM public.products p
CROSS JOIN unnest(ARRAY['S', 'M', 'L', 'XL']) AS sizes(size_name)
WHERE p.id::text LIKE '33333333-0000-0000-0000-0000000000%'
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_variants existing
    WHERE existing.product_id = p.id
      AND existing.size = size_name
  );

-- Keep the uploaded Storage objects authoritative for catalogue images.
-- Existing image rows for these products are replaced without touching other products.
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
