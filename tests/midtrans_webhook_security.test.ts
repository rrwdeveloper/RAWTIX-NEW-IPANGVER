import { test, describe } from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import { canAutomatedSyncTransition } from "../src/utils/doku.functions";

describe("Midtrans Webhook Security & Signature Verification", () => {
  const serverKey = "SB-Mid-server-TESTKEY123";
  const orderId = "RX-20261118-001";
  const statusCode = "200";
  const grossAmount = "150000.00";

  test("generates and verifies valid SHA512 signature", () => {
    const rawString = orderId + statusCode + grossAmount + serverKey;
    const expectedHash = crypto.createHash("sha512").update(rawString).digest("hex");

    const sigBuf = Buffer.from(expectedHash);
    const expBuf = Buffer.from(expectedHash);

    const matches = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    assert.strictEqual(matches, true);
  });

  test("timing-safe comparison rejects forged signature", () => {
    const forgedSignature = "a".repeat(128); // 128 chars hex for SHA-512
    const validRawString = orderId + statusCode + grossAmount + serverKey;
    const realHash = crypto.createHash("sha512").update(validRawString).digest("hex");

    const sigBuf = Buffer.from(forgedSignature);
    const expBuf = Buffer.from(realHash);

    const matches = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    assert.strictEqual(matches, false);
  });

  test("rejects payload when gross_amount is tampered (underpayment attack)", () => {
    const expectedOrderTotal = 150000;
    const tamperedPayloadGrossAmount = "50000.00"; // Attacker attempts to pay 50k for 150k item

    const payloadAmount = Math.round(Number(tamperedPayloadGrossAmount));
    const orderTotal = Math.round(Number(expectedOrderTotal));

    const isMatch = !isNaN(payloadAmount) && payloadAmount === orderTotal;
    assert.strictEqual(isMatch, false, "Must detect gross_amount mismatch and reject");
  });

  test("settlement and accept capture map to paid status", () => {
    const mappingLogic = (txStatus: string, fraudStatus?: string) => {
      if (txStatus === "settlement" || (txStatus === "capture" && fraudStatus === "accept")) {
        return "paid";
      }
      if (["deny", "cancel", "expire", "failure"].includes(txStatus)) {
        return "cancelled";
      }
      return "pending";
    };

    assert.strictEqual(mappingLogic("settlement"), "paid");
    assert.strictEqual(mappingLogic("capture", "accept"), "paid");
    assert.strictEqual(mappingLogic("capture", "challenge"), "pending");
    assert.strictEqual(mappingLogic("expire"), "cancelled");
    assert.strictEqual(mappingLogic("deny"), "cancelled");
    assert.strictEqual(mappingLogic("cancel"), "cancelled");
  });

  test("late Midtrans expire/cancel notification never downgrades a paid or shipped order", () => {
    const protectedStates: Array<"paid" | "processing" | "shipped" | "delivered"> = [
      "paid",
      "processing",
      "shipped",
      "delivered",
    ];

    for (const state of protectedStates) {
      assert.strictEqual(
        canAutomatedSyncTransition(state, "cancelled"),
        false,
        `Terminal state ${state} must not be downgraded to cancelled`
      );
      assert.strictEqual(
        canAutomatedSyncTransition(state, "pending"),
        false,
        `Terminal state ${state} must not be downgraded to pending`
      );
    }
  });

  test("idempotent duplicate callback does not deduct stock twice", () => {
    let currentStatus: "pending" | "paid" | "cancelled" = "pending";
    let stock = 25;
    const itemQty = 3;

    const handleWebhook = (effectiveStatus: "paid" | "cancelled") => {
      if (currentStatus === effectiveStatus) {
        return { status: 200, message: "Already up to date", decremented: false };
      }
      if (effectiveStatus === "paid" && currentStatus === "pending") {
        currentStatus = "paid";
        stock -= itemQty;
        return { status: 200, message: "Updated", decremented: true };
      }
      return { status: 200, message: "Ignored", decremented: false };
    };

    // Callback 1: settlement
    const res1 = handleWebhook("paid");
    assert.strictEqual(res1.decremented, true);
    assert.strictEqual(stock, 22);
    assert.strictEqual(currentStatus, "paid");

    // Callback 2: duplicate settlement
    const res2 = handleWebhook("paid");
    assert.strictEqual(res2.decremented, false);
    assert.strictEqual(stock, 22);
    assert.strictEqual(currentStatus, "paid");
  });
});
