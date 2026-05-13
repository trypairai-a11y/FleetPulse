/**
 * RED test — turns GREEN when Wave 1 locationService.ts module load
 * calls TaskManager.defineTask("darb-background-location", ...) exactly once.
 */

import * as TaskManager from "expo-task-manager";

const mockTaskManager = TaskManager as unknown as {
  defineTask: jest.Mock;
  __getDefinedTasks: () => Array<{ name: string }>;
  __resetTasks: () => void;
};

describe("locationService task registration", () => {
  beforeEach(() => {
    mockTaskManager.__resetTasks();
    jest.resetModules();
  });

  test("TaskManager.defineTask called at module load with name 'darb-background-location'", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("../src/services/locationService");

    const registered = mockTaskManager.__getDefinedTasks();
    const darbTask = registered.find((t) => t.name === "darb-background-location");
    expect(darbTask).toBeTruthy();
    expect(mockTaskManager.defineTask).toHaveBeenCalledWith(
      "darb-background-location",
      expect.any(Function),
    );
  });
});
