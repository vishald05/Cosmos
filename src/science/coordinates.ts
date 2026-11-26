import type { Vector3Au } from "./types";

export function eclipticToScene(position: Vector3Au): Vector3Au {
  return { x: position.x, y: position.z, z: -position.y };
}

export function eclipticToMap(position: Vector3Au): { x: number; y: number } {
  return { x: position.x, y: position.y };
}

export function dot(a: Vector3Au, b: Vector3Au): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function normalize(vector: Vector3Au): Vector3Au {
  const magnitude = Math.hypot(vector.x, vector.y, vector.z);
  if (magnitude === 0) throw new RangeError("Cannot normalize a zero-length vector.");
  return { x: vector.x / magnitude, y: vector.y / magnitude, z: vector.z / magnitude };
}
