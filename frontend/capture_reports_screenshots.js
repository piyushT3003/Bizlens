const { chromium } = require("@playwright/test");

const ARTIFACTS_DIR = "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476";

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    // 1. Dark Desktop 1440px
    console.log("Capturing Dark Desktop 1440px...");
    const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDark.goto("http://127.0.0.1:5173/app/reports", { waitUntil: "networkidle" });
    await pageDark.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
    });
    await pageDark.waitForTimeout(1500);

    // If report is not selected, click the first report card if available, or generate one
    const reportCard = pageDark.locator(".cursor-pointer").first();
    if (await reportCard.isVisible()) {
      await reportCard.click();
      await pageDark.waitForTimeout(800);
    }

    await pageDark.screenshot({
      path: `${ARTIFACTS_DIR}/reports-page-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: reports-page-dark-desktop-1440.png");
    await pageDark.close();

    // 2. Light Desktop 1440px
    console.log("Capturing Light Desktop 1440px...");
    const pageLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageLight.goto("http://127.0.0.1:5173/app/reports", { waitUntil: "networkidle" });
    await pageLight.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("bizlens_theme", "light");
    });
    await pageLight.waitForTimeout(1500);

    const reportCardLight = pageLight.locator(".cursor-pointer").first();
    if (await reportCardLight.isVisible()) {
      await reportCardLight.click();
      await pageLight.waitForTimeout(800);
    }

    await pageLight.screenshot({
      path: `${ARTIFACTS_DIR}/reports-page-light-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: reports-page-light-desktop-1440.png");
    await pageLight.close();

    // 3. Dark Mobile 390px
    console.log("Capturing Dark Mobile 390px...");
    const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pageMobile.goto("http://127.0.0.1:5173/app/reports", { waitUntil: "networkidle" });
    await pageMobile.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
    });
    await pageMobile.waitForTimeout(1500);

    await pageMobile.screenshot({
      path: `${ARTIFACTS_DIR}/reports-page-dark-mobile-390.png`,
      fullPage: false,
    });
    console.log("Saved: reports-page-dark-mobile-390.png");
    await pageMobile.close();

  } catch (err) {
    console.error("Error capturing screenshots:", err);
  } finally {
    await browser.close();
  }
}

capture();
