// Test 1: Basic Connectivity and Configuration
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load test environment variables BEFORE importing middleware
// Look for .env file in the project root directory
const envPath = resolve(__dirname, "../../.env");
console.log("Loading environment from:", envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.log("❌ Failed to load .env file:", result.error.message);
  console.log(
    "Make sure you have a .env file in the root directory with required variables",
  );
} else {
  console.log("✅ Environment file loaded successfully");
  console.log("Environment check:", {
    hasReveniumKey: !!process.env.REVENIUM_METERING_API_KEY,
    hasReveniumUrl: !!process.env.REVENIUM_METERING_BASE_URL,
    hasLitellmUrl: !!process.env.LITELLM_PROXY_URL,
    hasLitellmKey: !!process.env.LITELLM_API_KEY,
  });
}

// Import middleware (this should auto-initialize with loaded env vars)
import "@revenium/litellm";
import { getStatus, configure, getConfig } from "@revenium/litellm";

async function runBasicConnectivityTest() {
  console.log("🧪 Test 1: Basic Connectivity and Configuration\n");

  // Test 1.1: Check auto-initialization from environment
  console.log("📋 Step 1.1: Auto-initialization from environment variables");
  const autoStatus = getStatus();
  console.log("Auto-init status:", {
    initialized: autoStatus.initialized,
    patched: autoStatus.patched,
    hasConfig: autoStatus.hasConfig,
    proxyUrl: autoStatus.proxyUrl,
  });

  if (autoStatus.initialized) {
    console.log("✅ Auto-initialization successful from environment variables");
  } else {
    console.log(
      "⚠️  Auto-initialization failed - will test manual configuration",
    );
  }

  // Test 1.2: Manual configuration test
  console.log("\n📋 Step 1.2: Manual configuration test");
  const testConfig = configure({
    reveniumMeteringApiKey: "hak_test_key_example",
    reveniumMeteringBaseUrl: "https://api.dev.hcapp.io",
    litellmProxyUrl: "http://localhost:4000/chat/completions",
    litellmApiKey: "sk-test-key",
    organizationName: "test_org",
    apiTimeout: 10000,
    failSilent: false,
  });

  console.log(
    "Manual configuration result:",
    testConfig ? "✅ Success" : "❌ Failed",
  );

  // Test 1.3: Final status check
  console.log("\n📋 Step 1.3: Final middleware status");
  const finalStatus = getStatus();
  console.log("Final status:", {
    initialized: finalStatus.initialized,
    patched: finalStatus.patched,
    hasConfig: finalStatus.hasConfig,
    proxyUrl: finalStatus.proxyUrl,
  });

  // Test 1.4: Configuration validation
  console.log("\n📋 Step 1.4: Configuration validation");
  const config = getConfig();
  if (config) {
    console.log("✅ Configuration loaded successfully");
    console.log("Config details:", {
      hasReveniumKey: !!config.reveniumMeteringApiKey,
      reveniumMeteringBaseUrl: config.reveniumMeteringBaseUrl,
      litellmProxyUrl: config.litellmProxyUrl,
      hasLitellmKey: !!config.litellmApiKey,
      timeout: config.apiTimeout || 5000,
      failSilent: config.failSilent !== false,
    });
  } else {
    console.log("❌ No configuration found");
  }

  // Test 1.5: URL pattern validation
  console.log("\n📋 Step 1.5: URL pattern validation");
  if (config?.litellmProxyUrl) {
    try {
      const url = new URL(config.litellmProxyUrl);
      console.log("✅ LiteLLM Proxy URL is valid");
      console.log("URL analysis:", {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? "443" : "80"),
        pathname: url.pathname,
        isFullEndpoint: url.pathname.includes("/chat/completions"),
      });

      if (url.pathname.includes("/chat/completions")) {
        console.log(
          "✅ URL includes chat completions endpoint - will match exactly",
        );
      } else {
        console.log(
          "ℹ️  URL is base URL - will match any chat completions endpoint",
        );
      }
    } catch (error) {
      console.log(
        "❌ LiteLLM Proxy URL is invalid:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log("\n🎯 Basic Connectivity Test Summary:");
  console.log("- Auto-initialization:", autoStatus.initialized ? "✅" : "⚠️");
  console.log("- Manual configuration:", testConfig ? "✅" : "❌");
  console.log("- HTTP client patched:", finalStatus.patched ? "✅" : "❌");
  console.log("- Ready for requests:", finalStatus.initialized ? "✅" : "❌");

  if (finalStatus.initialized) {
    console.log("\n🚀 Middleware is ready! Proceed to proxy request tests.");
  } else {
    console.log(
      "\n⚠️  Middleware not ready. Check configuration and try again.",
    );
  }

  return finalStatus.initialized;
}

// Run the test
runBasicConnectivityTest()
  .then((success) => {
    if (success) {
      console.log("\n✅ Basic connectivity test PASSED");
      process.exit(0);
    } else {
      console.log("\n❌ Basic connectivity test FAILED");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("\nBasic connectivity test ERROR:", error);
    process.exit(1);
  });
