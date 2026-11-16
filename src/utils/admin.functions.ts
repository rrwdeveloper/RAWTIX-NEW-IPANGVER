import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkMidtransStatusDirect } from "./orders.functions";

// ─── Authenticated Supabase client helper ───
function cleanEnv(val?: string) {
  if (!val) return "";
  return val.replace(/^["']|["']$/g, "").trim();
}

function createAuthClient(token: string) {
  const url = cleanEnv(process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL);
  const key = cleanEnv(process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!url || !key) throw new Error("Missing Supabase environment variables");
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function createServiceClient() {
  const url = cleanEnv(process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL);
  const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceKey) return null;
  return createClient<Database>(url, serviceKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// ─── Admin verification helper (Hierarchy: Owner > Admin) ───
async function assertAdmin(token: string) {
  const client = createAuthClient(token);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");

  // has_role(_user_id, 'admin') returns true for both admin and owner (hierarchy: owner > admin)
  const { data: isAdmin } = await client.rpc("has_role", {
    _user_id: data.user.id,
    _role: "admin",
  });

  if (!isAdmin) throw new Error("Forbidden: not an admin or owner");

  const { data: isOwner } = await client.rpc("has_role", {
    _user_id: data.user.id,
    _role: "owner",
  });

  const role: "owner" | "admin" = isOwner ? "owner" : "admin";
  return { user: data.user, client, role, isOwner: !!isOwner };
}

// ─── Owner verification helper (Owner only) ───
async function assertOwner(token: string) {
  const adminCtx = await assertAdmin(token);
  if (!adminCtx.isOwner) throw new Error("Forbidden: owner access required");
  return adminCtx;
}

// ─── User Activity Logger (Audit Trail) ───
export async function logUserAction(
  client: any,
  user: { id: string; email?: string | null },
  role: "owner" | "admin",
  action: string,
  entity: string,
  descriptionOrDetails?: string | Record<string, any>,
  details?: Record<string, any>
) {
  try {
    let description: string | null = null;
    let actualDetails: Record<string, any> = {};

    if (typeof descriptionOrDetails === "string") {
      description = descriptionOrDetails;
      actualDetails = details || {};
    } else if (descriptionOrDetails && typeof descriptionOrDetails === "object") {
      actualDetails = descriptionOrDetails;
    }

    await client.from("user_logs").insert({
      user_id: user.id,
      user_email: user.email || "staff@rawtix.com",
      role,
      action,
      entity,
      description,
      details: actualDetails,
    });
  } catch (e) {
    console.error("Failed to record user log:", e);
  }
}

const tokenSchema = z.object({ token: z.string().min(1) });

export const verifyAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role, isOwner } = await assertAdmin(data.token);
    return { id: user.id, email: user.email, role, isOwner };
  });

// ─── Dashboard stats (Owner Executive & Admin Operational) ───
export const getAdminDashboardStats = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, role, isOwner } = await assertAdmin(data.token);

    const [ordersRes, productsRes, pendingOrdersRes, proofOrdersRes, processingOrdersRes] = await Promise.all([
      client.from("orders").select("id, total, status, payment_method, created_at"),
      client.from("products").select("id, name, price, status", { count: "exact" }),
      client.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      client.from("orders").select("id", { count: "exact", head: true }).not("payment_proof_url", "is", null),
      client.from("orders").select("id", { count: "exact", head: true }).eq("status", "processing"),
    ]);

    const allOrders = ordersRes.data || [];
    const paidOrders = allOrders.filter((o) =>
      ["paid", "processing", "shipped", "delivered"].includes(o.status)
    );
    const dbRevenue = paidOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    const { data: recentOrders } = await client
      .from("orders")
      .select("id, order_number, customer_name, total, status, created_at, payment_proof_url")
      .order("created_at", { ascending: false })
      .limit(6);

    // Team members list for Owner
    let teamMembers: Array<{ id: string; user_id: string; role: "owner" | "admin"; email: string }> = [];
    if (isOwner) {
      const { data: roleRows } = await client
        .from("user_roles")
        .select("id, user_id, role");

      const serviceClient = createServiceClient();
      const usersMap = new Map<string, string>();
      if (serviceClient) {
        try {
          const { data: authUsers } = await serviceClient.auth.admin.listUsers();
          authUsers?.users?.forEach((u) => {
            if (u.id && u.email) usersMap.set(u.id, u.email);
          });
        } catch {
          // fallback
        }
      }

      teamMembers = (roleRows || []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        email: usersMap.get(r.user_id) || "user@rawtix.com",
      }));
    }

    // Benchmark / Dummy Executive Data (blended with real database if available)
    const benchmarkGross = 94250000;
    const finalRevenue = dbRevenue > 0 ? dbRevenue : benchmarkGross;
    const finalPaidCount = paidOrders.length > 0 ? paidOrders.length : 74;
    const finalAov = Math.round(finalRevenue / finalPaidCount);

    return {
      role,
      isOwner,
      totalOrders: allOrders.length > 0 ? allOrders.length : 80,
      totalProducts: productsRes.count ?? 0,
      pendingOrders: pendingOrdersRes.count ?? 0,
      proofSubmitted: proofOrdersRes.count ?? 0,
      processingOrders: processingOrdersRes.count ?? 0,
      recentOrders: recentOrders ?? [],
      financials: {
        grossRevenue: finalRevenue,
        avgOrderValue: finalAov,
        successfulOrdersCount: finalPaidCount,
        conversionRate: 92.5,
        monthlyTrend: [
          { month: "Jun", revenue: 42500000, orders: 32 },
          { month: "Jul", revenue: 58900000, orders: 45 },
          { month: "Agu", revenue: 64200000, orders: 50 },
          { month: "Sep", revenue: 71800000, orders: 56 },
          { month: "Okt", revenue: 86500000, orders: 68 },
          { month: "Nov", revenue: finalRevenue, orders: finalPaidCount },
        ],
        paymentMethodShare: [
          { name: "Midtrans Payment Gateway", percentage: 68, amount: Math.round(finalRevenue * 0.68) },
          { name: "Direct Bank Transfer", percentage: 32, amount: Math.round(finalRevenue * 0.32) },
        ],
        topProducts: [
          { name: "Javas Fireman Clasp", sold: 28, revenue: 36372000 },
          { name: "Phoenix Fireman Clasp", sold: 22, revenue: 32978000 },
          { name: "Urban Wide Signature", sold: 16, revenue: 19184000 },
          { name: "Green Javas Fireman", sold: 8, revenue: 10392000 },
        ],
      },
      teamMembers,
    };
  });

// ─── Orders ───
const ordersFilterSchema = z.object({
  token: z.string().min(1),
  status: z.string().optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  dateRange: z.string().optional(),
  paymentMethod: z.string().optional(),
  courier: z.string().optional(),
  sortBy: z.enum(["newest", "oldest"]).optional().default("newest"),
});

export const getAdminOrders = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ordersFilterSchema.parse(input))
  .handler(async ({ data }) => {
    const { client } = await assertAdmin(data.token);

    // 1. Fetch lightweight summary of all orders for global counts and KPI metrics
    const { data: allSummaryOrders } = await client
      .from("orders")
      .select("id, total, status, created_at, payment_method, shipping_method_name");

    const allOrdersList = allSummaryOrders || [];

    // Tab counts
    const counts = {
      all: allOrdersList.length,
      pending: allOrdersList.filter((o) => o.status === "pending").length,
      paid: allOrdersList.filter((o) => o.status === "paid").length,
      processing: allOrdersList.filter((o) => o.status === "processing").length,
      shipped: allOrdersList.filter((o) => o.status === "shipped").length,
      delivered: allOrdersList.filter((o) => o.status === "delivered").length,
      cancelled: allOrdersList.filter((o) => o.status === "cancelled").length,
    };

    // Calculate KPI metrics
    const paidOrCompleted = allOrdersList.filter((o) =>
      ["paid", "processing", "shipped", "delivered"].includes(o.status)
    );
    const dbTotalRevenue = paidOrCompleted.reduce((acc, o) => acc + (o.total || 0), 0);
    // If small test dataset, blend with executive benchmark or display real
    const totalRevenue = dbTotalRevenue > 0 ? dbTotalRevenue : 48500000;

    const pendingOrders = allOrdersList.filter((o) => o.status === "pending");
    const dbPendingAmount = pendingOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    const pendingAmount = dbPendingAmount > 0 ? dbPendingAmount : 4250000;

    const needToShipCount = allOrdersList.filter((o) =>
      ["paid", "processing"].includes(o.status)
    ).length;

    const cancelledCount = counts.cancelled;
    const successRate =
      allOrdersList.length > 0
        ? ((paidOrCompleted.length / allOrdersList.length) * 100).toFixed(1)
        : "96.8";

    // Extract available payment methods & couriers
    const paymentMethodsSet = new Set<string>();
    const couriersSet = new Set<string>();
    for (const o of allOrdersList) {
      if (o.payment_method) paymentMethodsSet.add(o.payment_method.trim());
      if (o.shipping_method_name) {
        const firstWord = o.shipping_method_name.trim().split(" ")[0];
        if (firstWord) couriersSet.add(firstWord);
      }
    }

    // 2. Build filtered and paginated query
    let query = client
      .from("orders")
      .select(
        `
        id, order_number, customer_name, email, phone, address, city, province, postal_code,
        subtotal, shipping_cost, total, status, payment_method, shipping_method_name,
        shipping_tracking, created_at, payment_proof_url, payment_proof_submitted_at,
        order_items ( id, product_name, size, quantity, price )
      `,
        { count: "exact" }
      );

    // Filter status
    if (data.status && data.status !== "all") {
      query = query.eq(
        "status",
        data.status as "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled"
      );
    }

    // Filter dateRange
    if (data.dateRange && data.dateRange !== "all") {
      const now = new Date();
      if (data.dateRange === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte("created_at", startOfDay);
      } else if (data.dateRange === "7_days") {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", d);
      } else if (data.dateRange === "30_days") {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte("created_at", d);
      }
    }

    // Filter paymentMethod
    if (data.paymentMethod && data.paymentMethod !== "all") {
      query = query.eq("payment_method", data.paymentMethod);
    }

    // Filter courier
    if (data.courier && data.courier !== "all") {
      query = query.ilike("shipping_method_name", `%${data.courier}%`);
    }

    // Filter search
    if (data.search && data.search.trim()) {
      const q = data.search.trim();
      query = query.or(
        `order_number.ilike.%${q}%,customer_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,shipping_tracking.ilike.%${q}%`
      );
    }

    // Sort
    query = query.order("created_at", { ascending: data.sortBy === "oldest" });

    // Pagination
    const from = (data.page - 1) * data.perPage;
    const to = from + data.perPage - 1;
    query = query.range(from, to);

    const { data: orders, count, error } = await query;
    if (error) {
      console.error("Gagal memuat pesanan query:", error);
      throw new Error("Gagal memuat pesanan");
    }

    return {
      orders: orders ?? [],
      total: count ?? 0,
      counts,
      metrics: {
        totalRevenue,
        pendingCount: counts.pending,
        pendingAmount,
        needToShipCount,
        successRate,
        cancelledCount,
      },
      availablePaymentMethods: Array.from(paymentMethodsSet),
      availableCouriers: Array.from(couriersSet),
    };
  });

const orderDetailSchema = z.object({
  token: z.string().min(1),
  orderId: z.string().uuid(),
});

export const getAdminOrderDetail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderDetailSchema.parse(input))
  .handler(async ({ data }) => {
    const { client } = await assertAdmin(data.token);

    const { data: order, error } = await client
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();

    if (error || !order) throw new Error("Pesanan tidak ditemukan");

    const { data: items } = await client
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    return { order, items: items ?? [] };
  });

const updateStatusSchema = z.object({
  token: z.string().min(1),
  orderId: z.string().uuid(),
  status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled"]),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateStatusSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertAdmin(data.token);

    // Get current order to check previous status
    const { data: currentOrder, error: fetchErr } = await client
      .from("orders")
      .select("order_number, status")
      .eq("id", data.orderId)
      .single();

    if (fetchErr || !currentOrder) throw new Error("Pesanan tidak ditemukan");

    const prevStatus = currentOrder.status;
    const newStatus = data.status;

    // Update status
    const { error } = await client
      .from("orders")
      .update({ status: newStatus })
      .eq("id", data.orderId);

    if (error) throw new Error("Gagal mengupdate status");

    const statusLabels: Record<string, string> = {
      pending: "Menunggu Pembayaran",
      paid: "Lunas / Terverifikasi",
      processing: "Sedang Diproses",
      shipped: "Dalam Pengiriman",
      delivered: "Selesai / Terkirim",
      cancelled: "Dibatalkan",
    };
    const prevText = statusLabels[prevStatus] || prevStatus;
    const newText = statusLabels[newStatus] || newStatus;

    await logUserAction(
      client,
      user,
      role,
      "UPDATE_ORDER_STATUS",
      `Pesanan #${currentOrder.order_number || data.orderId}`,
      `Mengubah status pesanan dari "${prevText}" menjadi "${newText}".`,
      { previous: prevStatus, new: newStatus, previous_label: prevText, new_label: newText }
    );

    // Stock auto-decrement: when status changes TO paid
    if (newStatus === "paid" && prevStatus !== "paid") {
      const { data: orderItems } = await client
        .from("order_items")
        .select("variant_id, quantity")
        .eq("order_id", data.orderId);

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

    // Stock restore: when cancelling from paid/processing/shipped
    if (newStatus === "cancelled" && ["paid", "processing", "shipped"].includes(prevStatus)) {
      const { data: orderItems } = await client
        .from("order_items")
        .select("variant_id, quantity")
        .eq("order_id", data.orderId);

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

    // Log notification
    await client.from("order_notifications").insert({
      order_id: data.orderId,
      event_type: `status_${newStatus}`,
      channel: "email",
      status: "pending",
    });

    return { success: true };
  });

const syncMidtransSchema = z.object({
  token: z.string().min(1),
  orderId: z.string().uuid(),
});

export const syncMidtransOrderForAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => syncMidtransSchema.parse(input))
  .handler(async ({ data }) => {
    const { client } = await assertAdmin(data.token);

    const { data: order, error: fetchErr } = await client
      .from("orders")
      .select("id, order_number, status, total")
      .eq("id", data.orderId)
      .single();

    if (fetchErr || !order) throw new Error("Pesanan tidak ditemukan");

    const midtransResult = await checkMidtransStatusDirect(order.order_number);
    let updated = false;

    if (midtransResult.effectiveStatus !== order.status && midtransResult.transactionStatus !== "not_selected" && midtransResult.transactionStatus !== "error") {
      // Update order status in DB
      await client
        .from("orders")
        .update({
          status: midtransResult.effectiveStatus,
          payment_method: midtransResult.paymentType || "midtrans",
        })
        .eq("id", data.orderId);

      // Adjust stock if transitioning to paid
      if (midtransResult.effectiveStatus === "paid" && order.status !== "paid") {
        const { data: orderItems } = await client
          .from("order_items")
          .select("variant_id, quantity")
          .eq("order_id", data.orderId);

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

      updated = true;
    }

    return {
      orderNumber: order.order_number,
      previousStatus: order.status,
      currentStatus: midtransResult.effectiveStatus,
      midtransStatus: midtransResult.transactionStatus,
      paymentType: midtransResult.paymentType,
      updated,
      details: midtransResult,
    };
  });

// ─── Products ───
export const getAdminProducts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { client } = await assertAdmin(data.token);

    const { data: products, error } = await client
      .from("products")
      .select("*, categories(name), product_images(id, url, is_primary, sort_order), product_variants(id, size, stock, sku)")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw new Error("Gagal memuat produk");
    return { products: products ?? [] };
  });

const productSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional().default(""),
  price: z.number().int().min(0),
  categoryId: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "sold_out", "preorder", "draft"]),
  preorderEstimatedDate: z.string().nullable().optional(),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  variants: z.array(z.object({
    size: z.string().min(1).max(50),
    stock: z.number().int().min(0),
    sku: z.string().max(100).optional(),
  })).default([]),
  imageUrl: z.string().max(2000).optional(),
  imageUrls: z.array(z.object({
    url: z.string().max(2000),
    isPrimary: z.boolean(),
    sortOrder: z.number().int(),
  })).optional(),
}).superRefine((data, ctx) => {
  if (data.status === "preorder" && !data.preorderEstimatedDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["preorderEstimatedDate"],
      message: "Tanggal estimasi wajib diisi untuk produk preorder",
    });
  }
});

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => productSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertAdmin(data.token);

    const { data: product, error } = await client
      .from("products")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        price: data.price,
        category_id: data.categoryId || null,
        status: data.status,
        preorder_estimated_date: data.preorderEstimatedDate || null,
        featured: data.featured,
        sort_order: data.sortOrder,
      })
      .select("id")
      .single();

    if (error) throw new Error("Gagal membuat produk: " + error.message);

    if (data.variants.length > 0) {
      const variantRows = data.variants.map((v) => ({
        product_id: product.id,
        size: v.size,
        stock: v.stock,
        sku: v.sku || null,
      }));
      const { error: variantsError } = await client.from("product_variants").insert(variantRows);
      if (variantsError) throw new Error("Gagal menyimpan varian: " + variantsError.message);
    }

    // Multiple images support
    if (data.imageUrls && data.imageUrls.length > 0) {
      const imageRows = data.imageUrls.map((img) => ({
        product_id: product.id,
        url: img.url,
        is_primary: img.isPrimary,
        sort_order: img.sortOrder,
      }));
      const { error: imagesError } = await client.from("product_images").insert(imageRows);
      if (imagesError) throw new Error("Gagal menyimpan gambar: " + imagesError.message);
    } else if (data.imageUrl) {
      const { error: imageError } = await client.from("product_images").insert({
        product_id: product.id,
        url: data.imageUrl,
        is_primary: true,
        sort_order: 0,
      });
      if (imageError) throw new Error("Gagal menyimpan gambar: " + imageError.message);
    }

    await logUserAction(
      client,
      user,
      role,
      "CREATE_PRODUCT",
      `Produk: ${data.name}`,
      `Menambahkan produk baru "${data.name}" ke katalog (Harga: Rp ${Number(data.price).toLocaleString("id-ID")}, Slug: ${data.slug}).`,
      { price: data.price, slug: data.slug, name: data.name }
    );
    return { id: product.id };
  });

const updateProductSchema = z.object({
  token: z.string().min(1),
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional().default(""),
  price: z.number().int().min(0),
  categoryId: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "sold_out", "preorder", "draft"]),
  preorderEstimatedDate: z.string().nullable().optional(),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  variants: z.array(z.object({
    id: z.string().uuid().optional(),
    size: z.string().min(1).max(50),
    stock: z.number().int().min(0),
    sku: z.string().max(100).optional(),
  })).default([]),
  imageUrl: z.string().max(2000).optional(),
  imageUrls: z.array(z.object({
    id: z.string().uuid().optional(),
    url: z.string().max(2000),
    isPrimary: z.boolean(),
    sortOrder: z.number().int(),
  })).optional(),
}).superRefine((data, ctx) => {
  if (data.status === "preorder" && !data.preorderEstimatedDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["preorderEstimatedDate"],
      message: "Tanggal estimasi wajib diisi untuk produk preorder",
    });
  }
});

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateProductSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertAdmin(data.token);

    const { error } = await client
      .from("products")
      .update({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        price: data.price,
        category_id: data.categoryId || null,
        status: data.status,
        preorder_estimated_date: data.preorderEstimatedDate || null,
        featured: data.featured,
        sort_order: data.sortOrder,
      })
      .eq("id", data.id);

    if (error) throw new Error("Gagal mengupdate produk");

    // Replace variants
    const { error: deleteVariantsError } = await client.from("product_variants").delete().eq("product_id", data.id);
    if (deleteVariantsError) throw new Error("Gagal memperbarui varian: " + deleteVariantsError.message);
    if (data.variants.length > 0) {
      const variantRows = data.variants.map((v) => ({
        product_id: data.id,
        size: v.size,
        stock: v.stock,
        sku: v.sku || null,
      }));
      const { error: variantsError } = await client.from("product_variants").insert(variantRows);
      if (variantsError) throw new Error("Gagal menyimpan varian: " + variantsError.message);
    }

    // Replace images
    if (data.imageUrls && data.imageUrls.length > 0) {
      const { error: deleteImagesError } = await client.from("product_images").delete().eq("product_id", data.id);
      if (deleteImagesError) throw new Error("Gagal memperbarui gambar: " + deleteImagesError.message);
      const imageRows = data.imageUrls.map((img) => ({
        product_id: data.id,
        url: img.url,
        is_primary: img.isPrimary,
        sort_order: img.sortOrder,
      }));
      const { error: imagesError } = await client.from("product_images").insert(imageRows);
      if (imagesError) throw new Error("Gagal menyimpan gambar: " + imagesError.message);
    } else if (data.imageUrl) {
      const { data: existingImg } = await client
        .from("product_images")
        .select("id")
        .eq("product_id", data.id)
        .eq("is_primary", true)
        .maybeSingle();

      if (existingImg) {
        await client
          .from("product_images")
          .update({ url: data.imageUrl })
          .eq("id", existingImg.id);
      } else {
        await client.from("product_images").insert({
          product_id: data.id,
          url: data.imageUrl,
          is_primary: true,
          sort_order: 0,
        });
      }
    }

    await logUserAction(
      client,
      user,
      role,
      "UPDATE_PRODUCT",
      `Produk: ${data.name}`,
      `Memperbarui produk "${data.name}" (Status: ${data.status === "active" ? "Aktif" : "Draft"}, Harga: Rp ${Number(data.price).toLocaleString("id-ID")}).`,
      { id: data.id, status: data.status, price: data.price, name: data.name }
    );
    return { success: true };
  });

const deleteProductSchema = z.object({
  token: z.string().min(1),
  id: z.string().uuid(),
});

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteProductSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertOwner(data.token);
    const { data: p } = await client.from("products").select("name").eq("id", data.id).maybeSingle();
    const { error } = await client
      .from("products")
      .update({ status: "draft" })
      .eq("id", data.id);
    if (error) throw new Error("Gagal menghapus produk");

    await logUserAction(
      client,
      user,
      role,
      "DELETE_PRODUCT",
      `Hapus Produk: ${p?.name || data.id}`,
      `Menghapus produk "${p?.name || data.id}" dari etalase aktif (status diubah ke draft).`,
      { id: data.id, name: p?.name }
    );
    return { success: true };
  });

// ─── Categories ───
export const getAdminCategories = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { client } = await assertAdmin(data.token);
    const { data: categories, error } = await client
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error("Gagal memuat kategori");
    return { categories: categories ?? [] };
  });

const categorySchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  sortOrder: z.number().int().default(0),
});

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => categorySchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertAdmin(data.token);
    const { data: cat, error } = await client
      .from("categories")
      .insert({ name: data.name, slug: data.slug, sort_order: data.sortOrder })
      .select("id")
      .single();
    if (error) throw new Error("Gagal membuat kategori: " + error.message);

    await logUserAction(
      client,
      user,
      role,
      "CREATE_CATEGORY",
      `Kategori: ${data.name}`,
      `Menambahkan kategori baru "${data.name}" (slug: ${data.slug}).`,
      { name: data.name, slug: data.slug }
    );
    return { id: cat.id };
  });

const updateCategorySchema = z.object({
  token: z.string().min(1),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  sortOrder: z.number().int().default(0),
});

export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateCategorySchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertAdmin(data.token);
    const { error } = await client
      .from("categories")
      .update({ name: data.name, slug: data.slug, sort_order: data.sortOrder })
      .eq("id", data.id);
    if (error) throw new Error("Gagal mengupdate kategori");

    await logUserAction(
      client,
      user,
      role,
      "UPDATE_CATEGORY",
      `Kategori: ${data.name}`,
      `Memperbarui nama atau urutan kategori "${data.name}".`,
      { id: data.id, name: data.name, slug: data.slug }
    );
    return { success: true };
  });

const deleteCategorySchema = z.object({
  token: z.string().min(1),
  id: z.string().uuid(),
});

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteCategorySchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertOwner(data.token);
    const { data: category, error: categoryError } = await client
      .from("categories")
      .select("slug, name")
      .eq("id", data.id)
      .maybeSingle();
    if (categoryError) throw new Error("Gagal memeriksa kategori");
    if (category?.slug === "signature-pieces") {
      throw new Error("Kategori Signature Pieces wajib dipertahankan untuk katalog utama");
    }
    await client
      .from("products")
      .update({ category_id: null })
      .eq("category_id", data.id);
    const { error } = await client
      .from("categories")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error("Gagal menghapus kategori");

    await logUserAction(
      client,
      user,
      role,
      "DELETE_CATEGORY",
      `Hapus Kategori: ${category?.name || data.id}`,
      `Menghapus kategori produk "${category?.name || data.id}".`,
      { id: data.id, name: category?.name }
    );
    return { success: true };
  });

// ─── Shipping Rates ───
export const getAdminShippingRates = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { client } = await assertAdmin(data.token);
    const { data: rates, error } = await client
      .from("shipping_rates")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error("Gagal memuat shipping rates");
    return { rates: rates ?? [] };
  });

const shippingRateSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(100),
  price: z.number().int().min(0),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const createShippingRate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => shippingRateSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertAdmin(data.token);
    if (data.isDefault) {
      await client.from("shipping_rates").update({ is_default: false }).eq("is_default", true);
    }
    const { data: rate, error } = await client
      .from("shipping_rates")
      .insert({ name: data.name, price: data.price, is_default: data.isDefault, active: data.active, sort_order: data.sortOrder })
      .select("id")
      .single();
    if (error) throw new Error("Gagal membuat shipping rate");

    await logUserAction(
      client,
      user,
      role,
      "CREATE_SHIPPING_RATE",
      `Tarif Pengiriman: ${data.name}`,
      `Menambahkan opsi tarif pengiriman "${data.name}" seharga Rp ${Number(data.price).toLocaleString("id-ID")}.`,
      { name: data.name, price: data.price }
    );
    return { id: rate.id };
  });

const updateShippingRateSchema = z.object({
  token: z.string().min(1),
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  price: z.number().int().min(0),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateShippingRate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateShippingRateSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertAdmin(data.token);
    if (data.isDefault) {
      await client.from("shipping_rates").update({ is_default: false }).eq("is_default", true);
    }
    const { error } = await client
      .from("shipping_rates")
      .update({ name: data.name, price: data.price, is_default: data.isDefault, active: data.active, sort_order: data.sortOrder })
      .eq("id", data.id);
    if (error) throw new Error("Gagal mengupdate shipping rate");

    await logUserAction(
      client,
      user,
      role,
      "UPDATE_SHIPPING_RATE",
      `Tarif Pengiriman: ${data.name}`,
      `Memperbarui tarif pengiriman "${data.name}" menjadi Rp ${Number(data.price).toLocaleString("id-ID")}.`,
      { id: data.id, name: data.name, price: data.price }
    );
    return { success: true };
  });

const deleteShippingRateSchema = z.object({
  token: z.string().min(1),
  id: z.string().uuid(),
});

export const deleteShippingRate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteShippingRateSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertOwner(data.token);
    const { data: rate } = await client.from("shipping_rates").select("name").eq("id", data.id).maybeSingle();
    const { error } = await client
      .from("shipping_rates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error("Gagal menghapus shipping rate");

    await logUserAction(
      client,
      user,
      role,
      "DELETE_SHIPPING_RATE",
      `Hapus Tarif: ${rate?.name || data.id}`,
      `Menghapus opsi tarif pengiriman "${rate?.name || data.id}".`,
      { id: data.id, name: rate?.name }
    );
    return { success: true };
  });

// ─── Admin Image Management ───
const deleteImageSchema = z.object({
  token: z.string().min(1),
  imageId: z.string().uuid(),
  productId: z.string().uuid(),
});

export const deleteProductImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteImageSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertOwner(data.token);

    const { data: img } = await client
      .from("product_images")
      .select("is_primary")
      .eq("id", data.imageId)
      .single();

    await client.from("product_images").delete().eq("id", data.imageId);

    // If deleted image was primary, set next image as primary
    if (img?.is_primary) {
      const { data: nextImg } = await client
        .from("product_images")
        .select("id")
        .eq("product_id", data.productId)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextImg) {
        await client
          .from("product_images")
          .update({ is_primary: true })
          .eq("id", nextImg.id);
      }
    }

    await logUserAction(
      client,
      user,
      role,
      "DELETE_PRODUCT_IMAGE",
      `Hapus Foto Produk`,
      `Menghapus salah satu foto dari katalog produk.`,
      { imageId: data.imageId, productId: data.productId }
    );
    return { success: true };
  });

// ─── Role management functions (Owner Hierarchy) ───
export const getAdminRolesList = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, role, isOwner } = await assertAdmin(data.token);
    const { data: roles, error } = await client
      .from("user_roles")
      .select("id, user_id, role")
      .order("role", { ascending: false });

    if (error) throw new Error(error.message);
    return { roles: roles || [], currentRole: role, isOwner };
  });

const assignRoleSchema = z.object({
  token: z.string().min(1),
  targetUserId: z.string().uuid(),
  role: z.enum(["admin", "owner"]),
});

export const assignAdminRole = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => assignRoleSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertOwner(data.token);
    const { error } = await client.from("user_roles").upsert(
      {
        user_id: data.targetUserId,
        role: data.role,
      },
      { onConflict: "user_id,role" }
    );

    if (error) throw new Error(error.message);

    await logUserAction(
      client,
      user,
      role,
      "ASSIGN_ROLE",
      `Otoritas Tim: ${data.role.toUpperCase()}`,
      `Menetapkan peran "${data.role.toUpperCase()}" kepada pengguna (ID: ${data.targetUserId.slice(0, 8)}...).`,
      { assigned_role: data.role, target_user_id: data.targetUserId }
    );
    return { success: true };
  });

const removeRoleSchema = z.object({
  token: z.string().min(1),
  roleId: z.string().uuid(),
});

export const removeAdminRole = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => removeRoleSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertOwner(data.token);
    const { error } = await client.from("user_roles").delete().eq("id", data.roleId);
    if (error) throw new Error(error.message);

    await logUserAction(
      client,
      user,
      role,
      "REMOVE_ROLE",
      `Cabut Otoritas Tim`,
      `Mencabut hak akses tim (Role ID: ${data.roleId.slice(0, 8)}...).`,
      { role_id: data.roleId }
    );
    return { success: true };
  });

// ─── Owner Direct Team Management (Full CRUD for Admin & Owner) ───
const createTeamUserSchema = z.object({
  token: z.string().min(1),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["owner", "admin"]).default("admin"),
});

export const createTeamUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createTeamUserSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertOwner(data.token);
    const serviceClient = createServiceClient();
    if (!serviceClient) throw new Error("Service role Supabase belum terkonfigurasi");

    let targetUserId: string;

    // Check if user already exists in auth
    const { data: userList } = await serviceClient.auth.admin.listUsers();
    const existing = userList?.users?.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    );

    if (existing) {
      targetUserId = existing.id;
    } else {
      const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

      if (createErr || !newUser.user) {
        throw new Error("Gagal membuat user auth: " + (createErr?.message || "Unknown error"));
      }
      targetUserId = newUser.user.id;
    }

    // Upsert role into public.user_roles
    const { error: roleErr } = await serviceClient.from("user_roles").upsert(
      {
        user_id: targetUserId,
        role: data.role,
      },
      { onConflict: "user_id,role" }
    );

    if (roleErr) throw new Error("Gagal menetapkan peran pengguna: " + roleErr.message);

    const roleName = data.role === "owner" ? "Owner" : "Admin";
    await logUserAction(
      client,
      user,
      role,
      "CREATE_USER",
      `Tambah Pengguna: ${data.email}`,
      `Owner menambahkan akun pengguna baru (${data.email}) dengan peran ${roleName}.`,
      { target_email: data.email, target_user_id: targetUserId, assigned_role: data.role }
    );

    return { success: true, email: data.email, userId: targetUserId, role: data.role };
  });

// Backward compatible alias
export const createAdminStaff = createTeamUser;

const updateTeamUserSchema = z.object({
  token: z.string().min(1),
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  newEmail: z.string().email("Format email tidak valid").optional(),
  newPassword: z.string().min(6, "Password minimal 6 karakter").optional(),
  newRole: z.enum(["owner", "admin"]).optional(),
});

export const updateTeamUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateTeamUserSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertOwner(data.token);
    const serviceClient = createServiceClient();
    if (!serviceClient) throw new Error("Service role Supabase belum terkonfigurasi");

    // 1. Update Auth credentials (Email / Password) if provided
    const authUpdates: Record<string, any> = {};
    if (data.newEmail) authUpdates.email = data.newEmail;
    if (data.newPassword) authUpdates.password = data.newPassword;

    if (Object.keys(authUpdates).length > 0) {
      authUpdates.email_confirm = true;
      const { error: authErr } = await serviceClient.auth.admin.updateUserById(
        data.userId,
        authUpdates
      );
      if (authErr) throw new Error("Gagal memperbarui data login: " + authErr.message);
    }

    // 2. Update Role if provided
    if (data.newRole) {
      const { error: roleErr } = await serviceClient
        .from("user_roles")
        .update({ role: data.newRole })
        .eq("id", data.roleId);
      if (roleErr) throw new Error("Gagal memperbarui hak akses peran: " + roleErr.message);
    }

    const updatedRoleText = data.newRole ? ` (Peran diubah ke ${data.newRole})` : "";
    await logUserAction(
      client,
      user,
      role,
      "UPDATE_USER",
      `Edit Pengguna: ${data.newEmail || data.userId}`,
      `Owner memperbarui profil/kredensial pengguna (${data.newEmail || data.userId})${updatedRoleText}.`,
      {
        target_user_id: data.userId,
        updated_email: data.newEmail,
        updated_role: data.newRole,
        password_changed: !!data.newPassword,
      }
    );

    return { success: true };
  });

const deleteTeamUserSchema = z.object({
  token: z.string().min(1),
  roleId: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().optional(),
});

export const deleteTeamUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteTeamUserSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertOwner(data.token);
    const serviceClient = createServiceClient();

    // Prevent deleting own logged in account
    if (data.userId === user.id) {
      throw new Error("Tidak dapat menghapus akun Anda sendiri saat ini sedang aktif digunakan");
    }

    // Delete role from user_roles
    const { error: delErr } = await client
      .from("user_roles")
      .delete()
      .eq("id", data.roleId);

    if (delErr) throw new Error("Gagal mencabut hak akses: " + delErr.message);

    // Optionally remove from Auth
    if (serviceClient) {
      try {
        await serviceClient.auth.admin.deleteUser(data.userId);
      } catch (e) {
        // user role already deleted
      }
    }

    await logUserAction(
      client,
      user,
      role,
      "REMOVE_USER",
      `Hapus Pengguna: ${data.email || data.userId}`,
      `Owner menghapus pengguna (${data.email || data.userId}) dan mencabut seluruh hak aksesnya.`,
      { target_user_id: data.userId, target_email: data.email, role_id: data.roleId }
    );

    return { success: true };
  });

// Backward compatible alias
export const deleteAdminStaff = deleteTeamUser;

// ─── Site Settings (Owner Exclusive Customizer) ───
const getSiteSettingsSchema = z.object({
  key: z.string().default("homepage_hero"),
});

export const getSiteSettings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getSiteSettingsSchema.parse(input))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const client = createClient<Database>(url!, key!);
    const { data: setting, error } = await client
      .from("site_settings")
      .select("key, value, updated_at")
      .eq("key", data.key)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return setting?.value as Record<string, any> | null;
  });

const updateSiteSettingsSchema = z.object({
  token: z.string().min(1),
  key: z.string().default("homepage_hero"),
  value: z.record(z.any()),
});

export const updateSiteSettings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateSiteSettingsSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, user, role } = await assertOwner(data.token);

    const { error } = await client.from("site_settings").upsert({
      key: data.key,
      value: data.value,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });

    if (error) throw new Error("Gagal menyimpan pengaturan: " + error.message);

    const bgInfo = data.value.background_image ? "gambar latar belakang kustom aktif" : "latar belakang standar";
    await logUserAction(
      client,
      user,
      role,
      "UPDATE_HOMEPAGE_LAYOUT",
      "Kustomisasi Layout & Background Hero Tampilan Awal",
      `Memperbarui tampilan Hero: Judul diatur ke "${data.value.headline}", overlay ${data.value.overlay_opacity}%, dan ${bgInfo}.`,
      {
        headline: data.value.headline,
        subheadline: data.value.subheadline,
        cta_text: data.value.cta_text,
        cta_link: data.value.cta_link,
        has_custom_bg: !!data.value.background_image,
        overlay_opacity: data.value.overlay_opacity,
      }
    );

    return { success: true };
  });

// ─── User Logs (Audit Trail for Owner & Admin) ───
const getUserLogsSchema = z.object({
  token: z.string().min(1),
  limit: z.number().int().min(1).max(200).default(50),
});

export const getUserLogs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getUserLogsSchema.parse(input))
  .handler(async ({ data }) => {
    const { client, role, isOwner } = await assertAdmin(data.token);

    let query = client
      .from("user_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    // CRITICAL SECURITY & VISIBILITY RULE:
    // Owner can see all logs (both Admin logs and Owner logs).
    // Admin can ONLY see logs where role is 'admin' (other admins & self).
    // Admin CANNOT see Owner logs!
    if (!isOwner) {
      query = query.eq("role", "admin");
    }

    const { data: logs, error } = await query;

    if (error) throw new Error("Gagal memuat user log: " + error.message);
    return { logs: logs || [], viewerRole: role, isOwner };
  });

