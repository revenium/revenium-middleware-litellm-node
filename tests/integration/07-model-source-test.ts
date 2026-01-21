/**
 * Model Source Detection Integration Test
 *
 * Tests model source detection functionality for various providers
 */

// Load environment variables from .env file
import "dotenv/config";

// Import the middleware (this enables automatic tracking)
import "@revenium/litellm";

async function testModelSourceDetection() {
  console.log("🧪 Testing model source detection...\n");

  // Check environment variables
  const requiredVars = ["REVENIUM_METERING_API_KEY", "LITELLM_PROXY_URL"];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   ${key}`));
    process.exit(1);
  }

  const proxyUrl = process.env.LITELLM_PROXY_URL!;
  const apiKey = process.env.LITELLM_API_KEY || "sk-1234";

  // Handle proxy URL - remove endpoint if already included
  const baseProxyUrl = proxyUrl.replace(
    /\/(chat\/completions|embeddings)$/,
    ""
  );

  try {
    console.log("📤 Testing model source detection with OpenAI model...");

    const response = await fetch(`${baseProxyUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-revenium-subscriber-id": "test-user-model-source",
        "x-revenium-organization-id": "test-org",
        "x-revenium-task-type": "model-source-test",
        "x-revenium-product-id": "integration-test",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: "Test model source detection.",
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Model source detection test successful");
      console.log(`   Model: ${data.model}`);
      console.log(
        `   Tokens: ${data.usage?.prompt_tokens} input + ${data.usage?.completion_tokens} output`
      );
    } else {
      console.log(
        "❌ Model source detection test failed:",
        response.status,
        response.statusText
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error in model source detection test:", error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testModelSourceDetection()
    .then(() => {
      console.log("\nModel source detection test completed successfully!");
    })
    .catch((error) => {
      console.error("\nModel source detection test failed:", error);
      process.exit(1);
    });
}
