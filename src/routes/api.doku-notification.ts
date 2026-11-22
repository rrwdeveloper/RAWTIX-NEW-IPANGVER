import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { mapDokuStatus, canAutomatedSyncTransition, type OrderStatus } from "@/utils/doku.functions";

export const Route = createFileRoute("/api/doku-notification" as never)({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        POST: async ({ request }: { request: Request }) => {
          try {
            let rawBody = "";
            let body: {
              order?: { invoice_number?: string; status?: string };
              transaction?: { original_request_id?: string; status?: string };
              channel?: { id?: string };
            } = {};

            try {
              rawBody = await request.text();
              body = JSON.parse(rawBody || "{}");
            } catch {
              return Response.json({ message: "Malformed JSON payload" }, { status: 400 });
            }

            const clientId = request.headers.get("Client-Id") || "";
            const requestId = request.headers.get("Request-Id") || "";
            const requestTimestamp = request.headers.get("Request-Timestamp") || "";
            const signature = request.headers.get("Signature") || "";

            const secretKey = process.env.DOKU_SECRET_KEY || "";
            if (!secretKey) {
              console.error("[DOKU Webhook] DOKU_SECRET_KEY is not configured");
              return Response.json({ message: "Webhook secret key is not configured" }, { status: 503 });
            }

            if (!signature) {
              console.warn("[DOKU Webhook] Missing Signature header");
              return Response.json({ message: "Missing signature header" }, { status: 401 });
            }

            if (!requestId) {
              return Response.json({ message: "Missing Request-Id header" }, { status: 400 });
            }

            const bodyDigest = crypto.createHash("sha256").update(rawBody).digest("base64");
            const targetPath = "/api/doku-notification";
            const component = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${requestTimestamp}\nRequest-Target:${targetPath}\nDigest:${bodyDigest}`;
            const hmac = crypto.createHmac("sha256", secretKey);
            hmac.update(component);
            const expectedSignature = `HMACSHA256=${hmac.digest("base64")}`;

            const sigBuf = Buffer.from(signature);
            const expBuf = Buffer.from(expectedSignature);
            if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
              console.warn(`[DOKU Webhook] Signature mismatch for order ${body?.order?.invoice_number || ""}`);
              return Response.json({ message: "Invalid signature" }, { status: 401 });
            }

            const invoiceNumber = body?.order?.invoice_number || body?.transaction?.original_request_id;
            if (!invoiceNumber) {
              return Response.json({ message: "Invoice number missing" }, { status: 400 });
            }

            // 2. Map DOKU status to internal status
            const mapping = mapDokuStatus({
              transactionStatus: body?.transaction?.status,
              orderStatus: body?.order?.status,
            });
            const effectiveStatus = mapping.effectiveStatus;
            const channelId = body?.channel?.id || "doku";

            console.log(
              `[DOKU Webhook] Order ${invoiceNumber}: mapped to ${effectiveStatus} (raw tx: ${body?.transaction?.status}, ord: ${body?.order?.status})`
            );

            // 3. Connect to Supabase
            const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !supabaseKey) {
              console.error("[DOKU Webhook] Supabase service role credentials not configured");
              return Response.json({ message: "Server configuration error" }, { status: 503 });
            }

            const client = createClient(supabaseUrl, supabaseKey, {
              auth: { persistSession: false, autoRefreshToken: false },
            });

            // 4. Retrieve existing order
            const { data: order, error: fetchErr } = await client
              .from("orders")
              .select("id, order_number, status, payment_method")
              .eq("order_number", invoiceNumber)
              .maybeSingle();

            if (fetchErr) {
              console.error("[DOKU Webhook] Database query error:", fetchErr);
              return Response.json({ message: "Database query error" }, { status: 502 });
            }

            if (!order) {
              console.warn(`[DOKU Webhook] Order ${invoiceNumber} not found in database`);
              return Response.json({ message: "Order not found" }, { status: 404 });
            }

            const currentStatus = order.status as OrderStatus;

            // 5. Idempotent check
            if (currentStatus === effectiveStatus) {
              return Response.json(
                {
                  message: "Order status already up to date",
                  orderNumber: invoiceNumber,
                  status: effectiveStatus,
                },
                { status: 200 }
              );
            }

            // 6. Terminal state protection: prevent overwriting paid/processing/shipped/delivered with cancelled/pending
            if (!canAutomatedSyncTransition(currentStatus, effectiveStatus)) {
              console.warn(
                `[DOKU Webhook] Prevented illegal downgrade: #${invoiceNumber} is currently '${currentStatus}', ignoring incoming '${effectiveStatus}'`
              );
              return Response.json(
                {
                  message: `Notification acknowledged; order is already '${currentStatus}'`,
                  orderNumber: invoiceNumber,
                  status: currentStatus,
                },
                { status: 200 }
              );
            }

            // 7. Try RPC first for atomic sync
            let rpcSuccess = false;
            try {
              const { error: rpcErr } = await client.rpc("sync_order_payment_status" as never, {
                p_order_number: invoiceNumber,
                p_status: effectiveStatus,
                p_payment_method: channelId,
                p_snap_token: null,
              } as never);
              if (!rpcErr) rpcSuccess = true;
            } catch {
              rpcSuccess = false;
            }

            // 8. Service role fallback with explicit stock management if RPC wasn't available
            if (!rpcSuccess) {
              await client
                .from("orders")
                .update({
                  status: effectiveStatus,
                  payment_method: channelId,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", order.id);

              if (effectiveStatus === "paid" && currentStatus === "pending") {
                const { data: orderItems } = await client
                  .from("order_items")
                  .select("variant_id, quantity")
                  .eq("order_id", order.id);

                for (const item of orderItems || []) {
                  if (!item.variant_id) continue;
                  const { data: variant } = await client
                    .from("product_variants")
                    .select("stock")
                    .eq("id", item.variant_id)
                    .single();
                  if (variant) {
                    await client
                      .from("product_variants")
                      .update({ stock: Math.max(0, variant.stock - item.quantity) })
                      .eq("id", item.variant_id);
                  }
                }
              }

              if (effectiveStatus === "cancelled" && ["paid", "processing", "shipped"].includes(currentStatus)) {
                const { data: orderItems } = await client
                  .from("order_items")
                  .select("variant_id, quantity")
                  .eq("order_id", order.id);

                for (const item of orderItems || []) {
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

              // Record notification event
              try {
                await client.from("order_notifications").insert({
                  order_id: order.id,
                  event_type: `payment_status_${effectiveStatus}`,
                  channel: "email",
                  status: "pending",
                });
              } catch {
                // Ignore notification insert failures
              }
            }

            return Response.json(
              {
                message: "Notification received and processed successfully",
                orderNumber: invoiceNumber,
                previousStatus: currentStatus,
                status: effectiveStatus,
              },
              { status: 200 }
            );
          } catch (err: unknown) {
            console.error("[DOKU Webhook] Error processing notification:", err);
            return Response.json({ message: "Internal server error" }, { status: 500 });
          }
        },
      }),
  },
});
