import { test, describe } from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import {
  generateDokuSignature,
  generateDokuGetSignature,
  calculateDokuExpiry,
  mapDokuStatus,
  canAutomatedSyncTransition,
} from "../src/utils/doku.functions";

describe("DOKU Signature Generation", () => {
  const clientId = "MCH-0001";
  const requestId = "REQ-12345";
  const timestamp = "2026-11-18T10:00:00Z";
  const secretKey = "test-secret-key";

  test("generates correct POST signature with body digest", () => {
    const targetPath = "/checkout/v1/payment";
    const body = JSON.stringify({ order: { amount: 100000 } });
    const digest = crypto.createHash("sha256").update(body).digest("base64");

    const sig = generateDokuSignature(
      clientId,
      requestId,
      timestamp,
      targetPath,
      digest,
      secretKey
    );

    assert.ok(sig.startsWith("HMACSHA256="));

    // Recompute manually to verify exact component string
    const component = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`;
    const expected = `HMACSHA256=${crypto.createHmac("sha256", secretKey).update(component).digest("base64")}`;
    assert.strictEqual(sig, expected);
  });

  test("generates correct GET signature without digest", () => {
    const targetPath = "/orders/v1/status/RX-123";
    const sig = generateDokuGetSignature(
      clientId,
      requestId,
      timestamp,
      targetPath,
      secretKey
    );

    assert.ok(sig.startsWith("HMACSHA256="));

    const component = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}`;
    const expected = `HMACSHA256=${crypto.createHmac("sha256", secretKey).update(component).digest("base64")}`;
    assert.strictEqual(sig, expected);
  });

  test("detects signature mismatch when payload is tampered", () => {
    const targetPath = "/api/doku-notification";
    const originalBody = JSON.stringify({ transaction: { status: "SUCCESS" } });
    const tamperedBody = JSON.stringify({ transaction: { status: "SUCCESS", amount: 0 } });

    const originalDigest = crypto.createHash("sha256").update(originalBody).digest("base64");
    const tamperedDigest = crypto.createHash("sha256").update(tamperedBody).digest("base64");

    const originalSig = generateDokuSignature(
      clientId,
      requestId,
      timestamp,
      targetPath,
      originalDigest,
      secretKey
    );

    const tamperedSig = generateDokuSignature(
      clientId,
      requestId,
      timestamp,
      targetPath,
      tamperedDigest,
      secretKey
    );

    assert.notStrictEqual(originalSig, tamperedSig);
  });
});

describe("DOKU Status Mapping", () => {
  test("maps SUCCESS transaction to paid", () => {
    const result = mapDokuStatus({ transactionStatus: "SUCCESS" });
    assert.strictEqual(result.effectiveStatus, "paid");
    assert.strictEqual(result.isTerminal, true);
  });

  test("maps EXPIRED transaction to cancelled", () => {
    const result = mapDokuStatus({ transactionStatus: "EXPIRED" });
    assert.strictEqual(result.effectiveStatus, "cancelled");
    assert.strictEqual(result.isTerminal, true);
  });

  test("maps ORDER_EXPIRED order status to cancelled", () => {
    const result = mapDokuStatus({ orderStatus: "ORDER_EXPIRED" });
    assert.strictEqual(result.effectiveStatus, "cancelled");
    assert.strictEqual(result.isTerminal, true);
  });

  test("maps FAILED transaction to cancelled", () => {
    const result = mapDokuStatus({ transactionStatus: "FAILED" });
    assert.strictEqual(result.effectiveStatus, "cancelled");
    assert.strictEqual(result.isTerminal, true);
  });

  test("maps PENDING transaction or ORDER_GENERATED to pending", () => {
    const result1 = mapDokuStatus({ transactionStatus: "PENDING" });
    assert.strictEqual(result1.effectiveStatus, "pending");
    assert.strictEqual(result1.isTerminal, false);

    const result2 = mapDokuStatus({ orderStatus: "ORDER_GENERATED" });
    assert.strictEqual(result2.effectiveStatus, "pending");
    assert.strictEqual(result2.isTerminal, false);
  });
});

describe("DOKU Expiry Time Calculation", () => {
  test("identifies active payment within 60 minutes", () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const expiry = calculateDokuExpiry(tenMinutesAgo, 60);

    assert.strictEqual(expiry.isExpired, false);
    assert.ok(expiry.remainingSeconds > 0 && expiry.remainingSeconds <= 50 * 60);
    assert.ok(new Date(expiry.expiryIso).getTime() > Date.now());
  });

  test("identifies expired payment after 60 minutes", () => {
    const seventyMinutesAgo = new Date(Date.now() - 70 * 60 * 1000).toISOString();
    const expiry = calculateDokuExpiry(seventyMinutesAgo, 60);

    assert.strictEqual(expiry.isExpired, true);
    assert.strictEqual(expiry.remainingSeconds, 0);
    assert.ok(new Date(expiry.expiryIso).getTime() < Date.now());
  });
});

describe("Terminal State Protection for Webhooks & Polling", () => {
  test("allows pending -> paid transition", () => {
    assert.strictEqual(canAutomatedSyncTransition("pending", "paid"), true);
  });

  test("allows pending -> cancelled transition", () => {
    assert.strictEqual(canAutomatedSyncTransition("pending", "cancelled"), true);
  });

  test("allows idempotent same-status calls (pending -> pending, paid -> paid)", () => {
    assert.strictEqual(canAutomatedSyncTransition("pending", "pending"), true);
    assert.strictEqual(canAutomatedSyncTransition("paid", "paid"), true);
    assert.strictEqual(canAutomatedSyncTransition("cancelled", "cancelled"), true);
  });

  test("FORBIDS downgrading paid order to cancelled via automated webhook", () => {
    assert.strictEqual(canAutomatedSyncTransition("paid", "cancelled"), false);
  });

  test("FORBIDS downgrading paid order to pending via automated webhook", () => {
    assert.strictEqual(canAutomatedSyncTransition("paid", "pending"), false);
  });

  test("FORBIDS downgrading processing order to cancelled via automated webhook", () => {
    assert.strictEqual(canAutomatedSyncTransition("processing", "cancelled"), false);
  });

  test("FORBIDS downgrading shipped or delivered order to cancelled via automated webhook", () => {
    assert.strictEqual(canAutomatedSyncTransition("shipped", "cancelled"), false);
    assert.strictEqual(canAutomatedSyncTransition("delivered", "cancelled"), false);
  });

  test("FORBIDS reverting cancelled order back to pending via late callback", () => {
    assert.strictEqual(canAutomatedSyncTransition("cancelled", "pending"), false);
  });
});
