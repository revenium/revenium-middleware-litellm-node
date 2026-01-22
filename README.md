# Revenium Middleware for LiteLLM Node.js

[![npm version](https://img.shields.io/npm/v/@revenium/litellm.svg)](https://www.npmjs.com/package/@revenium/litellm)
[![Node Versions](https://img.shields.io/node/v/@revenium/litellm.svg)](https://www.npmjs.com/package/@revenium/litellm)
[![Documentation](https://img.shields.io/badge/docs-revenium.io-blue)](https://docs.revenium.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive Node.js middleware that automatically tracks LiteLLM Proxy usage and sends metrics to a LiteLLM server as well as Revenium for billing and analytics. Features seamless HTTP interception with support for all LiteLLM providers - no code changes required! Works with both TypeScript and JavaScript projects.

## Features

- **Seamless HTTP interception** - Automatically tracks all LiteLLM Proxy requests
- **Multi-provider support** - Works with OpenAI, Anthropic, Google, Azure, Cohere, and more
- **Chat completions & embeddings** - Full support for both operation types
- **Streaming support** - Real-time tracking with time-to-first-token metrics
- **Fire-and-forget tracking** - Will not block application execution with metering updates
- **Comprehensive analytics** - Track users, customers, and other custom metadata
- **Trace visualization fields** - Support for distributed tracing, workflow tracking, and advanced analytics
- **LiteLLM proxy integration** - Purpose-built for LiteLLM's proxy architecture

## Package Migration

This package has been renamed from `revenium-middleware-litellm-node` to `@revenium/litellm` for better organization and simpler naming.

### Migration Steps

If you're upgrading from the old package:

```bash
# Uninstall the old package
npm uninstall revenium-middleware-litellm-node

# Install the new package
npm install @revenium/litellm
```

**Update your imports:**

```typescript
// Old import
import "revenium-middleware-litellm-node";

// New import
import "@revenium/litellm";
```

All functionality remains exactly the same - only the package name has changed.

## Installation

```bash
npm install @revenium/litellm dotenv
npm install --save-dev typescript tsx @types/node  # For TypeScript projects
```

## Environment Variables

Set your environment variables:

```bash
export REVENIUM_METERING_API_KEY=hak_your_revenium_api_key
export REVENIUM_METERING_BASE_URL=https://api.revenium.ai
export LITELLM_PROXY_URL=https://your-litellm-proxy.com
export LITELLM_API_KEY=your_litellm_api_key
export REVENIUM_DEBUG=true  # Optional: for debug logging

# Optional: Terminal cost/metrics summary
export REVENIUM_PRINT_SUMMARY=true  # or 'human' or 'json'
export REVENIUM_TEAM_ID=your_team_id  # Required for cost retrieval
```

Or create a `.env` file in the project root:

```bash
# .env file
REVENIUM_METERING_API_KEY=hak_your_revenium_api_key
REVENIUM_METERING_BASE_URL=https://api.revenium.ai
LITELLM_PROXY_URL=https://your-litellm-proxy.com
LITELLM_API_KEY=your_litellm_api_key
REVENIUM_DEBUG=true

# Optional: Terminal cost/metrics summary
REVENIUM_PRINT_SUMMARY=true  # or 'human' or 'json'
REVENIUM_TEAM_ID=your_team_id  # Required for cost retrieval
```

## Requirements

- Node.js >= 18.0.0
- LiteLLM Proxy server running and accessible
- Revenium API key (obtain from [app.revenium.ai](https://app.revenium.ai))

## LiteLLM Proxy Server Installation

This middleware requires a running LiteLLM Proxy server. For installation instructions, see the [official LiteLLM documentation](https://docs.litellm.ai/docs/proxy/quick_start).

**Quick setup:**

```bash
# Install LiteLLM
pip install litellm[proxy]

# Start the proxy server
litellm --config /path/to/config.yaml
```

## What Gets Tracked

The middleware automatically captures comprehensive usage data for both chat completions and embeddings:

### Usage Metrics

- **Token Counts** - Input tokens, output tokens, total tokens
- **Model Information** - Model name, provider (OpenAI, Anthropic, Google, etc.)
- **Request Timing** - Request duration, time-to-first-token (for streaming)
- **Cost Calculation** - Estimated costs based on current pricing
- **Operation Type** - Chat completions or embeddings

### Business Context (Optional)

- **User Tracking** - Subscriber ID, email, credentials
- **Organization Data** - Organization ID, product ID
- **Task Classification** - Task type, agent identifier, trace ID
- **Quality Metrics** - Response quality scores, task identifiers

### Technical Details

- **API Endpoints** - Chat completions and embeddings
- **Request Types** - Streaming vs non-streaming (chat only)
- **Error Tracking** - Failed requests, error types, retry attempts
- **Environment Info** - Development vs production usage

## Usage

The middleware automatically initializes when imported. Simply import it at the top of your application:

```typescript
import "@revenium/litellm";
```

That's it! All LiteLLM Proxy requests will now be automatically tracked.

## API Overview

The middleware provides the following functions for advanced usage:

- **`initialize()`** - Manually initialize the middleware (auto-initializes on import)
- **`configure(config)`** - Set configuration programmatically instead of using environment variables
- **`isMiddlewareInitialized()`** - Check if the middleware is initialized and working
- **`getStatus()`** - Get detailed status information with fields: `initialized`, `patched`, `hasConfig`, `proxyUrl`
- **`resetInitializationState()`** - Reset initialization state (useful for testing)

**Example:**

```typescript
import {
  configure,
  isMiddlewareInitialized,
  getStatus,
} from "@revenium/litellm";

// Configure programmatically
configure({
  reveniumMeteringApiKey: "hak_your_api_key",
  reveniumMeteringBaseUrl: "https://api.revenium.ai",
  litellmProxyUrl: "https://your-proxy.com",
  litellmApiKey: "your_litellm_key",
});

// Check status
if (isMiddlewareInitialized()) {
  console.log("Middleware is ready!");
  console.log(getStatus());
}
```

## Quick Start Examples

Want to try it immediately? Access the examples directory to find sample scripts to demonstrate how to integrate Revenium's middleware into your existing code.

### Steps 1-4: Run Built-in Examples and Get Started

```bash
# 1. Install the package and dependencies
npm install @revenium/litellm dotenv
npm install --save-dev typescript tsx @types/node

# 2. Set your API keys (see Environment Variables above)

# 3. Run examples
REVENIUM_DEBUG=true npx tsx examples/litellm-basic.ts       # Basic LiteLLM proxy usage with metadata
REVENIUM_DEBUG=true npx tsx examples/litellm-streaming.ts   # Streaming, embeddings, and advanced features
```

### Step 4: Follow the Examples

Detailed examples are available to help you get started:

**For npm users**: After installing, examples are available in:

```
node_modules/@revenium/litellm/examples/
```

**For GitHub users**: Clone the repository and explore the `examples/` directory, or run the examples directly:

```bash
npm run example:basic
npm run example:streaming
```

See the [examples/README.md](https://github.com/revenium/revenium-middleware-litellm-node/blob/HEAD/examples/README.md) for detailed step-by-step guides, including TypeScript integration patterns and troubleshooting.

## Advanced Usage

### Adding Custom Metadata

Track users, organizations, agents, API keys, and other custom metadata using the optional metadata fields
shown in the examples folder.

## LiteLLM Multi-Provider Features

**Universal LLM Support**: The middleware supports all LiteLLM providers with automatic usage tracking for both chat completions and embeddings.

## API Support Matrix

The middleware has been tested and supports the following features:

| Feature                      | Chat Completions | Embeddings | Streaming |
| ---------------------------- | ---------------- | ---------- | --------- |
| Basic Requests               | ✅               | ✅         | ✅        |
| Metadata Tracking            | ✅               | ✅         | ✅        |
| Token Usage                  | ✅               | ✅         | N/A       |
| Cost Calculation             | ✅               | ✅         | ✅        |
| Time-to-First-Token          | ✅               | N/A        | ✅        |
| Error Tracking               | ✅               | ✅         | ✅        |
| Multi-Provider (via LiteLLM) | ✅               | ✅         | ✅        |

**Supported Providers** (via LiteLLM Proxy):

- OpenAI
- Anthropic (Claude)
- Google (Gemini)
- Azure OpenAI
- Cohere
- And all other providers supported by LiteLLM

## Configuration

### Supported Environment Variables

| Variable                     | Required | Description                                        |
| ---------------------------- | -------- | -------------------------------------------------- |
| `REVENIUM_METERING_API_KEY`  | Yes      | Your Revenium API key (starts with `hak_`)         |
| `REVENIUM_METERING_BASE_URL` | No       | Revenium API base URL (default: production)        |
| `LITELLM_PROXY_URL`          | Yes      | Your LiteLLM Proxy URL (base URL or full endpoint) |
| `LITELLM_API_KEY`            | No       | LiteLLM API key (if proxy requires authentication) |
| `REVENIUM_DEBUG`             | No       | Set to `true` for debug logging                    |

### Metadata Headers

Metadata headers help provide better analytics and tracking:

```typescript
const headers = {
  "x-revenium-subscriber-id": "user-123",
  "x-revenium-subscriber-email": "user@example.com",
  "x-revenium-subscriber-credential-name": "api-key",
  "x-revenium-subscriber-credential": "credential-value",
  "x-revenium-organization-id": "org-456",
  "x-revenium-product-id": "chat-app",
  "x-revenium-task-type": "document_analysis",
  "x-revenium-trace-id": "trace-789",
  "x-revenium-agent": "document-processor-v2",
  "x-revenium-environment": "production",
  "x-revenium-operation-subtype": "function_call",
  "x-revenium-retry-number": "0",
  "x-revenium-parent-transaction-id": "parent-txn-123",
  "x-revenium-transaction-name": "Process Payment",
  "x-revenium-region": "us-east-1",
  "x-revenium-credential-alias": "My API Key",
  "x-revenium-trace-type": "customer-support",
  "x-revenium-trace-name": "User Session #12345",
};
```

### Trace Visualization Fields

The middleware supports 10 trace visualization fields for distributed tracing and workflow analytics:

| Field                 | Header                             | Environment Variable                                          | Description                                                                                       |
| --------------------- | ---------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `environment`         | `x-revenium-environment`           | `REVENIUM_ENVIRONMENT`, `NODE_ENV`, `DEPLOYMENT_ENV`          | Deployment environment (production, staging, etc.)                                                |
| `operationSubtype`    | `x-revenium-operation-subtype`     | -                                                             | Additional operation detail (e.g., "function_call" when tools are used)                           |
| `retryNumber`         | `x-revenium-retry-number`          | `REVENIUM_RETRY_NUMBER`                                       | Retry attempt number (0 for first attempt)                                                        |
| `parentTransactionId` | `x-revenium-parent-transaction-id` | `REVENIUM_PARENT_TRANSACTION_ID`                              | Parent transaction reference for distributed tracing                                              |
| `transactionName`     | `x-revenium-transaction-name`      | `REVENIUM_TRANSACTION_NAME`                                   | Human-friendly operation label                                                                    |
| `region`              | `x-revenium-region`                | `AWS_REGION`, `AZURE_REGION`, `GCP_REGION`, `REVENIUM_REGION` | Cloud region or data center                                                                       |
| `credentialAlias`     | `x-revenium-credential-alias`      | `REVENIUM_CREDENTIAL_ALIAS`                                   | Human-readable credential name                                                                    |
| `traceType`           | `x-revenium-trace-type`            | `REVENIUM_TRACE_TYPE`                                         | Categorical identifier for grouping workflows (max 128 chars, alphanumeric + hyphens/underscores) |
| `traceName`           | `x-revenium-trace-name`            | `REVENIUM_TRACE_NAME`                                         | Human-readable label for trace instances (max 256 chars)                                          |
| `traceId`             | `x-revenium-trace-id`              | -                                                             | Unique identifier for a conversation or session                                                   |

These fields can be provided via HTTP headers or environment variables. The middleware automatically detects and validates them.

### Metadata Fields Reference

The following table shows the most commonly used metadata fields with their use cases:

| Field                      | Header                                  | Use Case                                                              |
| -------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `subscriberId`             | `x-revenium-subscriber-id`              | Track usage by end user for billing and analytics                     |
| `subscriberEmail`          | `x-revenium-subscriber-email`           | Associate requests with user email for support and reporting          |
| `subscriberCredentialName` | `x-revenium-subscriber-credential-name` | Identify which API key or credential was used                         |
| `subscriberCredential`     | `x-revenium-subscriber-credential`      | Store credential value for audit trails                               |
| `organizationId`           | `x-revenium-organization-id`            | Multi-tenant tracking and cost allocation                             |
| `subscriptionId`           | `x-revenium-subscription-id`            | Track usage by subscription plan or tier                              |
| `productId`                | `x-revenium-product-id`                 | Track usage across different products or features                     |
| `taskId`                   | `x-revenium-task-id`                    | Unique identifier for a specific task or job                          |
| `taskType`                 | `x-revenium-task-type`                  | Categorize requests by task (e.g., "summarization", "translation")    |
| `traceId`                  | `x-revenium-trace-id`                   | Link multiple API calls in a conversation or session                  |
| `agent`                    | `x-revenium-agent`                      | Identify which AI agent or service made the request                   |
| `responseQualityScore`     | `x-revenium-response-quality-score`     | Track quality metrics for responses (0-10 scale)                      |
| `environment`              | `x-revenium-environment`                | Separate production, staging, and development usage                   |
| `operationSubtype`         | `x-revenium-operation-subtype`          | Add detail to operation type (e.g., "function_call")                  |
| `retryNumber`              | `x-revenium-retry-number`               | Track retry attempts for reliability analysis                         |
| `parentTransactionId`      | `x-revenium-parent-transaction-id`      | Build distributed traces across microservices                         |
| `transactionName`          | `x-revenium-transaction-name`           | Human-readable operation labels for dashboards                        |
| `region`                   | `x-revenium-region`                     | Track usage by geographic region or data center                       |
| `credentialAlias`          | `x-revenium-credential-alias`           | Friendly name for credentials in reports                              |
| `traceType`                | `x-revenium-trace-type`                 | Group workflows by type (e.g., "customer-support", "data-processing") |
| `traceName`                | `x-revenium-trace-name`                 | Human-readable trace instance labels                                  |
| `capturePrompts`           | `x-revenium-capture-prompts`            | Enable/disable prompt capture for this request (true/false)           |
| `maxPromptSize`            | `x-revenium-max-prompt-size`            | Maximum prompt size in characters before truncation                   |

### Running Examples

```bash
# 1. Install dependencies
npm install @revenium/litellm dotenv
npm install --save-dev typescript tsx @types/node  # For TypeScript projects

# 2. Set environment variables (or use .env file)
export REVENIUM_METERING_API_KEY=hak_your_api_key
export REVENIUM_METERING_BASE_URL=https://api.revenium.ai
export LITELLM_PROXY_URL=https://your-proxy.com
export LITELLM_API_KEY=your_litellm_key

# 3. Run examples
REVENIUM_DEBUG=true npx tsx examples/litellm-basic.ts       # Basic LiteLLM proxy usage
REVENIUM_DEBUG=true npx tsx examples/litellm-streaming.ts   # Streaming, embeddings, and advanced features
```

## Terminal Cost/Metrics Summary

The middleware can print a cost and metrics summary to your terminal after each API request. This is useful for development and debugging.

### Configuration

Enable terminal summary output using environment variables or programmatic configuration:

**Environment Variables:**

```bash
# Enable human-readable summary (default format)
export REVENIUM_PRINT_SUMMARY=true

# Or specify format explicitly
export REVENIUM_PRINT_SUMMARY=human  # Human-readable format
export REVENIUM_PRINT_SUMMARY=json   # JSON format for log parsing

# Optional: Set team ID to fetch cost data
export REVENIUM_TEAM_ID=your_team_id
```

**Programmatic Configuration:**

```typescript
import { ConfigurationManager } from "@revenium/litellm";

ConfigurationManager.setConfig({
  reveniumMeteringApiKey: "hak_your_api_key",
  reveniumMeteringBaseUrl: "https://api.revenium.ai",
  printSummary: true, // or 'human' or 'json'
  teamId: "your_team_id", // Optional: for cost retrieval
});
```

### Output Formats

**Human-readable format** (`printSummary: true` or `printSummary: 'human'`):

```
============================================================
📊 REVENIUM USAGE SUMMARY
============================================================
🤖 Model: gpt-4
🏢 Provider: OpenAI
⏱️  Duration: 1.23s

💬 Token Usage:
   📥 Input Tokens:  150
   📤 Output Tokens: 75
   📊 Total Tokens:  225

💰 Cost: $0.004500
🔖 Trace ID: trace-abc-123
============================================================
```

**JSON format** (`printSummary: 'json'`):

```json
{
  "model": "gpt-4",
  "provider": "OpenAI",
  "durationSeconds": 1.23,
  "inputTokenCount": 150,
  "outputTokenCount": 75,
  "totalTokenCount": 225,
  "cost": 0.0045,
  "traceId": "trace-abc-123"
}
```

### Cost Retrieval

- **Without `teamId`**: Shows token counts and duration, displays hint to set `REVENIUM_TEAM_ID`
- **With `teamId`**: Fetches actual cost from Revenium API with automatic retry logic
- **Cost pending**: Shows "(pending aggregation)" if cost data isn't available yet
- **Fire-and-forget**: Never blocks your application, even if cost fetch fails

## Prompt Capture

The middleware can capture prompts and responses for analysis and debugging. This feature is **disabled by default** for privacy and performance.

### Configuration

Enable prompt capture using environment variables, programmatic configuration, or per-request metadata:

**Environment Variable:**

```bash
export REVENIUM_CAPTURE_PROMPTS=true
export REVENIUM_MAX_PROMPT_SIZE=50000  # Optional: default is 50000 characters
```

**Programmatic Configuration:**

```typescript
import { configure } from "@revenium/litellm";

configure({
  reveniumMeteringApiKey: "hak_your_api_key",
  reveniumMeteringBaseUrl: "https://api.revenium.ai",
  litellmProxyUrl: "https://your-proxy.com",
  capturePrompts: true,
  maxPromptSize: 50000,
});
```

**Per-Request via Headers:**

```typescript
const headers = {
  "x-revenium-capture-prompts": "true",
};

const response = await fetch(`${LITELLM_PROXY_URL}/chat/completions`, {
  method: "POST",
  headers: {
    ...headers,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4",
    messages: [{ role: "user", content: "Hello!" }],
  }),
});
```

### Security

The middleware automatically sanitizes credentials from captured prompts:

- API keys and tokens are redacted (e.g., `sk-***REDACTED***`)
- Sensitive headers are filtered
- Bearer tokens are replaced with `Bearer ***REDACTED***`
- Passwords and secrets are sanitized

### Use Cases

- **Debugging**: Analyze failed requests by reviewing exact prompts and responses
- **Quality Assurance**: Review model outputs for accuracy and appropriateness
- **Compliance**: Maintain audit trails of AI interactions
- **Cost Analysis**: Understand which prompts generate the most tokens

## How It Works

1. **HTTP Interception**: Patches the global `fetch` function to intercept LiteLLM Proxy requests
2. **Request Detection**: Identifies LiteLLM requests by URL pattern matching for both chat and embeddings
3. **Metadata Extraction**: Extracts usage metadata from request headers
4. **Response Processing**: Handles both streaming and non-streaming responses for chat and embeddings
5. **Usage Tracking**: Sends detailed metrics to Revenium API asynchronously
6. **Error Handling**: Implements retry logic and fails silently by default

The middleware never blocks your application - if Revenium tracking fails, your LiteLLM requests continue normally.

## Troubleshooting

### Common Issues

#### Middleware not tracking requests

- Ensure middleware is imported before making fetch requests
- Check that environment variables are loaded correctly
- Verify your `REVENIUM_METERING_API_KEY` starts with `hak_`
- Confirm `LITELLM_PROXY_URL` matches your proxy setup

#### LiteLLM proxy connection issues

- Verify LiteLLM proxy is running and accessible
- Check that `LITELLM_PROXY_URL` includes the correct base URL
- Ensure `LITELLM_API_KEY` is correct if proxy requires authentication

#### "403 Forbidden" errors

```bash
# Verify your Revenium API key
export REVENIUM_METERING_API_KEY="hak_your_actual_key"

# Check your base URL doesn't have double paths
export REVENIUM_METERING_BASE_URL="https://api.revenium.ai"
```

#### Streaming not being tracked

- Streaming usage is tracked when the stream completes
- Check debug logs for stream completion messages
- Ensure you're consuming the entire stream

#### Embeddings not being tracked

- Verify the endpoint URL includes `/embeddings` or `/v1/embeddings`
- Check that the request body includes the `model` field
- Ensure the response includes usage information

### Debug Mode

Enable detailed logging to troubleshoot issues:

```bash
export REVENIUM_DEBUG=true
node your-script.js
```

This will show:

- `[Revenium] LiteLLM request intercepted`
- `[Revenium] Usage metadata extracted`
- `[Revenium] Revenium tracking successful`

## Documentation

For detailed documentation, visit [docs.revenium.io](https://docs.revenium.io)

## Contributing

See [CONTRIBUTING.md](https://github.com/revenium/revenium-middleware-litellm-node/blob/HEAD/CONTRIBUTING.md)

## Testing

The middleware includes comprehensive automated tests that fail the build when something is wrong.

### Run All Tests

Run unit, integration, and performance tests:

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Test Requirements

All tests are designed to:

- ✅ Fail the build when something is wrong (`process.exit(1)`)
- ✅ Pass when everything works correctly (`process.exit(0)`)
- ✅ Provide clear error messages
- ✅ Test trace field validation, environment detection, and region detection

## Code of Conduct

See [CODE_OF_CONDUCT.md](https://github.com/revenium/revenium-middleware-litellm-node/blob/HEAD/CODE_OF_CONDUCT.md)

## Security

See [SECURITY.md](https://github.com/revenium/revenium-middleware-litellm-node/blob/HEAD/SECURITY.md)

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/revenium/revenium-middleware-litellm-node/blob/HEAD/LICENSE) file for details.

## Support

For support and questions:

- Visit [docs.revenium.io](https://docs.revenium.io)
- Open an issue on [GitHub](https://github.com/revenium/revenium-middleware-litellm-node/issues)
- Contact support at [support@revenium.io](mailto:support@revenium.io)

## Development

For development guidelines and setup, see [CONTRIBUTING.md](https://github.com/revenium/revenium-middleware-litellm-node/blob/HEAD/CONTRIBUTING.md)

---

Built by Revenium
