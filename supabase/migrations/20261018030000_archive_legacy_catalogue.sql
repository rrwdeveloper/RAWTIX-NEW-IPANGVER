-- Remove legacy seed products from the public catalogue without deleting
-- products that may still be referenced by historical orders.
UPDATE public.products
SET status = 'draft',
    featured = false,
    updated_at = now()
WHERE slug IN (
  'midnight-tee',
  'phantom-ls',
  'raw-hoodie',
  'shadow-cargo',
  'urban-wide',
  'stealth-cap'
)
AND (status <> 'draft' OR featured = true);
