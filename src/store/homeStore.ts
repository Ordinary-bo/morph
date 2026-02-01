import { useSyncExternalStore } from "react";

export type SortType = "default" | "name" | "latency";

interface HomeState {
  isRunning: boolean;
  latencies: Record<string, number>;
  sortType: SortType;
  connectedNodeId: string | null;
  selectedNodeId: string | null;
  mode: string;
}

let state: HomeState = {
  isRunning: false,
  latencies: {},
  sortType: "default",
  connectedNodeId: null,
  selectedNodeId: null,
  mode: "Rule",
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

  updateLatency(id: string, latency: number) {
    state = {
      ...state,
      latencies: {
        ...state.latencies,
        [id]: latency,
      },
    };
    emitChange();
  },

  setSortType(sortType: SortType) {
    if (state.sortType === sortType) return;
    state = { ...state, sortType };
    emitChange();
  },

  setConnectedNodeId(id: string | null) {
    if (state.connectedNodeId === id) return;
    state = { ...state, connectedNodeId: id, isRunning: id !== null };
    emitChange();
  },

  setSelectedNodeId(id: string | null) {
    if (state.selectedNodeId === id) return;
    state = { ...state, selectedNodeId: id };
    emitChange();
  },

  setMode(mode: string) {
    if (state.mode === mode) return;
    state = { ...state, mode };
    emitChange();
  },
  reset() {
    state = {
      isRunning: false,
      latencies: {},
      sortType: "default",
      connectedNodeId: null,
      selectedNodeId: null,
      mode: "Rule",
    };
    emitChange();
  },
};

export const useHomeStore = () => {
  return useSyncExternalStore(homeStore.subscribe, homeStore.getSnapshot);
};
