const { chromium } = require("@playwright/test");

const ARTIFACTS_DIR = "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476";

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    // 5. Backtest Validation Modal (1440px)
    console.log("5. Capturing Backtest Validation Modal 1440px...");
    const pageModal = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageModal.goto("http://127.0.0.1:5173/app/dashboard?view=observatory", { waitUntil: "networkidle" });
    await pageModal.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageModal.waitForSelector("text=RULES.md Certified (0 Fake ML Metrics)", { timeout: 15000 });
    await pageModal.waitForTimeout(1500);

    const viewBtn = pageModal.locator('button:has-text("View Validation Table")').first();
    await viewBtn.click();
    await pageModal.waitForSelector("text=Held-Out Backtest Validation Detail", { timeout: 10000 });
    await pageModal.waitForTimeout(1000);
    await pageModal.screenshot({
      path: `${ARTIFACTS_DIR}/observatory-backtest-modal-1440.png`,
      fullPage: false,
    });
    console.log("Saved: observatory-backtest-modal-1440.png");
    await pageModal.close();

    console.log("Phase 10 modal screenshot captured successfully!");
  } catch (err) {
    console.error("Error capturing modal screenshot:", err);
  } finally {
    await browser.close();
  }
}

capture();
