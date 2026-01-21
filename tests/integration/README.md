# LiteLLM Middleware Testing Scripts

This directory contains test scripts to verify that the Revenium LiteLLM middleware works correctly with actual LiteLLM proxy servers.

## Automated Tests (FRONT-69 Compliant)

The following tests are **automated tests that fail the build** when something is wrong:

### Unit Tests (`08-trace-fields-unit.ts`)

Tests individual trace field functions in isolation. **Fails the build** if any assertion fails.

```bash
npm run test:unit
```

**Exit codes:** `0` (success) or `1` (failure)

### Performance Tests (`10-trace-fields-performance.ts`)

Measures overhead (< 5ms), caching, and memory leaks. **Fails the build** if thresholds are exceeded.

```bash
npm run test:performance
```

**Exit codes:** `0` (success) or `1` (failure)

### E2E Tests (`09-trace-fields-integration.ts`)

Tests with real LiteLLM Proxy API calls. **Fails the build** if API calls fail or responses are invalid.

```bash
npm run test:e2e
```

**Exit codes:** `0` (success) or `1` (failure)

### Run All Automated Tests

```bash
npm test
npm run test:all-automated
```

---

## Manual/Example Integration Tests

The following tests are example scripts for manual testing:

## Prerequisites

1. **Running LiteLLM Proxy Server**

   ```bash
   # Install LiteLLM
   pip install litellm

   # Start LiteLLM proxy (example with OpenAI)
   export OPENAI_API_KEY=sk_your_openai_key
   litellm --model gpt-3.5-turbo --port 4000
   ```

2. **Environment Variables**
   Create a `.env` file in the **root directory** (not in testing/) with your credentials:
   ```bash
   # Copy the example and edit with your values
   cp env.example .env
   # Edit .env with your actual keys
   ```

## Test Scripts

### 1. `01-basic-connectivity.ts`

Tests basic middleware initialization and configuration.

```bash
npm run test:basic
```

### 2. `02-proxy-requests.ts`

Makes actual requests to LiteLLM proxy and verifies interception.

```bash
npm run test:proxy
```

### 3. `03-metadata-tracking.ts`

Tests metadata extraction and Revenium API integration.

```bash
npm run test:metadata
```

### 4. `04-multi-provider.ts`

Tests different LLM providers through LiteLLM proxy.

```bash
npm run test:providers
```

### 5. `05-streaming.ts`

Tests streaming request handling (Phase 2 feature - basic detection only).

```bash
npm run test:streaming
```

### 6. `06-embeddings.ts`

Tests embeddings endpoint tracking.

```bash
npm run test:embeddings
```

### 7. `07-model-source-test.ts`

Tests model source detection.

```bash
npm run test:model-source
```

## Quick Test All Manual Tests

```bash
npm run test:all-integration
```

## Expected Behavior

✅ **Successful Test**: Middleware intercepts requests, extracts usage data, sends to Revenium
✅ **Debug Logs**: Enable with `REVENIUM_DEBUG=true` to see detailed middleware activity
✅ **Revenium Dashboard**: Check your Revenium dashboard for tracked usage data

## Test Requirements

- **Node.js 18+** with TypeScript support
- **LiteLLM Proxy Server** running (for request tests)
- **Valid API Keys** (Revenium + at least one LLM provider)
- **Network Access** to Revenium API and LLM providers

## Environment Configuration

Create `.env` file in the **root directory** with these required variables:

```bash
# Required - Revenium Configuration
REVENIUM_METERING_API_KEY=hak_your_actual_revenium_key
REVENIUM_METERING_BASE_URL=https://api.dev.hcapp.io

# Required - LiteLLM Proxy Configuration
LITELLM_PROXY_URL=http://localhost:4000/chat/completions
LITELLM_API_KEY=sk-your_litellm_proxy_key

# Optional for enhanced testing
REVENIUM_DEBUG=true
```

## Troubleshooting

- **No interception**: Check `LITELLM_PROXY_URL` matches your actual proxy endpoint
- **Auth errors**: Verify `LITELLM_API_KEY` is correct for your proxy
- **Revenium errors**: Check `REVENIUM_METERING_API_KEY` and network connectivity
- **TypeScript errors**: Ensure `npx ts-node` is working in your environment
- **Environment not loaded**: Make sure `.env` file is in the root directory (not testing/)

## Test Results

Each test provides detailed output showing:

- ✅ Successful operations
- ⚠️ Expected failures (missing providers, etc.)
- ❌ Actual errors requiring attention
- Expected tracking behavior
- Usage statistics and metadata
