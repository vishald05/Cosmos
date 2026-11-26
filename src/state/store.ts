import { create } from "zustand";
import { INITIAL_DAYS } from "../science/simulation";
import type { BodyId, ScaleMode, ViewMode } from "../science/types";

interface CosmosState {
  daysSinceEpoch: number;
  playing: boolean;
  speed: number;
  selectedBody: BodyId | null;
  focusedBody: BodyId | null;
  scaleMode: ScaleMode;
  viewMode: ViewMode;
  setDays: (days: number) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  selectBody: (body: BodyId | null) => void;
  focusBody: (body: BodyId | null) => void;
  setScaleMode: (mode: ScaleMode) => void;
  setViewMode: (mode: ViewMode) => void;
  reset: () => void;
}

export const useCosmosStore = create<CosmosState>((set) => ({
  daysSinceEpoch: INITIAL_DAYS,
  playing: false,
  speed: 100,
  selectedBody: null,
  focusedBody: null,
  scaleMode: "cinematic",
  viewMode: "3d",
  setDays: (daysSinceEpoch) => set({ daysSinceEpoch }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  selectBody: (selectedBody) => set({ selectedBody }),
  focusBody: (focusedBody) => set({ focusedBody }),
  setScaleMode: (scaleMode) => set({ scaleMode, focusedBody: null }),
  setViewMode: (viewMode) => set({ viewMode }),
  reset: () => set({
    daysSinceEpoch: INITIAL_DAYS,
    playing: false,
    speed: 100,
    selectedBody: null,
    focusedBody: null,
  }),
}));
