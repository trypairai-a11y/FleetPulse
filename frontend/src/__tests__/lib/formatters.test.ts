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
  it("returns green colors for ACTIVE status", () => {
    const colors = getStatusColor("ACTIVE");
    expect(colors.bg).toBe("bg-green-50");
    expect(colors.text).toBe("text-green-700");
    expect(colors.dot).toBe("bg-green-500");
  });

  it("returns red colors for SUSPENDED status", () => {
    const colors = getStatusColor("SUSPENDED");
    expect(colors.bg).toBe("bg-red-50");
    expect(colors.text).toBe("text-red-700");
    expect(colors.dot).toBe("bg-red-500");
  });

  it("is case-insensitive", () => {
    const colors = getStatusColor("active");
    expect(colors.bg).toBe("bg-green-50");
  });

  it("returns default gray for unknown status", () => {
    const colors = getStatusColor("UNKNOWN_STATUS");
    expect(colors.bg).toBe("bg-gray-100");
    expect(colors.text).toBe("text-gray-600");
    expect(colors.dot).toBe("bg-gray-400");
  });

  it("returns default gray for null input", () => {
    const colors = getStatusColor(null);
    expect(colors.bg).toBe("bg-gray-100");
  });

  it("returns default gray for undefined input", () => {
    const colors = getStatusColor(undefined);
    expect(colors.bg).toBe("bg-gray-100");
  });
});

describe("getPlatformColor", () => {
  it("returns orange for TALABAT", () => {
    const colors = getPlatformColor("TALABAT");
    expect(colors.bg).toBe("bg-orange-50");
    expect(colors.text).toBe("text-orange-700");
  });

  it("returns yellow for KEETA", () => {
    const colors = getPlatformColor("KEETA");
    expect(colors.bg).toBe("bg-yellow-50");
    expect(colors.text).toBe("text-yellow-700");
  });

  it("returns teal for DELIVEROO", () => {
    const colors = getPlatformColor("DELIVEROO");
    expect(colors.bg).toBe("bg-teal-50");
    expect(colors.text).toBe("text-teal-700");
  });

  it("returns blue for AMERICANA", () => {
    const colors = getPlatformColor("AMERICANA");
    expect(colors.bg).toBe("bg-blue-50");
    expect(colors.text).toBe("text-blue-700");
  });

  it("is case-insensitive", () => {
    const colors = getPlatformColor("talabat");
    expect(colors.bg).toBe("bg-orange-50");
  });

  it("returns default gray for unknown platform", () => {
    const colors = getPlatformColor("UNKNOWN");
    expect(colors.bg).toBe("bg-gray-100");
    expect(colors.text).toBe("text-gray-600");
  });

  it("returns default gray for null input", () => {
    const colors = getPlatformColor(null);
    expect(colors.bg).toBe("bg-gray-100");
  });
});
