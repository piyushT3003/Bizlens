import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorldGlowMap } from "../components/visuals/WorldGlowMap";

describe("WorldGlowMap Component", () => {
  it("renders without crashing and allows clicking All Locations tab", () => {
    render(<WorldGlowMap />);
    const allLocationsTab = screen.getByRole("button", { name: /all locations/i });
    expect(allLocationsTab).toBeInTheDocument();

    // Click All Locations tab
    fireEvent.click(allLocationsTab);

    // Verify All Locations view rendered
    expect(screen.getByText(/All Locations in Active Dataset/i)).toBeInTheDocument();
  });

  it("allows clicking connected telemetry routes smoothly without crashing", () => {
    render(<WorldGlowMap />);

    // Initial selected hub is Mumbai Port Gateway
    expect(screen.getAllByText(/Mumbai Port Gateway/i).length).toBeGreaterThan(0);

    // Verify Connected Direct Telemetry Routes are present
    const routeHeader = screen.getByText(/Connected Direct Telemetry Routes/i);
    expect(routeHeader).toBeInTheDocument();

    // Find and click on a connected route, e.g. "Bengaluru Logistics HQ"
    const blrButton = screen.getByRole("button", { name: /Bengaluru Logistics HQ/i });
    expect(blrButton).toBeInTheDocument();

    fireEvent.mouseDown(blrButton);
    fireEvent.click(blrButton);

    // After click, the selected hub dossier should transition to Bengaluru Logistics HQ
    expect(screen.getByText(/National Operations HQ/i)).toBeInTheDocument();
  });

  it("allows selecting a location from All Locations directory and viewing dossier", () => {
    render(<WorldGlowMap />);

    // Switch to All Locations tab
    const allLocationsTab = screen.getByRole("button", { name: /all locations/i });
    fireEvent.click(allLocationsTab);

    // Click on Frankfurt Hub item
    const fraElements = screen.getAllByText(/Frankfurt Hub/i);
    expect(fraElements.length).toBeGreaterThan(0);
    fireEvent.click(fraElements[0]);

    // Switch back to Location Dossier to verify Frankfurt is selected
    const dossierTab = screen.getByRole("button", { name: /Location Dossier/i });
    fireEvent.click(dossierTab);

    expect(screen.getByText(/EU Cross-Dock Center/i)).toBeInTheDocument();
  });
});
