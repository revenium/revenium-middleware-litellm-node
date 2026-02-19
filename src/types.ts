/**
 * Configuration for Revenium LiteLLM middleware
 */
export interface ReveniumConfig {
  /** Revenium metering API key (starts with hak_) */
  reveniumMeteringApiKey: string;
  /** Revenium metering base URL */
  reveniumMeteringBaseUrl: string;
  /** LiteLLM Proxy Server URL (can be base URL or full endpoint URL) */
  litellmProxyUrl: string;
  /** LiteLLM API key for proxy authentication */
  litellmApiKey?: string;
  /** Customer organization name for multi-tenant applications (used for lookup/auto-creation) */
  organizationName?: string;
  /**
   * @deprecated Use organizationName instead. This field will be removed in a future version.
   * Organization/customer ID for aggregating usage across multiple users
   */
  organizationId?: string;
  /** API timeout in milliseconds (default: 5000) */
  apiTimeout?: number;
  /** Whether to fail silently if Revenium tracking fails (default: true) */
  failSilent?: boolean;
  /** Maximum retries for failed Revenium API calls (default: 3) */
  maxRetries?: number;
  /** Print usage summary to console (default: false). Can be true, false, 'human', or 'json' */
  printSummary?: boolean | "human" | "json";
  /** Team ID for cost retrieval from Revenium API */
  teamId?: string;
  /** Whether to capture and send prompts to Revenium API (default: false) */
  capturePrompts?: boolean;
  /** Maximum size in characters for captured prompts before truncation (default: 50000). Note: uses JavaScript string length (UTF-16 code units), not byte count. */
  maxPromptSize?: number;
}

/**
 * Optional metadata for enhanced tracking and analytics
 * Can be passed via headers or extracted from request context
 */
export interface UsageMetadata {
  traceId?: string;
  taskId?: string;
  taskType?: string;
  subscriberEmail?: string;
  subscriberId?: string;
  subscriberCredentialName?: string;
  subscriberCredential?: string;
  /** Customer organization name for multi-tenant applications (used for lookup/auto-creation) */
  organizationName?: string;
  /**
   * @deprecated Use organizationName instead. This field will be removed in a future version.
   * Organization/customer ID for aggregating usage across multiple users
   */
  organizationId?: string;
  subscriptionId?: string;
  /** Product or feature name that is using AI services (used for lookup/auto-creation) */
  productName?: string;
  /**
   * @deprecated Use productName instead. This field will be removed in a future version.
   * Product ID for cost attribution across features/tiers
   */
  productId?: string;
  agent?: string;
  responseQualityScore?: number;
  environment?: string;
  operationSubtype?: string;
  retryNumber?: number;
  parentTransactionId?: string;
  transactionName?: string;
  region?: string;
  credentialAlias?: string;
  traceType?: string;
  traceName?: string;
  capturePrompts?: boolean;
  /** Maximum size in characters for captured prompts before truncation. Note: uses JavaScript string length (UTF-16 code units), not byte count. */
  maxPromptSize?: number;
}

export interface SubscriberCredential {
  name: string;
  value: string;
}

export interface Subscriber {
  id: string;
  email: string;
  credential: SubscriberCredential;
}
export interface ReveniumPayload {
  stopReason: string;
  costType: "AI";
  isStreamed: boolean;
  taskType?: string;
  agent?: string;
  operationType: "CHAT" | "EMBED";
  inputTokenCount: number;
  outputTokenCount: number;
  reasoningTokenCount: number;
  cacheCreationTokenCount: number;
  cacheReadTokenCount: number;
  totalTokenCount: number;
  organizationName?: string;
  productName?: string;
  subscriber?: Subscriber;
  subscriptionId?: string;
  model: string;
  modelSource: string;
  transactionId: string;
  responseTime: string;
  requestDuration: number;
  provider: string;
  requestTime: string;
  middlewareSource: string;
  completionStartTime?: string;
  timeToFirstToken: number;
  traceId?: string;
  responseQualityScore?: number;
  environment?: string;
  operationSubtype?: string;
  retryNumber?: number;
  parentTransactionId?: string;
  transactionName?: string;
  region?: string;
  credentialAlias?: string;
  traceType?: string;
  traceName?: string;
  attributes?: Record<string, unknown>;
  systemPrompt?: string;
  inputMessages?: string;
  outputResponse?: string;
  promptsTruncated?: boolean;
}

/**
 * Supported message roles in LiteLLM
 */
export type MessageRole = "system" | "user" | "assistant" | "function" | "tool";

/**
 * Function call information for messages
 */
export interface FunctionCall {
  name: string;
  arguments: string;
}

/**
 * Tool call information for messages
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: FunctionCall;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: MessageRole;
  content?: string | null;
  name?: string;
  function_call?: FunctionCall;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/**
 * LiteLLM Chat Completion Request (OpenAI compatible)
 */
export interface LiteLLMChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  functions?: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;
  function_call?: "none" | "auto" | { name: string };
  tools?: Array<{
    type: "function";
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  tool_choice?:
    | "none"
    | "auto"
    | { type: "function"; function: { name: string } };
  response_format?:
    | { type: "text" }
    | { type: "json_object" }
    | {
        type: "json_schema";
        json_schema: {
          name: string;
          schema?: Record<string, unknown>;
          strict?: boolean;
        };
      };
  seed?: number;
  user?: string;
}

/**
 * Response message from LiteLLM
 */
export interface ResponseMessage {
  role: "assistant";
  content: string | null;
  function_call?: FunctionCall;
  tool_calls?: ToolCall[];
}

/**
 * Choice in LiteLLM response
 */
export interface ResponseChoice {
  index: number;
  message: ResponseMessage;
  finish_reason: string | null;
  logprobs?: {
    content?: Array<{
      token: string;
      logprob: number;
      bytes?: number[];
      top_logprobs?: Array<{
        token: string;
        logprob: number;
        bytes?: number[];
      }>;
    }>;
  };
}

/**
 * Token usage information
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
}

/**
 * LiteLLM Chat Completion Response (OpenAI compatible)
 */
export interface LiteLLMChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ResponseChoice[];
  usage?: TokenUsage;
  system_fingerprint?: string;
}

/**
 * LiteLLM Embedding Request (OpenAI compatible)
 */
export interface LiteLLMEmbeddingRequest {
  model: string;
  input: string | string[];
  encoding_format?: string;
  dimensions?: number;
  user?: string;
  [key: string]: any;
}

/**
 * LiteLLM Embedding Response (OpenAI compatible)
 */
export interface LiteLLMEmbeddingResponse {
  object: "list";
  data: Array<{
    object: "embedding";
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
  [key: string]: any;
}

/**
 * HTTP request body types
 */
export type RequestBody =
  | string
  | ArrayBuffer
  | ArrayBufferView
  | Blob
  | FormData
  | URLSearchParams
  | ReadableStream<Uint8Array>
  | null;

/**
 * HTTP response body types
 */
export type ResponseBody =
  | LiteLLMChatCompletionResponse
  | ReadableStream<Uint8Array>
  | ArrayBuffer
  | Blob
  | string
  | null;

/**
 * HTTP request context for tracking
 */
export interface RequestContext {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: RequestBody;
  startTime: number;
  metadata?: UsageMetadata;
}

/**
 * HTTP response context for tracking
 */
export interface ResponseContext {
  status: number;
  headers: Record<string, string>;
  body: ResponseBody;
  endTime: number;
  isStream: boolean;
}

/**
 * Custom headers for Revenium metadata
 */
export interface ReveniumHeaders {
  "x-revenium-subscriber-id"?: string;
  "x-revenium-product-name"?: string;
  "x-revenium-product-id"?: string;
  "x-revenium-organization-name"?: string;
  "x-revenium-organization-id"?: string;
  "x-revenium-trace-id"?: string;
  "x-revenium-task-type"?: string;
  "x-revenium-agent"?: string;
  [key: string]: string | undefined;
}

/**
 * Logger interface for the middleware
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * Middleware status information
 */
export interface MiddlewareStatus {
  initialized: boolean;
  patched: boolean;
  hasConfig: boolean;
  proxyUrl?: string;
}

/**
 * Provider pattern definitions for model detection
 */
export interface ProviderPattern {
  /** Standardized provider constant for Revenium API */
  source: string;
  /** Human-readable provider name */
  displayName: string;
  /** Model name patterns to match against */
  patterns: string[];
  /** Provider prefix patterns (e.g., "openai/" in "openai/gpt-4") */
  prefixes: string[];
}

export * from "./types/tool-metering";
