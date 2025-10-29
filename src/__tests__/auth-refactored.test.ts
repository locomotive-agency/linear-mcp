import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { LinearClient } from '@linear/sdk';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { LinearAuth } from '../auth/index';
import { APIKeyLinearAuth } from '../auth/api-key-auth';
import { OAuthLinearAuth } from '../auth/oauth-auth';
import { APIKeyConfig, OAuthConfig } from '../auth/types';

jest.mock('@linear/sdk');

describe('Auth Refactoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('APIKeyLinearAuth', () => {
    it('should initialize with valid API key', () => {
      const auth = new APIKeyLinearAuth();
      const config: APIKeyConfig = {
        type: 'api',
        apiKey: 'lin_api_test123'
      };

      auth.initialize(config);

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.needsTokenRefresh()).toBe(false);
    });

    it('should throw error for empty API key', () => {
      const auth = new APIKeyLinearAuth();
      const config: APIKeyConfig = {
        type: 'api',
        apiKey: ''
      };

      expect(() => auth.initialize(config)).toThrow(McpError);
      expect(() => auth.initialize(config)).toThrow('API key is required');
    });

    it('should throw error for OAuth config', () => {
      const auth = new APIKeyLinearAuth();
      const config: OAuthConfig = {
        type: 'oauth',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'http://localhost:3000/callback'
      };

      expect(() => auth.initialize(config as any)).toThrow(McpError);
      expect(() => auth.initialize(config as any)).toThrow('requires API key');
    });

    it('should return LinearClient after initialization', () => {
      const auth = new APIKeyLinearAuth();
      auth.initialize({
        type: 'api',
        apiKey: 'lin_api_test123'
      });

      const client = auth.getClient();
      expect(client).toBeInstanceOf(LinearClient);
    });

    it('should throw error when getting client before initialization', () => {
      const auth = new APIKeyLinearAuth();

      expect(() => auth.getClient()).toThrow(McpError);
      expect(() => auth.getClient()).toThrow('not initialized');
    });

    it('should never need token refresh', () => {
      const auth = new APIKeyLinearAuth();
      auth.initialize({
        type: 'api',
        apiKey: 'lin_api_test123'
      });

      expect(auth.needsTokenRefresh()).toBe(false);
    });
  });

  describe('OAuthLinearAuth', () => {
    it('should initialize with valid OAuth config', () => {
      const auth = new OAuthLinearAuth();
      const config: OAuthConfig = {
        type: 'oauth',
        clientId: 'client123',
        clientSecret: 'secret123',
        redirectUri: 'http://localhost:3000/callback'
      };

      auth.initialize(config);

      // Not authenticated yet (no token exchange)
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('should throw error for missing OAuth parameters', () => {
      const auth = new OAuthLinearAuth();

      expect(() =>
        auth.initialize({
          type: 'oauth',
          clientId: '',
          clientSecret: 'secret',
          redirectUri: 'uri'
        } as OAuthConfig)
      ).toThrow(McpError);
    });

    it('should throw error for API key config', () => {
      const auth = new OAuthLinearAuth();
      const config: APIKeyConfig = {
        type: 'api',
        apiKey: 'lin_api_test123'
      };

      expect(() => auth.initialize(config as any)).toThrow(McpError);
      expect(() => auth.initialize(config as any)).toThrow('requires OAuth');
    });

    it('should generate authorization URL', () => {
      const auth = new OAuthLinearAuth();
      auth.initialize({
        type: 'oauth',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:3000/callback'
      });

      const url = auth.getAuthorizationUrl();

      expect(url).toContain('https://linear.app/oauth/authorize');
      expect(url).toContain('client_id=test-client');
      expect(url).toContain('redirect_uri=http');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=read');
      expect(url).toContain('actor=application');
    });

    it('should throw error when getting auth URL before initialization', () => {
      const auth = new OAuthLinearAuth();

      expect(() => auth.getAuthorizationUrl()).toThrow(McpError);
      expect(() => auth.getAuthorizationUrl()).toThrow('not initialized');
    });

    it('should detect when token needs refresh', () => {
      const auth = new OAuthLinearAuth();
      auth.initialize({
        type: 'oauth',
        clientId: 'test',
        clientSecret: 'secret',
        redirectUri: 'uri'
      });

      // Set token that expires in 4 minutes (less than 5 minute buffer)
      auth.setTokenData({
        apiKey: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 4 * 60 * 1000
      });

      expect(auth.needsTokenRefresh()).toBe(true);
    });

    it('should not need refresh for fresh tokens', () => {
      const auth = new OAuthLinearAuth();
      auth.initialize({
        type: 'oauth',
        clientId: 'test',
        clientSecret: 'secret',
        redirectUri: 'uri'
      });

      // Set token that expires in 1 hour
      auth.setTokenData({
        apiKey: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 60 * 60 * 1000
      });

      expect(auth.needsTokenRefresh()).toBe(false);
    });
  });

  describe('LinearAuth (Factory/Adapter)', () => {
    it('should select APIKeyLinearAuth for API key config', () => {
      const auth = new LinearAuth();
      auth.initialize({
        type: 'api',
        apiKey: 'lin_api_test123'
      });

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.needsTokenRefresh()).toBe(false);
      expect(auth.getClient()).toBeInstanceOf(LinearClient);
    });

    it('should select OAuthLinearAuth for OAuth config', () => {
      const auth = new LinearAuth();
      auth.initialize({
        type: 'oauth',
        clientId: 'client',
        clientSecret: 'secret',
        redirectUri: 'uri'
      });

      // Not authenticated yet (no token exchange)
      expect(auth.isAuthenticated()).toBe(false);

      // OAuth methods available
      expect(typeof auth.getAuthorizationUrl).toBe('function');
      expect(typeof auth.handleCallback).toBe('function');
      expect(typeof auth.refreshAPIKey).toBe('function');
    });

    it('should throw error for OAuth methods with API key config', () => {
      const auth = new LinearAuth();
      auth.initialize({
        type: 'api',
        apiKey: 'lin_api_test123'
      });

      expect(() => auth.getAuthorizationUrl()).toThrow(McpError);
      expect(() => auth.getAuthorizationUrl()).toThrow('OAuth configuration required');
    });

    it('should delegate to API key implementation correctly', () => {
      const auth = new LinearAuth();
      const config: APIKeyConfig = {
        type: 'api',
        apiKey: 'lin_api_test123'
      };

      auth.initialize(config);

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.getClient()).toBeTruthy();
      expect(auth.needsTokenRefresh()).toBe(false);
    });

    it('should delegate to OAuth implementation correctly', () => {
      const auth = new LinearAuth();
      const config: OAuthConfig = {
        type: 'oauth',
        clientId: 'client',
        clientSecret: 'secret',
        redirectUri: 'http://localhost:3000'
      };

      auth.initialize(config);

      const url = auth.getAuthorizationUrl();
      expect(url).toContain('linear.app/oauth');
    });

    it('should maintain backward compatibility with old API', () => {
      // This test ensures the refactored code works exactly like the old code
      const auth = new LinearAuth();

      // Old API key initialization pattern
      auth.initialize({
        type: 'api',
        apiKey: 'lin_api_test'
      });

      // Old methods should still work
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.getClient()).toBeTruthy();
      expect(auth.needsTokenRefresh()).toBe(false);
    });
  });

  describe('Separation of Concerns', () => {
    it('should keep API key auth completely independent', () => {
      const apiAuth = new APIKeyLinearAuth();
      apiAuth.initialize({
        type: 'api',
        apiKey: 'test-key'
      });

      // API key auth should not have OAuth methods
      expect((apiAuth as any).getAuthorizationUrl).toBeUndefined();
      expect((apiAuth as any).handleCallback).toBeUndefined();
      expect((apiAuth as any).refreshAPIKey).toBeUndefined();
    });

    it('should keep OAuth auth independent', () => {
      const oauthAuth = new OAuthLinearAuth();
      oauthAuth.initialize({
        type: 'oauth',
        clientId: 'client',
        clientSecret: 'secret',
        redirectUri: 'uri'
      });

      // OAuth should have its specific methods
      expect(oauthAuth.getAuthorizationUrl).toBeDefined();
      expect(oauthAuth.handleCallback).toBeDefined();
      expect(oauthAuth.refreshAPIKey).toBeDefined();
    });

    it('should allow direct instantiation of specific implementations', () => {
      // Users can directly use specific implementations if they want
      const apiAuth = new APIKeyLinearAuth();
      const oauthAuth = new OAuthLinearAuth();

      expect(apiAuth).toBeInstanceOf(APIKeyLinearAuth);
      expect(oauthAuth).toBeInstanceOf(OAuthLinearAuth);
    });
  });
});
