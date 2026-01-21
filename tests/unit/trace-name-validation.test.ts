import { getTraceName } from "../../src/utils/trace-fields";

describe("TraceName Validation", () => {
  const originalEnv = process.env;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.REVENIUM_TRACE_NAME;
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  describe("Basic functionality", () => {
    it("returns trace name when set", () => {
      process.env.REVENIUM_TRACE_NAME = "User Session #12345";
      expect(getTraceName()).toBe("User Session #12345");
    });

    it("returns null when not set", () => {
      expect(getTraceName()).toBeNull();
    });

    it("returns null for empty string", () => {
      process.env.REVENIUM_TRACE_NAME = "";
      expect(getTraceName()).toBeNull();
    });

    it("returns whitespace string (no trimming in traceName)", () => {
      process.env.REVENIUM_TRACE_NAME = "   ";
      // traceName does NOT trim - returns as-is
      expect(getTraceName()).toBe("   ");
    });
  });

  describe("Max length (256 characters)", () => {
    it("accepts value at max length", () => {
      process.env.REVENIUM_TRACE_NAME = "a".repeat(256);
      const result = getTraceName();
      expect(result?.length).toBe(256);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("does not truncate value under max length", () => {
      process.env.REVENIUM_TRACE_NAME = "a".repeat(100);
      const result = getTraceName();
      expect(result?.length).toBe(100);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("Truncation", () => {
    it("truncates value exceeding 256 characters", () => {
      process.env.REVENIUM_TRACE_NAME = "a".repeat(300);
      const result = getTraceName();
      expect(result?.length).toBe(256);
    });

    it("logs warning when truncating", () => {
      process.env.REVENIUM_TRACE_NAME = "a".repeat(300);
      getTraceName();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("preserves content up to max length", () => {
      const longName = "Session-" + "x".repeat(300);
      process.env.REVENIUM_TRACE_NAME = longName;
      const result = getTraceName();
      expect(result).toBe(longName.substring(0, 256));
    });
  });

  describe("Edge cases", () => {
    it("preserves whitespace (no trimming)", () => {
      process.env.REVENIUM_TRACE_NAME = "  My Trace Name  ";
      // traceName does NOT trim - returns as-is
      expect(getTraceName()).toBe("  My Trace Name  ");
    });

    it("handles special characters", () => {
      process.env.REVENIUM_TRACE_NAME = "User-123 Session #456 (Active)";
      expect(getTraceName()).toBe("User-123 Session #456 (Active)");
    });

    it("handles unicode characters", () => {
      process.env.REVENIUM_TRACE_NAME = "セッション #12345";
      expect(getTraceName()).toBe("セッション #12345");
    });

    it("handles long descriptive names", () => {
      process.env.REVENIUM_TRACE_NAME =
        "Customer Support Chat - Ticket #789 - John Doe - Product Inquiry";
      expect(getTraceName()).toBe(
        "Customer Support Chat - Ticket #789 - John Doe - Product Inquiry"
      );
    });

    it("handles multi-line content (should be single line)", () => {
      process.env.REVENIUM_TRACE_NAME = "Line1\nLine2";
      const result = getTraceName();
      expect(result).toContain("Line1");
    });
  });
});
