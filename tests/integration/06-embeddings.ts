/**
 * Embeddings Integration Test
 *
 * Tests embeddings functionality with LiteLLM Proxy and Revenium tracking
 */

// Load environment variables from .env file
import "dotenv/config";

// Import the middleware (this enables automatic tracking)
import "@revenium/litellm";

async function testEmbeddings() {
  console.log("🧪 Testing embeddings integration...\n");

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
    console.log("📤 Testing embeddings with metadata...");

    const embeddingResponse = await fetch(`${baseProxyUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-revenium-subscriber-id": "test-user-embeddings",
        "x-revenium-organization-id": "test-org",
        "x-revenium-task-type": "embedding-test",
        "x-revenium-product-id": "integration-test",
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: "This is a test embedding for integration testing.",
      }),
    });

    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      console.log("✅ Embeddings test successful");
      console.log(
        `   Dimensions: ${
          embeddingData.data[0]?.embedding?.length || "Unknown"
        }`
      );
      console.log(`   Tokens: ${embeddingData.usage?.prompt_tokens} input`);
    } else {
      console.log(
        "❌ Embeddings test failed:",
        embeddingResponse.status,
        embeddingResponse.statusText
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error in embeddings test:", error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testEmbeddings()
    .then(() => {
      console.log("\nEmbeddings integration test completed successfully!");
    })
    .catch((error) => {
      console.error("\nEmbeddings test failed:", error);
      process.exit(1);
    });
}
