import { test, expect } from "@playwright/test";

test.describe("Admin Backend & Security E2E Tests", () => {
  // Test across responsive breakpoints
  const viewports = [
    { name: "Desktop 1440px", width: 1440, height: 900 },
    { name: "Desktop 1280px", width: 1280, height: 800 },
    { name: "Desktop 1024px", width: 1024, height: 768 },
    { name: "Mobile 390px", width: 390, height: 844 },
    { name: "Mobile 360px", width: 360, height: 740 },
    { name: "Mobile 320px", width: 320, height: 568 },
  ];

  for (const vp of viewports) {
    test(`Admin login page renders without overflow at ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("/admin/login");
      await page.waitForLoadState("domcontentloaded");

      // Verify login form is present
      const emailInput = page.locator("input[type='email']");
      await expect(emailInput).toBeVisible({ timeout: 10000 });

      const passwordInput = page.locator("input[type='password']");
      await expect(passwordInput).toBeVisible();

      // Check no horizontal scrollbar overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);

      // Filter out non-actionable browser logs (favicon, fonts, hydration hints)
      const fatalErrors = consoleErrors.filter(
        (e) =>
          !e.includes("favicon") &&
          !e.includes("ResizeObserver") &&
          !e.includes("Failed to load resource")
      );
      expect(fatalErrors, JSON.stringify(fatalErrors)).toHaveLength(0);
    });
  }

  test("Direct access to /admin without credentials redirects to login securely", async ({
    page,
  }) => {
    // Clear any stored admin tokens
    await page.goto("/admin/login");
    await page.evaluate(() => {
      localStorage.removeItem("supabase.auth.token");
      sessionStorage.clear();
    });

    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    // Should redirect to /admin/login or show login form
    await expect(page).toHaveURL(/.*admin\/login.*/, { timeout: 10000 });
  });

  test("Direct POST to DOKU webhook without secret or signature is rejected (503/401)", async ({
    request,
  }) => {
    // Post without signature
    const response = await request.post("/api/doku-notification", {
      headers: { "Content-Type": "application/json" },
      data: { order: { invoice_number: "RTX-FAKE-01" } },
    });

    // Must be rejected with 401 or 503 (if secret unconfigured), never 200
    expect([400, 401, 503]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty("message");
    // Ensure no secret or stack trace leaked
    const bodyString = JSON.stringify(body);
    expect(bodyString).not.toContain("DOKU_SECRET_KEY");
    expect(bodyString).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
