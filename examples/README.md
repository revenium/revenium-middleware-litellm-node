# Revenium LiteLLM Middleware Examples

Clear, focused examples that demonstrate seamless HTTP interception with LiteLLM Proxy for all providers.

## Quick Start

1. **Set up environment variables** (create `.env` in project root):

```bash
# Required for all examples
REVENIUM_METERING_API_KEY=hak_your_api_key
REVENIUM_METERING_BASE_URL=https://api.revenium.ai
LITELLM_PROXY_URL=https://your-litellm-proxy.com
LITELLM_API_KEY=your_litellm_api_key

# Optional: Enable debug logging
REVENIUM_DEBUG=true
```

2. **Install the package**:

```bash
npm install @revenium/litellm dotenv
npm install --save-dev typescript tsx @types/node
```

3. **Run any example**:

```bash
REVENIUM_DEBUG=true npx tsx examples/litellm-basic.ts        # Basic LiteLLM proxy usage with metadata
REVENIUM_DEBUG=true npx tsx examples/litellm-streaming.ts    # Streaming, multi-provider, and advanced features
```

## Getting Started - Step by Step

This guide walks you through creating a complete project from scratch. For GitHub users who cloned this repository, you can run the included examples directly. For npm users, copy these examples from `node_modules/@revenium/litellm/examples/` to your project directory.

### Step 1: Create Your First Test

#### TypeScript Test

Create `test-litellm.ts`:

```typescript
// test-litellm.ts
import "dotenv/config";
import "@revenium/litellm";

async function testLiteLLM() {
  const proxyUrl = process.env.LITELLM_PROXY_URL;
  const apiKey = process.env.LITELLM_API_KEY;

  try {
    const response = await fetch(`${proxyUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Optional: Add metadata for tracking
        "x-revenium-subscriber-id": "test-user",
        "x-revenium-subscriber-email": "test@example.com",
        "x-revenium-organization-id": "test-org",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello!" }],
      }),
    });

    const data = await response.json();
    console.log("Response:", data.choices[0].message.content);
    console.log("Usage tracked automatically by Revenium middleware!");
  } catch (error) {
    console.error("Error:", error);
  }
}

testLiteLLM();
```

#### JavaScript Test

Create `test-litellm.js`:

```javascript
// test-litellm.js
require("dotenv/config");
require("@revenium/litellm");

async function testLiteLLM() {
  const proxyUrl = process.env.LITELLM_PROXY_URL;
  const apiKey = process.env.LITELLM_API_KEY;

  try {
    const response = await fetch(`${proxyUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-revenium-subscriber-id": "test-user",
        "x-revenium-subscriber-email": "test@example.com",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello!" }],
      }),
    });

    const data = await response.json();
    console.log("Response:", data.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

testLiteLLM();
```

### Step 2: Update package.json

Add test scripts to your `package.json`:

```json
{
  "scripts": {
    "test:litellm": "tsx test-litellm.ts",
    "test:litellm:js": "node test-litellm.js"
  }
}
```

### Step 3: Run Your Tests

```bash
# TypeScript version
npm run test:litellm

# JavaScript version
npm run test:litellm:js

# Or run directly
npx tsx test-litellm.ts
node test-litellm.js
```

### Step 4: Explore Advanced Examples

Once your basic test works, explore the included examples (GitHub users can run directly, npm users should copy from `node_modules/@revenium/litellm/examples/`):

```bash
# Basic usage with metadata
npx tsx examples/litellm-basic.ts

# Streaming and multi-provider
npx tsx examples/litellm-streaming.ts
```

### Step 5: Project Structure

A typical project structure:

```
your-project/
├── .env                    # API keys (never commit!)
├── .gitignore             # Protect your .env file
├── package.json
├── test-litellm.ts        # Your first test
└── src/
    └── index.ts          # Your application code
```

## Examples

### litellm-basic.ts

**Basic LiteLLM Proxy usage** with seamless metadata:

- Chat completions with and without metadata
- Embeddings with metadata tracking
- Shows metadata usage patterns
- Multiple examples in one file

```typescript
// Chat with metadata - no complex setup needed!
const response = await fetch(`${proxyUrl}/chat/completions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    // Subscriber metadata for enhanced tracking:
    "x-revenium-subscriber-id": "user-123",
    "x-revenium-subscriber-email": "user@my-company.com",
    "x-revenium-subscriber-credential-name": "api-key",
    "x-revenium-subscriber-credential": "credential-value",
    "x-revenium-organization-id": "my-company",
  },
  body: JSON.stringify({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: "Hello!" }],
  }),
});
```

### litellm-streaming.ts

**Streaming responses and multi-provider support** with seamless metadata:

- Streaming chat completions with metadata
- Multi-provider examples (OpenAI, Anthropic, etc.)
- Advanced embeddings with comprehensive metadata
- Usage tracked automatically when streams complete
- Real-time responses + comprehensive analytics

### Key Features Demonstrated

**Seamless HTTP Interception**: Automatic tracking of all LiteLLM Proxy requests
**Flexible Metadata**: Add metadata headers as needed for enhanced tracking
**Multi-Provider Support**: Works with OpenAI, Anthropic, Google, Azure, and more
**Chat & Embeddings**: Full support for both operation types
**Streaming Support**: Real-time tracking when streams complete **LiteLLM Proxy Integration**: Purpose-built for LiteLLM's proxy architecture

## Running Examples

All examples require:

- Node.js 18+
- Valid Revenium API key
- Running LiteLLM Proxy server

**Individual examples:**

```bash
REVENIUM_DEBUG=true npx tsx examples/litellm-basic.ts        # Basic chat completions and embeddings
REVENIUM_DEBUG=true npx tsx examples/litellm-streaming.ts    # Streaming and multi-provider features
```

## LiteLLM Proxy Setup

For local testing, you can run LiteLLM Proxy locally:

### Option 1: Simple OpenAI Setup

```bash
# Install LiteLLM
pip install litellm

# Start with OpenAI (replace with your API key)
export OPENAI_API_KEY=sk_your_openai_key
litellm --model gpt-3.5-turbo --port 4000

# Update your .env for local testing
LITELLM_PROXY_URL=http://localhost:4000
LITELLM_API_KEY=sk-1234
```

### Option 2: Multi-Provider Setup

```bash
# Create a config file for multiple providers
cat > litellm_config.yaml << EOF
model_list:
  - model_name: gpt-4o-mini
    litellm_params:
      model: openai/gpt-4o-mini
      api_key: \${OPENAI_API_KEY}
  - model_name: claude-3-haiku
    litellm_params:
      model: anthropic/claude-3-haiku-20240307
      api_key: \${ANTHROPIC_API_KEY}
EOF

# Start with config
litellm --config litellm_config.yaml --port 4000
```

## Understanding the Magic

The middleware works by:

1. **Import**: Import the middleware before making fetch requests
2. **HTTP Interception**: Middleware patches global `fetch` function
3. **Request Detection**: Identifies LiteLLM Proxy requests by URL pattern
4. **Seamless Integration**: Use fetch normally with metadata headers as needed
5. **Data Extraction**: Captures tokens, timing, model info, and metadata
6. **Background Tracking**: Sends data to Revenium without blocking your app
7. **Transparent Response**: Returns original LiteLLM response unchanged

**The result**: Your existing LiteLLM Proxy code works exactly the same, but now you get automatic usage tracking and rich analytics!

## Troubleshooting

**Environment variable errors:**

- Ensure `.env` file is in project root
- Check variable names match exactly (note: `REVENIUM_METERING_API_KEY`)
- Verify API keys are valid

**LiteLLM Proxy setup issues:**

- Ensure LiteLLM Proxy is running and accessible
- Check that LITELLM_PROXY_URL points to the correct server
- Verify your LiteLLM Proxy has the required provider API keys

**Middleware not working:**

- Ensure middleware is imported before making fetch requests
- Verify the package is properly installed with `npm install @revenium/litellm`
- Check that TypeScript compilation is successful if using TypeScript

**Debug mode:**

```bash
export REVENIUM_DEBUG=true
npx ts-node examples/litellm-basic.ts
```

Look for log messages like:

- `[Revenium] LiteLLM request intercepted`
- `[Revenium] Usage metadata extracted`
- `[Revenium] Revenium tracking successful`
