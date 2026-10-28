import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { HomePage } from "@/pages/public/HomePage";
import { ProductPage } from "@/pages/public/ProductPage";
import { FloatingAssistant } from "@/components/ui/FloatingAssistant";

describe("Phase 13: Premium Polish & Effects Matrix Verification", () => {
  it("renders Landing Page (Panel 2 composition) with hero copy, CTAs, and 3 orbiting chips", () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    // Hero headline and subline
    expect(screen.getByText(/Turn Your Data Into/i)).toBeInTheDocument();
    expect(screen.getByText("Decisions.")).toBeInTheDocument();
    expect(
      screen.getByText(/Analyze\. Understand\. Decide\./i)
    ).toBeInTheDocument();

    // Primary & Secondary CTAs
    expect(screen.getByRole("button", { name: /get started free/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /explore live demo/i })).toBeInTheDocument();

    // 3 Orbiting Sample Data Chips (Panel 2)
    expect(screen.getByText("₹12.48 L Net Sales")).toBeInTheDocument();
    expect(screen.getByText("+31.4% Gross Margin")).toBeInTheDocument();
    expect(screen.getByText("100% Fact Grounded")).toBeInTheDocument();

    // Interoperability strip
    expect(screen.getByText(/interoperable with/i)).toBeInTheDocument();
    expect(screen.getByText(/csv & tsv/i)).toBeInTheDocument();
    expect(screen.getByText(/microsoft excel/i)).toBeInTheDocument();
  });

  it("renders 5 enterprise capability cards and 3-step architecture", () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    // 5 Feature Cards
    expect(screen.getByText("Data Quality Copilot")).toBeInTheDocument();
    expect(screen.getByText("Deterministic Analytics")).toBeInTheDocument();
    expect(screen.getByText("Ask BizLens AI")).toBeInTheDocument();
    expect(screen.getByText("What-If Scenario Simulator")).toBeInTheDocument();
    expect(screen.getByText("Decision Support & Findings")).toBeInTheDocument();

    // "How BizLens Works" 3 Steps
    expect(screen.getByText("Ingest & Profile")).toBeInTheDocument();
    expect(screen.getByText("Deterministic Compute")).toBeInTheDocument();
    expect(screen.getByText("Guardrailed AI Explanation")).toBeInTheDocument();
  });

  it("renders Product Page with the Core Principle and 6 capability anchor sections", () => {
    render(
      <BrowserRouter>
        <ProductPage />
      </BrowserRouter>
    );

    expect(screen.getByText("The BizLens Intelligence Architecture")).toBeInTheDocument();
    expect(screen.getByText(/Analytics calculates\. GenAI explains\./i)).toBeInTheDocument();

    // Capabilities
    expect(screen.getByText("Data Quality Copilot & Ingestion")).toBeInTheDocument();
    expect(screen.getByText("Deterministic Analytics Engine & Metric Catalog")).toBeInTheDocument();
    expect(screen.getByText("Ask BizLens Conversational Intelligence")).toBeInTheDocument();
    expect(screen.getByText("What-If Scenario Simulation Workspace")).toBeInTheDocument();
    expect(screen.getByText("Decision Support & Root-Cause Mitigation")).toBeInTheDocument();
    expect(screen.getByText("Executive Management Reports Engine")).toBeInTheDocument();
  });

  it("renders Floating Assistant on app route and opens ask composer", () => {
    render(
      <MemoryRouter initialEntries={["/app/dashboard"]}>
        <FloatingAssistant />
      </MemoryRouter>
    );

    // Trigger button should be rendered
    const trigger = screen.getByRole("button", { name: /open bizlens assistant/i });
    expect(trigger).toBeInTheDocument();

    // Open composer
    fireEvent.click(trigger);
    expect(screen.getByText("BizLens Assistant")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask BizLens anything...")).toBeInTheDocument();

    // Enter question
    const input = screen.getByPlaceholderText("Ask BizLens anything...");
    fireEvent.change(input, { target: { value: "What drove Q3 revenue growth?" } });
    expect(input).toHaveValue("What drove Q3 revenue growth?");
  });

  it("Floating Assistant remains hidden on Ask BizLens route to avoid duplicate input", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/app/ask"]}>
        <FloatingAssistant />
      </MemoryRouter>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
