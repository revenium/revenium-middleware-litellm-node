import { getRegion } from "../../src/utils/trace-fields";

describe("Region Detection", () => {
  const originalEnv = process.env;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    delete process.env.AWS_REGION;
    delete process.env.AWS_DEFAULT_REGION;
    delete process.env.AZURE_REGION;
    delete process.env.GCP_REGION;
    delete process.env.REVENIUM_REGION;
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  describe("AWS_REGION (highest priority)", () => {
    it("returns AWS_REGION when set", async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.AWS_REGION = "us-east-1";
        const { getRegion } = require("../../src/utils/trace-fields");
        const result = await getRegion();
        expect(result).toBe("us-east-1");
      });
    });

    it("takes precedence over other region vars", async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.AWS_REGION = "us-west-2";
        process.env.AZURE_REGION = "eastus";
        process.env.GCP_REGION = "us-central1";
        const { getRegion } = require("../../src/utils/trace-fields");
        const result = await getRegion();
        expect(result).toBe("us-west-2");
      });
    });
  });

  describe("AWS_DEFAULT_REGION fallback", () => {
    it("does not use AWS_DEFAULT_REGION (only AWS_REGION is checked)", async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.AWS_DEFAULT_REGION = "eu-west-1";
        global.fetch = jest
          .fn()
          .mockImplementation(() => Promise.reject(new Error("No metadata")));
        const { getRegion } = require("../../src/utils/trace-fields");
        const result = await getRegion();
        expect(result).toBeNull();
      });
    });
  });

  describe("AZURE_REGION fallback", () => {
    it("returns AZURE_REGION when AWS regions are not set", async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.AZURE_REGION = "eastus";
        const { getRegion } = require("../../src/utils/trace-fields");
        const result = await getRegion();
        expect(result).toBe("eastus");
      });
    });
  });

  describe("GCP_REGION fallback", () => {
    it("returns GCP_REGION as fallback", async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.GCP_REGION = "us-central1";
        const { getRegion } = require("../../src/utils/trace-fields");
        const result = await getRegion();
        expect(result).toBe("us-central1");
      });
    });
  });

  describe("REVENIUM_REGION fallback", () => {
    it("returns REVENIUM_REGION as fallback", async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.REVENIUM_REGION = "eu-west-1";
        const { getRegion } = require("../../src/utils/trace-fields");
        const result = await getRegion();
        expect(result).toBe("eu-west-1");
      });
    });
  });

  describe("Metadata service fallback", () => {
    it("returns null when no region env var is set and metadata fails", async () => {
      await jest.isolateModulesAsync(async () => {
        global.fetch = jest
          .fn()
          .mockImplementation(() => Promise.reject(new Error("Not in AWS")));

        const { getRegion } = require("../../src/utils/trace-fields");
        const result = await getRegion();
        expect(result).toBeNull();
      });
    });
  });

  describe("Edge cases", () => {
    it("handles region with hyphens and numbers", async () => {
      await jest.isolateModulesAsync(async () => {
        process.env.AWS_REGION = "ap-southeast-2";
        const { getRegion } = require("../../src/utils/trace-fields");
        const result = await getRegion();
        expect(result).toBe("ap-southeast-2");
      });
    });
  });
});
