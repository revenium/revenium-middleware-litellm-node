import { getRetryNumber } from "../../src/utils/trace-fields";

describe("Retry Number Tracking", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.REVENIUM_RETRY_NUMBER;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("REVENIUM_RETRY_NUMBER parsing", () => {
    it("returns 0 when not set (first attempt)", () => {
      expect(getRetryNumber()).toBe(0);
    });

    it("returns 0 for first retry attempt", () => {
      process.env.REVENIUM_RETRY_NUMBER = "0";
      expect(getRetryNumber()).toBe(0);
    });

    it("returns 1 for second attempt", () => {
      process.env.REVENIUM_RETRY_NUMBER = "1";
      expect(getRetryNumber()).toBe(1);
    });

    it("returns 2 for third attempt", () => {
      process.env.REVENIUM_RETRY_NUMBER = "2";
      expect(getRetryNumber()).toBe(2);
    });

    it("parses large retry numbers", () => {
      process.env.REVENIUM_RETRY_NUMBER = "10";
      expect(getRetryNumber()).toBe(10);
    });
  });

  describe("Invalid values", () => {
    it("returns 0 for non-numeric string", () => {
      process.env.REVENIUM_RETRY_NUMBER = "invalid";
      expect(getRetryNumber()).toBe(0);
    });

    it("returns 0 for empty string", () => {
      process.env.REVENIUM_RETRY_NUMBER = "";
      expect(getRetryNumber()).toBe(0);
    });

    it("returns 0 for floating point string", () => {
      process.env.REVENIUM_RETRY_NUMBER = "1.5";
      expect(getRetryNumber()).toBe(1);
    });

    it("returns negative number as-is (no validation for negative)", () => {
      process.env.REVENIUM_RETRY_NUMBER = "-1";
      expect(getRetryNumber()).toBe(-1);
    });

    it("returns 0 for whitespace", () => {
      process.env.REVENIUM_RETRY_NUMBER = "   ";
      expect(getRetryNumber()).toBe(0);
    });
  });

  describe("Edge cases", () => {
    it("handles leading/trailing whitespace", () => {
      process.env.REVENIUM_RETRY_NUMBER = "  3  ";
      expect(getRetryNumber()).toBe(3);
    });

    it("handles numeric string with leading zeros", () => {
      process.env.REVENIUM_RETRY_NUMBER = "007";
      expect(getRetryNumber()).toBe(7);
    });
  });
});
