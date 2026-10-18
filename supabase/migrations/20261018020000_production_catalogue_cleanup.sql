-- Production cleanup:
-- 1. Remove duplicate shipping rates while preserving the oldest row.
-- 2. Archive legacy seed products only when they have never appeared in an order.
-- Orders and order_items are intentionally preserved.

WITH duplicate_rates AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY lower(trim(name)), price
      ORDER BY created_at ASC, id ASC
    ) AS row_number
  FROM public.shipping_rates
)
DELETE FROM public.shipping_rates
WHERE id IN (
  SELECT id FROM duplicate_rates WHERE row_number > 1
);

UPDATE public.shipping_rates
SET is_default = false
WHERE id NOT IN (
  SELECT id
  FROM public.shipping_rates
  WHERE is_default = true
  ORDER BY created_at ASC, id ASC
  LIMIT 1
);

UPDATE public.products
SET status = 'draft'
WHERE slug IN (
  'midnight-tee',
  'phantom-ls',
  'raw-hoodie',
  'shadow-cargo',
  'urban-wide',
  'stealth-cap'
)
AND NOT EXISTS (
  SELECT 1
  FROM public.order_items
  WHERE order_items.product_id = products.id
);
