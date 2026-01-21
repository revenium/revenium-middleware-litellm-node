import {
  RequestContext,
  ResponseContext,
  LiteLLMChatCompletionRequest,
  LiteLLMChatCompletionResponse,
  LiteLLMEmbeddingRequest,
  LiteLLMEmbeddingResponse,
} from "./types";
import { getConfig, getLogger } from "./config";
import {
  trackUsageAsync,
  trackEmbeddingsUsageAsync,
  extractMetadataFromHeaders,
  extractUsageFromResponse,
} from "./tracking";
import { randomUUID } from "crypto";
import {
  validateHeaders,
  validateStreamChunk,
  validateLiteLLMRequest,
  validateLiteLLMUrl,
} from "./utils/validation";
import {
  PatchingError,
  RequestProcessingError,
  StreamProcessingError,
  createErrorContext,
} from "./utils/error-handling";
import { createLogContext } from "./utils/logger-types";
import { supportedEndpoints } from "./constants";
import { shouldCapturePrompts, getMaxPromptSize } from "./prompt-extraction";

// Global logger
const logger = getLogger();

/**
 * HTTP client manager singleton for proper state management
 */
class HttpClientManager {
  private static instance: HttpClientManager | null = null;
  private isPatched = false;
  private originalFetch: typeof globalThis.fetch | null = null;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): HttpClientManager {
    if (!HttpClientManager.instance) {
      HttpClientManager.instance = new HttpClientManager();
    }
    return HttpClientManager.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    HttpClientManager.instance = null;
  }

  /**
   * Check if HTTP client is patched
   */
  public isHttpClientPatched(): boolean {
    return this.isPatched;
  }

  /**
   * Get the original fetch function
   */
  public getOriginalFetch(): typeof globalThis.fetch | null {
    return this.originalFetch;
  }

  /**
   * Set the patched state and store original fetch
   */
  public setPatched(
    patched: boolean,
    originalFetch?: typeof globalThis.fetch
  ): void {
    this.isPatched = patched;
    if (originalFetch) this.originalFetch = originalFetch;
  }

  /**
   * Reset to unpatched state (for testing)
   */
  public reset(): void {
    this.isPatched = false;
    this.originalFetch = null;
  }
}

/**
 * Check if a URL is a LiteLLM Proxy endpoint (chat completions or embeddings)
 */
function isLiteLLMProxyRequest(url: string, config: any): boolean {
  try {
    const requestUrl = new URL(url);
    const proxyUrl = new URL(config.litellmProxyUrl);

    // Check if the request is going to our configured LiteLLM Proxy
    const isSameHost = requestUrl.hostname === proxyUrl.hostname;
    const isSamePort =
      requestUrl.port === proxyUrl.port ||
      ((requestUrl.port === "80" || requestUrl.port === "443") &&
        proxyUrl.port === "");

    // Handle two cases:
    // 1. Proxy URL is a base URL (e.g., http://localhost:4000) - check if request is to supported endpoint
    // 2. Proxy URL is a full endpoint URL (e.g., http://localhost:4000/chat/completions) - check exact match

    let isCorrectEndpoint = false;
    if (
      supportedEndpoints.some((endpoint) =>
        proxyUrl.pathname.endsWith(endpoint)
      )
    ) {
      // Case 2: Proxy URL includes the endpoint path - check exact path match
      isCorrectEndpoint = requestUrl.pathname === proxyUrl.pathname;
    } else {
      // Case 1: Proxy URL is base URL - check if request is to any supported endpoint
      isCorrectEndpoint = supportedEndpoints.some((endpoint) =>
        requestUrl.pathname.endsWith(endpoint)
      );
    }
    return isSameHost && isSamePort && isCorrectEndpoint;
  } catch (error) {
    return false;
  }
}

/**
 * Create patched fetch function that intercepts LiteLLM Proxy requests
 */
function createPatchedFetch(): typeof fetch {
  return async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const config = getConfig();
    // Convert input to URL string for checking
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    // Only intercept LiteLLM Proxy requests if we have config
    if (!config || !isLiteLLMProxyRequest(url, config)) {
      const clientManager = HttpClientManager.getInstance();
      const originalFetchFn = clientManager.getOriginalFetch();
      if (!originalFetchFn)
        throw new Error("Original fetch function not available");
      return originalFetchFn(input, init);
    }

    // Validate the URL against our proxy configuration
    const urlValidation = validateLiteLLMUrl(url, config.litellmProxyUrl);
    if (!urlValidation.isValid) {
      logger.warn("Invalid LiteLLM proxy URL detected", {
        url,
        errors: urlValidation.errors,
        configuredProxy: config.litellmProxyUrl,
      });
      // Continue with original fetch for invalid URLs
      const clientManager = HttpClientManager.getInstance();
      const originalFetchFn = clientManager.getOriginalFetch();
      if (!originalFetchFn)
        throw new Error("Original fetch function not available");
      return originalFetchFn(input, init);
    }

    // Extract and validate request context
    const rawHeaders = init?.headers
      ? Object.fromEntries(new Headers(init.headers))
      : {};
    const validatedHeaders = validateHeaders(rawHeaders);

    const requestContext: RequestContext = {
      url,
      method: init?.method || "GET",
      headers: validatedHeaders,
      body: init?.body || null,
      startTime: Date.now(),
      metadata: extractMetadataFromHeaders(validatedHeaders),
    };

    const requestId = randomUUID();
    logger.debug("Intercepted LiteLLM Proxy request", {
      url: requestContext.url,
      method: requestContext.method,
      requestId,
      hasMetadata: !!requestContext.metadata,
    });

    try {
      // Add LiteLLM Proxy authentication if configured
      const headers = new Headers(init?.headers);
      if (config.litellmApiKey)
        headers.set("Authorization", `Bearer ${config.litellmApiKey}`);

      // Make the actual request
      const clientManager = HttpClientManager.getInstance();
      const originalFetchFn = clientManager.getOriginalFetch();
      if (!originalFetchFn)
        throw new Error("Original fetch function not available");

      const response = await originalFetchFn(input, {
        ...init,
        headers,
      });

      const endTime = Date.now();
      const duration = endTime - requestContext.startTime;

      // Clone response to read body without consuming it
      const responseClone = response.clone();

      logger.debug("LiteLLM Proxy response received", {
        status: response.status,
        requestId,
        duration,
      });

      // Handle successful chat completion responses
      if (response.ok && requestContext.method === "POST") {
        handleSuccessfulResponse(
          requestContext,
          response,
          responseClone,
          requestId,
          duration
        );
      } else if (!response.ok) {
        logger.warn("LiteLLM Proxy request failed", {
          status: response.status,
          statusText: response.statusText,
          requestId,
        });
      }
      return response;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - requestContext.startTime;

      logger.error("LiteLLM Proxy request error", {
        error: error instanceof Error ? error.message : String(error),
        requestId,
        duration,
      });
      throw error;
    }
  };
}

/**
 * Parse request body for either chat completions or embeddings
 */
async function parseRequestBody<T>(
  requestContext: RequestContext,
  requestId: string,
  endpointType: "chat" | "embeddings"
): Promise<T | null> {
  if (!requestContext.body) return null;
  try {
    const bodyText =
      typeof requestContext.body === "string"
        ? requestContext.body
        : await new Response(requestContext.body as BodyInit).text();
    return JSON.parse(bodyText);
  } catch (error) {
    logger.warn(`Failed to parse ${endpointType} request body`, {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Handle successful chat completion response and track usage
 */
async function handleSuccessfulResponse(
  requestContext: RequestContext,
  originalResponse: Response,
  responseClone: Response,
  requestId: string,
  duration: number
): Promise<void> {
  try {
    // Determine endpoint type from URL
    const url = new URL(requestContext.url);
    const isEmbeddingsEndpoint =
      url.pathname.endsWith("/embeddings") ||
      url.pathname.endsWith("/v1/embeddings");

    if (isEmbeddingsEndpoint) {
      // Handle embeddings request
      const requestData = await parseRequestBody<LiteLLMEmbeddingRequest>(
        requestContext,
        requestId,
        "embeddings"
      );
      const model = requestData?.model || "unknown";
      await handleEmbeddingResponse(
        responseClone,
        requestContext,
        requestId,
        duration,
        model
      );
    } else {
      // Handle chat completions request
      const requestData = await parseRequestBody<LiteLLMChatCompletionRequest>(
        requestContext,
        requestId,
        "chat"
      );
      const isStreaming = requestData?.stream === true;
      const model = requestData?.model || "unknown";

      const responseFormat = requestData?.response_format;
      if (isStreaming) {
        await handleStreamingResponse(
          responseClone,
          requestContext,
          requestId,
          duration,
          model,
          responseFormat
        );
      } else {
        handleNonStreamingResponse(
          responseClone,
          requestContext,
          requestId,
          duration,
          model,
          responseFormat
        );
      }
    }
  } catch (error) {
    logger.error("Error handling LiteLLM response", {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });
  }
}

/**
 * Handle non-streaming chat completion response
 */
async function handleNonStreamingResponse(
  response: Response,
  requestContext: RequestContext,
  requestId: string,
  duration: number,
  model: string,
  responseFormat?: any
): Promise<void> {
  try {
    const responseData: LiteLLMChatCompletionResponse = await response.json();
    const usage = extractUsageFromResponse(responseData);

    logger.debug("Extracted usage from non-streaming response", {
      requestId,
      model,
      ...usage,
    });

    const requestBody = extractRequestBody(requestContext);

    trackUsageAsync({
      requestId,
      model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      duration,
      finishReason: usage.finishReason,
      usageMetadata: requestContext.metadata,
      isStreamed: false,
      responseFormat,
      request: requestBody,
      response: responseData,
    });
  } catch (error) {
    logger.error("Error processing non-streaming response", {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });
  }
}

/**
 * Extract request body from RequestContext
 */
function extractRequestBody(
  requestContext: RequestContext
): LiteLLMChatCompletionRequest | undefined {
  try {
    if (typeof requestContext.body === "string") {
      return JSON.parse(requestContext.body);
    } else if (
      typeof requestContext.body === "object" &&
      requestContext.body !== null &&
      "model" in requestContext.body &&
      "messages" in requestContext.body
    ) {
      return requestContext.body as LiteLLMChatCompletionRequest;
    }
  } catch (e) {
    logger.debug("Failed to parse request body for prompt capture", {
      error: e instanceof Error ? e.message : String(e),
      bodyType: typeof requestContext.body,
    });
  }
  return undefined;
}

/**
 * Handle streaming chat completion response
 */
async function handleStreamingResponse(
  response: Response,
  requestContext: RequestContext,
  requestId: string,
  duration: number,
  model: string,
  responseFormat?: any
): Promise<void> {
  logger.debug("Processing streaming response", { requestId, model });

  const requestBody = extractRequestBody(requestContext);

  if (!response.body) {
    logger.warn("Streaming response has no body", { requestId });
    trackUsageAsync({
      requestId,
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      duration,
      finishReason: "stop",
      usageMetadata: requestContext.metadata,
      isStreamed: true,
      timeToFirstToken: duration,
      responseFormat,
      request: requestBody,
    });
    return;
  }

  try {
    const streamParser = new StreamingResponseParser(
      requestId,
      model,
      requestContext,
      duration,
      responseFormat
    );
    await streamParser.parseStream(response.body);
  } catch (error) {
    logger.error("Error parsing streaming response", {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });

    trackUsageAsync({
      requestId,
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      duration,
      finishReason: "error",
      usageMetadata: requestContext.metadata,
      isStreamed: true,
      timeToFirstToken: duration,
      responseFormat,
      request: requestBody,
    });
  }
}

/**
 * Handle embeddings response and track usage
 */
async function handleEmbeddingResponse(
  response: Response,
  requestContext: RequestContext,
  requestId: string,
  duration: number,
  model: string
): Promise<void> {
  try {
    const responseData: LiteLLMEmbeddingResponse = await response.json();
    const usage = responseData.usage;

    logger.debug("Extracted usage from embeddings response", {
      requestId,
      model,
      promptTokens: usage.prompt_tokens,
      totalTokens: usage.total_tokens,
    });

    // Track embeddings usage asynchronously
    trackEmbeddingsUsageAsync({
      requestId,
      model,
      promptTokens: usage.prompt_tokens,
      totalTokens: usage.total_tokens,
      duration,
      usageMetadata: requestContext.metadata,
    });
  } catch (error) {
    logger.error("Error processing embeddings response", {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });
  }
}

/**
 * Streaming response parser for LiteLLM SSE streams
 */
class StreamingResponseParser {
  private requestId: string;
  private model: string;
  private requestContext: RequestContext;
  private requestDuration: number;
  private startTime: number;
  private firstTokenTime: number | null = null;
  private promptTokens: number = 0;
  private completionTokens: number = 0;
  private totalTokens: number = 0;
  private finishReason: string | null = null;
  private logger = getLogger();
  private responseFormat?: any;
  private requestBody?: LiteLLMChatCompletionRequest;
  private shouldCapturePrompts: boolean = false;
  private maxPromptSize: number;
  private accumulatedContent: string = "";
  private accumulatedToolCalls: Map<number, any> = new Map();
  private responseId?: string;
  private responseCreated?: number;

  constructor(
    requestId: string,
    model: string,
    requestContext: RequestContext,
    requestDuration: number,
    responseFormat?: any
  ) {
    this.requestId = requestId;
    this.model = model;
    this.requestContext = requestContext;
    this.requestDuration = requestDuration;
    this.startTime = Date.now();
    this.responseFormat = responseFormat;
    this.requestBody = extractRequestBody(requestContext);
    this.shouldCapturePrompts = shouldCapturePrompts(requestContext.metadata);
    this.maxPromptSize = getMaxPromptSize(requestContext.metadata);
  }

  async parseStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          this.processSSELine(line);
        }
      }

      // Process any remaining buffer content
      if (buffer.trim()) {
        this.processSSELine(buffer);
      }
    } finally {
      reader.releaseLock();
      this.finalizeTracking();
    }
  }

  private processSSELine(line: string): void {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith(":")) return;

    // Parse SSE data lines
    if (trimmed.startsWith("data: ")) {
      const data = trimmed.slice(6); // Remove 'data: ' prefix

      // Check for stream end marker
      if (data === "[DONE]") {
        this.logger.debug("Stream completed", { requestId: this.requestId });
        return;
      }

      try {
        const chunk = JSON.parse(data);
        this.processStreamChunk(chunk);
      } catch (error) {
        this.logger.debug("Failed to parse stream chunk", {
          requestId: this.requestId,
          data: data.substring(0, 100),
        });
      }
    }
  }

  private processStreamChunk(chunk: unknown): void {
    // Validate and sanitize chunk data
    const validatedChunk = validateStreamChunk(chunk);
    if (!validatedChunk) {
      this.logger.debug("Invalid stream chunk received", {
        requestId: this.requestId,
        chunkType: typeof chunk,
      });
      return;
    }

    interface ChunkWithMetadata {
      id?: string;
      created?: number;
    }

    const chunkData = validatedChunk as ChunkWithMetadata;
    if (!this.responseId && chunkData.id) {
      this.responseId = chunkData.id;
    }
    if (!this.responseCreated && chunkData.created) {
      this.responseCreated = chunkData.created;
    }

    // Record first token time
    if (
      this.firstTokenTime === null &&
      validatedChunk.choices?.[0]?.delta?.content
    ) {
      this.firstTokenTime = Date.now();
      this.logger.debug("First token received", {
        requestId: this.requestId,
        timeToFirstToken: this.firstTokenTime - this.startTime,
      });
    }

    if (
      this.shouldCapturePrompts &&
      validatedChunk.choices?.[0]?.delta?.content
    ) {
      const remaining = this.maxPromptSize - this.accumulatedContent.length;
      if (remaining > 0) {
        this.accumulatedContent +=
          validatedChunk.choices[0].delta.content.slice(0, remaining);
      }
    }

    interface DeltaToolCall {
      index?: number;
      id?: string;
      type?: string;
      function?: {
        name?: string;
        arguments?: string;
      };
    }

    interface DeltaWithTools {
      tool_calls?: DeltaToolCall[];
    }

    const delta = validatedChunk.choices?.[0]?.delta as
      | DeltaWithTools
      | undefined;
    if (
      this.shouldCapturePrompts &&
      delta?.tool_calls &&
      Array.isArray(delta.tool_calls)
    ) {
      delta.tool_calls.forEach((toolCallDelta) => {
        const index = toolCallDelta.index;
        if (index === undefined) {
          return;
        }

        // Get or create the accumulated tool call for this index
        let accumulated = this.accumulatedToolCalls.get(index);
        if (!accumulated) {
          accumulated = {
            index,
            id: toolCallDelta.id,
            type: toolCallDelta.type || "function",
            function: {
              name: "",
              arguments: "",
            },
          };
          this.accumulatedToolCalls.set(index, accumulated);
        }

        // Accumulate the tool call data
        if (toolCallDelta.id) {
          accumulated.id = toolCallDelta.id;
        }
        if (toolCallDelta.type) {
          accumulated.type = toolCallDelta.type;
        }
        if (toolCallDelta.function?.name) {
          accumulated.function.name = toolCallDelta.function.name;
        }
        if (toolCallDelta.function?.arguments) {
          const currentSize = accumulated.function.arguments.length;
          const remaining = this.maxPromptSize - currentSize;
          if (remaining > 0) {
            accumulated.function.arguments +=
              toolCallDelta.function.arguments.slice(0, remaining);
          }
        }
      });
    }

    // Extract usage information (typically in the last chunk)
    if (validatedChunk.usage) {
      this.promptTokens = validatedChunk.usage.prompt_tokens || 0;
      this.completionTokens = validatedChunk.usage.completion_tokens || 0;
      this.totalTokens = validatedChunk.usage.total_tokens || 0;

      this.logger.debug("Usage data extracted from stream", {
        requestId: this.requestId,
        promptTokens: this.promptTokens,
        completionTokens: this.completionTokens,
        totalTokens: this.totalTokens,
      });
    }

    // Extract finish reason
    if (validatedChunk.choices?.[0]?.finish_reason)
      this.finishReason = validatedChunk.choices[0].finish_reason;
    // Some providers send usage in different chunk structures
    if (!this.totalTokens && validatedChunk.x_groq?.usage) {
      // Groq-specific usage format
      this.promptTokens = validatedChunk.x_groq.usage.prompt_tokens || 0;
      this.completionTokens =
        validatedChunk.x_groq.usage.completion_tokens || 0;
      this.totalTokens = validatedChunk.x_groq.usage.total_tokens || 0;
    }
  }

  private finalizeTracking(): void {
    const timeToFirstToken = this.firstTokenTime
      ? this.firstTokenTime - this.startTime
      : this.requestDuration;

    this.logger.debug("Finalizing streaming response tracking", {
      requestId: this.requestId,
      model: this.model,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.totalTokens,
      finishReason: this.finishReason,
      timeToFirstToken,
    });

    let reconstructedResponse: LiteLLMChatCompletionResponse | undefined;
    if (
      this.shouldCapturePrompts &&
      (this.accumulatedContent || this.accumulatedToolCalls.size > 0)
    ) {
      const message: any = {
        role: "assistant",
        content: this.accumulatedContent,
      };

      if (this.accumulatedToolCalls.size > 0) {
        // Convert Map to array, sort by index, and remove index property (not part of OpenAI spec)
        message.tool_calls = Array.from(this.accumulatedToolCalls.values())
          .sort((a, b) => a.index - b.index)
          .map((tc) => {
            const { index, ...rest } = tc;
            return rest;
          });
      }

      reconstructedResponse = {
        id: this.responseId || "unknown",
        object: "chat.completion",
        created: this.responseCreated || Math.floor(Date.now() / 1000),
        model: this.model,
        choices: [
          {
            index: 0,
            message,
            finish_reason: this.finishReason || "stop",
          },
        ],
        usage: {
          prompt_tokens: this.promptTokens,
          completion_tokens: this.completionTokens,
          total_tokens: this.totalTokens,
        },
      };
    }

    trackUsageAsync({
      requestId: this.requestId,
      model: this.model,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.totalTokens,
      duration: this.requestDuration,
      finishReason: this.finishReason || "stop",
      usageMetadata: this.requestContext.metadata,
      isStreamed: true,
      timeToFirstToken,
      responseFormat: this.responseFormat,
      request: this.requestBody,
      response: reconstructedResponse,
    });
  }
}

/**
 * Patch the global fetch function to intercept LiteLLM Proxy requests
 */
export function patchHttpClient(): boolean {
  const clientManager = HttpClientManager.getInstance();
  if (clientManager.isHttpClientPatched()) {
    logger.debug("HTTP client already patched");
    return true;
  }

  if (typeof globalThis.fetch !== "function") {
    const errorContext = createErrorContext()
      .with("fetchType", typeof globalThis.fetch)
      .build();

    logger.error("Global fetch function not available", errorContext);
    return false;
  }

  try {
    // Store original fetch
    const originalFetch = globalThis.fetch;
    clientManager.setPatched(false, originalFetch);

    // Replace with patched version
    globalThis.fetch = createPatchedFetch();

    clientManager.setPatched(true);
    logger.info("LiteLLM HTTP client middleware enabled");
    return true;
  } catch (error) {
    const errorContext = createErrorContext()
      .with("error", error instanceof Error ? error.message : String(error))
      .with("stack", error instanceof Error ? error.stack : undefined)
      .build();

    logger.error("Failed to patch HTTP client", errorContext);

    // Throw a proper error for better debugging
    throw new PatchingError(
      "Failed to patch HTTP client for LiteLLM interception",
      errorContext
    );
  }
}

/**
 * Restore the original fetch function
 */
export function unpatchHttpClient(): boolean {
  const clientManager = HttpClientManager.getInstance();
  if (!clientManager.isHttpClientPatched()) {
    logger.debug("HTTP client not patched");
    return true;
  }

  const originalFetch = clientManager.getOriginalFetch();
  if (!originalFetch) {
    logger.error("Original fetch function not stored");
    return false;
  }

  try {
    globalThis.fetch = originalFetch;
    clientManager.setPatched(false);
    logger.info("LiteLLM HTTP client middleware disabled");
    return true;
  } catch (error) {
    logger.error("Failed to unpatch HTTP client", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Check if HTTP client is patched
 */
export function isHttpClientPatched(): boolean {
  return HttpClientManager.getInstance().isHttpClientPatched();
}

/**
 * Reset HTTP client manager (for testing)
 */
export function resetHttpClientManager(): void {
  HttpClientManager.resetInstance();
}
