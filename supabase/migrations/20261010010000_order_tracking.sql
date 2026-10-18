-- Migration: 20261010010000_order_tracking.sql
-- Function to allow guests to lookup orders by their verified email address

CREATE OR REPLACE FUNCTION public.lookup_orders_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'id', o.id,
          'order_number', o.order_number,
          'customer_name', o.customer_name,
          'email', o.email,
          'total', o.total,
          'subtotal', o.subtotal,
          'shipping_cost', o.shipping_cost,
          'shipping_method_name', o.shipping_method_name,
          'status', o.status,
          'payment_method', o.payment_method,
          'payment_proof_url', o.payment_proof_url,
          'created_at', o.created_at,
          'items', (
            SELECT COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'product_name', oi.product_name,
                  'size', oi.size,
                  'price', oi.price,
                  'quantity', oi.quantity
                )
              ), '[]'::json
            )
            FROM order_items oi
            WHERE oi.order_id = o.id
          )
        ) ORDER BY o.created_at DESC
      ), '[]'::json
    )
    FROM orders o
    WHERE LOWER(o.email) = LOWER(p_email)
    LIMIT 20
  );
END;
$$;
