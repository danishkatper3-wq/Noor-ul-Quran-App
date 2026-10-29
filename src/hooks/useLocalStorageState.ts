import { useState, useEffect, useCallback } from "react";

export function useLocalStorageState<T>(key: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // Ignore storage read errors in restricted browsing modes
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [key, state]);

  const updateState = useCallback((updater: T | ((prev: T) => T)) => {
    setState((prev) => (typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater));
  }, []);

  return [state, updateState];
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
