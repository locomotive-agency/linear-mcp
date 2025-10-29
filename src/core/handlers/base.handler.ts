import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { LinearAuth } from '../../auth.js';
import { LinearGraphQLClient } from '../../graphql/client.js';
import { BaseToolResponse } from '../interfaces/tool-handler.interface.js';
import { lifecycleHooks, HookContext } from './lifecycle-hooks.js';

/**
 * Base handler class that implements common authentication and error handling logic.
 * All feature-specific handlers should extend this class.
 */
export abstract class BaseHandler {
  constructor(
    protected readonly auth: LinearAuth,
    protected readonly graphqlClient: LinearGraphQLClient | undefined
  ) {}

  /**
   * Execute an operation with lifecycle hooks
   * @param toolName Name of the tool/operation
   * @param args Arguments passed to the operation
   * @param operation The actual operation to execute
   */
  protected async executeWithHooks<T extends BaseToolResponse>(
    toolName: string,
    args: any,
    operation: () => Promise<T>
  ): Promise<T> {
    const context: HookContext = {
      toolName,
      args,
      startTime: Date.now(),
    };

    try {
      // Execute beforeHandle hooks
      const beforeResult = await lifecycleHooks.executeBeforeHooks(context);

      // Check if any hook short-circuited
      if (beforeResult.shortCircuit && beforeResult.response) {
        return beforeResult.response as T;
      }

      // Update context if hooks modified it
      if (beforeResult.context) {
        Object.assign(context, beforeResult.context);
      }

      // Execute the actual operation
      let response = await operation();

      // Execute afterHandle hooks (can modify response)
      response = await lifecycleHooks.executeAfterHooks(context, response) as T;

      return response;
    } catch (error) {
      // Execute error hooks
      await lifecycleHooks.executeErrorHooks(context, error as Error);

      // Re-throw the error
      throw error;
    }
  }

  /**
   * Verifies authentication and returns the GraphQL client.
   * Should be called at the start of each handler method.
   */
  protected verifyAuth(): LinearGraphQLClient {
    if (!this.auth.isAuthenticated() || !this.graphqlClient) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Not authenticated. Call linear_auth first.'
      );
    }

    if (this.auth.needsTokenRefresh()) {
      this.auth.refreshAPIKey();
    }

    return this.graphqlClient;
  }

  /**
   * Creates a successful response with the given text content.
   */
  protected createResponse(text: string): BaseToolResponse {
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  /**
   * Creates a JSON response with the given data.
   */
  protected createJsonResponse(data: unknown): BaseToolResponse {
    return this.createResponse(JSON.stringify(data, null, 2));
  }

  /**
   * Handles errors consistently across all handlers.
   */
  protected handleError(error: unknown, operation: string): never {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to ${operation}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  /**
   * Validates that required parameters are present.
   * @param params The parameters object to validate
   * @param required Array of required parameter names
   * @throws {McpError} If any required parameters are missing
   */
  protected validateRequiredParams<T>(
    params: T,
    required: Array<keyof T & string>
  ): void {
    const missing = required.filter(param => !params[param]);
    if (missing.length > 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Missing required parameters: ${missing.join(', ')}`
      );
    }
  }
}
