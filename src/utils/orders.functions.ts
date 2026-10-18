import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
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

export interface MidtransStatusResult {
  statusCode: string;
  transactionStatus: string; // 'pending' | 'settlement' | 'capture' | 'deny' | 'cancel' | 'expire' | 'failure' | 'not_selected' | 'error'
  effectiveStatus: "pending" | "paid" | "cancelled";
  statusMessage?: string;
  paymentType?: string;
  grossAmount?: string;
  vaNumbers?: Array<{ bank: string; va_number: string }>;
  billKey?: string;
  billerCode?: string;
  permataVaNumber?: string;
  qrString?: string;
  expiryTime?: string;
  transactionTime?: string;
}

export async function checkMidtransStatusDirect(orderNumber: string): Promise<MidtransStatusResult> {
  const midtransServerKey = process.env.MIDTRANS_SERVER_KEY;
  if (!midtransServerKey) {
    return {
      statusCode: "500",
      transactionStatus: "error",
      effectiveStatus: "pending",
      statusMessage: "Midtrans Server Key tidak ditemukan di environment.",
    };
  }

  try {
    const authHeader = `Basic ${Buffer.from(midtransServerKey + ":").toString("base64")}`;
    const res = await fetch(`https://api.sandbox.midtrans.com/v2/${orderNumber}/status`, {
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
    });

    if (res.status === 404) {
      // User opened Snap, but closed before selecting payment method
      return {
        statusCode: "404",
        transactionStatus: "not_selected",
        effectiveStatus: "pending",
        statusMessage: "Menunggu pemilihan metode pembayaran di Midtrans",
      };
    }

    const data = (await res.json()) as {
      status_code?: string;
      transaction_status?: string;
      fraud_status?: string;
      status_message?: string;
      payment_type?: string;
      gross_amount?: string;
      va_numbers?: Array<{ bank: string; va_number: string }>;
      bill_key?: string;
      biller_code?: string;
      permata_va_number?: string;
      qr_string?: string;
      expiry_time?: string;
      transaction_time?: string;
    };

    const txStatus = data.transaction_status || "pending";
    const fraudStatus = data.fraud_status;

    let effectiveStatus: "pending" | "paid" | "cancelled" = "pending";
    if (txStatus === "settlement" || (txStatus === "capture" && fraudStatus === "accept")) {
      effectiveStatus = "paid";
    } else if (["deny", "cancel", "expire", "failure"].includes(txStatus)) {
      effectiveStatus = "cancelled";
    } else if (txStatus === "pending") {
      effectiveStatus = "pending";
    }

    return {
      statusCode: data.status_code || res.status.toString(),
      transactionStatus: txStatus,
      effectiveStatus,
      statusMessage: data.status_message,
      paymentType: data.payment_type,
      grossAmount: data.gross_amount,
      vaNumbers: data.va_numbers,
      billKey: data.bill_key,
      billerCode: data.biller_code,
      permataVaNumber: data.permata_va_number,
      qrString: data.qr_string,
      expiryTime: data.expiry_time,
      transactionTime: data.transaction_time,
    };
  } catch (err) {
    console.error("Midtrans API call failed:", err);
    return {
      statusCode: "500",
      transactionStatus: "error",
      effectiveStatus: "pending",
      statusMessage: "Gagal menghubungi API Midtrans",
    };
  }
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

    const itemsJsonb = data.items.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId,
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

    // --- Request Midtrans Snap Token ---
    let snapToken = null;
    let redirectUrl = null;
    const midtransServerKey = process.env.MIDTRANS_SERVER_KEY;
    
    if (midtransServerKey) {
      try {
        const authHeader = `Basic ${Buffer.from(midtransServerKey + ':').toString('base64')}`;
        const midtransResponse = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            transaction_details: {
              order_id: orderNumber,
              gross_amount: total
            },
            customer_details: {
              first_name: data.customerName,
              email: data.email,
              phone: data.phone
            },
            item_details: data.items.map(item => ({
              id: item.productId,
              price: item.price,
              quantity: item.quantity,
              name: item.name.slice(0, 50)
            })).concat([{
              id: 'shipping',
              price: shippingCost,
              quantity: 1,
              name: `Ongkir - ${(data.shippingMethodName || 'Reguler').slice(0, 40)}`
            }])
          })
        });
        
        const midtransData = (await midtransResponse.json()) as { token?: string; redirect_url?: string };
        if (midtransData && midtransData.token) {
          snapToken = midtransData.token;
          redirectUrl = midtransData.redirect_url;

          // Simpan snap token agar bisa dilanjutkan jika popup ter-close
          try {
            await client.rpc("submit_order_payment_proof" as never, {
              p_order_number: orderNumber,
              p_proof_url: `midtrans_snap:${snapToken}`,
            } as never);
          } catch (e) {
            console.warn("Gagal menyimpan snap token via RPC:", e);
          }

          const service = getServiceClient();
          if (service) {
            try {
              await service
                .from("orders")
                .update({
                  payment_proof_url: `midtrans_snap:${snapToken}`,
                  payment_reference: snapToken,
                })
                .eq("order_number", orderNumber);
            } catch (err) {
              console.warn("Fallback service update token failed:", err);
            }
          }
        } else {
          console.error("Midtrans Snap API error:", midtransData);
        }
      } catch (err) {
        console.error("Midtrans fetch error:", err);
      }
    }

    return {
      orderNumber: orderResult?.order_number || orderNumber,
      orderId: orderResult?.id,
      total,
      snapToken,
      redirectUrl
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
  midtrans_status: string;
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

    // Ekstrak snap token jika disimpan di payment_proof_url
    let snapToken: string | null = null;
    let actualProofUrl: string | null = orderData.payment_proof_url;
    if (orderData.payment_proof_url && orderData.payment_proof_url.startsWith("midtrans_snap:")) {
      snapToken = orderData.payment_proof_url.replace("midtrans_snap:", "");
      actualProofUrl = null;
    }

    if (!snapToken) {
      const service = getServiceClient();
      if (service) {
        const { data: dbOrder } = await service
          .from("orders")
          .select("payment_reference, payment_proof_url")
          .eq("order_number", data.orderNumber)
          .maybeSingle();
        if (dbOrder?.payment_reference && !dbOrder.payment_reference.startsWith("http")) {
          snapToken = dbOrder.payment_reference;
        } else if (dbOrder?.payment_proof_url && dbOrder.payment_proof_url.startsWith("midtrans_snap:")) {
          snapToken = dbOrder.payment_proof_url.replace("midtrans_snap:", "");
          actualProofUrl = null;
        }
      }
    }

    // Cek status real-time langsung ke Midtrans Sandbox API
    const midtransResult = await checkMidtransStatusDirect(data.orderNumber);

    // Jika Midtrans mengembalikan status konfirmasi (paid atau cancelled), coba sinkronkan ke DB jika RPC tersedia
    if (midtransResult.effectiveStatus !== "pending" || midtransResult.transactionStatus !== "not_selected") {
      try {
        const { error } = await client.rpc("sync_order_payment_status" as never, {
          p_order_number: data.orderNumber,
          p_status: midtransResult.effectiveStatus,
          p_payment_method: midtransResult.paymentType || "midtrans",
          p_snap_token: snapToken,
        } as never);
        if (error) throw error;
      } catch {
        // Fallback langsung menggunakan serviceClient jika RPC belum di-run di Supabase
        const service = getServiceClient();
        if (service) {
          await service
            .from("orders")
            .update({
              status: midtransResult.effectiveStatus,
              payment_method: midtransResult.paymentType || "midtrans",
              updated_at: new Date().toISOString(),
            })
            .eq("order_number", data.orderNumber);
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
      status: midtransResult.effectiveStatus,
      midtrans_status: midtransResult.transactionStatus,
      payment_type: midtransResult.paymentType || orderData.payment_method || null,
      va_numbers: midtransResult.vaNumbers || null,
      bill_key: midtransResult.billKey || null,
      biller_code: midtransResult.billerCode || null,
      permata_va_number: midtransResult.permataVaNumber || null,
      qr_string: midtransResult.qrString || null,
      expiry_time: midtransResult.expiryTime || null,
      snap_token: snapToken,
      payment_proof_url: actualProofUrl,
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

const saveSnapTokenSchema = z.object({
  orderNumber: z.string().min(1).max(50),
  snapToken: z.string().min(1).max(200),
});

export const saveSnapToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveSnapTokenSchema.parse(input))
  .handler(async ({ data }) => {
    const client = getAnonClient();
    try {
      await client.rpc("submit_order_payment_proof" as never, {
        p_order_number: data.orderNumber,
        p_proof_url: `midtrans_snap:${data.snapToken}`,
      } as never);
      return { success: true };
    } catch (e) {
      console.warn("Gagal menyimpan snap token:", e);
      return { success: false };
    }
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
  midtrans_status?: string;
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
            let snapToken: string | null = null;
            if (o.payment_proof_url && o.payment_proof_url.startsWith("midtrans_snap:")) {
              snapToken = o.payment_proof_url.replace("midtrans_snap:", "");
            }
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
              snap_token: snapToken,
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
              midtrans_status: order.midtrans_status,
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
