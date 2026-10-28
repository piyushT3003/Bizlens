const { chromium } = require("@playwright/test");

const ARTIFACTS_DIR = "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476";

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    // 1. Dark Desktop 1440px
    console.log("1. Capturing Insights Dark Desktop 1440px...");
    const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDark.goto("http://127.0.0.1:5173/app/insights", { waitUntil: "networkidle" });
    await pageDark.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageDark.waitForTimeout(2000);
    await pageDark.screenshot({
      path: `${ARTIFACTS_DIR}/insights-page-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: insights-page-dark-desktop-1440.png");
    await pageDark.close();

    // 2. Light Desktop 1440px
    console.log("2. Capturing Insights Light Desktop 1440px...");
    const pageLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageLight.goto("http://127.0.0.1:5173/app/insights", { waitUntil: "networkidle" });
    await pageLight.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("bizlens_theme", "light");
      window.scrollTo(0, 0);
    });
    await pageLight.waitForTimeout(2000);
    await pageLight.screenshot({
      path: `${ARTIFACTS_DIR}/insights-page-light-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: insights-page-light-desktop-1440.png");
    await pageLight.close();

    // 3. Hybrid Desktop 1440px
    console.log("3. Capturing Insights Hybrid Desktop 1440px...");
    const pageHybrid = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageHybrid.goto("http://127.0.0.1:5173/app/insights", { waitUntil: "networkidle" });
    await pageHybrid.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "hybrid");
      localStorage.setItem("bizlens_theme", "hybrid");
      window.scrollTo(0, 0);
    });
    await pageHybrid.waitForTimeout(2000);
    await pageHybrid.screenshot({
      path: `${ARTIFACTS_DIR}/insights-page-hybrid-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: insights-page-hybrid-desktop-1440.png");
    await pageHybrid.close();

    // 4. Dark Mobile 390px
    console.log("4. Capturing Insights Dark Mobile 390px...");
    const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pageMobile.goto("http://127.0.0.1:5173/app/insights", { waitUntil: "networkidle" });
    await pageMobile.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageMobile.waitForTimeout(2000);
    await pageMobile.screenshot({
      path: `${ARTIFACTS_DIR}/insights-page-dark-mobile-390.png`,
      fullPage: false,
    });
    console.log("Saved: insights-page-dark-mobile-390.png");
    await pageMobile.close();

    // 5. Evidence Drawer (Fresh Page)
    console.log("5. Capturing Insights Evidence Drawer...");
    const pageDrawer = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDrawer.goto("http://127.0.0.1:5173/app/insights", { waitUntil: "networkidle" });
    await pageDrawer.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageDrawer.waitForTimeout(1500);
    const lineageBtn = await pageDrawer.$('button:has-text("View Lineage")');
    if (lineageBtn) {
      await lineageBtn.click();
      await pageDrawer.waitForTimeout(1200);
      await pageDrawer.screenshot({
        path: `${ARTIFACTS_DIR}/insights-page-evidence-drawer-1440.png`,
        fullPage: false,
      });
      console.log("Saved: insights-page-evidence-drawer-1440.png");
    }
    await pageDrawer.close();

    // 6. AI Strategic Explain Modal (Fresh Page)
    console.log("6. Capturing AI Explain Modal...");
    const pageExplain = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageExplain.goto("http://127.0.0.1:5173/app/insights", { waitUntil: "networkidle" });
    await pageExplain.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageExplain.waitForTimeout(1500);
    const explainBtn = await pageExplain.$('button:has-text("Explain with AI")');
    if (explainBtn) {
      await explainBtn.click();
      await pageExplain.waitForTimeout(1800);
      await pageExplain.screenshot({
        path: `${ARTIFACTS_DIR}/insights-page-ai-explain-1440.png`,
        fullPage: false,
      });
      console.log("Saved: insights-page-ai-explain-1440.png");
    }
    await pageExplain.close();

    // 7. Decision Support Connected Page
    console.log("7. Capturing Connected Decision Support Page...");
    const pageDecisions = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDecisions.goto("http://127.0.0.1:5173/app/decisions", { waitUntil: "networkidle" });
    await pageDecisions.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageDecisions.waitForTimeout(2000);
    await pageDecisions.screenshot({
      path: `${ARTIFACTS_DIR}/decisions-page-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: decisions-page-dark-desktop-1440.png");
    await pageDecisions.close();

    console.log("All Phase 9 screenshots captured successfully!");
  } catch (err) {
    console.error("Error capturing screenshots:", err);
  } finally {
    await browser.close();
  }
}

capture();
