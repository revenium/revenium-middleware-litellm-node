import { ProviderPattern, UsageMetadata } from "./types";

/**
 * Comprehensive provider registry
 * Organized by priority - more specific patterns first
 */
export const PROVIDER_REGISTRY: ProviderPattern[] = [
  {
    source: "OPENAI",
    displayName: "OpenAI",
    patterns: ["gpt-", "davinci", "curie", "babbage", "ada", "text-embedding"],
    prefixes: ["openai"],
  },
  {
    source: "ANTHROPIC",
    displayName: "Anthropic",
    patterns: ["claude", "anthropic"],
    prefixes: ["anthropic"],
  },
  {
    source: "GOOGLE",
    displayName: "Google Vertex AI",
    patterns: ["gemini", "palm", "bison", "gecko"],
    prefixes: ["vertex_ai", "palm"],
  },
  {
    source: "AZURE",
    displayName: "Azure OpenAI",
    patterns: ["azure"],
    prefixes: ["azure"],
  },
  {
    source: "COHERE",
    displayName: "Cohere",
    patterns: ["command", "cohere"],
    prefixes: ["cohere"],
  },
  {
    source: "HUGGINGFACE",
    displayName: "Hugging Face",
    patterns: ["huggingface"],
    prefixes: ["huggingface"],
  },
  {
    source: "TOGETHER",
    displayName: "Together AI",
    patterns: ["llama", "mistral", "mixtral"],
    prefixes: ["together_ai"],
  },
  {
    source: "OLLAMA",
    displayName: "Ollama",
    patterns: ["ollama"],
    prefixes: ["ollama"],
  },
  {
    source: "MISTRAL",
    displayName: "Mistral",
    patterns: ["mistral"],
    prefixes: ["mistral"],
  },
  {
    source: "GROQ",
    displayName: "Groq",
    patterns: ["groq"],
    prefixes: ["groq"],
  },
];

export const stringFields: (keyof UsageMetadata)[] = [
  "traceId",
  "taskId",
  "taskType",
  "subscriberEmail",
  "subscriberId",
  "subscriberCredentialName",
  "subscriberCredential",
  "organizationId",
  "organizationName",
  "subscriptionId",
  "productId",
  "productName",
  "agent",
];

export const supportedEndpoints: string[] = [
  "/chat/completions",
  "/v1/chat/completions",
  "/embeddings",
  "/v1/embeddings",
];
export const SUPPORTED_ROLES: string[] = [
  "system",
  "user",
  "assistant",
  "function",
  "tool",
];
export const PATHNAME_URL: string[] = ["/chat/completions", "/embeddings"];
export const HOSTNAME: string = "localhost";
export const HOSTNAME_IP: string = "127.0.0.1";
export const URL_PROTOCOL: string = "http";
export const REVENIUM_COMPLETION_ENDPOINT: string = "meter/v2/ai/completions";
