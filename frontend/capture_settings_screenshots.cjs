const { chromium } = require("@playwright/test");

const ARTIFACTS_DIR = "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476";

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    // 1. Dark Desktop 1440px (Profile & Configuration Crystal)
    console.log("1. Capturing Settings Dark Desktop 1440px...");
    const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDark.goto("http://127.0.0.1:5173/app/settings", { waitUntil: "networkidle" });
    await pageDark.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageDark.waitForSelector("text=PANEL 9: CONFIGURATION CRYSTAL", { timeout: 15000 });
    await pageDark.waitForTimeout(2000);
    await pageDark.screenshot({
      path: `${ARTIFACTS_DIR}/settings-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: settings-dark-desktop-1440.png");
    await pageDark.close();

    // 2. Light Desktop 1440px
    console.log("2. Capturing Settings Light Desktop 1440px...");
    const pageLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageLight.goto("http://127.0.0.1:5173/app/settings", { waitUntil: "networkidle" });
    await pageLight.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("bizlens_theme", "light");
      window.scrollTo(0, 0);
    });
    await pageLight.waitForSelector("text=PANEL 9: CONFIGURATION CRYSTAL", { timeout: 15000 });
    await pageLight.waitForTimeout(2000);
    await pageLight.screenshot({
      path: `${ARTIFACTS_DIR}/settings-light-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: settings-light-desktop-1440.png");
    await pageLight.close();

    // 3. Hybrid Desktop 1440px
    console.log("3. Capturing Settings Hybrid Desktop 1440px...");
    const pageHybrid = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageHybrid.goto("http://127.0.0.1:5173/app/settings?tab=appearance", { waitUntil: "networkidle" });
    await pageHybrid.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "hybrid");
      localStorage.setItem("bizlens_theme", "hybrid");
      window.scrollTo(0, 0);
    });
    await pageHybrid.waitForSelector("text=PANEL 9: CONFIGURATION CRYSTAL", { timeout: 15000 });
    await pageHybrid.waitForTimeout(2000);
    await pageHybrid.screenshot({
      path: `${ARTIFACTS_DIR}/settings-hybrid-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: settings-hybrid-desktop-1440.png");
    await pageHybrid.close();

    // 4. Dark Mobile 390px
    console.log("4. Capturing Settings Dark Mobile 390px...");
    const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pageMobile.goto("http://127.0.0.1:5173/app/settings", { waitUntil: "networkidle" });
    await pageMobile.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageMobile.waitForSelector("text=PANEL 9: CONFIGURATION CRYSTAL", { timeout: 15000 });
    await pageMobile.waitForTimeout(2000);
    await pageMobile.screenshot({
      path: `${ARTIFACTS_DIR}/settings-dark-mobile-390.png`,
      fullPage: false,
    });
    console.log("Saved: settings-dark-mobile-390.png");
    await pageMobile.close();

    // 5. AI Configuration & Key Vault 1440px
    console.log("5. Capturing Settings AI Configuration & Key Vault 1440px...");
    const pageAi = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageAi.goto("http://127.0.0.1:5173/app/settings?tab=ai", { waitUntil: "networkidle" });
    await pageAi.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageAi.waitForSelector("text=Google Gemini AI Configuration & Key Vault", { timeout: 15000 });
    await pageAi.waitForTimeout(1000);

    // Click to open Configure Custom API Key modal/section
    const configKeyBtn = await pageAi.$("button:has-text('Configure Custom API Key'), button:has-text('Replace Custom Key')");
    if (configKeyBtn) {
      await configKeyBtn.click();
      await pageAi.waitForTimeout(1000);
    }

    await pageAi.screenshot({
      path: `${ARTIFACTS_DIR}/settings-ai-vault-1440.png`,
      fullPage: false,
    });
    console.log("Saved: settings-ai-vault-1440.png");
    await pageAi.close();

    console.log("All Phase 12 screenshots captured successfully!");
  } catch (err) {
    console.error("Screenshot capture error:", err);
  } finally {
    await browser.close();
  }
}

capture();
