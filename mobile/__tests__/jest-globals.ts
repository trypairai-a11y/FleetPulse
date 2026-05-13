// Loaded via jest.config.js setupFiles (runs once per test file, before tests).
// Polyfills any React-Native globals that jest-expo doesn't ship by default.

// Suppress noisy console.error from the existing locationService.ts (legacy
// AsyncStorage paths) so RED test output is readable.
const originalError = console.error;
console.error = (...args: any[]) => {
  const msg = String(args[0] ?? "");
  if (msg.includes("AsyncStorage")) return;
  originalError(...args);
};
