import { describe, it, expect } from "vitest";
import { cleanDriverName, getStatusColor, getPlatformColor } from "@/lib/formatters";

describe("cleanDriverName", () => {
  it("returns the name unchanged when there is no platform suffix", () => {
    expect(cleanDriverName("Ahmed Ali")).toBe("Ahmed Ali");
  });

  it("strips a trailing platform ID suffix", () => {
    expect(cleanDriverName("Ahmed Ali 123A - Hawally")).toBe("Ahmed Ali");
  });

  it("returns empty string for null input", () => {
    expect(cleanDriverName(null)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(cleanDriverName(undefined)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(cleanDriverName("")).toBe("");
  });
});

describe("getStatusColor", () => {
  it("returns primary colors for ACTIVE status", () => {
    const colors = getStatusColor("ACTIVE");
    expect(colors.bg).toBe("bg-primary/10");
    expect(colors.text).toBe("text-primary");
    expect(colors.dot).toBe("bg-primary");
  });

  it("returns red colors for SUSPENDED status", () => {
    const colors = getStatusColor("SUSPENDED");
    expect(colors.bg).toBe("bg-red-50");
    expect(colors.text).toBe("text-red-700");
    expect(colors.dot).toBe("bg-red-500");
  });

  it("is case-insensitive", () => {
    const colors = getStatusColor("active");
    expect(colors.bg).toBe("bg-primary/10");
  });

  it("returns default sand for unknown status", () => {
    const colors = getStatusColor("UNKNOWN_STATUS");
    expect(colors.bg).toBe("bg-sand-200");
    expect(colors.text).toBe("text-sand-800");
    expect(colors.dot).toBe("bg-sand-500");
  });

  it("returns default sand for null input", () => {
    const colors = getStatusColor(null);
    expect(colors.bg).toBe("bg-sand-200");
  });

  it("returns default sand for undefined input", () => {
    const colors = getStatusColor(undefined);
    expect(colors.bg).toBe("bg-sand-200");
  });
});

describe("getPlatformColor", () => {
  it("returns talabat brand color for TALABAT", () => {
    const colors = getPlatformColor("TALABAT");
    expect(colors.bg).toBe("bg-talabat/10");
    expect(colors.text).toBe("text-talabat");
  });

  it("returns keeta brand color for KEETA", () => {
    const colors = getPlatformColor("KEETA");
    expect(colors.bg).toBe("bg-keeta/10");
    expect(colors.text).toBe("text-keeta");
  });

  it("returns deliveroo brand color for DELIVEROO", () => {
    const colors = getPlatformColor("DELIVEROO");
    expect(colors.bg).toBe("bg-deliveroo/10");
    expect(colors.text).toBe("text-deliveroo");
  });

  it("returns americana brand color for AMERICANA", () => {
    const colors = getPlatformColor("AMERICANA");
    expect(colors.bg).toBe("bg-americana/10");
    expect(colors.text).toBe("text-americana");
  });

  it("is case-insensitive", () => {
    const colors = getPlatformColor("talabat");
    expect(colors.bg).toBe("bg-talabat/10");
  });

  it("returns default sand for unknown platform", () => {
    const colors = getPlatformColor("UNKNOWN");
    expect(colors.bg).toBe("bg-sand-200");
    expect(colors.text).toBe("text-sand-800");
  });

  it("returns default sand for null input", () => {
    const colors = getPlatformColor(null);
    expect(colors.bg).toBe("bg-sand-200");
  });
});
