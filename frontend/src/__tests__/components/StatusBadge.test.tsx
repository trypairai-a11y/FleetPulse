import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, PlatformBadge } from "@/components/shared/StatusBadge";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("renders a custom label when provided", () => {
    render(<StatusBadge status="ACTIVE" label="Online Now" />);
    expect(screen.getByText("Online Now")).toBeInTheDocument();
  });

  it("renders 'Unknown' when status is null", () => {
    render(<StatusBadge status={null} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("applies primary color classes for ACTIVE status", () => {
    const { container } = render(<StatusBadge status="ACTIVE" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-primary/10");
    expect(badge.className).toContain("text-primary");
  });

  it("applies red color classes for SUSPENDED status", () => {
    const { container } = render(<StatusBadge status="SUSPENDED" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-red-50");
    expect(badge.className).toContain("text-red-700");
  });

  it("renders the status dot by default", () => {
    const { container } = render(<StatusBadge status="ACTIVE" />);
    const dot = container.querySelector(".bg-primary");
    expect(dot).toBeInTheDocument();
  });

  it("hides the dot when showDot is false", () => {
    const { container } = render(<StatusBadge status="ACTIVE" showDot={false} />);
    const dots = container.querySelectorAll(".rounded-full.bg-primary");
    expect(dots.length).toBe(0);
  });

  it("replaces underscores with spaces in the display label", () => {
    render(<StatusBadge status="NO_SHOW" />);
    expect(screen.getByText("NO SHOW")).toBeInTheDocument();
  });
});

describe("PlatformBadge (from StatusBadge)", () => {
  it("renders the platform name", () => {
    render(<PlatformBadge platform="KEETA" />);
    expect(screen.getByText("KEETA")).toBeInTheDocument();
  });

  it("renders 'Unknown' when platform is null", () => {
    render(<PlatformBadge platform={null} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("applies keeta brand classes for KEETA", () => {
    const { container } = render(<PlatformBadge platform="KEETA" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-keeta/10");
    expect(badge.className).toContain("text-keeta");
  });

  it("applies default sand classes for unknown platform", () => {
    const { container } = render(<PlatformBadge platform="UNKNOWN" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-sand-200");
    expect(badge.className).toContain("text-sand-800");
  });
});
