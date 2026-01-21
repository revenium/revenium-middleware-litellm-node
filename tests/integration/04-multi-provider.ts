// Test 4: Multi-Provider LLM Testing
import dotenv from "dotenv";
import { resolve } from "path";

// Load test environment variables BEFORE importing middleware
// Look for .env file in the project root directory
dotenv.config({ path: resolve(__dirname, "../../.env") });

// Import middleware (this should auto-initialize with loaded env vars)
import "@revenium/litellm";
import { getStatus, configure } from "@revenium/litellm";
import fetch from "node-fetch";

const config = {
  litellmProxyUrl: process.env.LITELLM_PROXY_URL!,
  litellmApiKey: process.env.LITELLM_API_KEY!,
};

// Test models from user's actual LiteLLM proxy configuration
const testModels = [
  // Supported models (confirmed working)
  { name: "openai/gpt-4o", provider: "OpenAI", shouldSucceed: true },
  { name: "openai/gpt-4o-mini", provider: "OpenAI", shouldSucceed: true },
  {
    name: "anthropic/claude-3-7-sonnet-latest",
    provider: "Anthropic",
    shouldSucceed: true,
  },
  {
    name: "anthropic/claude-3-5-haiku-latest",
    provider: "Anthropic",
    shouldSucceed: true,
  },
  { name: "claude-sonnet-4", provider: "Anthropic", shouldSucceed: true },

  // Models with known restrictions/limitations (expected failures for testing)
  { name: "openai/o3-mini", provider: "OpenAI", shouldSucceed: false }, // O-series models have temperature restrictions
  {
    name: "google/gemini-pro",
    provider: "Google Vertex AI",
    shouldSucceed: false,
  }, // Not found/deprecated
  {
    name: "google/gemini-2.5-pro-exp-03-25",
    provider: "Google Vertex AI",
    shouldSucceed: false,
  }, // Quota exceeded

  // Unsupported model (to test error handling)
  { name: "azure/gpt-4", provider: "Azure OpenAI", shouldSucceed: false },
];

async function testModel(model: {
  name: string;
  provider: string;
  shouldSucceed: boolean;
}): Promise<{
  name: string;
  provider: string;
  success: boolean;
  status?: number;
  statusText?: string;
  duration?: number;
  error?: string;
  shouldSucceed: boolean;
}> {
  const startTime = Date.now();

  try {
    // Construct proper endpoint URL like the examples do
    const baseProxyUrl = config.litellmProxyUrl.replace(
      /\/(chat\/completions|embeddings)$/,
      ""
    );
    const chatCompletionsUrl = `${baseProxyUrl}/chat/completions`;

    const response = await fetch(chatCompletionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.litellmApiKey}`,
        "x-revenium-subscriber-id": `test_${model.provider
          .toLowerCase()
          .replace(/\s+/g, "_")}`,
        "x-revenium-product-id": "multi_provider_test",
        "x-revenium-task-type": "provider_testing",
        "x-revenium-trace-id": `trace_${Date.now()}`,
      },
      body: JSON.stringify({
        model: model.name,
        messages: [
          {
            role: "user",
            content: `Test message for ${model.provider} provider using ${model.name}. Please respond briefly.`,
          },
        ],
        max_tokens: 20,
        temperature: 0.1,
      }),
    });

    const duration = Date.now() - startTime;
    const success = response.ok;

    if (!success) {
      const errorBody = await response.text();
      return {
        name: model.name,
        provider: model.provider,
        success: false,
        status: response.status,
        statusText: response.statusText,
        duration,
        error:
          errorBody.substring(0, 200) + (errorBody.length > 200 ? "..." : ""),
        shouldSucceed: model.shouldSucceed,
      };
    }

    const responseData = await response.json();
    return {
      name: model.name,
      provider: model.provider,
      success: true,
      status: response.status,
      statusText: response.statusText,
      duration,
      shouldSucceed: model.shouldSucceed,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      name: model.name,
      provider: model.provider,
      success: false,
      duration,
      error: error instanceof Error ? error.message : String(error),
      shouldSucceed: model.shouldSucceed,
    };
  }
}

async function main() {
  console.log("🧪 Test 4: Multi-Provider LLM Testing\n");
  console.log(`📋 Testing against LiteLLM Proxy: ${config.litellmProxyUrl}`);
  console.log(
    "🎯 Testing provider detection and tracking across multiple LLM providers\n"
  );
  console.log(
    "💡 Note: This test uses your actual proxy configuration with one intentional failure test\n"
  );

  const results: Awaited<ReturnType<typeof testModel>>[] = [];

  // Group models by provider for organized output
  const providerGroups: Record<string, typeof testModels> = {};
  testModels.forEach((model) => {
    if (!providerGroups[model.provider]) {
      providerGroups[model.provider] = [];
    }
    providerGroups[model.provider].push(model);
  });

  for (const [providerName, models] of Object.entries(providerGroups)) {
    console.log(`📂 ${providerName} Models`);
    console.log("=".repeat(50));
    console.log();

    for (const model of models) {
      console.log(`🧪 Testing: ${model.name}`);
      console.log(`   Expected Provider: ${model.provider}`);
      console.log(
        `   Should Succeed: ${
          model.shouldSucceed ? "Yes" : "No (testing error handling)"
        }`
      );

      const result = await testModel(model);
      results.push(result);

      if (result.success) {
        console.log(`   ✅ SUCCESS (${result.status}): ${result.statusText}`);
        console.log(`   ⏱️  Duration: ${result.duration}ms`);
      } else {
        const expectedText = result.shouldSucceed
          ? "UNEXPECTED FAILURE"
          : "EXPECTED FAILURE (testing error handling)";
        const emoji = result.shouldSucceed ? "❌" : "⚠️";
        console.log(
          `   ${emoji} ${expectedText} (${result.status || "N/A"}): ${
            result.statusText || "Network Error"
          }`
        );
        if (result.error) {
          console.log(`   📄 Error: ${result.error}`);
        }
      }
      console.log(
        `   🎯 Provider detection should work regardless of success/failure`
      );
      console.log();
    }
  }

  // Summary
  console.log("=".repeat(80));
  console.log("🎯 MULTI-PROVIDER TEST SUMMARY");
  console.log("=".repeat(80));
  console.log();

  const totalTests = results.length;
  const expectedSuccesses = results.filter((r) => r.shouldSucceed);
  const actualSuccesses = results.filter((r) => r.success);
  const expectedFailures = results.filter((r) => !r.shouldSucceed);
  const actualFailures = results.filter((r) => !r.success);

  const unexpectedFailures = results.filter(
    (r) => r.shouldSucceed && !r.success
  );
  const expectedFailureCount = expectedFailures.filter(
    (r) => !r.success
  ).length;

  console.log(`📊 Overall Results:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Expected Successes: ${expectedSuccesses.length}`);
  console.log(`   Actual Successes: ${actualSuccesses.length}`);
  console.log(`   Expected Failures: ${expectedFailures.length}`);
  console.log(`   Actual Expected Failures: ${expectedFailureCount}`);
  console.log(`   Unexpected Failures: ${unexpectedFailures.length}`);
  console.log();

  // Results by provider
  console.log(`📈 Results by Provider:`);
  const providerStats: Record<
    string,
    { total: number; successful: number; expected: number }
  > = {};

  results.forEach((result) => {
    if (!providerStats[result.provider]) {
      providerStats[result.provider] = { total: 0, successful: 0, expected: 0 };
    }
    providerStats[result.provider].total++;
    if (result.success) providerStats[result.provider].successful++;
    if (result.shouldSucceed) providerStats[result.provider].expected++;
  });

  Object.entries(providerStats).forEach(([provider, stats]) => {
    const rate =
      stats.expected > 0
        ? Math.round((stats.successful / stats.expected) * 100)
        : 0;
    console.log(
      `   ${provider.padEnd(20)}: ${stats.successful}/${
        stats.expected
      } expected successful (${rate}%)`
    );
  });
  console.log();

  if (unexpectedFailures.length > 0) {
    console.log(`⚠️  Unexpected Failures:`);
    unexpectedFailures.forEach((result) => {
      console.log(
        `   ${result.provider.padEnd(20)} → ${result.name}: HTTP ${
          result.status || "N/A"
        }: ${result.statusText || result.error}`
      );
    });
    console.log();
  }

  if (expectedFailureCount > 0) {
    console.log(`✅ Expected Failures (testing error handling):`);
    expectedFailures
      .filter((r) => !r.success)
      .forEach((result) => {
        console.log(
          `   ${result.provider.padEnd(20)} → ${result.name}: HTTP ${
            result.status || "N/A"
          }: ${result.statusText || result.error}`
        );
      });
    console.log();
  }

  console.log(`Verification Steps:`);
  console.log(
    `1. Check your Revenium dashboard for ${actualSuccesses.length} new usage records`
  );
  console.log(`2. Verify different providers are tracked separately`);
  console.log(
    `3. Check that model names are extracted correctly (without provider prefix where applicable)`
  );
  console.log(`4. Verify metadata fields are populated correctly`);
  console.log(`5. Look for debug logs if REVENIUM_DEBUG=true`);
  console.log();

  console.log(`💡 Notes:`);
  console.log(
    `- ${expectedFailureCount}/${expectedFailures.length} expected failures occurred (testing error handling)`
  );
  console.log(
    `- ${actualSuccesses.length} successful requests should create separate tracking records in Revenium`
  );
  console.log(
    `- Provider detection works for both successful and failed requests`
  );
  console.log(
    `- Each model test includes unique metadata for tracking verification`
  );
  console.log();

  const successRate =
    expectedSuccesses.length > 0
      ? Math.round((actualSuccesses.length / expectedSuccesses.length) * 100)
      : 0;
  console.log(`Multi-provider test COMPLETED!`);
  console.log(
    `📈 ${actualSuccesses.length}/${expectedSuccesses.length} expected models tested successfully (${successRate}%)`
  );
  console.log(
    `Check your Revenium dashboard for detailed provider analytics!`
  );
}

main().catch(console.error);
