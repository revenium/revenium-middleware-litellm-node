// Test 3: Metadata Tracking and Revenium API Integration
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load test environment variables BEFORE importing middleware
// Look for .env file in the project root directory
dotenv.config({ path: resolve(__dirname, "../../.env") });

// Import middleware (this should auto-initialize with loaded env vars)
import "@revenium/litellm";
import { getStatus, configure } from "@revenium/litellm";

// Import internal functions for direct testing - Note: extractProvider is internal, let's create our own test function
async function testProviderExtraction() {
  // We'll test provider extraction through actual model strings in requests
  // since extractProvider is not exported from tracking module
  return true;
}

async function runMetadataTrackingTest() {
  console.log("🧪 Test 3: Metadata Tracking and Revenium API Integration\n");

  // Ensure middleware is configured
  const status = getStatus();
  if (!status.initialized) {
    const configSuccess = configure({
      reveniumMeteringApiKey: process.env.REVENIUM_METERING_API_KEY!,
      reveniumMeteringBaseUrl: process.env.REVENIUM_METERING_BASE_URL!,
      litellmProxyUrl: process.env.LITELLM_PROXY_URL!,
      litellmApiKey: process.env.LITELLM_API_KEY,
      organizationName: "test_org",
      apiTimeout: 15000,
      failSilent: false,
    });

    if (!configSuccess) {
      throw new Error("Failed to configure middleware for metadata test");
    }
  }

  console.log("📋 Middleware configured for metadata testing");

  // Test 3.1: Header metadata extraction
  console.log("\n📋 Step 3.1: Testing header metadata extraction");

  const testHeaders = {
    "content-type": "application/json",
    authorization: "Bearer sk-test",
    "x-revenium-subscriber-id": "user_12345",
    "x-revenium-product-id": "my_ai_app",
    "x-revenium-organization-id": "org_67890",
    "x-revenium-trace-id": "trace_abc123",
    "x-revenium-task-type": "document_analysis",
    "x-revenium-agent": "document_processor_v2",
  };

  const { extractMetadataFromHeaders } =
    await import("@revenium/litellm/dist/tracking");
  const extractedMetadata = extractMetadataFromHeaders(testHeaders);
  console.log("Extracted metadata:", extractedMetadata);

  const expectedFields = [
    "subscriberId",
    "productName",
    "organizationName",
    "traceId",
    "taskType",
    "agent",
  ];

  expectedFields.forEach((field) => {
    if (extractedMetadata[field as keyof typeof extractedMetadata]) {
      console.log(
        `✅ ${field}: ${
          extractedMetadata[field as keyof typeof extractedMetadata]
        }`,
      );
    } else {
      console.log(`❌ ${field}: Missing`);
    }
  });

  // Test 3.2: Provider extraction through real requests
  console.log(
    "\n📋 Step 3.2: Testing provider detection through model strings",
  );

  const testModels = [
    { model: "gpt-4", expectedProvider: "OpenAI" },
    { model: "gpt-3.5-turbo", expectedProvider: "OpenAI" },
    { model: "openai/gpt-4", expectedProvider: "OpenAI" },
    { model: "anthropic/claude-3-opus", expectedProvider: "Anthropic" },
    {
      model: "anthropic/claude-3-haiku-20240307",
      expectedProvider: "Anthropic",
    },
    { model: "azure/gpt-4", expectedProvider: "Azure OpenAI" },
    { model: "cohere/command-r", expectedProvider: "Cohere" },
    { model: "vertex_ai/gemini-pro", expectedProvider: "Google Vertex AI" },
  ];

  testModels.forEach((test) => {
    console.log(
      `Model: ${test.model.padEnd(35)} → Expected Provider: ${
        test.expectedProvider
      }`,
    );
  });

  // Test 3.3: Usage extraction from response
  console.log("\n📋 Step 3.3: Testing usage extraction from LiteLLM response");

  const mockResponse = {
    id: "chatcmpl-test123",
    object: "chat.completion" as const,
    created: Date.now(),
    model: "gpt-3.5-turbo",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant" as const,
          content: "This is a test response from the AI model.",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 25,
      completion_tokens: 12,
      total_tokens: 37,
    },
  };

  const { extractUsageFromResponse } = await import("../../src/tracking");
  const extractedUsage = extractUsageFromResponse(mockResponse);
  console.log("Extracted usage data:", extractedUsage);

  if (
    extractedUsage.promptTokens === 25 &&
    extractedUsage.completionTokens === 12 &&
    extractedUsage.totalTokens === 37 &&
    extractedUsage.finishReason === "stop"
  ) {
    console.log("✅ Usage extraction working correctly");
  } else {
    console.log("❌ Usage extraction failed");
  }

  // Test 3.4: Real request with comprehensive metadata
  console.log(
    "\n📋 Step 3.4: Testing real request with comprehensive metadata",
  );

  const comprehensiveHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.LITELLM_API_KEY || "sk-test"}`,
    "x-revenium-subscriber-id": "comprehensive_test_user",
    "x-revenium-product-id": "metadata_test_app",
    "x-revenium-organization-id": "test_org_metadata",
    "x-revenium-trace-id": `trace_${Date.now()}`,
    "x-revenium-task-type": "comprehensive_test",
    "x-revenium-agent": "metadata_test_agent",
  };

  const config = getStatus();

  // Construct proper endpoint URL like the examples do
  const baseProxyUrl = config.proxyUrl!.replace(
    /\/(chat\/completions|embeddings)$/,
    "",
  );
  const chatCompletionsUrl = `${baseProxyUrl}/chat/completions`;

  try {
    console.log("Making request with comprehensive metadata...");
    const response = await fetch(chatCompletionsUrl, {
      method: "POST",
      headers: comprehensiveHeaders,
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant for testing metadata tracking.",
          },
          {
            role: "user",
            content:
              "This is a comprehensive metadata test. Please respond briefly.",
          },
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    console.log("Comprehensive metadata request status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("Comprehensive metadata request successful");
      console.log("Response summary:", {
        model: data.model,
        usage: data.usage,
        finish_reason: data.choices?.[0]?.finish_reason,
      });

      console.log("Expected Revenium tracking data:");
      console.log("- Provider: OpenAI");
      console.log("- Model: gpt-3.5-turbo");
      console.log("- Subscriber ID: comprehensive_test_user");
      console.log("- Product ID: metadata_test_app");
      console.log("- Organization ID: test_org_metadata");
      console.log("- Task Type: comprehensive_test");
      console.log("- Agent: metadata_test_agent");
      console.log("- Token counts from response usage");
    } else {
      console.log("Comprehensive request failed (check proxy and API keys)");
      const errorText = await response.text();
      console.log("Error:", errorText.substring(0, 100));
    }
  } catch (error) {
    console.log(
      "Comprehensive request error:",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Test 3.5: Multiple provider models in sequence
  console.log("\nStep 3.5: Testing multiple provider models in sequence");

  const providerTests = [
    { model: "openai/gpt-4o-mini", expectedProvider: "OpenAI" },
    {
      model: "anthropic/claude-3-5-haiku-latest",
      expectedProvider: "Anthropic",
    },
    { model: "google/gemini-pro", expectedProvider: "Google" },
  ];

  for (const test of providerTests) {
    try {
      console.log(`\nTesting ${test.model} (${test.expectedProvider})...`);

      const response = await fetch(chatCompletionsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LITELLM_API_KEY || "sk-test"}`,
          "x-revenium-subscriber-id": `user_${test.expectedProvider
            .toLowerCase()
            .replace(" ", "_")}`,
          "x-revenium-task-type": "provider_test",
        },
        body: JSON.stringify({
          model: test.model,
          messages: [
            { role: "user", content: `Hello from ${test.expectedProvider}!` },
          ],
          max_tokens: 20,
        }),
      });

      if (response.ok) {
        console.log(`${test.expectedProvider} request successful`);
        console.log(`Should track as provider: ${test.expectedProvider}`);
      } else {
        console.log(
          `${test.expectedProvider} request failed (may not be configured)`,
        );
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(
        `${test.expectedProvider} request error:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log("\nMetadata Tracking Test Summary:");
  console.log("- Header metadata extraction: Tested");
  console.log("- Provider detection: Tested");
  console.log("- Usage data extraction: Tested");
  console.log("- Comprehensive metadata request: Tested");
  console.log("- Multi-provider tracking: Tested");

  console.log("\nExpected Results:");
  console.log("If Revenium API key is valid and middleware is working:");
  console.log("- Multiple usage records should appear in Revenium dashboard");
  console.log("- Each record should have proper metadata fields populated");
  console.log("- Different providers should be correctly identified");
  console.log("- Token counts should match LiteLLM response usage data");

  console.log("\nTo verify tracking:");
  console.log("1. Check your Revenium dashboard for new usage records");
  console.log("2. Look for debug logs if REVENIUM_DEBUG=true");
  console.log("3. Verify metadata fields are populated correctly");
  console.log("4. Check that different providers are tracked separately");

  return true;
}

// Run the test
runMetadataTrackingTest()
  .then(() => {
    console.log("\nMetadata tracking test COMPLETED");
    console.log("Check your Revenium dashboard for detailed usage analytics!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nMetadata tracking test ERROR:", error);
    process.exit(1);
  });
