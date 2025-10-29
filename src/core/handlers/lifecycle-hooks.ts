/**
 * Handler lifecycle hooks system
 *
 * Enables cross-cutting concerns (logging, metrics, caching, tracing) to be added
 * to handlers without modifying handler code.
 *
 * Lifecycle:
 * 1. beforeHandle(request) - Before operation execution
 * 2. execute() - Actual handler operation
 * 3. afterHandle(response) - After successful execution
 * 4. onError(error) - On operation failure
 */

import { BaseToolResponse } from '../interfaces/tool-handler.interface.js';

/**
 * Context passed to lifecycle hooks
 */
export interface HookContext {
  /** Tool/operation name */
  toolName: string;
  /** Request arguments */
  args: any;
  /** Start timestamp */
  startTime: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result from beforeHandle hook
 */
export interface BeforeHandleResult {
  /** If true, skip execution and return cached/pre-computed response */
  shortCircuit?: boolean;
  /** Response to return if short-circuited */
  response?: BaseToolResponse;
  /** Updated context to pass to execution */
  context?: HookContext;
}

/**
 * Lifecycle hook interface
 */
export interface ILifecycleHook {
  /** Hook name for identification */
  name: string;

  /** Priority (higher = earlier execution, default: 50) */
  priority?: number;

  /**
   * Called before handler execution
   * Can short-circuit execution by returning { shortCircuit: true, response }
   */
  beforeHandle?(context: HookContext): Promise<BeforeHandleResult> | BeforeHandleResult;

  /**
   * Called after successful handler execution
   * Can modify response before returning
   */
  afterHandle?(context: HookContext, response: BaseToolResponse): Promise<BaseToolResponse> | BaseToolResponse;

  /**
   * Called when handler throws an error
   * Can transform errors or perform cleanup
   */
  onError?(context: HookContext, error: Error): Promise<void> | void;
}

/**
 * Manager for lifecycle hooks
 */
export class LifecycleHookManager {
  private hooks: ILifecycleHook[] = [];

  /**
   * Register a lifecycle hook
   */
  registerHook(hook: ILifecycleHook): void {
    // Set default priority
    if (hook.priority === undefined) {
      hook.priority = 50;
    }

    this.hooks.push(hook);

    // Sort by priority (higher priority = earlier execution)
    this.hooks.sort((a, b) => (b.priority || 50) - (a.priority || 50));
  }

  /**
   * Unregister a hook by name
   */
  unregisterHook(name: string): boolean {
    const initialLength = this.hooks.length;
    this.hooks = this.hooks.filter(hook => hook.name !== name);
    return this.hooks.length < initialLength;
  }

  /**
   * Get all registered hooks
   */
  getHooks(): ILifecycleHook[] {
    return [...this.hooks];
  }

  /**
   * Clear all hooks
   */
  clearHooks(): void {
    this.hooks = [];
  }

  /**
   * Execute beforeHandle hooks
   * Returns short-circuit result if any hook requests it
   */
  async executeBeforeHooks(context: HookContext): Promise<BeforeHandleResult> {
    for (const hook of this.hooks) {
      if (hook.beforeHandle) {
        const result = await hook.beforeHandle(context);

        // If hook requests short-circuit, stop and return
        if (result.shortCircuit && result.response) {
          return result;
        }

        // Update context if hook modified it
        if (result.context) {
          context = result.context;
        }
      }
    }

    return { context };
  }

  /**
   * Execute afterHandle hooks
   * Allows hooks to modify response
   */
  async executeAfterHooks(context: HookContext, response: BaseToolResponse): Promise<BaseToolResponse> {
    let modifiedResponse = response;

    for (const hook of this.hooks) {
      if (hook.afterHandle) {
        modifiedResponse = await hook.afterHandle(context, modifiedResponse);
      }
    }

    return modifiedResponse;
  }

  /**
   * Execute onError hooks
   */
  async executeErrorHooks(context: HookContext, error: Error): Promise<void> {
    for (const hook of this.hooks) {
      if (hook.onError) {
        try {
          await hook.onError(context, error);
        } catch (hookError) {
          // Don't let hook errors crash the system
          console.error(`[LifecycleHook] Error in ${hook.name}.onError:`, hookError);
        }
      }
    }
  }
}

/**
 * Singleton hook manager instance
 */
export const lifecycleHooks = new LifecycleHookManager();

/**
 * Example hooks
 */

/**
 * Logging hook - logs all handler operations
 */
export const loggingHook: ILifecycleHook = {
  name: 'logging',
  priority: 100, // High priority - log first

  beforeHandle(context) {
    console.log(`[Handler] ${context.toolName} started`);
    return {};
  },

  afterHandle(context, response) {
    const duration = Date.now() - context.startTime;
    console.log(`[Handler] ${context.toolName} completed in ${duration}ms`);
    return response;
  },

  onError(context, error) {
    const duration = Date.now() - context.startTime;
    console.error(`[Handler] ${context.toolName} failed after ${duration}ms:`, error.message);
  },
};

/**
 * Metrics hook - tracks operation metrics
 */
export const metricsHook: ILifecycleHook = {
  name: 'metrics',
  priority: 90,

  async afterHandle(context, response) {
    const duration = Date.now() - context.startTime;

    // In a real implementation, this would send to a metrics service
    // For now, just log structured metrics
    const metrics = {
      tool: context.toolName,
      duration_ms: duration,
      success: true,
      timestamp: new Date().toISOString(),
    };

    console.log('[Metrics]', JSON.stringify(metrics));

    return response;
  },

  async onError(context, error) {
    const duration = Date.now() - context.startTime;

    const metrics = {
      tool: context.toolName,
      duration_ms: duration,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };

    console.log('[Metrics]', JSON.stringify(metrics));
  },
};
