import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  LifecycleHookManager,
  ILifecycleHook,
  HookContext,
  loggingHook,
  metricsHook,
} from '../core/handlers/lifecycle-hooks';
import { BaseToolResponse } from '../core/interfaces/tool-handler.interface';

describe('LifecycleHookManager', () => {
  let hookManager: LifecycleHookManager;

  beforeEach(() => {
    hookManager = new LifecycleHookManager();
  });

  describe('Hook Registration', () => {
    it('should register a hook', () => {
      const testHook: ILifecycleHook = {
        name: 'test-hook',
        beforeHandle: async () => ({}),
      };

      hookManager.registerHook(testHook);

      const hooks = hookManager.getHooks();
      expect(hooks.length).toBe(1);
      expect(hooks[0].name).toBe('test-hook');
    });

    it('should sort hooks by priority (higher first)', () => {
      const hook1: ILifecycleHook = { name: 'low', priority: 10 };
      const hook2: ILifecycleHook = { name: 'high', priority: 100 };
      const hook3: ILifecycleHook = { name: 'medium', priority: 50 };

      hookManager.registerHook(hook1);
      hookManager.registerHook(hook2);
      hookManager.registerHook(hook3);

      const hooks = hookManager.getHooks();
      expect(hooks[0].name).toBe('high');
      expect(hooks[1].name).toBe('medium');
      expect(hooks[2].name).toBe('low');
    });

    it('should unregister a hook by name', () => {
      const hook: ILifecycleHook = { name: 'test' };
      hookManager.registerHook(hook);

      const removed = hookManager.unregisterHook('test');
      expect(removed).toBe(true);
      expect(hookManager.getHooks().length).toBe(0);
    });

    it('should return false when unregistering non-existent hook', () => {
      const removed = hookManager.unregisterHook('non-existent');
      expect(removed).toBe(false);
    });

    it('should clear all hooks', () => {
      hookManager.registerHook({ name: 'hook1' });
      hookManager.registerHook({ name: 'hook2' });

      hookManager.clearHooks();

      expect(hookManager.getHooks().length).toBe(0);
    });
  });

  describe('beforeHandle Hooks', () => {
    it('should execute all beforeHandle hooks', async () => {
      const executed: string[] = [];

      const hook1: ILifecycleHook = {
        name: 'hook1',
        beforeHandle: async () => {
          executed.push('hook1');
          return {};
        },
      };

      const hook2: ILifecycleHook = {
        name: 'hook2',
        beforeHandle: async () => {
          executed.push('hook2');
          return {};
        },
      };

      hookManager.registerHook(hook1);
      hookManager.registerHook(hook2);

      const context: HookContext = {
        toolName: 'test_tool',
        args: {},
        startTime: Date.now(),
      };

      await hookManager.executeBeforeHooks(context);

      expect(executed).toEqual(['hook1', 'hook2']);
    });

    it('should allow hook to short-circuit execution', async () => {
      const cachedResponse: BaseToolResponse = {
        content: [{ type: 'text', text: 'Cached response' }],
      };

      const cacheHook: ILifecycleHook = {
        name: 'cache',
        beforeHandle: async () => {
          return {
            shortCircuit: true,
            response: cachedResponse,
          };
        },
      };

      hookManager.registerHook(cacheHook);

      const context: HookContext = {
        toolName: 'test_tool',
        args: {},
        startTime: Date.now(),
      };

      const result = await hookManager.executeBeforeHooks(context);

      expect(result.shortCircuit).toBe(true);
      expect(result.response).toEqual(cachedResponse);
    });

    it('should allow hook to modify context', async () => {
      const modifyHook: ILifecycleHook = {
        name: 'modifier',
        beforeHandle: async (context) => {
          return {
            context: {
              ...context,
              metadata: { modified: true },
            },
          };
        },
      };

      hookManager.registerHook(modifyHook);

      const context: HookContext = {
        toolName: 'test_tool',
        args: {},
        startTime: Date.now(),
      };

      const result = await hookManager.executeBeforeHooks(context);

      expect(result.context?.metadata).toEqual({ modified: true });
    });
  });

  describe('afterHandle Hooks', () => {
    it('should execute all afterHandle hooks', async () => {
      const executed: string[] = [];

      const hook1: ILifecycleHook = {
        name: 'hook1',
        afterHandle: async (ctx, response) => {
          executed.push('hook1');
          return response;
        },
      };

      const hook2: ILifecycleHook = {
        name: 'hook2',
        afterHandle: async (ctx, response) => {
          executed.push('hook2');
          return response;
        },
      };

      hookManager.registerHook(hook1);
      hookManager.registerHook(hook2);

      const context: HookContext = {
        toolName: 'test_tool',
        args: {},
        startTime: Date.now(),
      };

      const response: BaseToolResponse = {
        content: [{ type: 'text', text: 'Original response' }],
      };

      await hookManager.executeAfterHooks(context, response);

      expect(executed).toEqual(['hook1', 'hook2']);
    });

    it('should allow hooks to modify response', async () => {
      const enrichHook: ILifecycleHook = {
        name: 'enricher',
        afterHandle: async (ctx, response) => {
          return {
            content: [
              ...response.content,
              { type: 'text', text: '\nEnriched by hook' },
            ],
          };
        },
      };

      hookManager.registerHook(enrichHook);

      const context: HookContext = {
        toolName: 'test_tool',
        args: {},
        startTime: Date.now(),
      };

      const response: BaseToolResponse = {
        content: [{ type: 'text', text: 'Original' }],
      };

      const result = await hookManager.executeAfterHooks(context, response);

      expect(result.content.length).toBe(2);
      expect(result.content[1]).toEqual({ type: 'text', text: '\nEnriched by hook' });
    });
  });

  describe('onError Hooks', () => {
    it('should execute all error hooks', async () => {
      const executed: string[] = [];

      const hook1: ILifecycleHook = {
        name: 'hook1',
        onError: async () => {
          executed.push('hook1');
        },
      };

      const hook2: ILifecycleHook = {
        name: 'hook2',
        onError: async () => {
          executed.push('hook2');
        },
      };

      hookManager.registerHook(hook1);
      hookManager.registerHook(hook2);

      const context: HookContext = {
        toolName: 'test_tool',
        args: {},
        startTime: Date.now(),
      };

      await hookManager.executeErrorHooks(context, new Error('Test error'));

      expect(executed).toEqual(['hook1', 'hook2']);
    });

    it('should not crash if error hook throws', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const badHook: ILifecycleHook = {
        name: 'bad-hook',
        onError: async () => {
          throw new Error('Hook failed');
        },
      };

      hookManager.registerHook(badHook);

      const context: HookContext = {
        toolName: 'test_tool',
        args: {},
        startTime: Date.now(),
      };

      // Should not throw
      await hookManager.executeErrorHooks(context, new Error('Original error'));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[LifecycleHook]'),
        expect.anything()
      );

      errorSpy.mockRestore();
    });
  });

  describe('Built-in Hooks', () => {
    describe('loggingHook', () => {
      it('should log before, after, and on error', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const context: HookContext = {
          toolName: 'test_operation',
          args: { foo: 'bar' },
          startTime: Date.now(),
        };

        // beforeHandle
        await loggingHook.beforeHandle!(context);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Handler] test_operation started')
        );

        // afterHandle
        const response: BaseToolResponse = {
          content: [{ type: 'text', text: 'Success' }],
        };
        await loggingHook.afterHandle!(context, response);
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Handler] test_operation completed')
        );

        // onError
        await loggingHook.onError!(context, new Error('Test error'));
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('[Handler] test_operation failed'),
          expect.anything()
        );

        logSpy.mockRestore();
        errorSpy.mockRestore();
      });
    });

    describe('metricsHook', () => {
      it('should log metrics on success', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const context: HookContext = {
          toolName: 'test_operation',
          args: {},
          startTime: Date.now() - 100, // 100ms ago
        };

        const response: BaseToolResponse = {
          content: [{ type: 'text', text: 'Success' }],
        };

        await metricsHook.afterHandle!(context, response);

        expect(logSpy).toHaveBeenCalledWith(
          '[Metrics]',
          expect.stringContaining('"tool":"test_operation"')
        );
        expect(logSpy).toHaveBeenCalledWith(
          '[Metrics]',
          expect.stringContaining('"success":true')
        );

        logSpy.mockRestore();
      });

      it('should log metrics on error', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const context: HookContext = {
          toolName: 'test_operation',
          args: {},
          startTime: Date.now() - 50,
        };

        await metricsHook.onError!(context, new Error('Operation failed'));

        expect(logSpy).toHaveBeenCalledWith(
          '[Metrics]',
          expect.stringContaining('"success":false')
        );
        expect(logSpy).toHaveBeenCalledWith(
          '[Metrics]',
          expect.stringContaining('"error":"Operation failed"')
        );

        logSpy.mockRestore();
      });
    });
  });

  describe('Hook Execution Order', () => {
    it('should execute hooks in priority order', async () => {
      const executionOrder: number[] = [];

      const hooks: ILifecycleHook[] = [
        {
          name: 'low',
          priority: 10,
          beforeHandle: async () => {
            executionOrder.push(10);
            return {};
          },
        },
        {
          name: 'high',
          priority: 100,
          beforeHandle: async () => {
            executionOrder.push(100);
            return {};
          },
        },
        {
          name: 'medium',
          priority: 50,
          beforeHandle: async () => {
            executionOrder.push(50);
            return {};
          },
        },
      ];

      hooks.forEach(hook => hookManager.registerHook(hook));

      const context: HookContext = {
        toolName: 'test',
        args: {},
        startTime: Date.now(),
      };

      await hookManager.executeBeforeHooks(context);

      // Should execute in order: 100, 50, 10 (highest priority first)
      expect(executionOrder).toEqual([100, 50, 10]);
    });
  });
});
