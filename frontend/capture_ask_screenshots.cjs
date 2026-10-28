const { chromium } = require("@playwright/test");

const ARTIFACTS_DIR = "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476";

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    const pageDark = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDark.goto("http://127.0.0.1:5173/app/ask", { waitUntil: "networkidle" });
    await pageDark.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageDark.waitForTimeout(1000);

    // 1. Empty State
    console.log("1. Capturing Empty State Dark Desktop 1440px...");
    await pageDark.screenshot({
      path: `${ARTIFACTS_DIR}/ask-bizlens-empty-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: ask-bizlens-empty-dark-desktop-1440.png");

    // 2. Type query & click Send -> might trigger Consent Modal or go straight to chat
    console.log("2. Sending query...");
    const input = pageDark.getByPlaceholder(/Ask anything about your data/i);
    await input.fill("What were our top-performing product categories by revenue?");
    await pageDark.getByRole("button", { name: /Send/i }).click();
    await pageDark.waitForTimeout(800);

    // Check if Consent Modal popped up
    const consentBtn = pageDark.getByRole("button", { name: /I Consent & Continue/i });
    if (await consentBtn.count() > 0) {
      console.log("Consent modal detected. Capturing Consent Modal screenshot...");
      await pageDark.screenshot({
        path: `${ARTIFACTS_DIR}/ask-bizlens-consent-dark-desktop-1440.png`,
        fullPage: false,
      });
      console.log("Saved: ask-bizlens-consent-dark-desktop-1440.png");

      // Click I Consent & Continue
      await consentBtn.click();
      console.log("Clicked consent. Waiting for answer...");
    } else {
      console.log("Consent already granted. Waiting for answer...");
    }

    // Wait for response with tagged blocks
    await pageDark.waitForSelector("text=[CALCULATED FACT]", { timeout: 20000 });
    await pageDark.waitForTimeout(1500);

    // 3. Active Chat with Tagged Blocks
    console.log("3. Capturing Active Chat Dark Desktop 1440px...");
    await pageDark.screenshot({
      path: `${ARTIFACTS_DIR}/ask-bizlens-chat-dark-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: ask-bizlens-chat-dark-desktop-1440.png");

    // 4. Evidence Drawer
    console.log("4. Opening Evidence Drawer...");
    const evidenceBtn = pageDark.getByRole("button", { name: /View Evidence/i });
    if (await evidenceBtn.count() > 0) {
      await evidenceBtn.first().click();
      await pageDark.waitForTimeout(1200);

      await pageDark.screenshot({
        path: `${ARTIFACTS_DIR}/ask-bizlens-evidence-dark-desktop-1440.png`,
        fullPage: false,
      });
      console.log("Saved: ask-bizlens-evidence-dark-desktop-1440.png");
    }

    await pageDark.close();

    // 5. Active Chat — Light Desktop 1440px
    console.log("5. Capturing Light Desktop 1440px...");
    const pageLight = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageLight.goto("http://127.0.0.1:5173/app/ask", { waitUntil: "networkidle" });
    await pageLight.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("bizlens_theme", "light");
      window.scrollTo(0, 0);
    });
    await pageLight.waitForTimeout(1500);
    const inputLight = pageLight.getByPlaceholder(/Ask anything about your data/i);
    if (await inputLight.count() > 0) {
      await inputLight.fill("Summarize revenue performance and margins");
      await pageLight.getByRole("button", { name: /Send/i }).click();
      await pageLight.waitForSelector("text=[CALCULATED FACT]", { timeout: 20000 }).catch(e => console.log(e.message));
      await pageLight.waitForTimeout(1200);
    }
    await pageLight.screenshot({
      path: `${ARTIFACTS_DIR}/ask-bizlens-light-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: ask-bizlens-light-desktop-1440.png");
    await pageLight.close();

    // 6. Active Chat — Hybrid Desktop 1440px
    console.log("6. Capturing Hybrid Desktop 1440px...");
    const pageHybrid = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageHybrid.goto("http://127.0.0.1:5173/app/ask", { waitUntil: "networkidle" });
    await pageHybrid.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "hybrid");
      localStorage.setItem("bizlens_theme", "hybrid");
      window.scrollTo(0, 0);
    });
    await pageHybrid.waitForTimeout(1500);
    const inputHybrid = pageHybrid.getByPlaceholder(/Ask anything about your data/i);
    if (await inputHybrid.count() > 0) {
      await inputHybrid.fill("What is our gross margin health?");
      await pageHybrid.getByRole("button", { name: /Send/i }).click();
      await pageHybrid.waitForSelector("text=[CALCULATED FACT]", { timeout: 20000 }).catch(e => console.log(e.message));
      await pageHybrid.waitForTimeout(1200);
    }
    await pageHybrid.screenshot({
      path: `${ARTIFACTS_DIR}/ask-bizlens-hybrid-desktop-1440.png`,
      fullPage: false,
    });
    console.log("Saved: ask-bizlens-hybrid-desktop-1440.png");
    await pageHybrid.close();

    // 7. Mobile Viewport 390px — Dark Theme
    console.log("7. Capturing Mobile Dark 390px...");
    const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pageMobile.goto("http://127.0.0.1:5173/app/ask", { waitUntil: "networkidle" });
    await pageMobile.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
      window.scrollTo(0, 0);
    });
    await pageMobile.waitForTimeout(1500);
    const inputMobile = pageMobile.getByPlaceholder(/Ask anything about your data/i);
    if (await inputMobile.count() > 0) {
      await inputMobile.fill("Top categories by sales");
      await pageMobile.getByRole("button", { name: /Send/i }).click();
      await pageMobile.waitForSelector("text=[CALCULATED FACT]", { timeout: 20000 }).catch(e => console.log(e.message));
      await pageMobile.waitForTimeout(1200);
    }
    await pageMobile.screenshot({
      path: `${ARTIFACTS_DIR}/ask-bizlens-dark-mobile-390.png`,
      fullPage: false,
    });
    console.log("Saved: ask-bizlens-dark-mobile-390.png");
    await pageMobile.close();

  } catch (err) {
    console.error("Screenshot capture error:", err);
  } finally {
    await browser.close();
  }
}

capture().then(() => console.log("All screenshots successfully captured!"));
