import {
  setToolContext,
  clearToolContext,
} from "../../src/tool-context";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

jest.mock("../../src/config", () => ({
  __esModule: true,
  getConfig: () => ({
    reveniumMeteringApiKey: "test-api-key",
    reveniumMeteringBaseUrl: "https://api.test.com",
  }),
  getLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { meterTool, reportToolCall } from "../../src/tool-tracker";

describe("Tool Tracker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearToolContext();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: jest.fn().mockResolvedValue(""),
    });
  });

  describe("meterTool", () => {
    describe("synchronous functions", () => {
      it("wraps and returns result from sync function", async () => {
        const result = await meterTool("test-tool", () => {
          return "sync-result";
        });

        expect(result).toBe("sync-result");
      });

      it("sends tool event on success", async () => {
        await meterTool("my-tool", () => "result");

        await new Promise((resolve) => setImmediate(resolve));

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/tool/events"),
          expect.objectContaining({
            method: "POST",
          })
        );

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.toolId).toBe("my-tool");
        expect(body.success).toBe(true);
        expect(body.middlewareSource).toBe("revenium-litellm-node");
      });

      it("captures duration in milliseconds", async () => {
        await meterTool("timed-tool", () => {
          const start = Date.now();
          while (Date.now() - start < 50) {}
          return "done";
        });

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.durationMs).toBeGreaterThanOrEqual(40);
      });

      it("captures error on sync throw", async () => {
        let caughtError: Error | undefined;
        try {
          await meterTool("failing-tool", () => {
            throw new Error("sync failure");
          });
        } catch (e) {
          caughtError = e as Error;
        }

        expect(caughtError?.message).toBe("sync failure");

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.toolId).toBe("failing-tool");
        expect(body.success).toBe(false);
        expect(body.errorMessage).toBe("sync failure");
      });

      it("re-throws error to caller", async () => {
        const error = new Error("must propagate");
        let caughtError: Error | undefined;

        try {
          await meterTool("error-tool", () => {
            throw error;
          });
        } catch (e) {
          caughtError = e as Error;
        }

        expect(caughtError).toBe(error);
      });
    });

    describe("asynchronous functions", () => {
      it("wraps and returns result from async function", async () => {
        const result = await meterTool("async-tool", async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return "async-result";
        });

        expect(result).toBe("async-result");
      });

      it("sends tool event after async completion", async () => {
        await meterTool("async-tool", async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return "done";
        });

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.toolId).toBe("async-tool");
        expect(body.success).toBe(true);
      });

      it("captures error on async rejection", async () => {
        await expect(
          meterTool("async-failing", async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            throw new Error("async failure");
          })
        ).rejects.toThrow("async failure");

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.toolId).toBe("async-failing");
        expect(body.success).toBe(false);
        expect(body.errorMessage).toBe("async failure");
      });

      it("measures duration including async wait time", async () => {
        await meterTool("slow-async", async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return "done";
        });

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.durationMs).toBeGreaterThanOrEqual(90);
      });
    });

    describe("metadata handling", () => {
      it("includes operation in payload", async () => {
        await meterTool("tool-with-op", () => "result", {
          operation: "custom-operation",
        });

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.operation).toBe("custom-operation");
      });

      it("includes usageMetadata in payload", async () => {
        await meterTool("tool-with-usage", () => "result", {
          usageMetadata: { customField: "value", count: 42 },
        });

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.usageMetadata).toEqual({ customField: "value", count: 42 });
      });

      it("uses transactionId from metadata if provided", async () => {
        await meterTool("tool-with-txid", () => "result", {
          transactionId: "custom-tx-123",
        });

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.transactionId).toBe("custom-tx-123");
      });
    });

    describe("context integration", () => {
      it("uses context values when no metadata provided", async () => {
        setToolContext({
          agent: "context-agent",
          organizationName: "context-org",
          traceId: "context-trace",
        });

        await meterTool("ctx-tool", () => "result");

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.agent).toBe("context-agent");
        expect(body.organizationName).toBe("context-org");
        expect(body.traceId).toBe("context-trace");
      });

      it("metadata overrides context values", async () => {
        setToolContext({ agent: "context-agent" });

        await meterTool("override-tool", () => "result", {
          agent: "metadata-agent",
        });

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.agent).toBe("metadata-agent");
      });

      it("generates transactionId if not in context or metadata", async () => {
        await meterTool("no-txid-tool", () => "result");

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.transactionId).toBeDefined();
        expect(typeof body.transactionId).toBe("string");
        expect(body.transactionId.length).toBeGreaterThan(0);
      });
    });

    describe("payload structure", () => {
      it("includes all required fields", async () => {
        await meterTool("full-payload-tool", () => "result");

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.transactionId).toBeDefined();
        expect(body.toolId).toBe("full-payload-tool");
        expect(typeof body.durationMs).toBe("number");
        expect(body.success).toBe(true);
        expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(body.middlewareSource).toBe("revenium-litellm-node");
      });

      it("includes timestamp in ISO format", async () => {
        const before = new Date().toISOString();
        await meterTool("timestamp-tool", () => "result");
        const after = new Date().toISOString();

        await new Promise((resolve) => setImmediate(resolve));

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.timestamp >= before).toBe(true);
        expect(body.timestamp <= after).toBe(true);
      });
    });
  });

  describe("reportToolCall", () => {
    it("sends tool event with provided report data", async () => {
      reportToolCall("reported-tool", {
        durationMs: 150,
        success: true,
      });

      await new Promise((resolve) => setImmediate(resolve));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.toolId).toBe("reported-tool");
      expect(body.durationMs).toBe(150);
      expect(body.success).toBe(true);
      expect(body.middlewareSource).toBe("revenium-litellm-node");
    });

    it("includes error information for failed calls", async () => {
      reportToolCall("failed-reported", {
        durationMs: 50,
        success: false,
        errorMessage: "manual error report",
      });

      await new Promise((resolve) => setImmediate(resolve));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.success).toBe(false);
      expect(body.errorMessage).toBe("manual error report");
    });

    it("uses provided transactionId", async () => {
      reportToolCall("txid-reported", {
        durationMs: 100,
        success: true,
        transactionId: "manual-tx-456",
      });

      await new Promise((resolve) => setImmediate(resolve));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.transactionId).toBe("manual-tx-456");
    });

    it("uses provided timestamp", async () => {
      const customTimestamp = "2024-01-15T10:30:00.000Z";

      reportToolCall("timestamp-reported", {
        durationMs: 100,
        success: true,
        timestamp: customTimestamp,
      });

      await new Promise((resolve) => setImmediate(resolve));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.timestamp).toBe(customTimestamp);
    });

    it("merges with context values", async () => {
      setToolContext({
        agent: "report-context-agent",
        workflowId: "wf-report",
      });

      reportToolCall("context-reported", {
        durationMs: 100,
        success: true,
        operation: "manual-op",
      });

      await new Promise((resolve) => setImmediate(resolve));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.agent).toBe("report-context-agent");
      expect(body.workflowId).toBe("wf-report");
      expect(body.operation).toBe("manual-op");
    });

    it("report values override context", async () => {
      setToolContext({ agent: "context-agent" });

      reportToolCall("override-reported", {
        durationMs: 100,
        success: true,
        agent: "report-agent",
      });

      await new Promise((resolve) => setImmediate(resolve));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.agent).toBe("report-agent");
    });
  });
});
