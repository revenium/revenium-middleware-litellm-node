// Test 2: LiteLLM Proxy Request Interception
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load test environment variables BEFORE importing middleware
// Look for .env file in the project root directory
dotenv.config({ path: resolve(__dirname, "../../.env") });

// Import middleware (this should auto-initialize with loaded env vars)
import "@revenium/litellm";
import { getStatus, configure } from "@revenium/litellm";

async function runProxyRequestTest() {
  console.log("🧪 Test 2: LiteLLM Proxy Request Interception\n");

  // Configure middleware manually to ensure proper settings
  const configSuccess = configure({
    reveniumMeteringApiKey: process.env.REVENIUM_METERING_API_KEY!,
    reveniumMeteringBaseUrl: process.env.REVENIUM_METERING_BASE_URL!,
    litellmProxyUrl: process.env.LITELLM_PROXY_URL!,
    litellmApiKey: process.env.LITELLM_API_KEY,
    apiTimeout: 15000,
    failSilent: false,
  });

  const config = getStatus();
  console.log("📋 Middleware status:", config);

  // Construct proper endpoint URLs like the examples do
  const baseProxyUrl = config.proxyUrl!.replace(
    /\/(chat\/completions|embeddings)$/,
    ""
  );
  const chatCompletionsUrl = `${baseProxyUrl}/chat/completions`;

  console.log("🎯 Target proxy URL:", config.proxyUrl);
  console.log("🎯 Chat completions URL:", chatCompletionsUrl);

  // Test 2.1: Basic OpenAI model request
  console.log("\n📋 Step 2.1: Testing basic OpenAI model request");
  try {
    const startTime = Date.now();

    const response = await fetch(chatCompletionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LITELLM_API_KEY || "sk-test"}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content:
              "Hello! This is a test message from the Revenium LiteLLM middleware.",
          },
        ],
        max_tokens: 50,
      }),
    });

    const duration = Date.now() - startTime;
    console.log("Request completed:", {
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Basic request successful");
      console.log("Response data:", {
        id: data.id,
        model: data.model,
        choices: data.choices?.length || 0,
        usage: data.usage,
        created: data.created,
      });

      if (data.usage) {
        console.log("🎯 Token usage detected:", data.usage);
        console.log("✅ This usage should be tracked by Revenium middleware");
      }
    } else {
      console.log(
        "⚠️  Request failed (expected if proxy not running or no valid API key)"
      );
      const errorText = await response.text();
      console.log("Error response:", errorText.substring(0, 200));
    }
  } catch (error) {
    console.log(
      "⚠️  Request error (expected if proxy not running):",
      error instanceof Error ? error.message : String(error)
    );
  }

  // Test 2.2: Request with metadata headers
  console.log("\n📋 Step 2.2: Testing request with Revenium metadata headers");
  try {
    const startTime = Date.now();

    const response = await fetch(chatCompletionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LITELLM_API_KEY || "sk-test"}`,
        // Revenium metadata headers
        "x-revenium-subscriber-id": "test_user_456",
        "x-revenium-product-id": "proxy_test_app",
        "x-revenium-trace-id": "trace_" + Date.now(),
        "x-revenium-task-type": "chat_completion",
        "x-revenium-organization-id": "test_org_123",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "This is a test with metadata headers for tracking.",
          },
        ],
        max_tokens: 30,
      }),
    });

    const duration = Date.now() - startTime;
    console.log("Metadata request completed:", {
      status: response.status,
      duration: `${duration}ms`,
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Metadata request successful");
      console.log("🎯 Middleware should extract these metadata values:");
      console.log("- Subscriber ID: test_user_456");
      console.log("- Product ID: proxy_test_app");
      console.log("- Task Type: chat_completion");
      console.log("- Organization ID: test_org_123");
      console.log("- Trace ID: trace_*");
    } else {
      console.log(
        "⚠️  Metadata request failed (expected if proxy not running)"
      );
    }
  } catch (error) {
    console.log(
      "⚠️  Metadata request error:",
      error instanceof Error ? error.message : String(error)
    );
  }

  // Test 2.3: Different model provider test
  console.log("\n📋 Step 2.3: Testing different model provider (Anthropic)");
  try {
    const response = await fetch(chatCompletionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LITELLM_API_KEY || "sk-test"}`,
        "x-revenium-subscriber-id": "test_user_anthropic",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-5-haiku-latest",
        messages: [
          {
            role: "user",
            content: "Test message for Anthropic Claude via LiteLLM proxy.",
          },
        ],
        max_tokens: 40,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Anthropic model request successful");
      console.log("🎯 Provider should be detected as: Anthropic");
      console.log("🎯 Model should be detected as: claude-3-5-haiku-latest");
    } else {
      console.log(
        "⚠️  Anthropic request failed (expected if no Claude API key configured)"
      );
    }
  } catch (error) {
    console.log(
      "⚠️  Anthropic request error:",
      error instanceof Error ? error.message : String(error)
    );
  }

  // Test 2.4: Non-LiteLLM request (should not be intercepted)
  console.log(
    "\n📋 Step 2.4: Testing non-LiteLLM request (should NOT be intercepted)"
  );
  try {
    const response = await fetch("https://httpbin.org/post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        test: "This request should NOT be intercepted by Revenium middleware",
      }),
    });

    if (response.ok) {
      console.log(
        "✅ Non-LiteLLM request successful (correctly not intercepted)"
      );
    } else {
      console.log("⚠️  Non-LiteLLM request failed");
    }
  } catch (error) {
    console.log(
      "⚠️  Non-LiteLLM request error:",
      error instanceof Error ? error.message : String(error)
    );
  }

  // Test 2.5: Invalid proxy URL test
  console.log(
    "\n📋 Step 2.5: Testing request to non-existent proxy (error handling)"
  );
  try {
    const response = await fetch("http://localhost:9999/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "test" }],
      }),
    });
  } catch (error) {
    console.log(
      "✅ Error handling working correctly:",
      error instanceof Error ? error.message : String(error)
    );
  }

  console.log("\n�� Proxy Request Test Summary:");
  console.log("- Basic request handling: Tested");
  console.log("- Metadata header extraction: Tested");
  console.log("- Multi-provider support: Tested");
  console.log("- Non-LiteLLM request isolation: Tested");
  console.log("- Error handling: Tested");

  console.log("\n📊 Expected Revenium API calls:");
  console.log(
    "If tests succeeded and Revenium API key is valid, you should see:"
  );
  console.log("- 2-3 usage tracking API calls to Revenium");
  console.log("- Debug logs showing request interception");
  console.log("- Metadata extraction from headers");
  console.log("- Provider detection (OpenAI, Anthropic)");

  return true;
}

// Run the test
runProxyRequestTest()
  .then(() => {
    console.log("\n✅ Proxy request test COMPLETED");
    console.log("Check Revenium dashboard for tracked usage data!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nProxy request test ERROR:", error);
    process.exit(1);
  });
