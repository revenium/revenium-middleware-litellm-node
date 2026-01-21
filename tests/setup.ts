const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.warn = (...args: unknown[]) => {
  const message = String(args[0] || "");
  if (
    message.includes("[Revenium]") ||
    message.includes("Revenium middleware not initialized")
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

console.info = (...args: unknown[]) => {
  const message = String(args[0] || "");
  if (
    message.includes("[Revenium]") ||
    message.includes("REVENIUM_METERING_API_KEY")
  ) {
    return;
  }
  originalConsoleInfo.apply(console, args);
};

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.info = originalConsoleInfo;
});
