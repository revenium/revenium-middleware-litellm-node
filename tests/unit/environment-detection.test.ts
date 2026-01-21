import { getEnvironment } from "../../src/utils/trace-fields";

describe("Environment Detection", () => {
  const originalEnv = process.env;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.REVENIUM_ENVIRONMENT;
    delete process.env.NODE_ENV;
    delete process.env.DEPLOYMENT_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  describe("REVENIUM_ENVIRONMENT (highest priority)", () => {
    it("returns REVENIUM_ENVIRONMENT when set", () => {
      process.env.REVENIUM_ENVIRONMENT = "production";
      expect(getEnvironment()).toBe("production");
    });

    it("takes precedence over NODE_ENV", () => {
      process.env.REVENIUM_ENVIRONMENT = "staging";
      process.env.NODE_ENV = "production";
      expect(getEnvironment()).toBe("staging");
    });

    it("takes precedence over DEPLOYMENT_ENV", () => {
      process.env.REVENIUM_ENVIRONMENT = "development";
      process.env.DEPLOYMENT_ENV = "production";
      expect(getEnvironment()).toBe("development");
    });
  });

  describe("NODE_ENV fallback", () => {
    it("returns NODE_ENV when REVENIUM_ENVIRONMENT is not set", () => {
      process.env.NODE_ENV = "development";
      expect(getEnvironment()).toBe("development");
    });

    it("takes precedence over DEPLOYMENT_ENV", () => {
      process.env.NODE_ENV = "test";
      process.env.DEPLOYMENT_ENV = "production";
      expect(getEnvironment()).toBe("test");
    });
  });

  describe("DEPLOYMENT_ENV fallback", () => {
    it("returns DEPLOYMENT_ENV when others are not set", () => {
      process.env.DEPLOYMENT_ENV = "staging";
      expect(getEnvironment()).toBe("staging");
    });
  });

  describe("No environment set", () => {
    it("returns null when no env var is set", () => {
      expect(getEnvironment()).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("trims whitespace from environment value", () => {
      process.env.REVENIUM_ENVIRONMENT = "  production  ";
      expect(getEnvironment()).toBe("production");
    });

    it("returns null for empty string", () => {
      process.env.REVENIUM_ENVIRONMENT = "";
      expect(getEnvironment()).toBeNull();
    });

    it("returns empty string for whitespace-only string (trims to empty)", () => {
      process.env.REVENIUM_ENVIRONMENT = "   ";
      expect(getEnvironment()).toBe("");
    });

    it("truncates environment to 255 characters", () => {
      process.env.REVENIUM_ENVIRONMENT = "a".repeat(300);
      const result = getEnvironment();
      expect(result?.length).toBe(255);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("handles special characters", () => {
      process.env.REVENIUM_ENVIRONMENT = "prod-us-east-1";
      expect(getEnvironment()).toBe("prod-us-east-1");
    });
  });
});
