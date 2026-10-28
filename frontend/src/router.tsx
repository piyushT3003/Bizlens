import { createBrowserRouter, Navigate } from "react-router-dom";
import { HomePage } from "@/pages/public/HomePage";
import { ProductPage } from "@/pages/public/ProductPage";
import { HowItWorksPage } from "@/pages/public/HowItWorksPage";
import { DemoPage } from "@/pages/public/DemoPage";
import { NotFoundPage } from "@/pages/public/NotFoundPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { StyleGuidePage } from "@/pages/dev/StyleGuidePage";
import { MasterShowcasePage } from "@/pages/public/MasterShowcasePage";
import { AppShell } from "@/components/layout/AppShell";
import { AppHomePage } from "@/pages/app/AppHomePage";
import { DashboardPage } from "@/pages/app/DashboardPage";
import { UploadPage } from "@/pages/app/UploadPage";
import { AskPage } from "@/pages/app/AskPage";
import { InsightsPage } from "@/pages/app/InsightsPage";
import { WhatIfPage } from "@/pages/app/WhatIfPage";
import { DecisionsPage } from "@/pages/app/DecisionsPage";
import { ReportsPage } from "@/pages/app/ReportsPage";
import { DataManagementPage } from "@/pages/app/DataManagementPage";
import { SettingsPage } from "@/pages/app/SettingsPage";

export const router = createBrowserRouter([
  // Public Routes
  { path: "/", element: <HomePage /> },
  { path: "/showcase", element: <MasterShowcasePage /> },
  { path: "/blueprint", element: <MasterShowcasePage /> },
  { path: "/product", element: <ProductPage /> },
  { path: "/how-it-works", element: <HowItWorksPage /> },
  { path: "/demo", element: <DemoPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  // Root Aliases & Shortcuts
  { path: "/dashboard", element: <Navigate to="/app/dashboard" replace /> },
  { path: "/observatory", element: <Navigate to="/app/dashboard" replace /> },
  { path: "/reports", element: <Navigate to="/app/reports" replace /> },
  { path: "/upload", element: <Navigate to="/app/upload" replace /> },
  { path: "/ask", element: <Navigate to="/app/ask" replace /> },
  { path: "/what-if", element: <Navigate to="/app/what-if" replace /> },
  { path: "/whatif", element: <Navigate to="/app/what-if" replace /> },
  { path: "/scenarios", element: <Navigate to="/app/what-if" replace /> },
  { path: "/insights", element: <Navigate to="/app/insights" replace /> },
  { path: "/decisions", element: <Navigate to="/app/decisions" replace /> },
  { path: "/data", element: <Navigate to="/app/data" replace /> },
  { path: "/settings", element: <Navigate to="/app/settings" replace /> },

  {
    path: "/app",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/app/home" replace /> },
      { path: "home", element: <AppHomePage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "upload", element: <UploadPage /> },
      { path: "ask", element: <AskPage /> },
      { path: "ask/:sessionId", element: <AskPage /> },
      { path: "insights", element: <InsightsPage /> },
      { path: "what-if", element: <WhatIfPage /> },
      { path: "whatif", element: <Navigate to="/app/what-if" replace /> },
      { path: "scenarios", element: <Navigate to="/app/what-if" replace /> },
      { path: "decisions", element: <DecisionsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "reports/:reportId", element: <ReportsPage /> },
      { path: "data", element: <DataManagementPage /> },
      { path: "data/:datasetId", element: <DataManagementPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },

  // 404 Catch-All
  { path: "*", element: <NotFoundPage /> },
]);
