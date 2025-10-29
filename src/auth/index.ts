import { LinearClient } from '@linear/sdk';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ILinearAuth, IOAuthLinearAuth, AuthConfig, TokenData } from './types.js';
import { APIKeyLinearAuth } from './api-key-auth.js';
import { OAuthLinearAuth } from './oauth-auth.js';

/**
 * Factory/Adapter class that maintains backward compatibility with existing code.
 *
 * Automatically selects the appropriate authentication implementation based on
 * the provided configuration:
 * - APIKeyLinearAuth for API key authentication
 * - OAuthLinearAuth for OAuth flow
 *
 * This class delegates all operations to the selected implementation while
 * providing a unified interface.
 *
 * Usage (backward compatible):
 * ```typescript
 * const auth = new LinearAuth();
 * auth.initialize({ type: 'api', apiKey: '...' });
 * const client = auth.getClient();
 * ```
 *
 * Or with OAuth:
 * ```typescript
 * const auth = new LinearAuth();
 * auth.initialize({ type: 'oauth', clientId: '...', ...});
 * const url = auth.getAuthorizationUrl();
 * await auth.handleCallback(code);
 * const client = auth.getClient();
 * ```
 */
export class LinearAuth {
  private implementation?: ILinearAuth;
  private config?: AuthConfig;

  constructor() {}

  /**
   * Initialize authentication with the given configuration.
   * Automatically selects API Key or OAuth implementation.
   */
  public initialize(config: AuthConfig): void {
    this.config = config;

    if (config.type === 'api') {
      this.implementation = new APIKeyLinearAuth();
    } else {
      this.implementation = new OAuthLinearAuth();
    }

    this.implementation.initialize(config);
  }

  /**
   * Get the authenticated Linear client.
   * @throws McpError if not authenticated
   */
  public getClient(): LinearClient {
    if (!this.implementation) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Authentication not initialized. Call initialize() first.'
      );
    }
    return this.implementation.getClient();
  }

  /**
   * Check if currently authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.implementation && this.implementation.isAuthenticated();
  }

  /**
   * Check if token needs refresh (OAuth only)
   */
  public needsTokenRefresh(): boolean {
    if (!this.implementation) return false;
    return this.implementation.needsTokenRefresh();
  }

  /**
   * Get OAuth authorization URL (OAuth only).
   * @throws McpError if not using OAuth
   */
  public getAuthorizationUrl(): string {
    if (!this.config || this.config.type !== 'oauth') {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'OAuth configuration required for authorization URL'
      );
    }

    const oauthImpl = this.implementation as IOAuthLinearAuth;
    if (!oauthImpl.getAuthorizationUrl) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Current authentication method does not support OAuth'
      );
    }

    return oauthImpl.getAuthorizationUrl();
  }

  /**
   * Handle OAuth callback with authorization code (OAuth only).
   * @throws McpError if not using OAuth
   */
  public async handleCallback(code: string): Promise<void> {
    if (!this.config || this.config.type !== 'oauth') {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'OAuth configuration required for callback handling'
      );
    }

    const oauthImpl = this.implementation as IOAuthLinearAuth;
    if (!oauthImpl.handleCallback) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Current authentication method does not support OAuth'
      );
    }

    await oauthImpl.handleCallback(code);
  }

  /**
   * Refresh access token using refresh token (OAuth only).
   * @throws McpError if not using OAuth
   */
  public async refreshAPIKey(): Promise<void> {
    if (!this.config || this.config.type !== 'oauth') {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'OAuth configuration required for token refresh'
      );
    }

    const oauthImpl = this.implementation as IOAuthLinearAuth;
    if (!oauthImpl.refreshAPIKey) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Current authentication method does not support token refresh'
      );
    }

    await oauthImpl.refreshAPIKey();
  }

  /**
   * Set token data directly (for testing purposes, OAuth only)
   * @internal
   */
  public setTokenData(tokenData: TokenData): void {
    if (!this.config || this.config.type !== 'oauth') {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'setTokenData is only available for OAuth authentication'
      );
    }

    const oauthImpl = this.implementation as OAuthLinearAuth;
    if (oauthImpl.setTokenData) {
      oauthImpl.setTokenData(tokenData);
    }
  }
}

// Re-export types and implementations for direct use
export { ILinearAuth, IOAuthLinearAuth, AuthConfig, OAuthConfig, APIKeyConfig, TokenData } from './types.js';
export { APIKeyLinearAuth } from './api-key-auth.js';
export { OAuthLinearAuth } from './oauth-auth.js';
