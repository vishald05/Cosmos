export type BodyId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export interface OrbitalElements {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  longitudeAscendingNodeDeg: number;
  argumentPerihelionDeg: number;
  meanAnomalyAtEpochDeg: number;
  meanMotionDegPerDay: number;
}

export interface PlanetData {
  id: Exclude<BodyId, "sun">;
  name: string;
  description: string;
  meanDiameterKm: number;
  meanDistanceAu: number;
  orbitalPeriodDays: number;
  rotationPeriodHours: number;
  eccentricity: number;
  inclinationDeg: number;
  orbitalElements: OrbitalElements;
  color: string;
  visual: {
    baseColor: string;
    roughness: number;
    atmosphereColor?: string;
    ringColor?: string;
    ringInnerRadius?: number;
    ringOuterRadius?: number;
  };
}

export interface CelestialBody {
  id: BodyId;
  name: string;
  meanDiameterKm: number;
  description: string;
  color: string;
}

export type ScaleMode = "cinematic" | "distance";
export type ViewMode = "3d" | "map";

export interface SimulationSettings {
  speed: number;
  playing: boolean;
}

export interface SimulationState extends SimulationSettings {
  daysSinceEpoch: number;
}

export interface DisplayScaleSettings {
  mode: ScaleMode;
  distance: (distanceAu: number) => number;
}

export interface Vector3Au {
  x: number;
  y: number;
  z: number;
}
