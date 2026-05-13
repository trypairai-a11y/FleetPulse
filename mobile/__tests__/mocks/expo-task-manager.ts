/**
 * expo-task-manager mock. Captures defineTask calls so tests can assert
 * registration name + executor signature.
 *
 * Module state survives `jest.resetModules()` by anchoring BOTH the registry array
 * AND the jest.fn() spies themselves to Symbols on globalThis. Without this, a test
 * that does `jest.resetModules()` + re-`require()` the service under test loads a
 * fresh `expo-task-manager` mock module with fresh jest.fn() spies. The test's
 * pre-resetModules `mockTaskManager.defineTask` reference still points to the OLD
 * spy, but the production code now calls the NEW spy, and call-count assertions on
 * the OLD spy fail with "Number of calls: 0".
 *
 * The Symbol-on-global trick is the conventional jest workaround for module-level
 * mutable state that must survive module-cache invalidation.
 */

type TaskExecutor = (body: { data: any; error: any }) => void | Promise<void>;
type DefinedTask = { name: string; executor: TaskExecutor };

const REGISTRY_KEY = Symbol.for("@darb/test-mock/expo-task-manager/definedTasks");
const DEFINE_KEY = Symbol.for("@darb/test-mock/expo-task-manager/defineTask");
const ISREG_KEY = Symbol.for("@darb/test-mock/expo-task-manager/isTaskRegisteredAsync");
const UNREG_KEY = Symbol.for("@darb/test-mock/expo-task-manager/unregisterTaskAsync");
const UNREGALL_KEY = Symbol.for("@darb/test-mock/expo-task-manager/unregisterAllTasksAsync");

const g = globalThis as any;
if (!g[REGISTRY_KEY]) g[REGISTRY_KEY] = [] as DefinedTask[];
const definedTasks: DefinedTask[] = g[REGISTRY_KEY];

if (!g[DEFINE_KEY]) {
  g[DEFINE_KEY] = jest.fn((name: string, executor: TaskExecutor) => {
    definedTasks.push({ name, executor });
  });
}
if (!g[ISREG_KEY]) {
  g[ISREG_KEY] = jest.fn(async (name: string) =>
    definedTasks.some((t) => t.name === name),
  );
}
if (!g[UNREG_KEY]) g[UNREG_KEY] = jest.fn(async (_name: string) => {});
if (!g[UNREGALL_KEY]) g[UNREGALL_KEY] = jest.fn(async () => {});

export const defineTask: jest.Mock = g[DEFINE_KEY];
export const isTaskRegisteredAsync: jest.Mock = g[ISREG_KEY];
export const unregisterTaskAsync: jest.Mock = g[UNREG_KEY];
export const unregisterAllTasksAsync: jest.Mock = g[UNREGALL_KEY];

export function __getDefinedTasks(): DefinedTask[] {
  return definedTasks.slice();
}

export function __resetTasks(): void {
  definedTasks.length = 0;
}

export default {
  defineTask,
  isTaskRegisteredAsync,
  unregisterTaskAsync,
  unregisterAllTasksAsync,
  __getDefinedTasks,
  __resetTasks,
};
