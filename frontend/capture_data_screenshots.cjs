const { chromium } = require("@playwright/test");

const ARTIFACTS_DIR = "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476";

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    // 1. Quality Tab — Dark Desktop 1440px
    console.log("Capturing Quality Tab Dark Desktop 1440px...");
    const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDark.goto("http://127.0.0.1:5173/app/data", { waitUntil: "networkidle" });
    await pageDark.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageDark.waitForTimeout(2000);

    await pageDark.screenshot({
      path: `${ARTIFACTS_DIR}/data-page-quality-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: data-page-quality-dark-desktop-1440.png");

    // 2. Clean Data Modal with Preview Diff — Dark Desktop 1440px
    console.log("Capturing Clean Data Modal with Preview Diff...");
    // Click "Clean Data" button
    const cleanBtn = pageDark.getByRole("button", { name: "Clean Data" });
    if (await cleanBtn.count() > 0) {
      await cleanBtn.first().click();
      await pageDark.waitForTimeout(600);

      // Click "Preview Diff"
      const previewBtn = pageDark.getByRole("button", { name: "Preview Diff" });
      if (await previewBtn.count() > 0) {
        await previewBtn.first().click();
        await pageDark.waitForTimeout(1500);
      }

      await pageDark.screenshot({
        path: `${ARTIFACTS_DIR}/data-page-clean-modal-dark-desktop-1440.png`,
        fullPage: false,
      });
      console.log("Saved: data-page-clean-modal-dark-desktop-1440.png");

      // Close modal
      const cancelBtn = pageDark.getByRole("button", { name: "Cancel" });
      if (await cancelBtn.count() > 0) {
        await cancelBtn.first().click();
        await pageDark.waitForTimeout(500);
      }
    }

    // 3. Quality Copilot Drawer — Dark Desktop 1440px
    console.log("Capturing Quality Copilot Drawer...");
    const copilotBtn = pageDark.getByRole("button", { name: "Ask Copilot" });
    if (await copilotBtn.count() > 0) {
      await copilotBtn.first().click();
      await pageDark.waitForTimeout(2000);

      await pageDark.screenshot({
        path: `${ARTIFACTS_DIR}/data-page-copilot-dark-desktop-1440.png`,
        fullPage: false,
      });
      console.log("Saved: data-page-copilot-dark-desktop-1440.png");

      // Close copilot
      const closeBtn = pageDark.getByRole("button", { name: "Close" });
      if (await closeBtn.count() > 0) {
        await closeBtn.first().click();
        await pageDark.waitForTimeout(500);
      }
    }

    // 4. Version Lineage Tab — Dark Desktop 1440px
    console.log("Capturing Version Lineage Tab...");
    const versionsTab = pageDark.getByRole("button", { name: /Version Lineage/ });
    if (await versionsTab.count() > 0) {
      await versionsTab.first().click();
      await pageDark.waitForTimeout(1200);

      await pageDark.screenshot({
        path: `${ARTIFACTS_DIR}/data-page-versions-dark-desktop-1440.png`,
        fullPage: false,
      });
      console.log("Saved: data-page-versions-dark-desktop-1440.png");
    }

    await pageDark.close();

    // 5. Quality Tab — Light Desktop 1440px
    console.log("Capturing Quality Tab Light Desktop 1440px...");
    const pageLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageLight.goto("http://127.0.0.1:5173/app/data", { waitUntil: "networkidle" });
    await pageLight.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("bizlens_theme", "light");
      window.scrollTo(0, 0);
    });
    await pageLight.waitForTimeout(2000);

    await pageLight.screenshot({
      path: `${ARTIFACTS_DIR}/data-page-quality-light-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: data-page-quality-light-desktop-1440.png");
    await pageLight.close();

    // 6. Quality Tab — Hybrid Desktop 1440px
    console.log("Capturing Quality Tab Hybrid Desktop 1440px...");
    const pageHybrid = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageHybrid.goto("http://127.0.0.1:5173/app/data", { waitUntil: "networkidle" });
    await pageHybrid.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "hybrid");
      localStorage.setItem("bizlens_theme", "hybrid");
      window.scrollTo(0, 0);
    });
    await pageHybrid.waitForTimeout(2000);

    await pageHybrid.screenshot({
      path: `${ARTIFACTS_DIR}/data-page-quality-hybrid-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: data-page-quality-hybrid-desktop-1440.png");
    await pageHybrid.close();

    // 7. Dark Mobile 390px
    console.log("Capturing Quality Tab Dark Mobile 390px...");
    const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pageMobile.goto("http://127.0.0.1:5173/app/data", { waitUntil: "networkidle" });
    await pageMobile.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageMobile.waitForTimeout(2000);

    await pageMobile.screenshot({
      path: `${ARTIFACTS_DIR}/data-page-quality-dark-mobile-390.png`,
      fullPage: false,
    });
    console.log("Saved: data-page-quality-dark-mobile-390.png");
    await pageMobile.close();

  } catch (err) {
    console.error("Error capturing screenshots:", err);
  } finally {
    await browser.close();
  }
}

capture();
