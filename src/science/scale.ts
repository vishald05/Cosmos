import type { DisplayScaleSettings, ScaleMode, Vector3Au } from "./types";

export const BODY_RENDER_RADIUS: Record<string, number> = {
  sun: 1.7, mercury: 0.11, venus: 0.17, earth: 0.18, mars: 0.13,
  jupiter: 0.65, saturn: 0.55, uranus: 0.34, neptune: 0.33,
};

export function displayDistance(distanceAu: number, mode: ScaleMode): number {
  if (distanceAu === 0) return 0;
  return mode === "cinematic"
    ? 1.9 + Math.log1p(distanceAu) * 5.8
    : distanceAu * 1.12;
}

export function displayPosition(position: Vector3Au, mode: ScaleMode): Vector3Au {
  const radius = Math.hypot(position.x, position.y, position.z);
  if (radius === 0) return { ...position };
  const transformedRadius = displaySettings(mode).distance(radius);
  const factor = transformedRadius / radius;
  return { x: position.x * factor, y: position.y * factor, z: position.z * factor };
}

export function displaySettings(mode: ScaleMode): DisplayScaleSettings {
  return {
    mode,
    distance: (distanceAu) => displayDistance(distanceAu, mode),
  };
}
