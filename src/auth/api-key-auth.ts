import { LinearClient } from '@linear/sdk';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ILinearAuth, APIKeyConfig, AuthConfig } from './types.js';

/**
 * API Key authentication implementation for Linear.
 *
 * This is a stateless, simple authentication method that uses
 * a personal access token from Linear. No OAuth flow required.
 *
 * Features:
 * - Immediate authentication (no callback flow)
 * - No token expiration
 * - No token refresh needed
 * - Simple configuration
 *
 * Usage:
 * ```typescript
 * const auth = new APIKeyLinearAuth();
 * auth.initialize({ type: 'api', apiKey: 'lin_api_...' });
 * const client = auth.getClient();
 * ```
 */
export class APIKeyLinearAuth implements ILinearAuth {
  private linearClient?: LinearClient;
  private apiKey?: string;

  /**
   * Initialize with API key configuration.
   * Creates LinearClient immediately since no OAuth flow is needed.
   */
  public initialize(config: AuthConfig): void {
    if (config.type !== 'api') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'APIKeyLinearAuth requires API key configuration'
      );
    }

    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'API key is required and cannot be empty'
      );
    }

    this.apiKey = config.apiKey;
    this.linearClient = new LinearClient({
      apiKey: this.apiKey,
    });
  }

  /**
   * Get the authenticated Linear client.
   * @throws McpError if not initialized
   */
  public getClient(): LinearClient {
    if (!this.linearClient) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'API Key authentication not initialized. Call initialize() first.'
      );
    }
    return this.linearClient;
  }

  /**
   * Check if authenticated (i.e., if client is initialized)
   */
  public isAuthenticated(): boolean {
    return !!this.linearClient && !!this.apiKey;
  }

  /**
   * API keys don't expire, so always returns false
   */
  public needsTokenRefresh(): boolean {
    return false;
  }
}
