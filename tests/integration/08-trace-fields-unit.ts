import {
  getEnvironment,
  getRegion,
  getCredentialAlias,
  getTraceType,
  getTraceName,
  detectOperationSubtype,
  getParentTransactionId,
  getTransactionName,
  getRetryNumber,
} from "../../src/utils/trace-fields";

function assertEqual<T>(actual: T, expected: T, testName: string): void {
  if (actual !== expected) {
    throw new Error(`${testName} failed: expected ${expected}, got ${actual}`);
  }
  console.log(`✓ ${testName}`);
}

async function runTests() {
  console.log("\n=== Unit Tests for Trace Visualization Fields ===\n");

  let testsPassed = 0;
  let totalTests = 16;

  try {
    console.log("--- Test 1: getEnvironment() ---");
    process.env.REVENIUM_ENVIRONMENT = "production";
    assertEqual(
      getEnvironment(),
      "production",
      "getEnvironment() with REVENIUM_ENVIRONMENT"
    );
    testsPassed++;

    console.log("\n--- Test 2: getEnvironment() fallback to NODE_ENV ---");
    delete process.env.REVENIUM_ENVIRONMENT;
    process.env.NODE_ENV = "development";
    assertEqual(
      getEnvironment(),
      "development",
      "getEnvironment() fallback to NODE_ENV"
    );
    testsPassed++;

    console.log("\n--- Test 3: getEnvironment() truncation ---");
    process.env.REVENIUM_ENVIRONMENT = "a".repeat(300);
    const env = getEnvironment();
    assertEqual(env?.length, 255, "getEnvironment() truncation to 255 chars");
    testsPassed++;

    console.log("\n--- Test 4: getRegion() from env var ---");
    process.env.AWS_REGION = "us-west-2";
    const region = await getRegion();
    assertEqual(region, "us-west-2", "getRegion() from AWS_REGION");
    testsPassed++;

    console.log("\n--- Test 5: getCredentialAlias() ---");
    process.env.REVENIUM_CREDENTIAL_ALIAS = "My API Key";
    assertEqual(getCredentialAlias(), "My API Key", "getCredentialAlias()");
    testsPassed++;

    console.log("\n--- Test 6: getTraceType() valid format ---");
    process.env.REVENIUM_TRACE_TYPE = "customer-support_v1";
    assertEqual(
      getTraceType(),
      "customer-support_v1",
      "getTraceType() valid format"
    );
    testsPassed++;

    console.log("\n--- Test 7: getTraceType() invalid format ---");
    process.env.REVENIUM_TRACE_TYPE = "invalid@type!";
    assertEqual(
      getTraceType(),
      null,
      "getTraceType() invalid format returns null"
    );
    testsPassed++;

    console.log("\n--- Test 8: getTraceType() truncation ---");
    process.env.REVENIUM_TRACE_TYPE = "a".repeat(150);
    const traceType = getTraceType();
    assertEqual(
      traceType?.length,
      128,
      "getTraceType() truncation to 128 chars"
    );
    testsPassed++;

    console.log("\n--- Test 9: getTraceName() ---");
    process.env.REVENIUM_TRACE_NAME = "User Session #12345";
    assertEqual(getTraceName(), "User Session #12345", "getTraceName()");
    testsPassed++;

    console.log("\n--- Test 10: getTraceName() truncation ---");
    process.env.REVENIUM_TRACE_NAME = "a".repeat(300);
    const traceName = getTraceName();
    assertEqual(
      traceName?.length,
      256,
      "getTraceName() truncation to 256 chars"
    );
    testsPassed++;

    console.log("\n--- Test 11: detectOperationSubtype() with tools ---");
    const requestWithTools = {
      tools: [{ name: "get_weather", description: "Get weather" }],
    };
    assertEqual(
      detectOperationSubtype(requestWithTools),
      "function_call",
      "detectOperationSubtype() with tools"
    );
    testsPassed++;

    console.log("\n--- Test 12: detectOperationSubtype() without tools ---");
    const requestWithoutTools = { messages: [] };
    assertEqual(
      detectOperationSubtype(requestWithoutTools),
      null,
      "detectOperationSubtype() without tools"
    );
    testsPassed++;

    console.log("\n--- Test 13: getParentTransactionId() ---");
    process.env.REVENIUM_PARENT_TRANSACTION_ID = "parent-txn-123";
    assertEqual(
      getParentTransactionId(),
      "parent-txn-123",
      "getParentTransactionId()"
    );
    testsPassed++;

    console.log("\n--- Test 14: getTransactionName() ---");
    process.env.REVENIUM_TRANSACTION_NAME = "Process Payment";
    assertEqual(
      getTransactionName(),
      "Process Payment",
      "getTransactionName()"
    );
    testsPassed++;

    console.log("\n--- Test 15: getRetryNumber() default ---");
    delete process.env.REVENIUM_RETRY_NUMBER;
    assertEqual(getRetryNumber(), 0, "getRetryNumber() default to 0");
    testsPassed++;

    console.log("\n--- Test 16: getRetryNumber() with value ---");
    process.env.REVENIUM_RETRY_NUMBER = "3";
    assertEqual(getRetryNumber(), 3, "getRetryNumber() with value");
    testsPassed++;

    console.log("\n=== All Unit Tests Complete ===");
    console.log(`✓ ${testsPassed}/${totalTests} tests passed\n`);
    process.exit(0);
  } catch (error) {
    console.error(
      `\n✗ Test failed: ${error instanceof Error ? error.message : error}`
    );
    console.log(
      `\n✗ ${testsPassed}/${totalTests} tests passed before failure\n`
    );
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
