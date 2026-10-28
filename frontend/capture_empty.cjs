const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:5173/app/ask", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("bizlens_theme", "dark");
  });
  await page.waitForTimeout(1000);

  const newChatBtn = page.locator("button[title='New Chat']");
  if (await newChatBtn.count() > 0) {
    await newChatBtn.first().click();
    console.log("Clicked New Chat. Waiting for empty state...");
    await page.waitForSelector("text=Meet BizLens AI", { timeout: 10000 });
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476/ask-bizlens-empty-dark-desktop-1440.png",
      fullPage: false,
    });
    console.log("Saved empty state screenshot!");
  }
  await browser.close();
})();
