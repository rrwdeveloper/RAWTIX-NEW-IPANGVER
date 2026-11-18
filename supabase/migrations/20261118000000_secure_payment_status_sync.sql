-- =============================================================================
-- RAWTIX — Secure Payment Status Synchronization & Terminal State Protection
-- Migration: 20261118000000_secure_payment_status_sync.sql
-- =============================================================================

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

  -- 1. Terminal state protection:
  -- If order is already paid or in fulfillment ('paid', 'processing', 'shipped', 'delivered'),
  -- automated gateway sync / late webhooks MUST NOT downgrade or cancel the order.
  IF v_prev_status IN ('paid', 'processing', 'shipped', 'delivered') AND p_status IN ('pending', 'cancelled') THEN
    RETURN true; -- Acknowledge idempotently without corrupting fulfilled state
  END IF;

  -- 2. Prevent reviving cancelled orders back to pending via late callback
  IF v_prev_status = 'cancelled' AND p_status = 'pending' THEN
    RETURN true;
  END IF;

  -- 3. Idempotent check
  IF v_prev_status = p_status THEN
    UPDATE orders
    SET
      payment_method = COALESCE(NULLIF(p_payment_method, ''), payment_method),
      payment_reference = COALESCE(NULLIF(p_snap_token, ''), payment_reference),
      updated_at = now()
    WHERE id = v_order_id;
    RETURN true;
  END IF;

  -- 4. Update order record
  UPDATE orders
  SET 
    status = p_status,
    payment_method = COALESCE(NULLIF(p_payment_method, ''), payment_method),
    payment_reference = COALESCE(NULLIF(p_snap_token, ''), payment_reference),
    updated_at = now()
  WHERE id = v_order_id;

  -- 5. Kurangi stok otomatis jika status berubah menjadi 'paid'
  IF p_status = 'paid' AND v_prev_status != 'paid' THEN
    FOR v_item IN
      SELECT variant_id, quantity
      FROM order_items
      WHERE order_id = v_order_id AND variant_id IS NOT NULL
    LOOP
      UPDATE product_variants
      SET stock = GREATEST(0, stock - v_item.quantity)
      WHERE id = v_item.variant_id;
    END LOOP;
  END IF;

  -- 6. Kembalikan stok jika pesanan yang sebelumnya 'paid' dibatalkan
  IF p_status = 'cancelled' AND v_prev_status IN ('paid', 'processing', 'shipped') THEN
    FOR v_item IN
      SELECT variant_id, quantity
      FROM order_items
      WHERE order_id = v_order_id AND variant_id IS NOT NULL
    LOOP
      UPDATE product_variants
      SET stock = stock + v_item.quantity
      WHERE id = v_item.variant_id;
    END LOOP;
  END IF;

  INSERT INTO order_notifications (order_id, event_type, channel, status)
  VALUES (v_order_id, 'payment_status_' || p_status::text, 'email', 'pending');

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_order_payment_status(text, order_status, text, text) TO anon, authenticated, service_role;
