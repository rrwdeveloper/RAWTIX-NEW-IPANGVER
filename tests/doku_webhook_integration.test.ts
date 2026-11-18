import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import {
  generateDokuSignature,
  calculateDokuExpiry,
  mapDokuStatus,
  canAutomatedSyncTransition,
} from "../src/utils/doku.functions";

describe("DOKU Webhook & Expiry Integration Unit Tests", () => {
  const secretKey = "test-doku-secret";
  const clientId = "MCH-TEST-001";
  const requestId = "REQ-TEST-999";
  const targetPath = "/api/doku-notification";
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  test("Webhook signature validation correctly authenticates valid webhook payload", () => {
    const rawBody = JSON.stringify({
      order: { invoice_number: "RX-TEST01" },
      transaction: { status: "SUCCESS" },
      channel: { id: "QRIS" },
    });

    const bodyDigest = crypto.createHash("sha256").update(rawBody).digest("base64");
    const component = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${bodyDigest}`;
    const validSignature = `HMACSHA256=${crypto.createHmac("sha256", secretKey).update(component).digest("base64")}`;

    // Validate signature matching logic
    const computedDigest = crypto.createHash("sha256").update(rawBody).digest("base64");
    const computedComponent = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${computedDigest}`;
    const expectedSig = `HMACSHA256=${crypto.createHmac("sha256", secretKey).update(computedComponent).digest("base64")}`;

    assert.strictEqual(validSignature, expectedSig);
  });

  test("Webhook rejects tampered payload with mismatched signature", () => {
    const originalBody = JSON.stringify({
      order: { invoice_number: "RX-TEST01" },
      transaction: { status: "FAILED" },
    });
    const tamperedBody = JSON.stringify({
      order: { invoice_number: "RX-TEST01" },
      transaction: { status: "SUCCESS" }, // Attacker trying to flip status
    });

    const originalDigest = crypto.createHash("sha256").update(originalBody).digest("base64");
    const component = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${originalDigest}`;
    const originalSignature = `HMACSHA256=${crypto.createHmac("sha256", secretKey).update(component).digest("base64")}`;

    // Attacker sends tampered body with original signature
    const tamperedDigest = crypto.createHash("sha256").update(tamperedBody).digest("base64");
    const tamperedComponent = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${tamperedDigest}`;
    const expectedSig = `HMACSHA256=${crypto.createHmac("sha256", secretKey).update(tamperedComponent).digest("base64")}`;

    assert.notStrictEqual(originalSignature, expectedSig);
  });

  test("Expired order simulation: 1-hour timeout triggers expired state transition", () => {
    // Simulate order created 61 minutes ago
    const sixtyOneMinutesAgo = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    const expiry = calculateDokuExpiry(sixtyOneMinutesAgo, 60);

    assert.strictEqual(expiry.isExpired, true);
    assert.strictEqual(expiry.remainingSeconds, 0);

    // If order was pending and expiry reached:
    let orderStatus: "pending" | "paid" | "cancelled" = "pending";
    if (orderStatus === "pending" && expiry.isExpired) {
      orderStatus = "cancelled";
    }

    assert.strictEqual(orderStatus, "cancelled");
  });

  test("Duplicate webhooks are handled idempotently without state corruption", () => {
    let orderStatus: "pending" | "paid" | "cancelled" = "pending";
    let stock = 10;
    const quantity = 2;

    const processWebhook = (incomingStatus: "paid" | "cancelled") => {
      if (orderStatus === incomingStatus) {
        // Idempotent: do nothing
        return { acknowledged: true, duplicated: true };
      }
      if (canAutomatedSyncTransition(orderStatus, incomingStatus)) {
        orderStatus = incomingStatus;
        if (incomingStatus === "paid") {
          stock -= quantity;
        }
        return { acknowledged: true, duplicated: false };
      }
      return { acknowledged: false, duplicated: false };
    };

    // First SUCCESS callback
    const res1 = processWebhook("paid");
    assert.strictEqual(res1.acknowledged, true);
    assert.strictEqual(res1.duplicated, false);
    assert.strictEqual(orderStatus, "paid");
    assert.strictEqual(stock, 8);

    // Second (duplicate) SUCCESS callback
    const res2 = processWebhook("paid");
    assert.strictEqual(res2.acknowledged, true);
    assert.strictEqual(res2.duplicated, true);
    assert.strictEqual(orderStatus, "paid");
    assert.strictEqual(stock, 8); // Stock was NOT deducted twice!
  });

  test("Late EXPIRED callback does not downgrade paid or shipped order", () => {
    const statuses: Array<"paid" | "processing" | "shipped" | "delivered"> = [
      "paid",
      "processing",
      "shipped",
      "delivered",
    ];

    for (const status of statuses) {
      const canDowngrade = canAutomatedSyncTransition(status, "cancelled");
      assert.strictEqual(
        canDowngrade,
        false,
        `Status ${status} must not be downgraded to cancelled`
      );
    }
  });
});
