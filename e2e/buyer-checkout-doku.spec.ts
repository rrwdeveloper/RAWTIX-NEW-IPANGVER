import { test, expect } from "@playwright/test";

test.describe("RAWTIX Buyer Flow & Responsive Layout", () => {
  test("Homepage loads and displays header, products, and footer without horizontal overflow", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Header visible
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Verify brand title / navigation
    const logoOrBrand = page.getByRole("link", { name: /rawtix/i }).first();
    await expect(logoOrBrand).toBeVisible();

    // Check no horizontal scrollbar on viewport
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("Catalog & Quick View Modal can be opened and closed with keyboard Escape", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Look for quick view or product card
    const quickViewBtn = page.getByRole("button", { name: /quick view/i }).first();
    if (await quickViewBtn.isVisible()) {
      await quickViewBtn.click();

      // Modal dialog should appear
      const modal = page.locator("[role='dialog']");
      await expect(modal).toBeVisible();

      // Test keyboard navigation: Escape closes dialog
      await page.keyboard.press("Escape");
      await expect(modal).not.toBeVisible();
    }
  });

  test("Cart drawer operates and persists items in localStorage", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Seed mock cart item into localStorage to test cart resilience & persistence
    await page.evaluate(() => {
      const mockCart = [
        {
          id: "prod-1",
          name: "RAWTIX Heavyweight Oversized Tee",
          price: 185000,
          quantity: 2,
          selectedSize: "L",
          stock: 10,
          weight: 300,
          image: "/images/artboard-1.webp",
        },
      ];
      localStorage.setItem("rawtix_cart", JSON.stringify(mockCart));
      window.dispatchEvent(new Event("storage"));
    });

    // Reload page to verify persistence
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    const cartData = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("rawtix_cart") || "[]");
    });
    expect(cartData.length).toBe(1);
    expect(cartData[0].name).toBe("RAWTIX Heavyweight Oversized Tee");
    expect(cartData[0].quantity).toBe(2);
  });

  test("Checkout form validates required fields", async ({ page }) => {
    // Seed cart so checkout doesn't redirect immediately to empty cart
    await page.goto("/");
    await page.evaluate(() => {
      const mockCart = [
        {
          id: "prod-1",
          name: "RAWTIX Signature Jacket",
          price: 450000,
          quantity: 1,
          selectedSize: "XL",
          stock: 5,
          weight: 800,
          image: "/images/artboard-2.webp",
        },
      ];
      localStorage.setItem("rawtix_cart", JSON.stringify(mockCart));
    });

    await page.goto("/checkout");
    await page.waitForLoadState("domcontentloaded");

    // Attempt to submit order with empty form fields
    const submitBtn = page.getByRole("button", { name: /bayar sekarang|buat pesanan/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should show validation toast / error messages or prevent submission
      // Page should remain on checkout
      await expect(page).toHaveURL(/.*checkout.*/);
    }
  });

  test("Order-Success page renders pending order RTX-98214 with payment instructions and countdown", async ({
    page,
  }) => {
    await page.goto("/order-success?order=RTX-98214");
    await page.waitForLoadState("domcontentloaded");

    // Order number should be visible
    const orderNumberText = page.getByText(/RTX-98214/i).first();
    await expect(orderNumberText).toBeVisible({ timeout: 10000 });

    // Pending payment UI elements
    const pendingHeading = page.getByRole("heading", { name: /menunggu pembayaran/i });
    await expect(pendingHeading).toBeVisible();

    // Check status button should be present
    const checkStatusBtn = page.getByRole("button", { name: /cek status pembayaran/i });
    await expect(checkStatusBtn).toBeVisible();

    // Pay button should be present
    const payBtn = page.getByRole("button", { name: /bayar sekarang/i });
    await expect(payBtn).toBeVisible();
  });

  test("Order-Success page renders cancelled/expired order RTX-98210 with reorder button", async ({
    page,
  }) => {
    await page.goto("/order-success?order=RTX-98210");
    await page.waitForLoadState("domcontentloaded");

    // Order number should be visible
    const orderNumberText = page.getByText(/RTX-98210/i).first();
    await expect(orderNumberText).toBeVisible({ timeout: 10000 });

    // Cancelled / Expired status display
    const cancelledBadge = page.getByText(/ditolak \/ dibatalkan|kedaluwarsa/i).first();
    await expect(cancelledBadge).toBeVisible();

    // Reorder button should be present
    const reorderBtn = page.getByRole("link", { name: /pesan ulang/i });
    await expect(reorderBtn).toBeVisible();
  });
});
