import { chromium } from "@playwright/test";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\piyus\\.gemini\\antigravity\\brain\\0edf10ae-5049-498a-a82f-827cefb32476";

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://127.0.0.1:5173/app/dashboard", { waitUntil: "networkidle" });
  
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("bizlens_theme", "dark");
  });

  await page.waitForTimeout(1000);

  // Click the View Evidence shield button on the ChartFrame
  const evidenceBtn = page.locator('button[title="View Calculation Lineage & Evidence"]').first();
  await evidenceBtn.click();
  await page.waitForTimeout(800);

  const outPath = path.join(ARTIFACT_DIR, "dashboard-evidence-dark-desktop-1440.png");
  await page.screenshot({ path: outPath, fullPage: false });
  console.log("Saved screenshot: dashboard-evidence-dark-desktop-1440.png");

  await browser.close();
}

main().catch(console.error);
