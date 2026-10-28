import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACT_DIR = "C:\\Users\\piyus\\.gemini\\antigravity\\brain\\0edf10ae-5049-498a-a82f-827cefb32476";

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  // 1. Desktop Dark - Ask a question
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://127.0.0.1:5173/app/ask", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
    });
    await page.waitForTimeout(1000);

    // Click first suggested prompt or type question
    const firstSuggested = page.locator("button:has-text('Summarize our overall revenue')").first();
    if (await firstSuggested.isVisible()) {
      await firstSuggested.click();
    } else {
      const input = page.locator("input[placeholder*='Ask questions']").first();
      await input.fill("Summarize our overall revenue and profitability performance.");
      await page.keyboard.press("Enter");
    }

    // Wait for response to render
    await page.waitForSelector("text=BizLens Verified Explanation", { timeout: 10000 });
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "ask-bizlens-dark-desktop-1440.png"),
      fullPage: false,
    });
    console.log("Saved: ask-bizlens-dark-desktop-1440.png");

    // 2. Expand Show Your Work Accordion
    const showWorkBtn = page.locator("button:has-text('Show Your Work')").first();
    if (await showWorkBtn.isVisible()) {
      await showWorkBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "ask-bizlens-show-work-dark-desktop-1440.png"),
        fullPage: false,
      });
      console.log("Saved: ask-bizlens-show-work-dark-desktop-1440.png");

      // 3. Open Lineage Evidence Drawer
      const inspectLineageBtn = page.locator("button:has-text('Inspect Full Audit Lineage')").first();
      if (await inspectLineageBtn.isVisible()) {
        await inspectLineageBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, "ask-bizlens-evidence-dark-desktop-1440.png"),
          fullPage: false,
        });
        console.log("Saved: ask-bizlens-evidence-dark-desktop-1440.png");
      }
    }

    await page.close();
  }

  // 4. Desktop Light
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://127.0.0.1:5173/app/ask", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("bizlens_theme", "light");
    });
    await page.waitForTimeout(1000);

    // Select existing session if available
    const sessionItem = page.locator(".truncate:has-text('Summarize our overall revenue')").first();
    if (await sessionItem.isVisible()) {
      await sessionItem.click();
      await page.waitForTimeout(800);
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "ask-bizlens-light-desktop-1440.png"),
      fullPage: false,
    });
    console.log("Saved: ask-bizlens-light-desktop-1440.png");
    await page.close();
  }

  // 5. Desktop Hybrid
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://127.0.0.1:5173/app/ask", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "hybrid");
      localStorage.setItem("bizlens_theme", "hybrid");
    });
    await page.waitForTimeout(1000);

    const sessionItem = page.locator(".truncate:has-text('Summarize our overall revenue')").first();
    if (await sessionItem.isVisible()) {
      await sessionItem.click();
      await page.waitForTimeout(800);
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "ask-bizlens-hybrid-desktop-1440.png"),
      fullPage: false,
    });
    console.log("Saved: ask-bizlens-hybrid-desktop-1440.png");
    await page.close();
  }

  // 6. Mobile Dark (390px)
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto("http://127.0.0.1:5173/app/ask", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bizlens_theme", "dark");
    });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "ask-bizlens-dark-mobile-390.png"),
      fullPage: false,
    });
    console.log("Saved: ask-bizlens-dark-mobile-390.png");
    await page.close();
  }

  await browser.close();
  console.log("Phase 4 screenshots completed.");
}

main().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
