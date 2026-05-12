// Wave 0 RED test — turns GREEN in Wave 2 when
// frontend/src/app/(dashboard)/drivers/[id]/page.tsx ships.
//
// Proves CON-driver-file-sections at the UI layer — all 8 anchor IDs render.
// REQ-driver-file.

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
// Wave 2 creates this — RED state today.
// @ts-expect-error wave-2-creates
import DriverFilePage from "@/app/(dashboard)/drivers/[id]/page";
import { mockDriverFileData } from "./__fixtures__/mockDriverFileData";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "drv_d1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/useApi", () => ({
  useApiQuery: () => ({ data: mockDriverFileData, isLoading: false, error: null }),
}));

const REQUIRED_SECTION_IDS = ["profile", "score", "trend", "shifts", "orders", "violations", "cash", "notes"];

describe("CON-driver-file-sections compliance (RED — Wave 2)", () => {
  it("renders all 8 required section anchor IDs", () => {
    const { container } = render(<DriverFilePage />);
    REQUIRED_SECTION_IDS.forEach((id) => {
      expect(container.querySelector(`#${id}`)).toBeInTheDocument();
    });
  });

  it("each section is a landmark with role='region' or an h2", () => {
    const { container } = render(<DriverFilePage />);
    REQUIRED_SECTION_IDS.forEach((id) => {
      const el = container.querySelector(`#${id}`);
      const hasRoleRegion = el?.getAttribute("role") === "region";
      const hasH2 = el?.querySelector("h2") !== null;
      expect(hasRoleRegion || hasH2).toBe(true);
    });
  });
});
