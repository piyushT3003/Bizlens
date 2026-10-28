const { chromium } = require("@playwright/test");

const ARTIFACTS_DIR = "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476";

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    // 1. Dark Desktop 1440px
    console.log("1. Capturing Forecast Observatory Dark Desktop 1440px...");
    const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDark.goto("http://127.0.0.1:5173/app/dashboard?view=observatory", { waitUntil: "networkidle" });
    await pageDark.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    // Wait for the Observatory component to load
    await pageDark.waitForSelector("text=RULES.md Certified (0 Fake ML Metrics)", { timeout: 15000 });
    await pageDark.waitForTimeout(2500);
    await pageDark.screenshot({
      path: `${ARTIFACTS_DIR}/observatory-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: observatory-dark-desktop-1440.png");
    await pageDark.close();

    // 2. Light Desktop 1440px
    console.log("2. Capturing Forecast Observatory Light Desktop 1440px...");
    const pageLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageLight.goto("http://127.0.0.1:5173/app/dashboard?view=observatory", { waitUntil: "networkidle" });
    await pageLight.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("bizlens_theme", "light");
      window.scrollTo(0, 0);
    });
    await pageLight.waitForSelector("text=RULES.md Certified (0 Fake ML Metrics)", { timeout: 15000 });
    await pageLight.waitForTimeout(2000);
    await pageLight.screenshot({
      path: `${ARTIFACTS_DIR}/observatory-light-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: observatory-light-desktop-1440.png");
    await pageLight.close();

    // 3. Hybrid Desktop 1440px
    console.log("3. Capturing Forecast Observatory Hybrid Desktop 1440px...");
    const pageHybrid = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageHybrid.goto("http://127.0.0.1:5173/app/dashboard?view=observatory", { waitUntil: "networkidle" });
    await pageHybrid.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "hybrid");
      localStorage.setItem("bizlens_theme", "hybrid");
      window.scrollTo(0, 0);
    });
    await pageHybrid.waitForSelector("text=RULES.md Certified (0 Fake ML Metrics)", { timeout: 15000 });
    await pageHybrid.waitForTimeout(2000);
    await pageHybrid.screenshot({
      path: `${ARTIFACTS_DIR}/observatory-hybrid-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: observatory-hybrid-desktop-1440.png");
    await pageHybrid.close();

    // 4. Dark Mobile 390px
    console.log("4. Capturing Forecast Observatory Dark Mobile 390px...");
    const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pageMobile.goto("http://127.0.0.1:5173/app/dashboard?view=observatory", { waitUntil: "networkidle" });
    await pageMobile.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageMobile.waitForSelector("text=RULES.md Certified (0 Fake ML Metrics)", { timeout: 15000 });
    await pageMobile.waitForTimeout(2000);
    await pageMobile.screenshot({
      path: `${ARTIFACTS_DIR}/observatory-dark-mobile-390.png`,
      fullPage: false,
    });
    console.log("Saved: observatory-dark-mobile-390.png");
    await pageMobile.close();

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
    const viewBtn = await pageModal.$('button:has-text("View Validation Table")');
    if (viewBtn) {
      await viewBtn.click();
      await pageModal.waitForSelector("text=Held-out Period Backtest Validation Table", { timeout: 5000 });
      await pageModal.waitForTimeout(1000);
      await pageModal.screenshot({
        path: `${ARTIFACTS_DIR}/observatory-backtest-modal-1440.png`,
        fullPage: false,
      });
      console.log("Saved: observatory-backtest-modal-1440.png");
    } else {
      console.warn("Could not find 'View Validation Table' button");
    }
    await pageModal.close();

    console.log("All 5 Phase 10 screenshots captured successfully!");
  } catch (err) {
    console.error("Error capturing screenshots:", err);
  } finally {
    await browser.close();
  }
}

capture();
