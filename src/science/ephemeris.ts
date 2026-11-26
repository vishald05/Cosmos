import { AU_IN_KM } from "./units";
import type { Vector3Au } from "./types";

export function positionErrorAu(predicted: Vector3Au, reference: Vector3Au): number {
  return Math.hypot(
    predicted.x - reference.x,
    predicted.y - reference.y,
    predicted.z - reference.z,
  );
}

export function positionErrorKm(predicted: Vector3Au, reference: Vector3Au): number {
  return positionErrorAu(predicted, reference) * AU_IN_KM;
}
