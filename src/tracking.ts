import {
  ReveniumPayload,
  UsageMetadata,
  LiteLLMChatCompletionResponse,
  LiteLLMChatCompletionRequest,
  Subscriber,
} from "./types";
import { getConfig, getLogger } from "./config";
import {
  extractModelSource,
  extractProvider,
  extractModelName,
} from "./utils/provider-detection";
import { getStopReason } from "./utils/stop-reason";
import { validateUsageMetadata } from "./utils/validation";
import {
  ReveniumApiError,
  createErrorContext,
  withRetry,
  executeWithErrorHandling,
  ErrorHandlingStrategy,
} from "./utils/error-handling";
import { createLogContext } from "./utils/logger-types";
import {
  executeWithCircuitBreaker,
  canExecuteRequest,
  getCircuitBreakerStats,
} from "./utils/circuit-breaker";
import {
  getEnvironment,
  getRegion,
  getCredentialAlias,
  getTraceType,
  getTraceName,
  detectOperationSubtype,
  getParentTransactionId,
  getTransactionName,
  getRetryNumber,
} from "./utils/trace-fields";
import { REVENIUM_COMPLETION_ENDPOINT } from "./constants";
import { printUsageSummary } from "./utils/summary-printer";
import { extractPrompts } from "./prompt-extraction";

const logger = getLogger();

export async function sendReveniumMetrics(data: {
  requestId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
  cachedTokens?: number;
  duration: number;
  finishReason: string | null;
  usageMetadata?: UsageMetadata;
  isStreamed?: boolean;
  timeToFirstToken?: number;
  operationType?: "CHAT" | "EMBED";
  responseFormat?: any;
  request?: LiteLLMChatCompletionRequest;
  response?: LiteLLMChatCompletionResponse;
}): Promise<void> {
  const config = getConfig();

  if (!config)
    return logger.warn("Revenium configuration not found, skipping tracking");

  const now = new Date().toISOString();
  const requestTime = new Date(Date.now() - data.duration).toISOString();

  // Determine operation type and set appropriate defaults
  const operationType = data.operationType || "CHAT";
  const isEmbedding = operationType === "EMBED";

  // Construct nested subscriber object if subscriber data is available
  let subscriber: Subscriber | undefined;
  if (
    data.usageMetadata?.subscriberId &&
    data.usageMetadata?.subscriberEmail &&
    data.usageMetadata?.subscriberCredentialName &&
    data.usageMetadata?.subscriberCredential
  ) {
    subscriber = {
      id: data.usageMetadata.subscriberId,
      email: data.usageMetadata.subscriberEmail,
      credential: {
        name: data.usageMetadata.subscriberCredentialName,
        value: data.usageMetadata.subscriberCredential,
      },
    };
  }

  const region = await getRegion();

  const attributes: Record<string, unknown> = {};
  if (data.responseFormat) {
    if (
      typeof data.responseFormat === "object" &&
      data.responseFormat !== null
    ) {
      const formatType = data.responseFormat.type;
      if (formatType) {
        attributes.response_format_type = formatType;
        if (formatType === "json_schema") {
          const schemaName = data.responseFormat.json_schema?.name;
          if (schemaName) {
            attributes.response_format_schema_name = schemaName;
          }
        }
      }
    } else {
      attributes.response_format = data.responseFormat;
    }
  }

  const promptData =
    data.request && data.response
      ? extractPrompts(data.request, data.response, data.usageMetadata)
      : null;

  const payload: ReveniumPayload = {
    stopReason: isEmbedding ? "END" : getStopReason(data.finishReason),
    costType: "AI",
    isStreamed: isEmbedding ? false : data.isStreamed || false,
    operationType: operationType,
    inputTokenCount: data.promptTokens,
    outputTokenCount: isEmbedding ? 0 : data.completionTokens,
    reasoningTokenCount: data.reasoningTokens || 0,
    cacheCreationTokenCount: data.cachedTokens || 0,
    cacheReadTokenCount: 0,
    totalTokenCount: data.totalTokens,
    model: extractModelName(data.model),
    modelSource: extractModelSource(data.model),
    transactionId: data.requestId,
    responseTime: now,
    requestDuration: Math.round(data.duration),
    provider: extractProvider(data.model),
    requestTime: requestTime,
    completionStartTime: isEmbedding
      ? now
      : data.isStreamed && data.timeToFirstToken
      ? new Date(
          Date.now() - (data.duration - data.timeToFirstToken)
        ).toISOString()
      : now,
    timeToFirstToken: isEmbedding
      ? 0
      : data.timeToFirstToken || Math.round(data.duration),
    middlewareSource: "nodejs",

    traceId: data.usageMetadata?.traceId,
    taskType: data.usageMetadata?.taskType,
    agent: data.usageMetadata?.agent,
    organizationId: data.usageMetadata?.organizationId || config.organizationId,
    productId: data.usageMetadata?.productId,
    subscriber: subscriber,
    subscriptionId: data.usageMetadata?.subscriptionId,
    responseQualityScore: data.usageMetadata?.responseQualityScore,
    environment:
      data.usageMetadata?.environment || getEnvironment() || undefined,
    operationSubtype:
      data.usageMetadata?.operationSubtype ||
      detectOperationSubtype() ||
      undefined,
    retryNumber: data.usageMetadata?.retryNumber ?? getRetryNumber(),
    parentTransactionId:
      data.usageMetadata?.parentTransactionId ||
      getParentTransactionId() ||
      undefined,
    transactionName:
      data.usageMetadata?.transactionName || getTransactionName() || undefined,
    region: data.usageMetadata?.region || region || undefined,
    credentialAlias:
      data.usageMetadata?.credentialAlias || getCredentialAlias() || undefined,
    traceType: data.usageMetadata?.traceType || getTraceType() || undefined,
    traceName: data.usageMetadata?.traceName || getTraceName() || undefined,
    ...(Object.keys(attributes).length > 0 && { attributes }),
    ...(promptData && {
      systemPrompt: promptData.systemPrompt,
      inputMessages: promptData.inputMessages,
      outputResponse: promptData.outputResponse,
      promptsTruncated: promptData.promptsTruncated,
    }),
  };

  // Remove undefined values to clean up the payload
  Object.keys(payload).forEach((key) => {
    const typedKey = key as keyof ReveniumPayload;
    if (payload[typedKey] === undefined) delete payload[typedKey];
  });

  const url = `${config.reveniumMeteringBaseUrl}/${REVENIUM_COMPLETION_ENDPOINT}`;
  const timeout = config.apiTimeout || 5000;

  logger.debug("Sending Revenium API request", {
    url,
    requestId: data.requestId,
    model: data.model,
    provider: extractProvider(data.model),
    totalTokens: data.totalTokens,
  });

  // Add specific debug logging for streaming fields
  if (data.isStreamed) {
    logger.debug("Streaming payload debug", {
      requestId: data.requestId,
      isStreamed: payload.isStreamed,
      timeToFirstToken: payload.timeToFirstToken,
      completionStartTime: payload.completionStartTime,
      operationType: payload.operationType,
    });
  }

  // Check circuit breaker before making request
  if (!canExecuteRequest()) {
    const stats = getCircuitBreakerStats();
    logger.warn("Circuit breaker is open, skipping Revenium API call", {
      requestId: data.requestId,
      circuitState: stats.state,
      timeUntilRecovery: stats.timeUntilRecovery,
    });
    if (!config.failSilent) {
      throw new ReveniumApiError(
        "Circuit breaker is open - Revenium API temporarily unavailable",
        503,
        "Service temporarily unavailable",
        createErrorContext().withRequestId(data.requestId).build()
      );
    }
    return;
  }

  // Create error handling strategy based on configuration
  const errorStrategy: ErrorHandlingStrategy = {
    failSilent: config.failSilent !== false,
    maxRetries: config.maxRetries || 3,
    baseDelay: 1000,
    logErrors: true,
  };

  const result = await executeWithErrorHandling(
    async () => {
      // Execute with circuit breaker protection
      return await executeWithCircuitBreaker(async () => {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-api-key": config.reveniumMeteringApiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        logger.debug("Revenium API response", {
          status: response.status,
          statusText: response.statusText,
          requestId: data.requestId,
        });

        if (!response.ok) {
          const responseText = await response.text();
          const errorContext = createErrorContext()
            .withRequestId(data.requestId)
            .withModel(data.model)
            .withStatus(response.status)
            .with("responseBody", responseText)
            .build();

          logger.error("Revenium API error response", errorContext);

          // Throw error to trigger circuit breaker
          throw new ReveniumApiError(
            `Revenium API error: ${response.status} ${response.statusText}`,
            response.status,
            responseText,
            errorContext
          );
        }

        const responseBody = await response.text();
        logger.debug("Revenium tracking successful", {
          requestId: data.requestId,
          response: responseBody,
        });

        return response; // Return response for circuit breaker success
      });
    },
    errorStrategy,
    logger,
    {
      requestId: data.requestId,
      model: data.model,
      duration: data.duration,
      totalTokens: data.totalTokens,
    }
  );

  if (!result.success && result.error) {
    logger.error("Revenium tracking failed after all retries", {
      requestId: data.requestId,
      error: result.error.message,
      retryCount: result.retryCount,
    });
  }

  printUsageSummary(payload);
}

/**
 * Fire-and-forget async tracking wrapper
 * This ensures tracking never blocks the main application flow
 */
export function trackUsageAsync(
  trackingData: Parameters<typeof sendReveniumMetrics>[0]
): void {
  // Run tracking in background without awaiting
  // The sendReveniumMetrics function now handles retries and error strategies internally
  sendReveniumMetrics(trackingData)
    .then(() => {
      logger.debug("Revenium tracking completed successfully", {
        requestId: trackingData.requestId,
      });
    })
    .catch((error) => {
      // This should rarely happen since sendReveniumMetrics handles errors internally
      // Only occurs if failSilent is false and all retries are exhausted
      logger.warn("Revenium tracking failed completely", {
        error: error instanceof Error ? error.message : String(error),
        requestId: trackingData.requestId,
      });
    });
}

/**
 * Fire-and-forget async tracking wrapper specifically for embeddings
 * This ensures embeddings tracking never blocks the main application flow
 */
export function trackEmbeddingsUsageAsync(data: {
  requestId: string;
  model: string;
  promptTokens: number;
  totalTokens: number;
  duration: number;
  usageMetadata?: UsageMetadata;
}): void {
  trackUsageAsync({
    ...data,
    completionTokens: 0, // Embeddings don't have completion tokens
    finishReason: "stop", // Embeddings always complete normally
    isStreamed: false, // Embeddings don't support streaming
    timeToFirstToken: 0, // Not applicable for embeddings
    operationType: "EMBED",
  });
}

export function extractMetadataFromHeaders(
  headers: Record<string, string>
): UsageMetadata {
  return {
    subscriberId: headers["x-revenium-subscriber-id"],
    productId: headers["x-revenium-product-id"],
    organizationId: headers["x-revenium-organization-id"],
    traceId: headers["x-revenium-trace-id"],
    taskType: headers["x-revenium-task-type"],
    agent: headers["x-revenium-agent"],
    subscriberEmail: headers["x-revenium-subscriber-email"],
    subscriptionId: headers["x-revenium-subscription-id"],
    subscriberCredentialName: headers["x-revenium-subscriber-credential-name"],
    subscriberCredential: headers["x-revenium-subscriber-credential"],
    environment: headers["x-revenium-environment"],
    operationSubtype: headers["x-revenium-operation-subtype"],
    retryNumber: headers["x-revenium-retry-number"]
      ? parseInt(headers["x-revenium-retry-number"], 10)
      : undefined,
    parentTransactionId: headers["x-revenium-parent-transaction-id"],
    transactionName: headers["x-revenium-transaction-name"],
    region: headers["x-revenium-region"],
    credentialAlias: headers["x-revenium-credential-alias"],
    traceType: headers["x-revenium-trace-type"],
    traceName: headers["x-revenium-trace-name"],
    capturePrompts: headers["x-revenium-capture-prompts"]
      ? headers["x-revenium-capture-prompts"].toLowerCase() === "true"
      : undefined,
  };
}

/**
 * Process LiteLLM response and extract token usage
 */
export function extractUsageFromResponse(
  response: LiteLLMChatCompletionResponse
): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string | null;
} {
  const usage = response.usage;
  const finishReason = response.choices?.[0]?.finish_reason || null;

  return {
    promptTokens: usage?.prompt_tokens || 0,
    completionTokens: usage?.completion_tokens || 0,
    totalTokens: usage?.total_tokens || 0,
    finishReason,
  };
}
