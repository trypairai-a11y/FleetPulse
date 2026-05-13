/**
 * expo-task-manager mock. Captures defineTask calls so tests can assert
 * registration name + executor signature.
 */

type TaskExecutor = (body: { data: any; error: any }) => void | Promise<void>;
type DefinedTask = { name: string; executor: TaskExecutor };

const definedTasks: DefinedTask[] = [];

export const defineTask = jest.fn((name: string, executor: TaskExecutor) => {
  definedTasks.push({ name, executor });
});

export const isTaskRegisteredAsync = jest.fn(async (name: string) => {
  return definedTasks.some((t) => t.name === name);
});

export const unregisterTaskAsync = jest.fn(async (_name: string) => {});
export const unregisterAllTasksAsync = jest.fn(async () => {});

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
