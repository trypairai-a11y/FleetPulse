// Wave 0 RED test — turns GREEN in Wave 2 when
// frontend/src/components/shared/DriverLink.tsx ships.
//
// REQ-driver-file (canonical link primitive).

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
// Wave 2 creates this — RED state today.
// @ts-expect-error wave-2-creates
import DriverLink from "@/components/shared/DriverLink";

describe("DriverLink (RED — Wave 2)", () => {
  it("renders an <a> with href=/drivers/:driverId and the supplied name", () => {
    const { container } = render(<DriverLink driverId="D1" name="Mohamed" />);
    const anchor = container.querySelector("a");
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute("href")).toBe("/drivers/D1");
    expect(anchor?.textContent).toContain("Mohamed");
  });

  it("appends ?from=<platform> when platform prop is provided", () => {
    const { container } = render(<DriverLink driverId="D1" name="Mohamed" platform="keeta" />);
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe("/drivers/D1?from=keeta");
  });

  it("driverId is required at the type level", () => {
    // @ts-expect-error driverId is required
    const _x = <DriverLink name="Mohamed" />;
    expect(_x).toBeTruthy();
  });
});
