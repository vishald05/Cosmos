export const AU_IN_KM = 149_597_870.7;
export const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12);
export const SECONDS_PER_DAY = 86_400;

export function auToKm(au: number): number {
  return au * AU_IN_KM;
}

export function kmToAu(km: number): number {
  return km / AU_IN_KM;
}

export function formatDistanceAu(au: number): string {
  if (au < 0.01) return `${Math.round(auToKm(au)).toLocaleString()} km`;
  return `${au.toLocaleString(undefined, { maximumFractionDigits: 3 })} AU`;
}

export function simulationDate(daysSinceEpoch: number): Date {
  return new Date(J2000_UNIX_MS + daysSinceEpoch * 86_400_000);
}
