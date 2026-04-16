export interface ScrollRestorationState {
  key: string;
  scrollTop: number;
}

const scrollState = new Map<string, number>();

export function saveScrollPosition(key: string, scrollTop: number) {
  scrollState.set(key, scrollTop);
}

export function readScrollPosition(key: string): number | null {
  const value = scrollState.get(key);
  return typeof value === "number" ? value : null;
}

export function consumeScrollPosition(key: string): number | null {
  const value = readScrollPosition(key);
  if (value !== null) {
    scrollState.delete(key);
  }
  return value;
}

export function clearScrollPosition(key: string) {
  scrollState.delete(key);
}

export function createScrollRestorationState(key: string, scrollTop: number): ScrollRestorationState {
  return { key, scrollTop };
}
