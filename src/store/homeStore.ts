import { useSyncExternalStore } from "react";

export type SortType = 'default' | 'name' | 'latency';

interface HomeState {
  isRunning: boolean;
  latencies: Record<string, number>;
  sortType: SortType;
}

let state: HomeState = {
  isRunning: false,
  latencies: {},
  sortType: 'default',
};

const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export const homeStore = {
  subscribe(callback: () => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  getSnapshot() {
    return state;
  },

  setIsRunning(isRunning: boolean) {
    if (state.isRunning === isRunning) return;
    state = { ...state, isRunning };
    emitChange();
  },

  setLatencies(latencies: Record<string, number>) {
    state = { ...state, latencies };
    emitChange();
  },

  // ✅ 新增：只更新单个节点的延迟 (性能更好，且支持实时刷新)
  updateLatency(id: string, latency: number) {
    state = {
      ...state,
      latencies: {
        ...state.latencies,
        [id]: latency
      }
    };
    emitChange();
  },

  setSortType(sortType: SortType) {
    if (state.sortType === sortType) return;
    state = { ...state, sortType };
    emitChange();
  },

  reset() {
    state = { isRunning: false, latencies: {}, sortType: 'default' };
    emitChange();
  }
};

export const useHomeStore = () => {
  return useSyncExternalStore(homeStore.subscribe, homeStore.getSnapshot);
};