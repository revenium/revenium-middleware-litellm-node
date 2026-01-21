import { getCredentialAlias } from "../../src/utils/trace-fields";

describe("Credential Alias Configuration", () => {
  const originalEnv = process.env;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.REVENIUM_CREDENTIAL_ALIAS;
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  describe("REVENIUM_CREDENTIAL_ALIAS", () => {
    it("returns credential alias when set", () => {
      process.env.REVENIUM_CREDENTIAL_ALIAS = "Production API Key";
      expect(getCredentialAlias()).toBe("Production API Key");
    });

    it("returns null when not set", () => {
      expect(getCredentialAlias()).toBeNull();
    });

    it("returns null for empty string", () => {
      process.env.REVENIUM_CREDENTIAL_ALIAS = "";
      expect(getCredentialAlias()).toBeNull();
    });

    it("returns empty string for whitespace-only string (trims to empty)", () => {
      process.env.REVENIUM_CREDENTIAL_ALIAS = "   ";
      expect(getCredentialAlias()).toBe("");
    });
  });

  describe("Truncation", () => {
    it("truncates to 255 characters", () => {
      process.env.REVENIUM_CREDENTIAL_ALIAS = "a".repeat(300);
      const result = getCredentialAlias();
      expect(result?.length).toBe(255);
    });

    it("logs warning when truncating", () => {
      process.env.REVENIUM_CREDENTIAL_ALIAS = "a".repeat(300);
      getCredentialAlias();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("does not truncate value at 255 characters", () => {
      process.env.REVENIUM_CREDENTIAL_ALIAS = "a".repeat(255);
      const result = getCredentialAlias();
      expect(result?.length).toBe(255);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("does not truncate value under 255 characters", () => {
      process.env.REVENIUM_CREDENTIAL_ALIAS = "a".repeat(100);
      const result = getCredentialAlias();
      expect(result?.length).toBe(100);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("trims whitespace", () => {
      process.env.REVENIUM_CREDENTIAL_ALIAS = "  My API Key  ";
      expect(getCredentialAlias()).toBe("My API Key");
    });

    it("handles special characters", () => {
      process.env.REVENIUM_CREDENTIAL_ALIAS = "API-Key_v2.0 (Production)";
      expect(getCredentialAlias()).toBe("API-Key_v2.0 (Production)");
    });

    it("handles unicode characters", () => {
      process.env.REVENIUM_CREDENTIAL_ALIAS = "API キー";
      expect(getCredentialAlias()).toBe("API キー");
    });

    it("handles descriptive alias names", () => {
      process.env.REVENIUM_CREDENTIAL_ALIAS =
        "claude-3-opus-prod-team-a-key-001";
      expect(getCredentialAlias()).toBe("claude-3-opus-prod-team-a-key-001");
    });
  });
});
