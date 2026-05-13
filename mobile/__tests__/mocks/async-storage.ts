/**
 * AsyncStorage mock — used by the existing (Wave-0-time) locationService.ts.
 * Wave 1 replaces AsyncStorage with the SQLite outbox; this mock keeps the
 * legacy module load path working until the rewrite lands.
 */

const store = new Map<string, string>();

const AsyncStorage = {
  getItem: jest.fn(async (key: string) => store.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    store.delete(key);
  }),
  clear: jest.fn(async () => {
    store.clear();
  }),
  getAllKeys: jest.fn(async () => Array.from(store.keys())),
  multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, store.get(k) ?? null])),
  multiSet: jest.fn(async (kvs: [string, string][]) => {
    for (const [k, v] of kvs) store.set(k, v);
  }),
};

export default AsyncStorage;
