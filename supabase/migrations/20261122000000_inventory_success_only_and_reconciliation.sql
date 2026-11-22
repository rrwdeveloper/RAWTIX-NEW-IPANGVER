-- Prevent inventory changes for unpaid/failed orders and make stock adjustments idempotent.

CREATE TABLE IF NOT EXISTS public.order_stock_movements (
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('debit', 'credit')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, variant_id, movement_type)
);

CREATE INDEX IF NOT EXISTS idx_order_stock_movements_variant
  ON public.order_stock_movements(variant_id);

-- Existing successful/in-flight orders are already represented by stock that was decremented.
-- Recording this history prevents future gateway retries from decrementing again.
INSERT INTO public.order_stock_movements (order_id, variant_id, movement_type, quantity)
SELECT oi.order_id, oi.variant_id, 'debit', oi.quantity
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE oi.variant_id IS NOT NULL
  AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
ON CONFLICT (order_id, variant_id, movement_type) DO NOTHING;

-- Reconcile the historical bug: pending and clearly unpaid cancelled orders were
-- previously decremented at order creation, so restore each quantity exactly once.
DO $$
DECLARE
  v_order record;
  v_item record;
  v_movement_exists boolean;
BEGIN
  FOR v_order IN
    SELECT id
    FROM public.orders
    WHERE status = 'pending'
       OR (
         status = 'cancelled'
         AND COALESCE(payment_reference, '') = ''
         AND COALESCE(payment_proof_url, '') = ''
       )
  LOOP
    FOR v_item IN
      SELECT oi.variant_id, oi.quantity
      FROM public.order_items oi
      WHERE oi.order_id = v_order.id AND oi.variant_id IS NOT NULL
    LOOP
      SELECT EXISTS (
        SELECT 1
        FROM public.order_stock_movements m
        WHERE m.order_id = v_order.id
          AND m.variant_id = v_item.variant_id
          AND m.movement_type = 'credit'
      ) INTO v_movement_exists;

      IF NOT v_movement_exists THEN
        UPDATE public.product_variants
        SET stock = stock + v_item.quantity
        WHERE id = v_item.variant_id;

        INSERT INTO public.order_stock_movements (
          order_id, variant_id, movement_type, quantity
        ) VALUES (
          v_order.id, v_item.variant_id, 'credit', v_item.quantity
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_order_payment_status(
  p_order_number   text,
  p_status         order_status,
  p_payment_method text DEFAULT NULL,
  p_snap_token     text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_prev_status order_status;
  v_item record;
BEGIN
  SELECT id, status INTO v_order_id, v_prev_status
  FROM orders
  WHERE order_number = p_order_number;

  IF v_order_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_prev_status IN ('paid', 'processing', 'shipped', 'delivered')
     AND p_status IN ('pending', 'cancelled') THEN
    RETURN true;
  END IF;

  IF v_prev_status = 'cancelled' AND p_status = 'pending' THEN
    RETURN true;
  END IF;

  IF v_prev_status = p_status THEN
    UPDATE orders
    SET
      payment_method = COALESCE(NULLIF(p_payment_method, ''), payment_method),
      payment_reference = COALESCE(NULLIF(p_snap_token, ''), payment_reference),
      updated_at = now()
    WHERE id = v_order_id;
    RETURN true;
  END IF;

  UPDATE orders
  SET
    status = p_status,
    payment_method = COALESCE(NULLIF(p_payment_method, ''), payment_method),
    payment_reference = COALESCE(NULLIF(p_snap_token, ''), payment_reference),
    updated_at = now()
  WHERE id = v_order_id;

  -- Debit inventory exactly once when payment becomes confirmed.
  IF p_status = 'paid' AND v_prev_status = 'pending' THEN
    FOR v_item IN
      SELECT oi.variant_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = v_order_id AND oi.variant_id IS NOT NULL
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM order_stock_movements m
        WHERE m.order_id = v_order_id
          AND m.variant_id = v_item.variant_id
          AND m.movement_type = 'debit'
      ) THEN
        UPDATE product_variants
        SET stock = GREATEST(0, stock - v_item.quantity)
        WHERE id = v_item.variant_id;

        INSERT INTO order_stock_movements (
          order_id, variant_id, movement_type, quantity
        ) VALUES (
          v_order_id, v_item.variant_id, 'debit', v_item.quantity
        );
      END IF;
    END LOOP;
  END IF;

  -- Restore inventory exactly once when a previously paid order is cancelled.
  IF p_status = 'cancelled'
     AND v_prev_status IN ('paid', 'processing', 'shipped') THEN
    FOR v_item IN
      SELECT oi.variant_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = v_order_id AND oi.variant_id IS NOT NULL
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM order_stock_movements m
        WHERE m.order_id = v_order_id
          AND m.variant_id = v_item.variant_id
          AND m.movement_type = 'credit'
      ) THEN
        UPDATE product_variants
        SET stock = stock + v_item.quantity
        WHERE id = v_item.variant_id;

        INSERT INTO order_stock_movements (
          order_id, variant_id, movement_type, quantity
        ) VALUES (
          v_order_id, v_item.variant_id, 'credit', v_item.quantity
        );
      END IF;
    END LOOP;
  END IF;

  INSERT INTO order_notifications (order_id, event_type, channel, status)
  VALUES (v_order_id, 'payment_status_' || p_status::text, 'email', 'pending');

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_order_payment_status(text, order_status, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_order_payment_status(text, order_status, text, text) TO service_role;
