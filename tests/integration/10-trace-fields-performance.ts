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

const PERFORMANCE_THRESHOLD_MS = 5;
const MEMORY_LEAK_ITERATIONS = 1000;

function measureExecutionTime(fn: () => any): number {
  const start = performance.now();
  fn();
  const end = performance.now();
  return end - start;
}

async function measureAsyncExecutionTime(
  fn: () => Promise<any>
): Promise<number> {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
}

async function testPerformance() {
  console.log("\n=== Performance Tests ===\n");
  let testsPassed = 0;
  let totalTests = 0;

  try {
    totalTests++;
    console.log("--- Test 1: getEnvironment() overhead ---");
    process.env.REVENIUM_ENVIRONMENT = "production";
    const time1 = measureExecutionTime(() => getEnvironment());
    console.log(`Execution time: ${time1.toFixed(3)}ms`);
    if (time1 > PERFORMANCE_THRESHOLD_MS) {
      throw new Error(
        `getEnvironment() too slow: ${time1.toFixed(3)}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`
      );
    }
    console.log(`✓ Performance acceptable (< ${PERFORMANCE_THRESHOLD_MS}ms)`);
    testsPassed++;

    totalTests++;
    console.log("\n--- Test 2: getRegion() caching ---");
    process.env.AWS_REGION = "us-west-2";

    const time2a = await measureAsyncExecutionTime(() => getRegion());
    console.log(`First call: ${time2a.toFixed(3)}ms`);

    const time2b = await measureAsyncExecutionTime(() => getRegion());
    console.log(`Second call (cached): ${time2b.toFixed(3)}ms`);

    if (time2b > time2a) {
      throw new Error(
        `getRegion() caching not working: second call (${time2b.toFixed(3)}ms) slower than first (${time2a.toFixed(3)}ms)`
      );
    }
    console.log("✓ Region caching working correctly");
    testsPassed++;

    totalTests++;
    console.log("\n--- Test 3: detectOperationSubtype() overhead ---");
    const requestWithTools = {
      tools: [{ name: "get_weather", description: "Get weather" }],
    };
    const time3 = measureExecutionTime(() =>
      detectOperationSubtype(requestWithTools)
    );
    console.log(`Execution time: ${time3.toFixed(3)}ms`);
    if (time3 > PERFORMANCE_THRESHOLD_MS) {
      throw new Error(
        `detectOperationSubtype() too slow: ${time3.toFixed(3)}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`
      );
    }
    console.log(`✓ Performance acceptable (< ${PERFORMANCE_THRESHOLD_MS}ms)`);
    testsPassed++;

    totalTests++;
    console.log("\n--- Test 4: Memory leak test (1000 iterations) ---");
    const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Memory before: ${memBefore.toFixed(2)} MB`);

    for (let i = 0; i < MEMORY_LEAK_ITERATIONS; i++) {
      getEnvironment();
      await getRegion();
      getCredentialAlias();
      getTraceType();
      getTraceName();
      detectOperationSubtype(requestWithTools);
      getParentTransactionId();
      getTransactionName();
      getRetryNumber();
    }

    if (global.gc) {
      global.gc();
    }

    const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Memory after: ${memAfter.toFixed(2)} MB`);

    const memIncrease = memAfter - memBefore;
    console.log(`Memory increase: ${memIncrease.toFixed(2)} MB`);

    const memIncreasePerIteration = memIncrease / MEMORY_LEAK_ITERATIONS;
    console.log(
      `Memory increase per iteration: ${(memIncreasePerIteration * 1024).toFixed(3)} KB`
    );

    if (memIncrease > 10) {
      throw new Error(
        `Potential memory leak detected: ${memIncrease.toFixed(2)} MB increase after ${MEMORY_LEAK_ITERATIONS} iterations`
      );
    }
    console.log("✓ No significant memory leak detected");
    testsPassed++;

    totalTests++;
    console.log("\n--- Test 5: All fields combined overhead ---");
    const timeCombined = await measureAsyncExecutionTime(async () => {
      getEnvironment();
      await getRegion();
      getCredentialAlias();
      getTraceType();
      getTraceName();
      detectOperationSubtype(requestWithTools);
      getParentTransactionId();
      getTransactionName();
      getRetryNumber();
    });
    console.log(`Total execution time: ${timeCombined.toFixed(3)}ms`);
    if (timeCombined > PERFORMANCE_THRESHOLD_MS * 2) {
      throw new Error(
        `Combined overhead too high: ${timeCombined.toFixed(3)}ms (threshold: ${PERFORMANCE_THRESHOLD_MS * 2}ms)`
      );
    }
    console.log(
      `✓ Combined performance acceptable (< ${PERFORMANCE_THRESHOLD_MS * 2}ms)`
    );
    testsPassed++;

    console.log("\n=== All Performance Tests Complete ===");
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

testPerformance().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

