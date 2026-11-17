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
  rawResponse?: any;
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
      callback_url: (process.env.APP_URL || "https://rawtix.com") + "/order-success?order=" + encodeURIComponent(data.orderNumber),
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
      id: `CUST-${data.email.replace(/[^a-zA-Z0-9]/g, "")}`.slice(0, 30),
      name: data.customerName.slice(0, 50),
      email: data.email,
      phone: data.phone,
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
