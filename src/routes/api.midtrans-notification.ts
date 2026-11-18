import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { canAutomatedSyncTransition, type OrderStatus } from "@/utils/doku.functions";

export const Route = createFileRoute("/api/midtrans-notification")({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        POST: async ({ request }: { request: Request }) => {
          try {
            let rawBody = "";
            let body: {
              order_id?: string;
              status_code?: string;
              gross_amount?: string;
              signature_key?: string;
              transaction_status?: string;
              fraud_status?: string;
              payment_type?: string;
            } = {};

            try {
              rawBody = await request.text();
              body = JSON.parse(rawBody || "{}");
            } catch {
              return Response.json({ message: "Malformed JSON payload" }, { status: 400 });
            }

            const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
            if (!serverKey) {
              console.error("[Midtrans Webhook] MIDTRANS_SERVER_KEY is not configured");
              return Response.json({ message: "Webhook server key is not configured" }, { status: 503 });
            }

            if (!body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) {
              return Response.json({ message: "Missing required parameters" }, { status: 400 });
            }

            const hash = crypto
              .createHash("sha512")
              .update((body.order_id || "") + (body.status_code || "") + (body.gross_amount || "") + serverKey)
              .digest("hex");

            const sigBuf = Buffer.from(body.signature_key);
            const expBuf = Buffer.from(hash);
            if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
              console.warn(`[Midtrans Webhook] Invalid signature for order ${body.order_id}`);
              return Response.json({ message: "Invalid signature" }, { status: 401 });
            }

            const txStatus = body.transaction_status || "pending";
            const fraudStatus = body.fraud_status;
            let effectiveStatus: "pending" | "paid" | "cancelled" = "pending";

            if (txStatus === "settlement" || (txStatus === "capture" && fraudStatus === "accept")) {
              effectiveStatus = "paid";
            } else if (["deny", "cancel", "expire", "failure"].includes(txStatus)) {
              effectiveStatus = "cancelled";
            } else if (txStatus === "pending") {
              effectiveStatus = "pending";
            }

            console.log(
              `[Midtrans Webhook] Order ${body.order_id}: mapped to ${effectiveStatus} (raw: ${txStatus})`
            );

            // Connect to Supabase using service role key
            const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !supabaseKey) {
              console.error("[Midtrans Webhook] Supabase service role credentials not configured");
              return Response.json({ message: "Server configuration error" }, { status: 503 });
            }

            const client = createClient(supabaseUrl, supabaseKey, {
              auth: { persistSession: false, autoRefreshToken: false },
            });

            // Fetch target order from database
            const { data: order, error: fetchErr } = await client
              .from("orders")
              .select("id, order_number, status, total, payment_method")
              .eq("order_number", body.order_id)
              .maybeSingle();

            if (fetchErr) {
              console.error("[Midtrans Webhook] Database query error:", fetchErr);
              return Response.json({ message: "Database query error" }, { status: 502 });
            }

            if (!order) {
              console.warn(`[Midtrans Webhook] Order ${body.order_id} not found in database`);
              return Response.json({ message: "Order not found" }, { status: 404 });
            }

            // Amount validation to prevent payment tampering
            const payloadAmount = Math.round(Number(body.gross_amount));
            const orderTotal = Math.round(Number(order.total));
            if (isNaN(payloadAmount) || payloadAmount !== orderTotal) {
              console.warn(
                `[Midtrans Webhook] Gross amount mismatch: payload=${payloadAmount}, orderTotal=${orderTotal}`
              );
              return Response.json({ message: "Gross amount mismatch" }, { status: 422 });
            }

            const currentStatus = order.status as OrderStatus;

            // Idempotent check
            if (currentStatus === effectiveStatus) {
              return Response.json(
                {
                  status: "OK",
                  message: "Order status already up to date",
                  order_id: body.order_id,
                  transaction_status: body.transaction_status,
                  effective_status: effectiveStatus,
                },
                { status: 200 }
              );
            }

            // Terminal state protection
            if (!canAutomatedSyncTransition(currentStatus, effectiveStatus)) {
              console.warn(
                `[Midtrans Webhook] Prevented illegal downgrade: #${body.order_id} is currently '${currentStatus}', ignoring incoming '${effectiveStatus}'`
              );
              return Response.json(
                {
                  status: "OK",
                  message: `Notification acknowledged; order is already '${currentStatus}'`,
                  order_id: body.order_id,
                  transaction_status: body.transaction_status,
                  effective_status: currentStatus,
                },
                { status: 200 }
              );
            }

            // Atomic sync via RPC
            let rpcSuccess = false;
            try {
              const { error: rpcErr } = await client.rpc("sync_order_payment_status" as never, {
                p_order_number: body.order_id,
                p_status: effectiveStatus,
                p_payment_method: body.payment_type || "midtrans",
                p_snap_token: null,
              } as never);
              if (!rpcErr) rpcSuccess = true;
            } catch {
              rpcSuccess = false;
            }

            // Service role fallback if RPC is unavailable
            if (!rpcSuccess) {
              const { error: updateErr } = await client
                .from("orders")
                .update({
                  status: effectiveStatus,
                  payment_method: body.payment_type || "midtrans",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", order.id);

              if (updateErr) {
                console.error("[Midtrans Webhook] Failed to update order status:", updateErr);
                return Response.json({ message: "Failed to update order status" }, { status: 502 });
              }

              // Decrement stock only when transitioning from pending to paid
              if (effectiveStatus === "paid" && currentStatus === "pending") {
                const { data: orderItems } = await client
                  .from("order_items")
                  .select("variant_id, quantity")
                  .eq("order_id", order.id);

                if (orderItems) {
                  for (const item of orderItems) {
                    if (!item.variant_id) continue;
                    const { data: variant } = await client
                      .from("product_variants")
                      .select("stock")
                      .eq("id", item.variant_id)
                      .single();

                    if (variant) {
                      const newStock = Math.max(0, variant.stock - item.quantity);
                      await client
                        .from("product_variants")
                        .update({ stock: newStock })
                        .eq("id", item.variant_id);
                    }
                  }
                }
              }

              // Restore stock when cancelling an order that was previously paid, processing, or shipped
              if (
                effectiveStatus === "cancelled" &&
                ["paid", "processing", "shipped"].includes(currentStatus)
              ) {
                const { data: orderItems } = await client
                  .from("order_items")
                  .select("variant_id, quantity")
                  .eq("order_id", order.id);

                if (orderItems) {
                  for (const item of orderItems) {
                    if (!item.variant_id) continue;
                    const { data: variant } = await client
                      .from("product_variants")
                      .select("stock")
                      .eq("id", item.variant_id)
                      .single();

                    if (variant) {
                      await client
                        .from("product_variants")
                        .update({ stock: variant.stock + item.quantity })
                        .eq("id", item.variant_id);
                    }
                  }
                }
              }

              // Record notification event
              try {
                await client.from("order_notifications").insert({
                  order_id: order.id,
                  event_type: `payment_status_${effectiveStatus}`,
                  channel: "email",
                  status: "pending",
                });
              } catch {
                // Ignore notification insert failure
              }
            }

            return Response.json(
              {
                status: "OK",
                order_id: body.order_id,
                transaction_status: body.transaction_status,
                effective_status: effectiveStatus,
              },
              { status: 200 }
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error processing webhook";
            console.error("[Midtrans Webhook] Error:", err);
            return Response.json({ error: msg }, { status: 500 });
          }
        },
      }),
  },
});
