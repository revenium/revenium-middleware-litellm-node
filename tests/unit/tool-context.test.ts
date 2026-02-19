import {
  setToolContext,
  getToolContext,
  clearToolContext,
  runWithToolContext,
} from "../../src/tool-context";

describe("Tool Context Management", () => {
  beforeEach(() => {
    clearToolContext();
  });

  describe("setToolContext", () => {
    it("sets context values", () => {
      setToolContext({ agent: "test-agent" });
      expect(getToolContext().agent).toBe("test-agent");
    });

    it("merges with existing context", () => {
      setToolContext({ agent: "test-agent" });
      setToolContext({ organizationName: "test-org" });

      const ctx = getToolContext();
      expect(ctx.agent).toBe("test-agent");
      expect(ctx.organizationName).toBe("test-org");
    });

    it("overwrites existing values when same key is set", () => {
      setToolContext({ agent: "agent-1" });
      setToolContext({ agent: "agent-2" });

      expect(getToolContext().agent).toBe("agent-2");
    });

    it("sets multiple values at once", () => {
      setToolContext({
        agent: "test-agent",
        organizationName: "test-org",
        productName: "test-product",
        workflowId: "wf-123",
        traceId: "trace-456",
      });

      const ctx = getToolContext();
      expect(ctx.agent).toBe("test-agent");
      expect(ctx.organizationName).toBe("test-org");
      expect(ctx.productName).toBe("test-product");
      expect(ctx.workflowId).toBe("wf-123");
      expect(ctx.traceId).toBe("trace-456");
    });
  });

  describe("getToolContext", () => {
    it("returns empty object when no context is set", () => {
      clearToolContext();
      const ctx = getToolContext();
      expect(ctx).toEqual({});
    });

    it("returns current context values", () => {
      clearToolContext();
      setToolContext({ transactionId: "tx-123" });
      expect(getToolContext().transactionId).toBe("tx-123");
    });
  });

  describe("clearToolContext", () => {
    it("clears all context values", () => {
      setToolContext({
        agent: "test-agent",
        organizationName: "test-org",
      });

      clearToolContext();

      const ctx = getToolContext();
      expect(ctx).toEqual({});
    });
  });

  describe("runWithToolContext", () => {
    it("runs synchronous function with context", () => {
      const result = runWithToolContext({ agent: "scoped-agent" }, () => {
        return getToolContext().agent;
      });

      expect(result).toBe("scoped-agent");
    });

    it("runs async function with context", async () => {
      const result = await runWithToolContext({ agent: "async-agent" }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return getToolContext().agent;
      });

      expect(result).toBe("async-agent");
    });

    it("merges with existing context", () => {
      setToolContext({ organizationName: "outer-org" });

      const result = runWithToolContext({ agent: "inner-agent" }, () => {
        const ctx = getToolContext();
        return { agent: ctx.agent, org: ctx.organizationName };
      });

      expect(result).toEqual({ agent: "inner-agent", org: "outer-org" });
    });

    it("does not leak context outside of run", () => {
      clearToolContext();
      runWithToolContext({ agent: "scoped-only" }, () => {
        return null;
      });

      expect(getToolContext().agent).toBeUndefined();
    });

    it("preserves return value from function", () => {
      const result = runWithToolContext({}, () => {
        return { data: "test-data", count: 42 };
      });

      expect(result).toEqual({ data: "test-data", count: 42 });
    });

    it("propagates errors from synchronous function", () => {
      expect(() => {
        runWithToolContext({}, () => {
          throw new Error("sync error");
        });
      }).toThrow("sync error");
    });

    it("propagates errors from async function", async () => {
      await expect(
        runWithToolContext({}, async () => {
          throw new Error("async error");
        })
      ).rejects.toThrow("async error");
    });
  });

  describe("nested contexts", () => {
    it("handles nested runWithToolContext calls", () => {
      const results: string[] = [];

      runWithToolContext({ agent: "outer" }, () => {
        results.push(getToolContext().agent!);

        runWithToolContext({ agent: "inner" }, () => {
          results.push(getToolContext().agent!);
        });

        results.push(getToolContext().agent!);
      });

      expect(results).toEqual(["outer", "inner", "outer"]);
    });
  });
});
