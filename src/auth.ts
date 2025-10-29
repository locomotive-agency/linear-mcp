/**
 * DEPRECATED: This file is kept for backward compatibility.
 * Use `./auth/index.js` instead.
 *
 * The auth module has been refactored into:
 * - ./auth/types.ts - Type definitions
 * - ./auth/api-key-auth.ts - API Key authentication
 * - ./auth/oauth-auth.ts - OAuth authentication
 * - ./auth/index.ts - Factory/adapter for unified API
 */

// Re-export everything from the new auth module
export {
  LinearAuth,
  ILinearAuth,
  IOAuthLinearAuth,
  AuthConfig,
  OAuthConfig,
  APIKeyConfig,
  TokenData,
  APIKeyLinearAuth,
  OAuthLinearAuth
} from './auth/index.js';
