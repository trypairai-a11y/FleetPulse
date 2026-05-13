/**
 * RED test — turns GREEN when Wave 1 ships
 * mobile/src/services/platformGuess.ts with setLastTab/getLastTab and
 * a 30-minute decay window.
 */

describe("platformGuess.lastTab", () => {
  test("setLastTab + getLastTab roundtrip returns the same platform", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setLastTab, getLastTab } = require("../src/services/platformGuess");
    setLastTab("KEETA");
    expect(getLastTab()).toBe("KEETA");
  });

  test("decays to null after 30 minutes", () => {
    jest.useFakeTimers();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setLastTab, getLastTab } = require("../src/services/platformGuess");
    setLastTab("KEETA");
    jest.advanceTimersByTime(31 * 60_000);
    expect(getLastTab()).toBeNull();
    jest.useRealTimers();
  });
});
