import { getTraceType } from "../../src/utils/trace-fields";

describe("TraceType Validation", () => {
  const originalEnv = process.env;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.REVENIUM_TRACE_TYPE;
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  describe("Valid format", () => {
    it("accepts alphanumeric characters", () => {
      process.env.REVENIUM_TRACE_TYPE = "CustomerSupport";
      expect(getTraceType()).toBe("CustomerSupport");
    });

    it("accepts hyphens", () => {
      process.env.REVENIUM_TRACE_TYPE = "customer-support";
      expect(getTraceType()).toBe("customer-support");
    });

    it("accepts underscores", () => {
      process.env.REVENIUM_TRACE_TYPE = "customer_support";
      expect(getTraceType()).toBe("customer_support");
    });

    it("accepts combination of valid characters", () => {
      process.env.REVENIUM_TRACE_TYPE = "customer-support_v2";
      expect(getTraceType()).toBe("customer-support_v2");
    });

    it("accepts numbers", () => {
      process.env.REVENIUM_TRACE_TYPE = "type123";
      expect(getTraceType()).toBe("type123");
    });

    it("accepts all lowercase", () => {
      process.env.REVENIUM_TRACE_TYPE = "chatbot";
      expect(getTraceType()).toBe("chatbot");
    });

    it("accepts all uppercase", () => {
      process.env.REVENIUM_TRACE_TYPE = "CHATBOT";
      expect(getTraceType()).toBe("CHATBOT");
    });
  });

  describe("Invalid format", () => {
    it("rejects special characters (@)", () => {
      process.env.REVENIUM_TRACE_TYPE = "invalid@type";
      expect(getTraceType()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("rejects special characters (!)", () => {
      process.env.REVENIUM_TRACE_TYPE = "invalid!type";
      expect(getTraceType()).toBeNull();
    });

    it("rejects spaces", () => {
      process.env.REVENIUM_TRACE_TYPE = "invalid type";
      expect(getTraceType()).toBeNull();
    });

    it("rejects special characters (#)", () => {
      process.env.REVENIUM_TRACE_TYPE = "type#1";
      expect(getTraceType()).toBeNull();
    });

    it("rejects dots", () => {
      process.env.REVENIUM_TRACE_TYPE = "type.v1";
      expect(getTraceType()).toBeNull();
    });

    it("rejects slashes", () => {
      process.env.REVENIUM_TRACE_TYPE = "type/subtype";
      expect(getTraceType()).toBeNull();
    });

    it("logs warning for invalid format", () => {
      process.env.REVENIUM_TRACE_TYPE = "invalid@type!";
      getTraceType();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe("Max length (128 characters)", () => {
    it("accepts value at max length", () => {
      process.env.REVENIUM_TRACE_TYPE = "a".repeat(128);
      const result = getTraceType();
      expect(result?.length).toBe(128);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("truncates value exceeding max length", () => {
      process.env.REVENIUM_TRACE_TYPE = "a".repeat(150);
      const result = getTraceType();
      expect(result?.length).toBe(128);
    });

    it("logs warning when truncating", () => {
      process.env.REVENIUM_TRACE_TYPE = "a".repeat(150);
      getTraceType();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("returns null when not set", () => {
      expect(getTraceType()).toBeNull();
    });

    it("returns null for empty string", () => {
      process.env.REVENIUM_TRACE_TYPE = "";
      expect(getTraceType()).toBeNull();
    });

    it("rejects value with leading/trailing whitespace (spaces not allowed)", () => {
      process.env.REVENIUM_TRACE_TYPE = "  valid-type  ";
      expect(getTraceType()).toBeNull();
    });
  });
});
