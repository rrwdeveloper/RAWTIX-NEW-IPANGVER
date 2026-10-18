import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/midtrans-notification")({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        POST: async ({ request }) => {
          try {
            const body = (await request.json()) as {
              order_id?: string;
              status_code?: string;
              gross_amount?: string;
              signature_key?: string;
              transaction_status?: string;
              fraud_status?: string;
              payment_type?: string;
            };

            const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
            if (!serverKey || !body.order_id || !body.signature_key) {
              return Response.json({ message: "Missing required parameters" }, { status: 400 });
            }

            const hash = crypto
              .createHash("sha512")
              .update((body.order_id || "") + (body.status_code || "") + (body.gross_amount || "") + serverKey)
              .digest("hex");

            if (hash !== body.signature_key) {
              console.warn(`[Midtrans Webhook] Invalid signature for order ${body.order_id}`);
              return Response.json({ message: "Invalid signature" }, { status: 403 });
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

            console.log(`[Midtrans Webhook] Order ${body.order_id}: status is ${effectiveStatus} (raw: ${txStatus})`);

            // Sync with Supabase via RPC
            const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

            if (supabaseUrl && supabaseKey) {
              try {
                const client = createClient(supabaseUrl, supabaseKey, {
                  auth: { persistSession: false, autoRefreshToken: false },
                });
                const { error } = await client.rpc("sync_order_payment_status" as never, {
                  p_order_number: body.order_id,
                  p_status: effectiveStatus,
                  p_payment_method: body.payment_type || "midtrans",
                  p_snap_token: null,
                } as never);
                if (error) throw error;
              } catch (e) {
                console.warn("[Midtrans Webhook] RPC failed, trying service_role fallback:", e);
                const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                if (serviceKey) {
                  const serviceClient = createClient(supabaseUrl, serviceKey, {
                    auth: { persistSession: false, autoRefreshToken: false },
                  });
                  await serviceClient
                    .from("orders")
                    .update({
                      status: effectiveStatus,
                      payment_method: body.payment_type || "midtrans",
                      updated_at: new Date().toISOString(),
                    })
                    .eq("order_number", body.order_id);
                }
              }
            }

            return Response.json({
              status: "OK",
              order_id: body.order_id,
              transaction_status: body.transaction_status,
              effective_status: effectiveStatus,
            });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error processing webhook";
            console.error("[Midtrans Webhook] Error:", err);
            return Response.json({ error: msg }, { status: 400 });
          }
        },
      }),
  },
});
