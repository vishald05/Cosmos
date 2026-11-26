let currentDays = 0;

export function readSimulationClock(): number {
  return currentDays;
}

export function writeSimulationClock(days: number): void {
  currentDays = days;
}
