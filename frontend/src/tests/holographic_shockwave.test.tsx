import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";
import { HolographicShockwaveOverlay } from "@/components/ui/HolographicShockwave";

describe("3D Holographic Shockwave Click Effect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders null initially when no clicks have occurred", () => {
    const { container } = render(<HolographicShockwaveOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("spawns 3D holographic shockwave with rings, flash, reticle diamond and particles on click", () => {
    const { container } = render(<HolographicShockwaveOverlay />);

    // Simulate primary button pointerdown via MouseEvent (fully supported in JSDOM and browsers)
    act(() => {
      window.dispatchEvent(
        new MouseEvent("pointerdown", {
          clientX: 250,
          clientY: 400,
          button: 0,
          bubbles: true,
        })
      );
    });

    const overlay = container.querySelector(".fixed");
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass("pointer-events-none");

    const stage = container.querySelector(".holo-shockwave-container") as HTMLElement;
    expect(stage).toBeInTheDocument();
    expect(stage.style.left).toBe("250px");
    expect(stage.style.top).toBe("400px");

    // Check 3D disk and holographic visual elements
    expect(container.querySelector(".holo-shockwave-disk")).toBeInTheDocument();
    expect(container.querySelector(".holo-center-flash")).toBeInTheDocument();
    expect(container.querySelector(".holo-ring-primary")).toBeInTheDocument();
    expect(container.querySelector(".holo-ring-echo")).toBeInTheDocument();
    expect(container.querySelector(".holo-ring-core")).toBeInTheDocument();
    expect(container.querySelector(".holo-reticle-diamond")).toBeInTheDocument();
    expect(container.querySelector(".holo-spine-x")).toBeInTheDocument();
    expect(container.querySelector(".holo-spine-y")).toBeInTheDocument();
    expect(container.querySelectorAll(".holo-quantum-particle").length).toBe(6);
  });

  it("automatically cleans up shockwaves after 650ms animation duration", () => {
    const { container } = render(<HolographicShockwaveOverlay />);

    act(() => {
      window.dispatchEvent(
        new MouseEvent("pointerdown", {
          clientX: 100,
          clientY: 150,
          button: 0,
          bubbles: true,
        })
      );
    });

    expect(container.querySelector(".holo-shockwave-container")).toBeInTheDocument();

    // Advance timers past the 650ms wave lifetime
    act(() => {
      vi.advanceTimersByTime(700);
    });

    // After animation finishes, the wave is cleaned up and overlay returns to null
    expect(container.querySelector(".holo-shockwave-container")).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it("caps maximum concurrent waves to 12 under rapid spam clicking to prevent lag", () => {
    const { container } = render(<HolographicShockwaveOverlay />);

    act(() => {
      for (let i = 0; i < 20; i++) {
        window.dispatchEvent(
          new MouseEvent("pointerdown", {
            clientX: 100 + i * 5,
            clientY: 100 + i * 5,
            button: 0,
            bubbles: true,
          })
        );
      }
    });

    const stages = container.querySelectorAll(".holo-shockwave-container");
    expect(stages.length).toBeLessThanOrEqual(12);
  });
});
