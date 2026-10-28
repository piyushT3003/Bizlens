import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACT_DIR = "C:\\Users\\piyus\\.gemini\\antigravity\\brain\\0edf10ae-5049-498a-a82f-827cefb32476";

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  const tasks = [
    {
      name: "dashboard-dark-desktop-1440.png",
      url: "http://127.0.0.1:5173/app/dashboard",
      theme: "dark",
      viewport: { width: 1440, height: 900 },
      evidenceOpen: false,
    },
    {
      name: "dashboard-evidence-dark-desktop-1440.png",
      url: "http://127.0.0.1:5173/app/dashboard",
      theme: "dark",
      viewport: { width: 1440, height: 900 },
      evidenceOpen: true,
    },
    {
      name: "dashboard-dark-mobile-390.png",
      url: "http://127.0.0.1:5173/app/dashboard",
      theme: "dark",
      viewport: { width: 390, height: 844 },
      evidenceOpen: false,
    },
    {
      name: "dashboard-light-desktop-1440.png",
      url: "http://127.0.0.1:5173/app/dashboard",
      theme: "light",
      viewport: { width: 1440, height: 900 },
      evidenceOpen: false,
    },
    {
      name: "dashboard-hybrid-desktop-1440.png",
      url: "http://127.0.0.1:5173/app/dashboard",
      theme: "hybrid",
      viewport: { width: 1440, height: 900 },
      evidenceOpen: false,
    },
    {
      name: "dashboard-hybrid-mobile-390.png",
      url: "http://127.0.0.1:5173/app/dashboard",
      theme: "hybrid",
      viewport: { width: 390, height: 844 },
      evidenceOpen: false,
    },
  ];

  for (const t of tasks) {
    const page = await browser.newPage({ viewport: t.viewport });
    await page.goto(t.url, { waitUntil: "networkidle" });
    
    // Set theme
    await page.evaluate((theme) => {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("bizlens_theme", theme);
    }, t.theme);

    await page.waitForTimeout(1000);

    // If evidence drawer needs to be opened
    if (t.evidenceOpen) {
      const kpiCard = await page.$("div:has-text('Total Revenue')");
      if (kpiCard) {
        await kpiCard.click();
        await page.waitForTimeout(600);
      }
    }

    const outPath = path.join(ARTIFACT_DIR, t.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot: ${t.name}`);
    await page.close();
  }

  await browser.close();
  console.log("All screenshots captured successfully.");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
