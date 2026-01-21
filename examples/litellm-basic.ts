/**
 * LiteLLM Basic Example
 *
 * This example demonstrates basic LiteLLM Proxy usage with optional metadata tracking.
 * Shows both chat completions and embeddings with and without metadata.
 */

// Load environment variables from .env file
import "dotenv/config";

// Step 1: Import the middleware (this enables automatic tracking)
import "@revenium/litellm";

async function basicExample() {
  console.log("Starting basic Revenium LiteLLM middleware example...\n");

  // Check environment variables
  const requiredVars = ["REVENIUM_METERING_API_KEY", "LITELLM_PROXY_URL"];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   ${key}`));
    console.error("\nPlease set them in a .env file in the project root:");
    console.error("   REVENIUM_METERING_API_KEY=hak_your_api_key");
    console.error("   REVENIUM_METERING_BASE_URL=https://api.revenium.ai");
    console.error("   LITELLM_PROXY_URL=https://your-proxy.com");
    console.error("   LITELLM_API_KEY=your_litellm_key  # Optional");
    process.exit(1);
  }

  const proxyUrl = process.env.LITELLM_PROXY_URL!;
  const apiKey = process.env.LITELLM_API_KEY || "sk-1234";

  // Handle proxy URL - remove endpoint if already included
  const baseProxyUrl = proxyUrl.replace(
    /\/(chat\/completions|embeddings)$/,
    ""
  );

  // Debug: Show loaded configuration (partially obfuscated)
  console.log("Configuration loaded:");
  console.log(
    `   Revenium API Key: ${process.env.REVENIUM_METERING_API_KEY?.substring(
      0,
      8
    )}...${process.env.REVENIUM_METERING_API_KEY?.slice(-4)}`
  );
  console.log(
    `   Revenium Base URL: ${process.env.REVENIUM_METERING_BASE_URL}`
  );
  console.log(`   LiteLLM Proxy URL: ${proxyUrl}`);
  console.log(`   Base Proxy URL: ${baseProxyUrl}`);
  console.log(
    `   LiteLLM API Key: ${apiKey.substring(0, 8)}...${apiKey.slice(-4)}\n`
  );

  let successCount = 0;
  let totalRequests = 3;

  try {
    // Example 1: Basic chat completion without metadata
    console.log("Example 1: Basic chat completion without metadata...");
    const chatUrl = `${baseProxyUrl}/chat/completions`;
    console.log(`   Calling: ${chatUrl}`);

    const basicResponse = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // No metadata - still tracked automatically!
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: "What is the capital of France? Please be concise.",
          },
        ],
      }),
    });

    if (basicResponse.ok) {
      const basicData = await basicResponse.json();
      console.log(
        "Basic response:",
        basicData.choices[0]?.message?.content || "No response"
      );
      console.log(
        `   Tokens: ${basicData.usage?.prompt_tokens} input + ${basicData.usage?.completion_tokens} output\n`
      );
      successCount++;
    } else {
      console.log(
        "❌ Basic request failed:",
        basicResponse.status,
        basicResponse.statusText
      );
      const errorText = await basicResponse.text();
      console.log("   Error details:", errorText.substring(0, 200));
    }

    // Example 2: Chat completion with custom metadata
    console.log("Example 2: Chat completion with custom metadata...");

    const metadataResponse = await fetch(`${baseProxyUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Add custom metadata for enhanced tracking and analytics
        "x-revenium-subscriber-id": "demo-user-123",
        "x-revenium-subscriber-email": "demo-user@acme.com",
        "x-revenium-subscriber-credential-name": "api-key",
        "x-revenium-subscriber-credential": "demo-credential-value",
        "x-revenium-organization-id": "my-customer-name",
        "x-revenium-task-type": "litellm-node-basic",
        "x-revenium-product-id": "litellm-middleware-demo",
        "x-revenium-agent": "littellm-node-basic",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: "Explain quantum computing in one sentence.",
          },
        ],
      }),
    });

    if (metadataResponse.ok) {
      const metadataData = await metadataResponse.json();
      console.log(
        "Metadata response:",
        metadataData.choices[0]?.message?.content || "No response"
      );
      console.log(
        `   Tokens: ${metadataData.usage?.prompt_tokens} input + ${metadataData.usage?.completion_tokens} output\n`
      );
      successCount++;
    } else {
      console.log(
        "❌ Metadata request failed:",
        metadataResponse.status,
        metadataResponse.statusText
      );
      const errorText = await metadataResponse.text();
      console.log("   Error details:", errorText.substring(0, 200));
    }

    // Example 3: Embeddings with metadata
    console.log("Example 3: Embeddings with metadata...");

    const embeddingResponse = await fetch(`${baseProxyUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Metadata works with embeddings too!
        "x-revenium-subscriber-id": "demo-user-123",
        "x-revenium-subscriber-email": "demo-user@acme.com",
        "x-revenium-subscriber-credential-name": "embedding-key",
        "x-revenium-subscriber-credential": "demo-embedding-credential",
        "x-revenium-organization-id": "my-customer-name",
        "x-revenium-task-type": "text-embedding",
        "x-revenium-product-id": "semantic-search-demo",
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: "This is a sample text for embedding generation.",
      }),
    });

    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      console.log("Embedding response: Vector generated successfully");
      console.log(
        `   Dimensions: ${
          embeddingData.data[0]?.embedding?.length || "Unknown"
        }`
      );
      console.log(`   Tokens: ${embeddingData.usage?.prompt_tokens} input\n`);
      successCount++;
    } else {
      console.log(
        "❌ Embedding request failed:",
        embeddingResponse.status,
        embeddingResponse.statusText
      );
      const errorText = await embeddingResponse.text();
      console.log("   Error details:", errorText.substring(0, 200));
    }

    // Report results
    console.log(
      `\nResults: ${successCount}/${totalRequests} requests successful`
    );

    if (successCount === totalRequests) {
      console.log(
        "✅ All requests successful and automatically tracked to Revenium!"
      );
      console.log("Check your Revenium dashboard to see the tracked usage.");
    } else if (successCount > 0) {
      console.log("⚠️  Some requests successful and tracked to Revenium.");
      console.log("Check your Revenium dashboard to see the tracked usage.");
    } else {
      console.log(
        "❌ No requests were successful. Check your LiteLLM Proxy configuration."
      );
      console.log(
        "Ensure your LiteLLM Proxy is running and accessible at:",
        baseProxyUrl
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

// Run the example
if (require.main === module) {
  basicExample()
    .then(() => {
      console.log("\nBasic example completed!");
      console.log(
        "Enable REVENIUM_DEBUG=true to see detailed request tracking logs"
      );
    })
    .catch((error) => {
      console.error("\nExample failed:", error);
      process.exit(1);
    });
}
