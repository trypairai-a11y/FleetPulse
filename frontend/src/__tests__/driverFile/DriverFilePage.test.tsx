// Wave 0 RED test — turns GREEN in Wave 2 when
// frontend/src/app/(dashboard)/drivers/[id]/page.tsx ships.
//
// Page-level contract for the Driver File page.
// REQ-driver-file.

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
// Wave 2 creates these — RED state today
// @ts-expect-error wave-2-creates
import DriverFilePage from "@/app/(dashboard)/drivers/[id]/page";
import { mockDriverFileData } from "./__fixtures__/mockDriverFileData";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "drv_d1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/useApi", () => ({
  useApiQuery: vi.fn(),
}));

describe("DriverFilePage (RED — Wave 2)", () => {
  it("while loading, renders DriverFileSkeleton (testid driver-file-skeleton)", async () => {
    const { useApiQuery } = await import("@/hooks/useApi");
    (useApiQuery as any).mockReturnValue({ data: null, isLoading: true, error: null });
    render(<DriverFilePage />);
    expect(screen.getByTestId("driver-file-skeleton")).toBeInTheDocument();
  });

  it("on success, renders all 8 sections", async () => {
    const { useApiQuery } = await import("@/hooks/useApi");
    (useApiQuery as any).mockReturnValue({ data: mockDriverFileData, isLoading: false, error: null });
    const { container } = render(<DriverFilePage />);
    ["profile", "score", "trend", "shifts", "orders", "violations", "cash", "notes"].forEach((id) => {
      expect(container.querySelector(`#${id}`)).toBeInTheDocument();
    });
  });

  it("on 404, renders an ErrorState with title 'Driver not found'", async () => {
    const { useApiQuery } = await import("@/hooks/useApi");
    (useApiQuery as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: { status: 404, message: "Driver not found" },
    });
    render(<DriverFilePage />);
    await waitFor(() => {
      expect(screen.getByText(/Driver not found/i)).toBeInTheDocument();
    });
  });

  it("reads :id from useParams and constructs the fetch URL /api/drivers/:id/file", async () => {
    const { useApiQuery } = await import("@/hooks/useApi");
    (useApiQuery as any).mockReturnValue({ data: mockDriverFileData, isLoading: false, error: null });
    render(<DriverFilePage />);
    expect(useApiQuery).toHaveBeenCalledWith(expect.stringContaining("/api/drivers/drv_d1/file"));
  });
});
