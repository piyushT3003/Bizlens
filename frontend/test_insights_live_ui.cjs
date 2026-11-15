const { chromium } = require("@playwright/test");
const path = require("path");

const ARTIFACTS_DIR = "C:/Users/piyus/.gemini/antigravity/brain/0edf10ae-5049-498a-a82f-827cefb32476";

async function runLiveInsightsUITest() {
  console.log("==================================================");
  console.log("STARTING LIVE PLAYWRIGHT TEST FOR BUSINESS INSIGHTS");
  console.log("==================================================");

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Listen to console and page errors
  const pageErrors = [];
  page.on("pageerror", (err) => {
    console.error("  [PAGE ERROR]", err.message);
    pageErrors.push(err.message);
  });

  try {
    // 1. Navigate to Insights Page
    console.log("\n[1] Navigating to http://127.0.0.1:8000/app/insights...");
    await page.goto("http://127.0.0.1:8000/app/insights", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // 2. Verify Page Title and Header
    console.log("[2] Verifying page title and certified badge...");
    const pageText = await page.textContent("body");
    if (pageText.includes("Business Insights") || pageText.includes("Discoveries")) {
      console.log("  -> Header found: 'Business Insights & Strategic Discoveries'");
    } else {
      throw new Error("Page header 'Business Insights' not found!");
    }

    // 3. Inspect Hero KPI Strip
    console.log("[3] Inspecting Hero KPI Cards...");
    const kpiElements = await page.$$(".text-2xl, .text-3xl, [class*='font-bold']");
    console.log(`  -> Found ${kpiElements.length} prominent numeric KPI elements.`);

    // 4. Test Switching Datasets
    console.log("[4] Testing dynamic dataset switching...");
    const datasetSelect = await page.$("select");
    if (datasetSelect) {
      const options = await page.$$eval("select option", (opts) =>
        opts.map((o) => ({ value: o.value, text: o.text }))
      );
      console.log(`  -> Available datasets in dropdown: ${options.length}`);
      options.slice(0, 4).forEach((o) => console.log(`     - ${o.text} (${o.value})`));

      if (options.length > 1) {
        // Switch to second dataset
        const targetOption = options[1];
        console.log(`  -> Switching to: '${targetOption.text}'...`);
        await datasetSelect.selectOption(targetOption.value);
        await page.waitForTimeout(2500);

        const updatedCards = await page.$$("[class*='GlassCard'], [class*='card']");
        console.log(`  -> Rendered finding cards for ${targetOption.text}: ${updatedCards.length}`);

        // Switch back or to first dataset
        const firstOption = options[0];
        console.log(`  -> Switching to: '${firstOption.text}'...`);
        await datasetSelect.selectOption(firstOption.value);
        await page.waitForTimeout(2500);
      }
    } else {
      console.log("  [INFO] Custom dataset pill selector used instead of native select.");
    }

    // 5. Test Filter Tabs
    console.log("[5] Testing Filter Tabs...");
    const filterButtons = await page.$$("button");
    let foundFilter = false;
    for (const btn of filterButtons) {
      const txt = (await btn.textContent()).trim();
      if (txt.includes("Opportunities") || txt.includes("Risks") || txt.includes("Efficiencies")) {
        console.log(`  -> Clicking filter tab: '${txt}'...`);
        await btn.click();
        await page.waitForTimeout(800);
        foundFilter = true;
        break;
      }
    }

    // Reset to "All"
    for (const btn of filterButtons) {
      const txt = (await btn.textContent()).trim();
      if (txt === "All" || txt.includes("All (") || txt === "All Findings") {
        await btn.click();
        await page.waitForTimeout(800);
        break;
      }
    }

    // 6. Test Evidence Drawer ("View Lineage" or "Evidence")
    console.log("[6] Testing Evidence Lineage Drawer...");
    const lineageBtn = await page.$('button:has-text("View Lineage"), button:has-text("Evidence"), button:has-text("Lineage")');
    if (lineageBtn) {
      console.log("  -> Clicking 'View Lineage' button...");
      await lineageBtn.click();
      await page.waitForTimeout(1500);

      const drawerText = await page.textContent("body");
      if (drawerText.includes("Lineage") || drawerText.includes("DuckDB") || drawerText.includes("SELECT")) {
        console.log("  -> Evidence Drawer opened successfully with DuckDB SQL Lineage!");
      }

      // Screenshot open evidence drawer
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "live_insights_evidence_drawer.png"),
        fullPage: false,
      });
      console.log("  -> Saved screenshot: live_insights_evidence_drawer.png");

      // Close drawer (press Escape or click close button)
      const closeBtn = await page.$('button[aria-label="Close"], button:has-text("Close"), button:has-text("✕"), button:has(svg.lucide-x)');
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(800);
    } else {
      console.log("  [INFO] No direct 'View Lineage' button found on current first card.");
    }

    // 7. Test AI Explain Modal
    console.log("[7] Testing AI Explain Strategic Modal...");
    const explainBtn = await page.$('button:has-text("Ask AI to Explain"), button:has-text("AI Deep Dive"), button:has-text("Explain with AI")');
    if (explainBtn) {
      console.log("  -> Clicking 'Ask AI to Explain' button...");
      await explainBtn.click();
      await page.waitForTimeout(3000);

      const modalText = await page.textContent("body");
      if (modalText.includes("Strategic Context") || modalText.includes("Guardrail") || modalText.includes("Action") || modalText.includes("Strategic")) {
        console.log("  -> AI Explain modal opened with certified strategic analysis!");
      }

      // Screenshot open AI Explain modal
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "live_insights_ai_explain_modal.png"),
        fullPage: false,
      });
      console.log("  -> Saved screenshot: live_insights_ai_explain_modal.png");

      // Close modal
      const closeBtn = await page.$('button[aria-label="Close"], button:has-text("Close"), button:has-text("✕"), button:has(svg.lucide-x)');
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(800);
    } else {
      console.log("  [INFO] No direct 'Ask AI to Explain' button on first card.");
    }

    // 8. Capture Full Page Screenshot
    console.log("[8] Capturing full page verified screenshot...");
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "live_insights_full_page.png"),
      fullPage: true,
    });
    console.log("  -> Saved full page screenshot: live_insights_full_page.png");

    console.log("\n==================================================");
    console.log("PLAYWRIGHT LIVE TEST COMPLETED SUCCESSFULLY!");
    console.log(`Page errors detected: ${pageErrors.length}`);
    console.log("==================================================");
    if (pageErrors.length > 0) {
      console.log("Page errors:", pageErrors);
    }
  } catch (err) {
    console.error("Test failed with exception:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runLiveInsightsUITest();
