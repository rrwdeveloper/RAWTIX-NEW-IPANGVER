import crypto from "crypto";

export interface DokuCheckoutRequest {
  orderNumber: string;
  amount: number;
  customerName: string;
  email: string;
  phone: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface DokuCheckoutResponse {
  paymentUrl: string | null;
  invoiceNumber: string;
  rawResponse?: unknown;
}

/**
 * Generate DOKU HMAC-SHA256 Signature
 * Format:
 * Client-Id + Request-Id + Request-Timestamp + Request-Target + Digest
 */
export function generateDokuSignature(
  clientId: string,
  requestId: string,
  requestTimestamp: string,
  requestTarget: string,
  bodyDigest: string,
  secretKey: string
): string {
  const component = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${requestTimestamp}\nRequest-Target:${requestTarget}\nDigest:${bodyDigest}`;
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(component);
  return `HMACSHA256=${hmac.digest("base64")}`;
}

/**
 * Generate DOKU HMAC-SHA256 Signature for GET requests (no Digest)
 * Format:
 * Client-Id + Request-Id + Request-Timestamp + Request-Target
 */
export function generateDokuGetSignature(
  clientId: string,
  requestId: string,
  requestTimestamp: string,
  requestTarget: string,
  secretKey: string
): string {
  const component = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${requestTimestamp}\nRequest-Target:${requestTarget}`;
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(component);
  return `HMACSHA256=${hmac.digest("base64")}`;
}

/**
 * Create DOKU Checkout Payment URL
 */
export async function createDokuCheckoutPayment(
  data: DokuCheckoutRequest
): Promise<DokuCheckoutResponse> {
  const clientId = process.env.DOKU_CLIENT_ID || "";
  const secretKey = process.env.DOKU_SECRET_KEY || "";
  const isProduction = process.env.DOKU_IS_PRODUCTION === "true";

  if (!clientId || !secretKey) {
    console.warn("[DOKU] Missing DOKU_CLIENT_ID or DOKU_SECRET_KEY in env");
    return { paymentUrl: null, invoiceNumber: data.orderNumber };
  }

  const baseUrl = isProduction
    ? "https://api.doku.com"
    : "https://api-sandbox.doku.com";

  const targetPath = "/checkout/v1/payment";
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const payload = {
    order: {
      invoice_number: data.orderNumber,
      amount: data.amount,
      currency: "IDR",
      callback_url: (process.env.APP_URL || "https://rawtix.id") + "/order-success?order=" + encodeURIComponent(data.orderNumber),
      line_items: data.items.map((it) => ({
        name: it.name.slice(0, 50),
        price: it.price,
        quantity: it.quantity,
      })),
    },
    payment: {
      payment_due_date: 60, // 60 menit expired
    },
    customer: {
      name: data.customerName.slice(0, 50),
      email: data.email,
      phone: (() => {
        let p = data.phone.replace(/[^0-9]/g, "");
        if (p.startsWith("0")) {
          p = "62" + p.slice(1);
        } else if (!p.startsWith("62")) {
          p = "62" + p;
        }
        return p;
      })(),
    },
  };

  const jsonBody = JSON.stringify(payload);
  const bodyDigest = crypto.createHash("sha256").update(jsonBody).digest("base64");

  const signature = generateDokuSignature(
    clientId,
    requestId,
    requestTimestamp,
    targetPath,
    bodyDigest,
    secretKey
  );

  try {
    const res = await fetch(`${baseUrl}${targetPath}`, {
      method: "POST",
      headers: {
        "Client-Id": clientId,
        "Request-Id": requestId,
        "Request-Timestamp": requestTimestamp,
        Signature: signature,
        "Content-Type": "application/json",
      },
      body: jsonBody,
    });

    const result = await res.json();

    if (result?.response?.payment?.url) {
      return {
        paymentUrl: result.response.payment.url,
        invoiceNumber: data.orderNumber,
        rawResponse: result,
      };
    }

    console.error("[DOKU] API Response Error:", result);
    return {
      paymentUrl: null,
      invoiceNumber: data.orderNumber,
      rawResponse: result,
    };
  } catch (err) {
    console.error("[DOKU] Request failed:", err);
    return { paymentUrl: null, invoiceNumber: data.orderNumber };
  }
}

export interface DokuExpiryInfo {
  expiryIso: string;
  isExpired: boolean;
  remainingSeconds: number;
}

/**
 * Calculate DOKU payment expiry based on creation timestamp and payment due date (default: 60 minutes)
 */
export function calculateDokuExpiry(
  createdAtIso: string,
  durationMinutes = 60
): DokuExpiryInfo {
  const createdMs = new Date(createdAtIso).getTime();
  const validCreatedMs = isNaN(createdMs) ? Date.now() : createdMs;
  const expiryMs = validCreatedMs + durationMinutes * 60 * 1000;
  const now = Date.now();
  const remainingSeconds = Math.max(0, Math.floor((expiryMs - now) / 1000));
  const isExpired = now >= expiryMs;

  return {
    expiryIso: new Date(expiryMs).toISOString(),
    isExpired,
    remainingSeconds,
  };
}

export interface DokuStatusMapping {
  effectiveStatus: "pending" | "paid" | "cancelled";
  isTerminal: boolean;
  rawStatus: string;
}

/**
 * Standard status mapper from DOKU transaction/order status to internal status
 */
export function mapDokuStatus(input: {
  transactionStatus?: string;
  orderStatus?: string;
}): DokuStatusMapping {
  const tx = (input.transactionStatus || "").trim().toUpperCase();
  const ord = (input.orderStatus || "").trim().toUpperCase();

  if (tx === "SUCCESS") {
    return { effectiveStatus: "paid", isTerminal: true, rawStatus: tx };
  }

  if (
    tx === "EXPIRED" ||
    tx === "FAILED" ||
    ord === "ORDER_EXPIRED"
  ) {
    return {
      effectiveStatus: "cancelled",
      isTerminal: true,
      rawStatus: tx || ord,
    };
  }

  if (
    tx === "PENDING" ||
    ord === "ORDER_GENERATED"
  ) {
    return {
      effectiveStatus: "pending",
      isTerminal: false,
      rawStatus: tx || ord,
    };
  }

  return {
    effectiveStatus: "pending",
    isTerminal: false,
    rawStatus: tx || ord || "UNKNOWN",
  };
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

/**
 * Validation guard to prevent automated webhooks or sync jobs from overwriting terminal or advanced order states
 */
export function canAutomatedSyncTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  if (currentStatus === targetStatus) return true;

  // Once an order is paid or in fulfillment, automated gateway sync / late webhook
  // MUST NEVER downgrade or cancel it!
  if (["paid", "processing", "shipped", "delivered"].includes(currentStatus)) {
    if (targetStatus === "cancelled" || targetStatus === "pending") {
      return false;
    }
  }

  // Once cancelled, automated sync cannot revert to pending
  if (currentStatus === "cancelled" && targetStatus === "pending") {
    return false;
  }

  return true;
}

export interface DokuStatusResult {
  statusCode: string;
  transactionStatus: "SUCCESS" | "FAILED" | "EXPIRED" | "PENDING" | "UNKNOWN";
  effectiveStatus: "pending" | "paid" | "cancelled";
  statusMessage?: string;
  paymentType?: string;
  rawResponse?: unknown;
}

/**
 * Check real-time DOKU order status via Standalone Check Status API (GET /orders/v1/status/{invoice_number})
 */
export async function checkDokuOrderStatus(
  orderNumber: string
): Promise<DokuStatusResult> {
  const clientId = process.env.DOKU_CLIENT_ID || "";
  const secretKey = process.env.DOKU_SECRET_KEY || "";
  const isProduction = process.env.DOKU_IS_PRODUCTION === "true";

  if (!clientId || !secretKey) {
    return {
      statusCode: "500",
      transactionStatus: "UNKNOWN",
      effectiveStatus: "pending",
      statusMessage: "DOKU credentials missing",
    };
  }

  const baseUrl = isProduction
    ? "https://api.doku.com"
    : "https://api-sandbox.doku.com";

  const targetPath = `/orders/v1/status/${encodeURIComponent(orderNumber)}`;
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const signature = generateDokuGetSignature(
    clientId,
    requestId,
    requestTimestamp,
    targetPath,
    secretKey
  );

  try {
    const res = await fetch(`${baseUrl}${targetPath}`, {
      method: "GET",
      headers: {
        "Client-Id": clientId,
        "Request-Id": requestId,
        "Request-Timestamp": requestTimestamp,
        Signature: signature,
      },
    });

    if (res.status === 404) {
      return {
        statusCode: "404",
        transactionStatus: "PENDING",
        effectiveStatus: "pending",
        statusMessage: "Order not found on DOKU, awaiting customer payment",
      };
    }

    const data = (await res.json()) as {
      order?: { status?: string };
      transaction?: { status?: string; channel_id?: string };
    };

    const mapping = mapDokuStatus({
      transactionStatus: data?.transaction?.status,
      orderStatus: data?.order?.status,
    });

    const txStatus = (data?.transaction?.status || data?.order?.status || "UNKNOWN").toUpperCase();

    return {
      statusCode: res.status.toString(),
      transactionStatus: (["SUCCESS", "FAILED", "EXPIRED", "PENDING"].includes(txStatus)
        ? txStatus
        : "UNKNOWN") as DokuStatusResult["transactionStatus"],
      effectiveStatus: mapping.effectiveStatus,
      paymentType: data?.transaction?.channel_id || "doku",
      statusMessage: `DOKU status: ${mapping.rawStatus}`,
      rawResponse: data,
    };
  } catch (err) {
    console.error("[DOKU] Check status failed:", err);
    return {
      statusCode: "500",
      transactionStatus: "UNKNOWN",
      effectiveStatus: "pending",
      statusMessage: "Failed to connect to DOKU API",
    };
  }
}

