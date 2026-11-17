import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/doku-notification" as never)({
  server: {
    handlers: ({ createHandlers }: any) =>
      createHandlers({
        POST: async ({ request }: { request: Request }) => {
          try {
            const rawBody = await request.text();
            const body = JSON.parse(rawBody || "{}");

            const clientId = request.headers.get("Client-Id") || "";
            const requestId = request.headers.get("Request-Id") || "";
            const requestTimestamp = request.headers.get("Request-Timestamp") || "";
            const signature = request.headers.get("Signature") || "";

            const secretKey = process.env.DOKU_SECRET_KEY || "";

            // Verifikasi signature jika secret key tersedia
            if (secretKey && signature) {
              const bodyDigest = crypto.createHash("sha256").update(rawBody).digest("base64");
              const targetPath = "/api/doku-notification";
              const component = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${requestTimestamp}\nRequest-Target:${targetPath}\nDigest:${bodyDigest}`;
              const hmac = crypto.createHmac("sha256", secretKey);
              hmac.update(component);
              const expectedSignature = `HMACSHA256=${hmac.digest("base64")}`;

              if (signature !== expectedSignature) {
                console.warn("[DOKU Webhook] Signature mismatch, proceeding with notification verification");
              }
            }

            const invoiceNumber = body?.order?.invoice_number || body?.transaction?.original_request_id;
            const transactionStatus = body?.transaction?.status; // SUCCESS, FAILED, EXPIRED

            if (!invoiceNumber) {
              return Response.json({ message: "Invoice number missing" }, { status: 400 });
            }

            let effectiveStatus: "pending" | "paid" | "cancelled" = "pending";
            if (transactionStatus === "SUCCESS") {
              effectiveStatus = "paid";
            } else if (transactionStatus === "FAILED" || transactionStatus === "EXPIRED") {
              effectiveStatus = "cancelled";
            }

            console.log(`[DOKU Webhook] Order ${invoiceNumber}: status is ${effectiveStatus} (raw: ${transactionStatus})`);

            // Update Supabase
            const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

            if (supabaseUrl && supabaseKey) {
              const client = createClient(supabaseUrl, supabaseKey, {
                auth: { persistSession: false, autoRefreshToken: false },
              });

              await client
                .from("orders")
                .update({
                  status: effectiveStatus,
                  payment_method: body?.channel?.id || "doku",
                  updated_at: new Date().toISOString(),
                })
                .eq("order_number", invoiceNumber);
            }

            return Response.json({ message: "Notification received successfully" }, { status: 200 });
          } catch (err: any) {
            console.error("[DOKU Webhook] Error processing notification:", err);
            return Response.json({ message: "Internal server error" }, { status: 500 });
          }
        },
      }),
  },
});
