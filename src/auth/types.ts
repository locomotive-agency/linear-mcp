import { LinearClient } from '@linear/sdk';

/**
 * OAuth configuration for Linear authentication
 */
export interface OAuthConfig {
  type: 'oauth';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * API Key configuration for Linear authentication
 */
export interface APIKeyConfig {
  type: 'api';
  apiKey: string;
}

/**
 * Union type for all supported authentication configurations
 */
export type AuthConfig = OAuthConfig | APIKeyConfig;

/**
 * Token data structure for OAuth tokens
 */
export interface TokenData {
  apiKey: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Common interface for all Linear authentication implementations.
 * Provides a consistent API regardless of the authentication method used.
 */
export interface ILinearAuth {
  /**
   * Initialize the authentication with the given configuration.
   * For API Key: immediately creates LinearClient
   * For OAuth: stores config for later authorization flow
   */
  initialize(config: AuthConfig): void;

  /**
   * Get the authenticated Linear client.
   * @throws Error if not authenticated
   */
  getClient(): LinearClient;

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Check if token needs refresh (OAuth only, returns false for API Key)
   */
  needsTokenRefresh(): boolean;
}

/**
 * Extended interface for OAuth-specific operations
 */
export interface IOAuthLinearAuth extends ILinearAuth {
  /**
   * Get the OAuth authorization URL to redirect users to
   */
  getAuthorizationUrl(): string;

  /**
   * Handle the OAuth callback with authorization code
   */
  handleCallback(code: string): Promise<void>;

  /**
   * Refresh the access token using refresh token
   */
  refreshAPIKey(): Promise<void>;
}
