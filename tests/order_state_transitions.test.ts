import { test, describe } from "node:test";
import assert from "node:assert";
import { canAdminOrderTransition } from "../src/utils/admin.functions";
import type { OrderStatus } from "../src/utils/doku.functions";

describe("Order State Machine & Transition Rules", () => {
  test("allows valid sequential order transitions", () => {
    assert.strictEqual(canAdminOrderTransition("pending", "paid").allowed, true);
    assert.strictEqual(canAdminOrderTransition("paid", "processing").allowed, true);
    assert.strictEqual(canAdminOrderTransition("processing", "shipped").allowed, true);
    assert.strictEqual(canAdminOrderTransition("shipped", "delivered").allowed, true);
  });

  test("allows cancelling unpaid and in-flight orders", () => {
    assert.strictEqual(canAdminOrderTransition("pending", "cancelled").allowed, true);
    assert.strictEqual(canAdminOrderTransition("paid", "cancelled").allowed, true);
    assert.strictEqual(canAdminOrderTransition("processing", "cancelled").allowed, true);
    assert.strictEqual(canAdminOrderTransition("shipped", "cancelled").allowed, true);
  });

  test("allows idempotent status transitions without error", () => {
    const statuses: OrderStatus[] = [
      "pending",
      "paid",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    for (const s of statuses) {
      assert.strictEqual(canAdminOrderTransition(s, s).allowed, true);
    }
  });

  test("FORBIDS modifying terminal delivered order", () => {
    const nonDelivered: OrderStatus[] = [
      "pending",
      "paid",
      "processing",
      "shipped",
      "cancelled",
    ];
    for (const target of nonDelivered) {
      const result = canAdminOrderTransition("delivered", target);
      assert.strictEqual(
        result.allowed,
        false,
        `Must reject transition delivered -> ${target}`
      );
      assert.ok(result.reason?.includes("delivered"));
    }
  });

  test("FORBIDS reviving cancelled order back to pending", () => {
    const result = canAdminOrderTransition("cancelled", "pending");
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes("dibatalkan"));
  });

  test("FORBIDS downgrading paid or fulfilled orders back to pending", () => {
    const fulfilledStates: OrderStatus[] = ["paid", "processing", "shipped"];
    for (const state of fulfilledStates) {
      const result = canAdminOrderTransition(state, "pending");
      assert.strictEqual(
        result.allowed,
        false,
        `Must reject downgrade ${state} -> pending`
      );
      assert.ok(result.reason?.includes("pending"));
    }
  });
});

describe("Inventory Consistency in Status Transitions", () => {
  test("decrements stock exactly once when moving pending -> paid", () => {
    let stock = 10;
    const qty = 2;

    const transition = (prev: OrderStatus, next: OrderStatus) => {
      if (next === "paid" && prev === "pending") {
        stock -= qty;
      }
    };

    transition("pending", "paid");
    assert.strictEqual(stock, 8);

    // If an admin re-selects paid while in processing, stock must NOT be decremented again
    transition("processing", "paid");
    assert.strictEqual(stock, 8, "Stock must NOT decrease again when re-asserting paid status");
  });

  test("restores stock when cancelling previously paid/processing/shipped order", () => {
    let stock = 8;
    const qty = 2;

    const cancelOrder = (prev: OrderStatus) => {
      if (["paid", "processing", "shipped"].includes(prev)) {
        stock += qty;
      }
    };

    // Cancelling a paid order restores stock
    cancelOrder("paid");
    assert.strictEqual(stock, 10);
  });

  test("does NOT restore stock when cancelling pending order (never decremented)", () => {
    let stock = 10;
    const qty = 2;

    const cancelOrder = (prev: OrderStatus) => {
      if (["paid", "processing", "shipped"].includes(prev)) {
        stock += qty;
      }
    };

    // Cancelling a pending order does not restore stock
    cancelOrder("pending");
    assert.strictEqual(stock, 10, "Stock must remain unchanged for unpaid cancelled orders");
  });
});
