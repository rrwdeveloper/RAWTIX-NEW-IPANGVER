import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  createDokuCheckoutPayment,
  checkDokuOrderStatus,
  calculateDokuExpiry,
  canAutomatedSyncTransition,
  type OrderStatus,
} from "./doku.functions";

function getAnonClient() {
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function getServiceClient() {
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const cartItemSchema = z.object({
  productId: z.string().min(1).max(100),
  variantId: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  size: z.string().min(1).max(50),
  price: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
  image: z.string().max(1000),
});

const orderInputSchema = z.object({
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(8).max(20).regex(/^[\d\s+\-()]+$/),
  customerName: z.string().trim().min(1).max(255),
  address: z.string().trim().min(1).max(1000),
  province: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  district: z.string().trim().max(100).optional().default(""),
  postalCode: z.string().trim().min(3).max(10).regex(/^[\d-]+$/),
  streetAddress: z.string().trim().max(500).optional().default(""),
  addressDetail: z.string().trim().max(500).optional().default(""),
  specialInstructions: z.string().max(1000).optional().default(""),
  shippingRateId: z.string().uuid().optional(),
  shippingMethodName: z.string().max(100).optional().default(""),
  shippingCost: z.number().int().min(0).optional().default(0),
  items: z.array(cartItemSchema).min(1).max(50),
});

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RX-${ts}${rand}`;
}

interface GuestOrderResult {
  order_number?: string;
  id?: string;
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderInputSchema.parse(input))
  .handler(async ({ data }) => {
    const client = getAnonClient();
    const orderNumber = generateOrderNumber();
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const shippingCost = data.shippingCost ?? 0;
    const total = subtotal + shippingCost;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const dokuClientId = process.env.DOKU_CLIENT_ID;
    if (!dokuClientId) {
      console.error("[DOKU] DOKU_CLIENT_ID is not configured");
      throw new Error("Layanan pembayaran sedang tidak tersedia. Silakan coba lagi nanti.");
    }

    const dokuItems = data.items.map((item) => ({
      name: item.name.slice(0, 50),
      price: item.price,
      quantity: item.quantity,
    })).concat([{
      name: `Ongkir - ${(data.shippingMethodName || "Reguler").slice(0, 40)}`,
      price: shippingCost,
      quantity: 1,
    }]);

    const dokuResult = await createDokuCheckoutPayment({
      orderNumber,
      amount: total,
      customerName: data.customerName,
      email: data.email,
      phone: data.phone,
      items: dokuItems,
    });

    if (!dokuResult.paymentUrl) {
      console.error("[DOKU] Checkout payment URL was not returned", dokuResult.rawResponse);
      throw new Error("Pembayaran tidak dapat diproses saat ini. Pesanan belum dibuat; silakan coba lagi atau hubungi WhatsApp RAWTIX.");
    }

    const itemsJsonb = data.items.map((item) => ({
      product_id: uuidRegex.test(item.productId) ? item.productId : null,
      variant_id: uuidRegex.test(item.variantId) ? item.variantId : null,
      product_name: item.name,
      size: item.size,
      price: item.price,
      quantity: item.quantity,
    }));

    const { data: result, error } = await client.rpc("create_guest_order" as never, {
      p_order_number: orderNumber,
      p_email: data.email,
      p_phone: data.phone,
      p_customer_name: data.customerName,
      p_address: data.address,
      p_city: data.city,
      p_province: data.province,
      p_district: data.district || "",
      p_postal_code: data.postalCode,
      p_street_address: data.streetAddress || "",
      p_address_detail: data.addressDetail || "",
      p_special_instructions: data.specialInstructions || "",
      p_shipping_method_name: data.shippingMethodName || "",
      p_subtotal: subtotal,
      p_shipping_cost: shippingCost,
      p_total: total,
      p_items: itemsJsonb,
    } as never);

    if (error) {
      console.error("Order creation error:", error);
      throw new Error("Gagal membuat pesanan. Silakan coba lagi.");
    }

    const orderResult = result as GuestOrderResult | null;

    // Stock is decremented only after payment is confirmed. Pending, failed,
    // expired, cancelled, or abandoned orders must never reduce inventory.

    if (service) {
      await service
        .from("orders")
        .update({
          payment_reference: dokuResult.paymentUrl,
          payment_method: "doku",
        })
        .eq("order_number", orderNumber);
    }

    return {
      orderNumber: orderResult?.order_number || orderNumber,
      orderId: orderResult?.id,
      total,
      snapToken: null,
      redirectUrl: dokuResult.paymentUrl,
    };
  });

const paymentProofSchema = z.object({
  orderNumber: z.string().min(1).max(50),
  proofUrl: z.string().url().max(2000),
});

export const submitPaymentProof = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => paymentProofSchema.parse(input))
  .handler(async ({ data }) => {
    const client = getAnonClient();

    const { data: success, error } = await client.rpc("submit_order_payment_proof" as never, {
      p_order_number: data.orderNumber,
      p_proof_url: data.proofUrl,
    } as never);

    if (error || !success) {
      console.error("Payment proof error:", error);
      throw new Error("Gagal menyimpan bukti pembayaran. Silakan coba lagi.");
    }

    return { success: true };
  });

const orderNumberSchema = z.object({
  orderNumber: z.string().min(1).max(50),
});

export interface DetailedOrderResult {
  id: string;
  order_number: string;
  customer_name: string;
  email: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  shipping_method_name: string;
  status: "pending" | "paid" | "cancelled";
  payment_type: string | null;
  va_numbers: Array<{ bank: string; va_number: string }> | null;
  bill_key: string | null;
  biller_code: string | null;
  permata_va_number: string | null;
  qr_string: string | null;
  expiry_time: string | null;
  snap_token: string | null;
  payment_proof_url: string | null;
  payment_proof_submitted_at: string | null;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    size: string;
    price: number;
    quantity: number;
  }>;
}

export const getOrderByNumber = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderNumberSchema.parse(input))
  .handler(async ({ data }): Promise<DetailedOrderResult | null> => {
    const client = getAnonClient();

    const { data: result, error } = await client.rpc("lookup_order" as never, {
      p_order_number: data.orderNumber,
    } as never);

    if (error || !result) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderData = result as any;

    const service = getServiceClient();
    if (service) {
        const { data: dbOrder } = await service
          .from("orders")
          .select("payment_reference, payment_proof_url, payment_method, status")
          .eq("order_number", data.orderNumber)
          .maybeSingle();

        // --- DOKU: payment_reference is the DOKU Checkout URL or payment_method is doku ---
        const isDokuPayment =
          dbOrder?.payment_method === "doku" ||
          (dbOrder?.payment_reference && dbOrder.payment_reference.includes("doku.com"));

        if (isDokuPayment) {
          const dokuPaymentUrl =
            dbOrder?.payment_reference && dbOrder.payment_reference.startsWith("http")
              ? dbOrder.payment_reference
              : null;

          let dbStatus = (dbOrder?.status || orderData.status || "pending") as "pending" | "paid" | "cancelled";
          const createdAt = orderData.created_at || new Date().toISOString();
          const expiryInfo = calculateDokuExpiry(createdAt, 60);

          let dokuTxStatus = dbStatus === "paid" ? "SUCCESS" : dbStatus === "cancelled" ? "EXPIRED" : "PENDING";
          let dokuChannel = "doku";

          // If pending, perform real-time verification and check expiry
          if (dbStatus === "pending") {
            const dokuResult = await checkDokuOrderStatus(data.orderNumber);

            if (dokuResult.transactionStatus !== "UNKNOWN") {
              dokuTxStatus = dokuResult.transactionStatus;
              if (dokuResult.paymentType) dokuChannel = dokuResult.paymentType;
            }

            if (dokuResult.effectiveStatus === "paid") {
              dbStatus = "paid";
            } else if (dokuResult.effectiveStatus === "cancelled") {
              dbStatus = "cancelled";
            } else if (expiryInfo.isExpired) {
              // Expiry fallback: payment due date (60 mins) has elapsed without confirmation
              dbStatus = "cancelled";
              dokuTxStatus = "EXPIRED";
            }

            // Sync with Supabase if status changed
            if (dbStatus !== dbOrder?.status) {
              let rpcSynced = false;
              try {
                const { error: rpcErr } = await client.rpc("sync_order_payment_status" as never, {
                  p_order_number: data.orderNumber,
                  p_status: dbStatus,
                  p_payment_method: dokuChannel,
                  p_snap_token: null,
                } as never);
                if (!rpcErr) rpcSynced = true;
              } catch {
                rpcSynced = false;
              }

              if (!rpcSynced && service) {
                await service
                  .from("orders")
                  .update({
                    status: dbStatus,
                    payment_method: dokuChannel,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("order_number", data.orderNumber);

                if (dbStatus === "paid" && dbOrder?.status === "pending") {
                  const { data: orderItems } = await service
                    .from("order_items")
                    .select("variant_id, quantity")
                    .eq("order_id", orderData.id);

                  for (const item of orderItems || []) {
                    if (!item.variant_id) continue;
                    const { data: variant } = await service
                      .from("product_variants")
                      .select("stock")
                      .eq("id", item.variant_id)
                      .single();
                    if (variant) {
                      await service
                        .from("product_variants")
                        .update({ stock: Math.max(0, variant.stock - item.quantity) })
                        .eq("id", item.variant_id);
                    }
                  }
                }

                if (dbStatus === "cancelled" && ["paid", "processing", "shipped"].includes(dbOrder?.status || "")) {
                  const { data: orderItems } = await service
                    .from("order_items")
                    .select("variant_id, quantity")
                    .eq("order_id", orderData.id);

                  for (const item of orderItems || []) {
                    if (!item.variant_id) continue;
                    const { data: variant } = await service
                      .from("product_variants")
                      .select("stock")
                      .eq("id", item.variant_id)
                      .single();
                    if (variant) {
                      await service
                        .from("product_variants")
                        .update({ stock: variant.stock + item.quantity })
                        .eq("id", item.variant_id);
                    }
                  }
                }
              }
            }
          }

          return {
            id: orderData.id,
            order_number: orderData.order_number,
            customer_name: orderData.customer_name,
            email: orderData.email,
            total: orderData.total,
            subtotal: orderData.subtotal,
            shipping_cost: orderData.shipping_cost,
            shipping_method_name: orderData.shipping_method_name,
            status: dbStatus,
            payment_type: dokuChannel,
            va_numbers: null,
            bill_key: null,
            biller_code: null,
            permata_va_number: null,
            qr_string: null,
            expiry_time: expiryInfo.expiryIso,
            snap_token: null,
            payment_proof_url: dokuPaymentUrl,
            payment_proof_submitted_at: orderData.payment_proof_submitted_at,
            created_at: orderData.created_at,
            items: orderData.items || [],
          };
        }
      }

    return {
      id: orderData.id,
      order_number: orderData.order_number,
      customer_name: orderData.customer_name,
      email: orderData.email,
      total: orderData.total,
      subtotal: orderData.subtotal,
      shipping_cost: orderData.shipping_cost,
      shipping_method_name: orderData.shipping_method_name,
      status: (orderData.status || "pending") as "pending" | "paid" | "cancelled",
      payment_type: orderData.payment_method || null,
      va_numbers: null,
      bill_key: null,
      biller_code: null,
      permata_va_number: null,
      qr_string: null,
      expiry_time: null,
      snap_token: null,
      payment_proof_url: orderData.payment_proof_url || null,
      payment_proof_submitted_at: orderData.payment_proof_submitted_at,
      created_at: orderData.created_at,
      items: orderData.items || [],
    };
  });


export const syncOrderPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderNumberSchema.parse(input))
  .handler(async ({ data }): Promise<DetailedOrderResult | null> => {
    return getOrderByNumber({ data: { orderNumber: data.orderNumber } });
  });


// --- Komerce / RajaOngkir API Functions ---

const searchQuerySchema = z.object({
  query: z.string().min(3).max(100),
});

interface ShippingRateItem {
  service: string;
  description: string;
  cost: number;
  etd: string;
}

export const searchDestination = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => searchQuerySchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.KOMERCE_API_KEY || "";
    try {
      const response = await fetch(`https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=${encodeURIComponent(data.query)}`, {
        headers: { "key": apiKey }
      });
      const result = await response.json();
      return result?.data || [];
    } catch (e) {
      console.error("Search destination error:", e);
      return [];
    }
  });

const rateQuerySchema = z.object({
  destinationId: z.number(),
  weight: z.number().positive(),
});

export const getShippingRates = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => rateQuerySchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.KOMERCE_API_KEY || "";
    try {
      const formData = new URLSearchParams();
      formData.append("origin", "17567"); // 17567 = Pejaten Barat (Jakarta Selatan)
      formData.append("destination", data.destinationId.toString());
      formData.append("weight", Math.max(1000, data.weight).toString());
      formData.append("courier", "jne");

      const response = await fetch(`https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost`, {
        method: "POST",
        headers: { 
          "key": apiKey,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      });
      const result = await response.json();
      const allRates: ShippingRateItem[] = result?.data || [];
      
      const standardRates = allRates.filter((r) => !r.service.startsWith('JTR'));
      return standardRates.sort((a,b) => a.cost - b.cost);
    } catch (e) {
      console.error("Get rates error:", e);
      return [];
    }
  });

const lookupOrdersQuerySchema = z.object({
  query: z.string().trim().min(3).max(255),
});

export interface GuestLookupItem {
  id: string;
  order_number: string;
  customer_name: string;
  email: string;
  total: number;
  subtotal?: number;
  shipping_cost?: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  snap_token?: string | null;
  items: Array<{
    id?: string;
    product_name: string;
    size: string;
    price?: number;
    quantity: number;
  }>;
}

export const lookupGuestOrders = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => lookupOrdersQuerySchema.parse(input))
  .handler(async ({ data }): Promise<GuestLookupItem[]> => {
    const rawQuery = data.query.trim();

    // 1. Jika query adalah email (mengandung @)
    if (rawQuery.includes("@")) {
      const client = getAnonClient();
      try {
        const { data: rpcData, error } = await client.rpc("lookup_orders_by_email" as never, {
          p_email: rawQuery.toLowerCase(),
        } as never);
        const resultList = rpcData as unknown as GuestLookupItem[] | null;
        if (!error && Array.isArray(resultList) && resultList.length > 0) {
          return resultList;
        }
      } catch {
        // Fallback ke service client
      }

      const service = getServiceClient();
      if (service) {
        const { data: ordersData } = await service
          .from("orders")
          .select(`
            id,
            order_number,
            customer_name,
            email,
            total,
            subtotal,
            shipping_cost,
            status,
            payment_proof_url,
            created_at,
            order_items (
              id,
              product_name,
              size,
              price,
              quantity
            )
          `)
          .ilike("email", rawQuery)
          .order("created_at", { ascending: false })
          .limit(20);

        if (ordersData && ordersData.length > 0) {
          return ordersData.map((o) => {
            return {
              id: o.id,
              order_number: o.order_number,
              customer_name: o.customer_name,
              email: o.email,
              total: o.total,
              subtotal: o.subtotal,
              shipping_cost: o.shipping_cost,
              status: o.status as "pending" | "paid" | "cancelled",
              created_at: o.created_at,
              snap_token: null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              items: (o.order_items || []) as any,
            };
          });
        }
      }
      return [];
    }

    // 2. Jika query adalah nomor pesanan (misal: RX-..., atau string tanpa RX-)
    const candidates = [rawQuery.toUpperCase()];
    if (!rawQuery.toUpperCase().startsWith("RX-")) {
      candidates.push(`RX-${rawQuery.toUpperCase()}`);
    }

    for (const orderNum of candidates) {
      try {
        const order = await getOrderByNumber({ data: { orderNumber: orderNum } });
        if (order) {
          return [
            {
              id: order.id,
              order_number: order.order_number,
              customer_name: order.customer_name,
              email: order.email,
              total: order.total,
              subtotal: order.subtotal,
              shipping_cost: order.shipping_cost,
              status: order.status,
              created_at: order.created_at,
              snap_token: order.snap_token,
              items: order.items,
            },
          ];
        }
      } catch {
        // continue
      }
    }

    return [];
  });
