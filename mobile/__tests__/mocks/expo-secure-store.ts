/**
 * expo-secure-store mock — in-memory map keyed by string.
 */

const store = new Map<string, string>();

export const getItemAsync = jest.fn(async (key: string) => store.get(key) ?? null);
export const setItemAsync = jest.fn(async (key: string, value: string) => {
  store.set(key, value);
});
export const deleteItemAsync = jest.fn(async (key: string) => {
  store.delete(key);
});

export function __resetStore(): void {
  store.clear();
}

export function __seedStore(entries: Record<string, string>): void {
  for (const [k, v] of Object.entries(entries)) store.set(k, v);
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  __resetStore,
  __seedStore,
};
