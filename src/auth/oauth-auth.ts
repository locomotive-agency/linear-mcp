import { LinearClient } from '@linear/sdk';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { IOAuthLinearAuth, OAuthConfig, AuthConfig, TokenData } from './types.js';

/**
 * OAuth authentication implementation for Linear.
 *
 * This handles the full OAuth 2.0 authorization code flow including:
 * - Authorization URL generation
 * - Token exchange from authorization code
 * - Token refresh using refresh tokens
 * - Token expiration tracking
 *
 * Features:
 * - Full OAuth 2.0 support
 * - Automatic token refresh capability
 * - Secure token management
 * - Actor authorization support
 *
 * Usage:
 * ```typescript
 * const auth = new OAuthLinearAuth();
 * auth.initialize({
 *   type: 'oauth',
 *   clientId: '...',
 *   clientSecret: '...',
 *   redirectUri: 'http://localhost:3000/callback'
 * });
 *
 * // Redirect user to:
 * const authUrl = auth.getAuthorizationUrl();
 *
 * // After callback:
 * await auth.handleCallback(code);
 * const client = auth.getClient();
 * ```
 */
export class OAuthLinearAuth implements IOAuthLinearAuth {
  private static readonly OAUTH_AUTH_URL = 'https://linear.app/oauth';
  private static readonly OAUTH_TOKEN_URL = 'https://api.linear.app';
  private static readonly TOKEN_REFRESH_BUFFER_MS = 300000; // 5 minutes

  private config?: OAuthConfig;
  private tokenData?: TokenData;
  private linearClient?: LinearClient;

  /**
   * Initialize with OAuth configuration.
   * Stores config for use in authorization flow.
   */
  public initialize(config: AuthConfig): void {
    if (config.type !== 'oauth') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'OAuthLinearAuth requires OAuth configuration'
      );
    }

    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'OAuth requires clientId, clientSecret, and redirectUri'
      );
    }

    this.config = config;
  }

  /**
   * Generate OAuth authorization URL with proper scope and parameters.
   * User should be redirected to this URL to grant permissions.
   */
  public getAuthorizationUrl(): string {
    if (!this.config) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'OAuth not initialized. Call initialize() first.'
      );
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'read,write,issues:create,offline_access',
      actor: 'application', // Enable OAuth Actor Authorization
      state: this.generateState(),
      access_type: 'offline',
    });

    return `${OAuthLinearAuth.OAUTH_AUTH_URL}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token and refresh token.
   * Creates LinearClient upon successful token exchange.
   */
  public async handleCallback(code: string): Promise<void> {
    if (!this.config) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'OAuth not initialized. Call initialize() first.'
      );
    }

    if (!code || code.trim() === '') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Authorization code is required'
      );
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code,
        access_type: 'offline'
      });

      const response = await fetch(`${OAuthLinearAuth.OAUTH_TOKEN_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Token request failed: ${response.statusText}. Response: ${errorText}`
        );
      }

      const data = await response.json();
      this.tokenData = {
        apiKey: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      this.linearClient = new LinearClient({
        apiKey: this.tokenData.apiKey,
      });
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `OAuth token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Refresh the access token using the refresh token.
   * Updates LinearClient with new token.
   */
  public async refreshAPIKey(): Promise<void> {
    if (!this.config || !this.tokenData?.refreshToken) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Cannot refresh token: OAuth not initialized or no refresh token available'
      );
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.tokenData.refreshToken
      });

      const response = await fetch(`${OAuthLinearAuth.OAUTH_TOKEN_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Token refresh failed: ${response.statusText}. Response: ${errorText}`
        );
      }

      const data = await response.json();
      this.tokenData = {
        apiKey: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      this.linearClient = new LinearClient({
        apiKey: this.tokenData.apiKey,
      });
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the authenticated Linear client.
   * @throws McpError if not authenticated (no token)
   */
  public getClient(): LinearClient {
    if (!this.linearClient) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'OAuth not authenticated. Complete authorization flow first.'
      );
    }
    return this.linearClient;
  }

  /**
   * Check if OAuth flow is complete and token is available
   */
  public isAuthenticated(): boolean {
    return !!this.linearClient && !!this.tokenData;
  }

  /**
   * Check if token needs refresh (within 5 minutes of expiry)
   */
  public needsTokenRefresh(): boolean {
    if (!this.tokenData) return false;
    return Date.now() >= this.tokenData.expiresAt - OAuthLinearAuth.TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Set token data directly (for testing purposes)
   * @internal
   */
  public setTokenData(tokenData: TokenData): void {
    this.tokenData = tokenData;
    this.linearClient = new LinearClient({
      apiKey: tokenData.apiKey,
    });
  }

  /**
   * Generate random state parameter for OAuth security
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
