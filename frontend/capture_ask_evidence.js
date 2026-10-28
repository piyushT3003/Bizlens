import { chromium } from "@playwright/test";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\piyus\\.gemini\\antigravity\\brain\\0edf10ae-5049-498a-a82f-827cefb32476";

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://127.0.0.1:5173/app/ask", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("bizlens_theme", "dark");
  });
  await page.waitForTimeout(1000);

  // Select the conversation session
  const sessionItem = page.locator(".truncate:has-text('Summarize our overall revenue')").first();
  if (await sessionItem.isVisible()) {
    await sessionItem.click();
    await page.waitForTimeout(800);
  }

  // Ensure Show Your Work is expanded
  const showWork = page.locator("button:has-text('Show Your Work')").first();
  if (await showWork.isVisible()) {
    await showWork.click();
    await page.waitForTimeout(600);
  }

  // Click Inspect Full Audit Lineage
  const lineageBtn = page.locator("button:has-text('Inspect Full Audit Lineage')").first();
  if (await lineageBtn.isVisible()) {
    await lineageBtn.click();
    await page.waitForTimeout(800);
  }

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "ask-bizlens-evidence-dark-desktop-1440.png"),
    fullPage: false,
  });
  console.log("Saved: ask-bizlens-evidence-dark-desktop-1440.png");

  await browser.close();
}

main().catch(console.error);
