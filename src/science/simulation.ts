import { J2000_TDB_UTC_UNIX_MS, SECONDS_PER_DAY } from "./units";

export const INITIAL_DAYS = 0;
export const MAX_FRAME_DELTA_SECONDS = 0.1;
export const SPEED_PRESETS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000] as const;

export function advanceSimulationDays(
  daysSinceEpoch: number,
  elapsedSeconds: number,
  speed: number,
  playing: boolean,
): number {
  if (!playing) return daysSinceEpoch;
  const clampedSeconds = Math.min(Math.max(elapsedSeconds, 0), MAX_FRAME_DELTA_SECONDS);
  return daysSinceEpoch + (clampedSeconds * speed) / SECONDS_PER_DAY;
}

export function dateFromSimulationDays(daysSinceEpoch: number): Date {
  return new Date(J2000_TDB_UTC_UNIX_MS + daysSinceEpoch * 86_400_000);
}
