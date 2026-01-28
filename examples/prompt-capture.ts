import { configure, UsageMetadata } from "../src/index.js";

async function main() {
  console.log("=== LiteLLM Prompt Capture Example ===\n");

  // Configure the middleware with prompt capture enabled
  configure({
    reveniumMeteringApiKey: process.env.REVENIUM_METERING_API_KEY || "test-key",
    reveniumMeteringBaseUrl:
      process.env.REVENIUM_METERING_BASE_URL || "https://api.revenium.ai",
    litellmProxyUrl: process.env.LITELLM_PROXY_URL || "http://localhost:4000",
    litellmApiKey: process.env.LITELLM_API_KEY,
    capturePrompts: true,
  });

  console.log("Example 1: Prompt capture enabled via config");
  console.log("Making request with prompt capture enabled...\n");

  try {
    const metadata: UsageMetadata = {
      organizationName: "org-prompt-capture-demo",
      productName: "prod-litellm-prompt-capture",
    };

    const response = await fetch(
      `${
        process.env.LITELLM_PROXY_URL || "http://localhost:4000"
      }/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LITELLM_API_KEY || ""}`,
          "X-Revenium-Organization-Name": metadata.organizationName || "",
          "X-Revenium-Product-Name": metadata.productName || "",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that provides concise answers.",
            },
            {
              role: "user",
              content: "What is the capital of France?",
            },
          ],
          max_tokens: 100,
        }),
      },
    );

    const data = await response.json();
    console.log("Response:", data.choices?.[0]?.message?.content);
    console.log("\nPrompts captured and sent to Revenium API!");
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error),
    );
  }

  console.log("\n" + "=".repeat(50) + "\n");
  console.log("Example 2: Prompt capture disabled via metadata override");
  console.log("Making request with prompt capture disabled...\n");

  try {
    const metadata2: UsageMetadata = {
      organizationName: "org-prompt-capture-demo",
      productName: "prod-litellm-prompt-capture",
      capturePrompts: false,
    };

    const response2 = await fetch(
      `${
        process.env.LITELLM_PROXY_URL || "http://localhost:4000"
      }/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LITELLM_API_KEY || ""}`,
          "X-Revenium-Organization-Name": metadata2.organizationName || "",
          "X-Revenium-Product-Name": metadata2.productName || "",
          "X-Revenium-Capture-Prompts": "false",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant.",
            },
            {
              role: "user",
              content: "What is 2+2?",
            },
          ],
          max_tokens: 100,
        }),
      },
    );

    const data2 = await response2.json();
    console.log("Response:", data2.choices?.[0]?.message?.content);
    console.log("\nPrompts NOT captured (overridden via metadata)!");
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error),
    );
  }

  console.log("\n" + "=".repeat(50) + "\n");
  console.log("Example 3: Prompt capture with environment variable");
  console.log("Set REVENIUM_CAPTURE_PROMPTS=true in your .env file\n");

  console.log("✅ Prompt capture examples completed!");
  console.log("\nConfiguration hierarchy:");
  console.log("1. Per-call metadata (highest priority)");
  console.log("2. Global config");
  console.log("3. Environment variable REVENIUM_CAPTURE_PROMPTS");
  console.log("4. Default: false (lowest priority)");
}

main().catch(console.error);
