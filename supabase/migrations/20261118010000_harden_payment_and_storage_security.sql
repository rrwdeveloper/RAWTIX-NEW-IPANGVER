-- =============================================================================
-- RAWTIX — Hardening Payment Status RPC, Storage Security & Proof Submission
-- Migration: 20261118010000_harden_payment_and_storage_security.sql
-- =============================================================================

-- 1. Hardened sync_order_payment_status function
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
  -- Once an order is paid or in fulfillment ('paid', 'processing', 'shipped', 'delivered'),
  -- automated gateway sync / late webhooks MUST NOT downgrade or cancel the order.
  IF v_prev_status IN ('paid', 'processing', 'shipped', 'delivered') AND p_status IN ('pending', 'cancelled') THEN
    RETURN true; -- Acknowledge idempotently without corrupting fulfilled state
  END IF;

  -- 2. Prevent reviving cancelled orders back to pending via late callback
  IF v_prev_status = 'cancelled' AND p_status = 'pending' THEN
    RETURN true;
  END IF;

  -- 3. Idempotent check: if status is already identical, simply update reference fields if present
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

  -- 5. Decrement stock ONLY when moving strictly from 'pending' to 'paid'
  IF p_status = 'paid' AND v_prev_status = 'pending' THEN
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

  -- 6. Restore stock when a previously paid/processing/shipped order is cancelled
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

-- Revoke execute from public/anon/authenticated; only service_role backend can execute
REVOKE EXECUTE ON FUNCTION public.sync_order_payment_status(text, order_status, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_order_payment_status(text, order_status, text, text) TO service_role;

-- 2. Harden submit_order_payment_proof: only allow proof submission on pending orders
CREATE OR REPLACE FUNCTION public.submit_order_payment_proof(
  p_order_number text,
  p_proof_url    text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_status order_status;
BEGIN
  SELECT id, status INTO v_order_id, v_status
  FROM orders
  WHERE order_number = p_order_number;

  IF v_order_id IS NULL THEN
    RETURN false;
  END IF;

  -- Prevent overriding payment proof on non-pending orders (e.g., cancelled or paid)
  IF v_status != 'pending' THEN
    RETURN false;
  END IF;

  UPDATE orders
  SET payment_proof_url          = p_proof_url,
      payment_proof_submitted_at = now(),
      payment_method             = 'transfer_bca',
      updated_at                 = now()
  WHERE id = v_order_id;

  INSERT INTO order_notifications (order_id, event_type, channel, status)
  VALUES (v_order_id, 'payment_proof_submitted', 'email', 'pending');

  RETURN true;
END;
$$;

-- 3. Secure storage: payment-proofs bucket must NOT be public
UPDATE storage.buckets 
SET public = false 
WHERE id = 'payment-proofs';

DROP POLICY IF EXISTS "Payment proofs are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload payment proofs" ON storage.objects;

-- Allow authenticated staff (admin & owner) to view payment proofs
CREATE POLICY "Staff can view payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
    )
  );

-- Allow uploads to payment-proofs bucket
CREATE POLICY "Anyone can upload payment proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs');
