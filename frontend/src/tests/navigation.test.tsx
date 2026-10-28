import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { HomePage } from "@/pages/public/HomePage";
import { StyleGuidePage } from "@/pages/dev/StyleGuidePage";
import { NotFoundPage } from "@/pages/public/NotFoundPage";
import { AppShell } from "@/components/layout/AppShell";
import { AppHomePage } from "@/pages/app/AppHomePage";

// Mock Three.js / Canvas scenes which require WebGL context not present in JSDOM
vi.mock("@/components/visuals/AICore", () => ({
  AICore: () => <div data-testid="mock-ai-core">Mock AI Core</div>,
}));
vi.mock("@/components/visuals/HelixScene", () => ({
  HelixScene: () => <div data-testid="mock-helix">Mock Helix</div>,
}));
vi.mock("@/components/visuals/CrystalScene", () => ({
  CrystalScene: () => <div data-testid="mock-crystal">Mock Crystal</div>,
}));
vi.mock("@/components/visuals/WorldGlowMap", () => ({
  WorldGlowMap: () => <div data-testid="mock-world-map">Mock World Map</div>,
}));
vi.mock("@/components/visuals/IsoCubeMap", () => ({
  IsoCubeMap: () => <div data-testid="mock-iso-cube">Mock Iso Cube</div>,
}));

describe("Route Navigation & Shell Verification", () => {
  it("renders Landing Page at root path '/'", async () => {
    const memoryRouter = createMemoryRouter(
      [{ path: "/", element: <HomePage /> }],
      { initialEntries: ["/"] }
    );
    render(<RouterProvider router={memoryRouter} />);
    expect(screen.getByText(/Turn Your Data Into/i)).toBeInTheDocument();
    expect(screen.getByText(/Quantum Horizon Ecosystem/i)).toBeInTheDocument();
  });

  it("renders Design System Style Guide at '/style-guide'", async () => {
    const memoryRouter = createMemoryRouter(
      [{ path: "/style-guide", element: <StyleGuidePage /> }],
      { initialEntries: ["/style-guide"] }
    );
    render(<RouterProvider router={memoryRouter} />);
    expect(screen.getByText(/BizLens Quantum Horizon Style Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/Theme Token Palette & WCAG AA Verification/i)).toBeInTheDocument();
  });

  it("renders 404 page for unmatched routes", async () => {
    const memoryRouter = createMemoryRouter(
      [{ path: "*", element: <NotFoundPage /> }],
      { initialEntries: ["/unknown-dimension"] }
    );
    render(<RouterProvider router={memoryRouter} />);
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
    expect(screen.getByText(/Return to Command Center/i)).toBeInTheDocument();
  });

  it("renders App Shell and Sidebar navigation at '/app/home'", async () => {
    const memoryRouter = createMemoryRouter(
      [
        {
          path: "/app",
          element: <AppShell />,
          children: [{ path: "home", element: <AppHomePage /> }],
        },
      ],
      { initialEntries: ["/app/home"] }
    );
    render(<RouterProvider router={memoryRouter} />);
    // App header brand
    expect(screen.getAllByText("BizLens").length).toBeGreaterThan(0);
    // Welcome message from AppHomePage
    expect(screen.getByText(/Welcome, Piyush!/i)).toBeInTheDocument();
    expect(screen.getByText(/The Decision Helix/i)).toBeInTheDocument();
  });
});
