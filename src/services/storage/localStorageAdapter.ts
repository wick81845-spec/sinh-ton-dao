import type { StorageAdapter } from './StorageAdapter'

export const localStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    const storedValue = window.localStorage.getItem(key)
    return storedValue === null ? null : (JSON.parse(storedValue) as T)
  },
  async set<T>(key: string, value: T): Promise<void> {
    window.localStorage.setItem(key, JSON.stringify(value))
  },
  async remove(key: string): Promise<void> {
    window.localStorage.removeItem(key)
  },
}
