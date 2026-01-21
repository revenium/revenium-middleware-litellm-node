/**
 * LiteLLM Streaming Example
 *
 * This example demonstrates streaming responses and advanced features with metadata tracking.
 * Shows streaming chat completions, multi-provider support, and advanced metadata usage.
 */

// Load environment variables from .env file
import "dotenv/config";

// Step 1: Import the middleware (this enables automatic tracking)
import "@revenium/litellm";

async function streamingExample() {
  console.log("Starting streaming Revenium LiteLLM middleware example...\n");

  // Check environment variables
  const requiredVars = ["REVENIUM_METERING_API_KEY", "LITELLM_PROXY_URL"];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   ${key}`));
    console.error("\nPlease set them in a .env file in the project root.");
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
    // Example 1: Basic streaming with metadata
    console.log("Example 1: Basic streaming response with metadata...");

    const streamResponse = await fetch(`${baseProxyUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Custom metadata for this streaming request
        "x-revenium-subscriber-id": "artist-456",
        "x-revenium-subscriber-email": "artist@creative-ai-inc.com",
        "x-revenium-subscriber-credential-name": "creative-api-key",
        "x-revenium-subscriber-credential": "creative-credential-value",
        "x-revenium-organization-id": "creative-ai-inc",
        "x-revenium-product-id": "story-generator",
        "x-revenium-task-type": "creative-writing",
        "x-revenium-agent": "litellm-node-streaming",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: "Tell me a short story about a robot learning to paint.",
          },
        ],
        stream: true,
      }),
    });

    if (streamResponse.ok && streamResponse.body) {
      console.log("Streaming response:");

      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                process.stdout.write(content);
              }
            } catch (e) {
              // Ignore parsing errors for malformed chunks
            }
          }
        }
      }

      console.log("\n   ✅ Stream completed and automatically tracked!\n");
      successCount++;
    } else {
      console.log(
        "❌ Streaming request failed:",
        streamResponse.status,
        streamResponse.statusText
      );
    }

    // Example 2: Multi-provider streaming
    console.log(
      "Example 2: Multi-provider streaming with different metadata..."
    );

    const anthropicStreamResponse = await fetch(
      `${baseProxyUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          // Metadata for research provider
          "x-revenium-subscriber-id": "researcher-789",
          "x-revenium-subscriber-email": "researcher@research-users.com",
          "x-revenium-subscriber-credential-name": "research-api-key",
          "x-revenium-subscriber-credential": "research-credential-value",
          "x-revenium-organization-id": "research-users",
          "x-revenium-product-id": "research-assistant",
          "x-revenium-task-type": "research-query",
          "x-revenium-agent": "litellm-node-streaming-multi",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: "What are three benefits of renewable energy?",
            },
          ],
          stream: true,
        }),
      }
    );

    if (anthropicStreamResponse.ok && anthropicStreamResponse.body) {
      console.log("Research streaming response:");

      const reader = anthropicStreamResponse.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                process.stdout.write(content);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }

      console.log(
        "\n   ✅ Research stream completed and automatically tracked!\n"
      );
      successCount++;
    } else {
      console.log(
        "❌ Research streaming request failed:",
        anthropicStreamResponse.status,
        anthropicStreamResponse.statusText
      );
    }

    // Example 3: Advanced metadata with embeddings
    console.log(
      "Example 3: Advanced embeddings with comprehensive metadata..."
    );

    const advancedEmbeddingResponse = await fetch(
      `${baseProxyUrl}/embeddings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          // Comprehensive metadata for embeddings
          "x-revenium-subscriber-id": "search-user-101",
          "x-revenium-subscriber-email": "user@search-company.com",
          "x-revenium-subscriber-credential-name": "search-api-key",
          "x-revenium-subscriber-credential": "search-credential-value",
          "x-revenium-organization-id": "search-company",
          "x-revenium-product-id": "semantic-search-engine",
          "x-revenium-task-type": "document-indexing",
          "x-revenium-agent": "litellm-node-streaming-embeddings",
          "x-revenium-trace-id": "batch-embedding-session-456",
        },
        body: JSON.stringify({
          model: "text-embedding-ada-002",
          input: [
            "Advanced machine learning techniques for natural language processing",
            "Deep learning architectures for computer vision applications",
            "Reinforcement learning algorithms for autonomous systems",
          ],
        }),
      }
    );

    if (advancedEmbeddingResponse.ok) {
      const embeddingData = await advancedEmbeddingResponse.json();
      console.log(
        "Advanced embedding response: Multiple vectors generated successfully"
      );
      console.log(`   Vectors: ${embeddingData.data?.length || 0}`);
      console.log(
        `   Dimensions: ${
          embeddingData.data?.[0]?.embedding?.length || "Unknown"
        }`
      );
      console.log(`   Tokens: ${embeddingData.usage?.prompt_tokens} input\n`);
      successCount++;
    } else {
      console.log(
        "❌ Advanced embedding request failed:",
        advancedEmbeddingResponse.status,
        advancedEmbeddingResponse.statusText
      );
    }

    // Report results
    console.log(
      `\nResults: ${successCount}/${totalRequests} requests successful`
    );

    if (successCount === totalRequests) {
      console.log(
        "✅ All streaming requests successful and automatically tracked to Revenium!"
      );
      console.log(
        "Check your Revenium dashboard to see the detailed analytics"
      );
    } else if (successCount > 0) {
      console.log(
        "⚠️  Some streaming requests successful and tracked to Revenium."
      );
      console.log("Check your Revenium dashboard to see the tracked usage.");
    } else {
      console.log(
        "❌ No requests were successful. Check your LiteLLM Proxy configuration."
      );
      console.log(
        "Ensure your LiteLLM Proxy is running and accessible at:",
        proxyUrl
      );
    }
  } catch (error) {
    console.error("❌ Error in streaming example:", error);
    throw error;
  }
}

// Run the example
if (require.main === module) {
  streamingExample()
    .then(() => {
      console.log("\nStreaming example completed successfully!");
      console.log(
        "Enable REVENIUM_DEBUG=true to see detailed request tracking logs"
      );
    })
    .catch((error) => {
      console.error("\nStreaming example failed:", error);
      process.exit(1);
    });
}
