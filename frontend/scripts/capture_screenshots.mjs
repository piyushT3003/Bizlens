import { chromium } from "playwright";
import { preview } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, "../../design-references/verification");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log("Starting preview server on port 4173 via Vite API...");
  const previewServer = await preview({
    root: path.resolve(__dirname, ".."),
    preview: {
      port: 4173,
      strictPort: true,
    },
  });

  const url = previewServer.resolvedUrls.local[0] || "http://localhost:4173/";
  console.log(`Preview server ready at ${url}`);

  console.log("Launching Edge browser via Playwright...");
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  const viewports = [
    { name: "desktop-1440", width: 1440, height: 900 },
    { name: "mobile-390", width: 390, height: 844 },
  ];

  const themes = ["dark", "light", "hybrid"];

  for (const vp of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      console.log(`Capturing Style Guide [${theme}] at ${vp.name}...`);
      await page.goto(`${url}style-guide`, { waitUntil: "networkidle" });
      
      await page.evaluate((th) => {
        document.documentElement.setAttribute("data-theme", th);
        localStorage.setItem("bizlens_theme", th);
      }, theme);

      await page.waitForTimeout(1200);

      const screenshotPath = path.join(outDir, `style-guide-${theme}-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved screenshot: ${screenshotPath}`);

      await context.close();
    }
  }

  // Also capture Home Page and App Home Page in dark mode at 1440px
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    console.log("Capturing Landing Page [dark] at desktop-1440...");
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const homePath = path.join(outDir, "landing-page-dark-desktop-1440.png");
    await page.screenshot({ path: homePath, fullPage: false });
    console.log(`Saved screenshot: ${homePath}`);

    console.log("Capturing App Home [dark] at desktop-1440...");
    await page.goto(`${url}app/home`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const appHomePath = path.join(outDir, "app-home-dark-desktop-1440.png");
    await page.screenshot({ path: appHomePath, fullPage: false });
    console.log(`Saved screenshot: ${appHomePath}`);

    // Capture Upload Page
    console.log("Capturing Upload Page [dark] at desktop-1440...");
    await page.goto(`${url}app/upload`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const uploadPath = path.join(outDir, "upload-page-dark-desktop-1440.png");
    await page.screenshot({ path: uploadPath, fullPage: false });
    console.log(`Saved screenshot: ${uploadPath}`);

    // Capture Data Management Page
    console.log("Capturing Data Management Page [dark] at desktop-1440...");
    await page.goto(`${url}app/data`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const dataPath = path.join(outDir, "data-page-dark-desktop-1440.png");
    await page.screenshot({ path: dataPath, fullPage: false });
    console.log(`Saved screenshot: ${dataPath}`);

    await context.close();
  }

  // Mobile 390px capture for upload and data
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    console.log("Capturing Upload Page [dark] at mobile-390...");
    await page.goto(`${url}app/upload`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const uploadMobPath = path.join(outDir, "upload-page-dark-mobile-390.png");
    await page.screenshot({ path: uploadMobPath, fullPage: true });
    console.log(`Saved screenshot: ${uploadMobPath}`);

    await context.close();
  }

  await browser.close();
  previewServer.httpServer.close();
  console.log("All screenshots successfully captured!");
}

run().catch((err) => {
  console.error("Error in capture:", err);
  process.exit(1);
});
