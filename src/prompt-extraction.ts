import {
  UsageMetadata,
  LiteLLMChatCompletionRequest,
  LiteLLMChatCompletionResponse,
} from "./types.js";
import { getConfig } from "./config.js";

const DEFAULT_MAX_PROMPT_SIZE = 50000;
const CAPTURE_PROMPTS_DEFAULT = false;

export function getMaxPromptSize(metadata?: UsageMetadata): number {
  if (metadata?.maxPromptSize && metadata.maxPromptSize > 0) {
    return metadata.maxPromptSize;
  }

  const config = getConfig();
  if (config?.maxPromptSize && config.maxPromptSize > 0) {
    return config.maxPromptSize;
  }

  const envValue = process.env.REVENIUM_MAX_PROMPT_SIZE;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return DEFAULT_MAX_PROMPT_SIZE;
}

export interface PromptData {
  systemPrompt?: string;
  inputMessages?: string;
  outputResponse?: string;
  promptsTruncated: boolean;
}

interface ContentBlock {
  type: string;
  text?: string;
  image_url?: unknown;
}

interface ToolCall {
  function?: {
    name?: string;
  };
}

interface MessageWithTools {
  tool_calls?: ToolCall[];
}

type MessageContent = string | ContentBlock[];

function sanitizeCredentials(text: string): string {
  const patterns = [
    {
      regex: /sk-proj-[a-zA-Z0-9_-]{48,}/g,
      replacement: "sk-proj-***REDACTED***",
    },
    { regex: /sk-[a-zA-Z0-9_-]{20,}/g, replacement: "sk-***REDACTED***" },
    {
      regex: /Bearer\s+[a-zA-Z0-9_\-\.]+/gi,
      replacement: "Bearer ***REDACTED***",
    },
    {
      regex: /api[_-]?key["\s:=]+[a-zA-Z0-9_\-\.\+\/=]{20,}/gi,
      replacement: "api_key: ***REDACTED***",
    },
    {
      regex: /token["\s:=]+[a-zA-Z0-9_\-\.]{20,}/gi,
      replacement: "token: ***REDACTED***",
    },
    {
      regex: /password["\s:=]+[^\s"']{8,}/gi,
      replacement: "password: ***REDACTED***",
    },
  ];

  let sanitized = text;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern.regex, pattern.replacement);
  }
  return sanitized;
}

function truncateString(
  str: string | null | undefined,
  maxLength: number
): { value: string; truncated: boolean } {
  if (!str || str.length === 0) {
    return { value: "", truncated: false };
  }

  const sanitized = sanitizeCredentials(str);

  if (sanitized.length <= maxLength) {
    return { value: sanitized, truncated: false };
  }
  return { value: sanitized.substring(0, maxLength), truncated: true };
}

function extractSystemPrompt(request: LiteLLMChatCompletionRequest): string {
  if (!request.messages || !Array.isArray(request.messages)) {
    return "";
  }

  const systemMessages = request.messages
    .filter((msg) => msg.role === "system")
    .map((msg) => {
      const content = msg.content as MessageContent;
      if (typeof content === "string") {
        return content;
      }
      if (Array.isArray(content)) {
        return content
          .map((block) => {
            if (block.type === "text" && block.text) {
              return block.text;
            }
            if (block.type === "image_url") {
              return "[IMAGE]";
            }
            return "";
          })
          .filter(Boolean)
          .join("\n");
      }
      return "";
    })
    .filter(Boolean);

  return systemMessages.join("\n\n");
}

function extractInputMessages(request: LiteLLMChatCompletionRequest): string {
  if (!request.messages || !Array.isArray(request.messages)) {
    return "";
  }

  return request.messages
    .map((message) => {
      const role = message.role;
      let content = "";
      const msgContent = message.content as MessageContent;

      if (typeof msgContent === "string") {
        content = msgContent;
      } else if (Array.isArray(msgContent)) {
        content = msgContent
          .map((block) => {
            if (block.type === "text" && block.text) {
              return block.text;
            }
            if (block.type === "image_url") {
              return "[IMAGE]";
            }
            if (block.type === "tool_use") {
              const toolName = (block as any).name || "unknown";
              return `[TOOL_USE: ${toolName}]`;
            }
            if (block.type === "tool_result") {
              return "[TOOL_RESULT]";
            }
            return "";
          })
          .filter(Boolean)
          .join("\n");
      }

      const msgWithTools = message as MessageWithTools;
      if (msgWithTools.tool_calls && Array.isArray(msgWithTools.tool_calls)) {
        const toolCalls = msgWithTools.tool_calls
          .map((tc) => `[TOOL_USE: ${tc.function?.name || "unknown"}]`)
          .join("\n");
        content = content ? `${content}\n${toolCalls}` : toolCalls;
      }

      return `[${role}]\n${content}`;
    })
    .join("\n\n");
}

function extractOutputResponse(
  response: LiteLLMChatCompletionResponse
): string {
  if (!response.choices || response.choices.length === 0) {
    return "";
  }

  const choice = response.choices[0];
  const parts: string[] = [];

  if (choice.message?.content) {
    parts.push(choice.message.content);
  }

  const message = choice.message as MessageWithTools | undefined;
  if (message?.tool_calls && Array.isArray(message.tool_calls)) {
    message.tool_calls.forEach((toolCall) => {
      if (toolCall.function?.name) {
        parts.push(`[TOOL_USE: ${toolCall.function.name}]`);
      }
    });
  }

  return parts.join("\n");
}

export function shouldCapturePrompts(metadata?: UsageMetadata): boolean {
  if (metadata?.capturePrompts !== undefined) {
    return metadata.capturePrompts;
  }

  const config = getConfig();
  if (config?.capturePrompts !== undefined) {
    return config.capturePrompts;
  }

  const envValue = process.env.REVENIUM_CAPTURE_PROMPTS;
  if (envValue !== undefined) {
    return envValue.toLowerCase() === "true";
  }

  return CAPTURE_PROMPTS_DEFAULT;
}

export function extractPrompts(
  request: LiteLLMChatCompletionRequest,
  response: LiteLLMChatCompletionResponse,
  metadata?: UsageMetadata
): PromptData | null {
  if (!shouldCapturePrompts(metadata)) {
    return null;
  }

  const maxSize = getMaxPromptSize(metadata);
  let anyTruncated = false;

  const systemPromptRaw = extractSystemPrompt(request);
  const systemPromptResult = truncateString(systemPromptRaw, maxSize);
  anyTruncated = anyTruncated || systemPromptResult.truncated;

  const inputMessagesRaw = extractInputMessages(request);
  const inputMessagesResult = truncateString(inputMessagesRaw, maxSize);
  anyTruncated = anyTruncated || inputMessagesResult.truncated;

  const outputResponseRaw = extractOutputResponse(response);
  const outputResponseResult = truncateString(outputResponseRaw, maxSize);
  anyTruncated = anyTruncated || outputResponseResult.truncated;

  const hasAnyContent =
    systemPromptResult.value ||
    inputMessagesResult.value ||
    outputResponseResult.value;

  if (!hasAnyContent) {
    return null;
  }

  return {
    systemPrompt: systemPromptResult.value || undefined,
    inputMessages: inputMessagesResult.value || undefined,
    outputResponse: outputResponseResult.value || undefined,
    promptsTruncated: anyTruncated,
  };
}
