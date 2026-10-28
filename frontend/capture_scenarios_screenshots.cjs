const { chromium } = require("@playwright/test");

const ARTIFACTS_DIR = "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476";

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    // 1. Dark Desktop 1440px (Variance Waterfall View)
    console.log("1. Capturing What-If Scenario Dark Desktop 1440px...");
    const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDark.goto("http://127.0.0.1:5173/app/what-if", { waitUntil: "networkidle" });
    await pageDark.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageDark.waitForSelector("text=PANEL 8: SCENARIO SIMULATOR", { timeout: 15000 });
    await pageDark.waitForTimeout(2500);
    await pageDark.screenshot({
      path: `${ARTIFACTS_DIR}/what-if-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: what-if-dark-desktop-1440.png");
    await pageDark.close();

    // 2. Light Desktop 1440px
    console.log("2. Capturing What-If Scenario Light Desktop 1440px...");
    const pageLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageLight.goto("http://127.0.0.1:5173/app/what-if", { waitUntil: "networkidle" });
    await pageLight.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("bizlens_theme", "light");
      window.scrollTo(0, 0);
    });
    await pageLight.waitForSelector("text=PANEL 8: SCENARIO SIMULATOR", { timeout: 15000 });
    await pageLight.waitForTimeout(2000);
    await pageLight.screenshot({
      path: `${ARTIFACTS_DIR}/what-if-light-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: what-if-light-desktop-1440.png");
    await pageLight.close();

    // 3. Hybrid Desktop 1440px
    console.log("3. Capturing What-If Scenario Hybrid Desktop 1440px...");
    const pageHybrid = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageHybrid.goto("http://127.0.0.1:5173/app/what-if", { waitUntil: "networkidle" });
    await pageHybrid.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "hybrid");
      localStorage.setItem("bizlens_theme", "hybrid");
      window.scrollTo(0, 0);
    });
    await pageHybrid.waitForSelector("text=PANEL 8: SCENARIO SIMULATOR", { timeout: 15000 });
    await pageHybrid.waitForTimeout(2000);
    await pageHybrid.screenshot({
      path: `${ARTIFACTS_DIR}/what-if-hybrid-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: what-if-hybrid-desktop-1440.png");
    await pageHybrid.close();

    // 4. Dark Mobile 390px
    console.log("4. Capturing What-If Scenario Dark Mobile 390px...");
    const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pageMobile.goto("http://127.0.0.1:5173/app/what-if", { waitUntil: "networkidle" });
    await pageMobile.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageMobile.waitForSelector("text=PANEL 8: SCENARIO SIMULATOR", { timeout: 15000 });
    await pageMobile.waitForTimeout(2000);
    await pageMobile.screenshot({
      path: `${ARTIFACTS_DIR}/what-if-dark-mobile-390.png`,
      fullPage: false,
    });
    console.log("Saved: what-if-dark-mobile-390.png");
    await pageMobile.close();

    // 5. Sensitivity Matrix Tab (1440px)
    console.log("5. Capturing Sensitivity Matrix Tab 1440px...");
    const pageSens = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageSens.goto("http://127.0.0.1:5173/app/what-if", { waitUntil: "networkidle" });
    await pageSens.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageSens.waitForSelector("text=PANEL 8: SCENARIO SIMULATOR", { timeout: 15000 });
    await pageSens.waitForTimeout(1500);
    const sensBtn = pageSens.locator('button:has-text("Sensitivity Matrix")').first();
    await sensBtn.click();
    await pageSens.waitForSelector("text=Price × Cost Profit Sensitivity Matrix", { timeout: 8000 });
    await pageSens.waitForTimeout(1000);
    await pageSens.screenshot({
      path: `${ARTIFACTS_DIR}/what-if-sensitivity-1440.png`,
      fullPage: false,
    });
    console.log("Saved: what-if-sensitivity-1440.png");
    await pageSens.close();

    // 6. Side-by-Side Compare Modal (1440px)
    console.log("6. Capturing Side-by-Side Compare Modal 1440px...");
    const pageModal = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageModal.goto("http://127.0.0.1:5173/app/what-if", { waitUntil: "networkidle" });
    await pageModal.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageModal.waitForSelector("text=PANEL 8: SCENARIO SIMULATOR", { timeout: 15000 });
    await pageModal.waitForTimeout(1500);

    // Save a quick scenario first if none saved yet so compare has content
    const saveBtn = pageModal.locator('button:has-text("Save Run")').first();
    if (await saveBtn.count() > 0) {
      await saveBtn.click();
      await pageModal.waitForTimeout(800);
      const submitBtn = pageModal.locator('button:has-text("Save Checkpoint")').first();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await pageModal.waitForTimeout(1200);
      }
    }

    const compareBtn = pageModal.locator('button:has-text("Compare")').first();
    await compareBtn.click();
    await pageModal.waitForSelector("text=Side-by-Side Scenario Comparison", { timeout: 8000 });
    await pageModal.waitForTimeout(1000);
    await pageModal.screenshot({
      path: `${ARTIFACTS_DIR}/what-if-compare-modal-1440.png`,
      fullPage: false,
    });
    console.log("Saved: what-if-compare-modal-1440.png");
    await pageModal.close();

    console.log("All Phase 11 screenshots captured successfully!");
  } catch (err) {
    console.error("Error capturing screenshots:", err);
  } finally {
    await browser.close();
  }
}

capture();
