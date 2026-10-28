const { chromium } = require("@playwright/test");

const ARTIFACTS_DIR = "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476";

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    // 1. Landing Dark Desktop 1440px
    console.log("1. Capturing Landing Dark Desktop 1440px...");
    const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDark.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
    await pageDark.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageDark.waitForSelector("text=Turn Your Data Into", { timeout: 15000 });
    await pageDark.waitForTimeout(2000);
    await pageDark.screenshot({
      path: `${ARTIFACTS_DIR}/landing-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: landing-dark-desktop-1440.png");
    await pageDark.close();

    // 2. Landing Light Desktop 1440px
    console.log("2. Capturing Landing Light Desktop 1440px...");
    const pageLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageLight.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
    await pageLight.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("bizlens_theme", "light");
      window.scrollTo(0, 0);
    });
    await pageLight.waitForSelector("text=Turn Your Data Into", { timeout: 15000 });
    await pageLight.waitForTimeout(2000);
    await pageLight.screenshot({
      path: `${ARTIFACTS_DIR}/landing-light-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: landing-light-desktop-1440.png");
    await pageLight.close();

    // 3. Landing Hybrid Desktop 1440px
    console.log("3. Capturing Landing Hybrid Desktop 1440px...");
    const pageHybrid = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageHybrid.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
    await pageHybrid.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "hybrid");
      localStorage.setItem("bizlens_theme", "hybrid");
      window.scrollTo(0, 0);
    });
    await pageHybrid.waitForSelector("text=Turn Your Data Into", { timeout: 15000 });
    await pageHybrid.waitForTimeout(2000);
    await pageHybrid.screenshot({
      path: `${ARTIFACTS_DIR}/landing-hybrid-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: landing-hybrid-desktop-1440.png");
    await pageHybrid.close();

    // 4. Landing Dark Mobile 390px
    console.log("4. Capturing Landing Dark Mobile 390px...");
    const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pageMobile.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
    await pageMobile.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageMobile.waitForSelector("text=Turn Your Data Into", { timeout: 15000 });
    await pageMobile.waitForTimeout(2000);
    await pageMobile.screenshot({
      path: `${ARTIFACTS_DIR}/landing-dark-mobile-390.png`,
      fullPage: false,
    });
    console.log("Saved: landing-dark-mobile-390.png");
    await pageMobile.close();

    // 5. Product Dark Desktop 1440px
    console.log("5. Capturing Product Dark Desktop 1440px...");
    const pageProduct = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageProduct.goto("http://127.0.0.1:5173/product", { waitUntil: "networkidle" });
    await pageProduct.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageProduct.waitForSelector("text=The BizLens Intelligence Architecture", { timeout: 15000 });
    await pageProduct.waitForTimeout(2000);
    await pageProduct.screenshot({
      path: `${ARTIFACTS_DIR}/product-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: product-dark-desktop-1440.png");
    await pageProduct.close();

    console.log("All 5 polish screenshots captured successfully!");
  } catch (err) {
    console.error("Screenshot capture failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

capture();
