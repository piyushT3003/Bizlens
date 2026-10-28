const { chromium } = require("@playwright/test");

const ARTIFACTS_DIR = "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476";

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    // 1. Dark Desktop 1440px
    console.log("1. Capturing Dark Desktop 1440px...");
    const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDark.goto("http://127.0.0.1:5173/app/reports", { waitUntil: "networkidle" });
    await pageDark.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageDark.waitForTimeout(2000);
    await pageDark.screenshot({
      path: `${ARTIFACTS_DIR}/reports-page-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: reports-page-dark-desktop-1440.png");

    // Scroll to bottom for Archive Section
    console.log("2. Capturing Report Archive section...");
    await pageDark.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await pageDark.waitForTimeout(1000);
    await pageDark.screenshot({
      path: `${ARTIFACTS_DIR}/reports-archive-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: reports-archive-dark-desktop-1440.png");
    await pageDark.close();

    // 2. Light Desktop 1440px
    console.log("3. Capturing Light Desktop 1440px...");
    const pageLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageLight.goto("http://127.0.0.1:5173/app/reports", { waitUntil: "networkidle" });
    await pageLight.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("bizlens_theme", "light");
      window.scrollTo(0, 0);
    });
    await pageLight.waitForTimeout(2000);
    await pageLight.screenshot({
      path: `${ARTIFACTS_DIR}/reports-page-light-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: reports-page-light-desktop-1440.png");
    await pageLight.close();

    // 3. Hybrid Desktop 1440px
    console.log("4. Capturing Hybrid Desktop 1440px...");
    const pageHybrid = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageHybrid.goto("http://127.0.0.1:5173/app/reports", { waitUntil: "networkidle" });
    await pageHybrid.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "hybrid");
      localStorage.setItem("bizlens_theme", "hybrid");
      window.scrollTo(0, 0);
    });
    await pageHybrid.waitForTimeout(2000);
    await pageHybrid.screenshot({
      path: `${ARTIFACTS_DIR}/reports-page-hybrid-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: reports-page-hybrid-desktop-1440.png");
    await pageHybrid.close();

    // 4. Dark Mobile 390px
    console.log("5. Capturing Dark Mobile 390px...");
    const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pageMobile.goto("http://127.0.0.1:5173/app/reports", { waitUntil: "networkidle" });
    await pageMobile.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageMobile.waitForTimeout(2000);
    await pageMobile.screenshot({
      path: `${ARTIFACTS_DIR}/reports-page-dark-mobile-390.png`,
      fullPage: false,
    });
    console.log("Saved: reports-page-dark-mobile-390.png");
    await pageMobile.close();

    // 5. Filter Drawer (Fresh Page)
    console.log("6. Capturing Filter Drawer...");
    const pageDrawer = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDrawer.goto("http://127.0.0.1:5173/app/reports", { waitUntil: "networkidle" });
    await pageDrawer.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageDrawer.waitForTimeout(1500);
    const filterBtn = await pageDrawer.$('button:has-text("Edit Filters")');
    if (filterBtn) {
      await filterBtn.click();
      await pageDrawer.waitForTimeout(1000);
      await pageDrawer.screenshot({
        path: `${ARTIFACTS_DIR}/reports-page-filter-drawer-1440.png`,
        fullPage: false,
      });
      console.log("Saved: reports-page-filter-drawer-1440.png");
    }
    await pageDrawer.close();

    // 6. Full Document Preview Modal (Fresh Page)
    console.log("7. Capturing Full Document Preview Modal...");
    const pagePreview = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pagePreview.goto("http://127.0.0.1:5173/app/reports", { waitUntil: "networkidle" });
    await pagePreview.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pagePreview.waitForTimeout(2000);
    const previewBtn = await pagePreview.$('button[title="Expand Full Preview"]');
    if (previewBtn) {
      await previewBtn.click();
      await pagePreview.waitForTimeout(1200);
      await pagePreview.screenshot({
        path: `${ARTIFACTS_DIR}/reports-page-full-preview-1440.png`,
        fullPage: false,
      });
      console.log("Saved: reports-page-full-preview-1440.png");
    }
    await pagePreview.close();

    console.log("All Phase 8 screenshots captured successfully!");
  } catch (err) {
    console.error("Error capturing screenshots:", err);
  } finally {
    await browser.close();
  }
}

capture();
