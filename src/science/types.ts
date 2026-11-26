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

export type PlanetId = Exclude<BodyId, "sun">;
export type CelestialKind = "star" | "terrestrial" | "gas-giant" | "ice-giant";
export type RotationDirection = "prograde" | "retrograde";
export type SourceId = "nasa-factsheet" | "nasa-compare" | "nasa-sun" | "jpl-elements" | "naif-pck" | "jpl-horizons";

export interface OrbitalElementRates {
  semiMajorAxisAuPerCentury: number;
  eccentricityPerCentury: number;
  inclinationDegPerCentury: number;
  meanLongitudeDegPerCentury: number;
  longitudePerihelionDegPerCentury: number;
  longitudeAscendingNodeDegPerCentury: number;
}

export interface OrbitalElements {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  longitudeAscendingNodeDeg: number;
  argumentPerihelionDeg: number;
  meanAnomalyAtEpochDeg: number;
  meanMotionDegPerDay: number;
  ratesPerCentury: OrbitalElementRates;
}

export interface PhysicalProperties {
  meanRadiusKm: number;
  meanDiameterKm: number;
  massKg: number;
  meanDensityKgM3: number;
  referenceGravityMps2: number;
  escapeVelocityKms: number;
  meanTemperatureC: number | null;
  atmosphere: string;
}

export interface RotationModel {
  siderealPeriodHours: number;
  direction: RotationDirection;
  axialTiltDeg: number;
  primeMeridianAtEpochDeg: number;
  primeMeridianRateDegPerDay: number;
  poleRightAscensionDeg: number;
  poleRightAscensionRateDegPerCentury: number;
  poleDeclinationDeg: number;
  poleDeclinationRateDegPerCentury: number;
}

export interface CelestialBodyProfile<Id extends string = string> {
  id: Id;
  name: string;
  kind: CelestialKind;
  description: string;
  physical: PhysicalProperties;
  rotation: RotationModel;
  color: string;
  sourceIds: SourceId[];
  measurementNote: string;
}

export interface PlanetData extends CelestialBodyProfile<PlanetId> {
  kind: Exclude<CelestialKind, "star">;
  meanDistanceAu: number;
  orbitalPeriodDays: number;
  eccentricity: number;
  inclinationDeg: number;
  orbitalElements: OrbitalElements;
  visual: {
    baseColor: string;
    roughness: number;
    atmosphereColor?: string;
    ringColor?: string;
    ringInnerRadius?: number;
    ringOuterRadius?: number;
  };
}

export interface SunData extends CelestialBodyProfile<"sun"> {
  kind: "star";
  stellar: {
    luminosityW: number;
    effectiveTemperatureK: number;
  };
}

export type CelestialBody = SunData | PlanetData;

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
  /** Ecliptic J2000 coordinates: X/Y in the ecliptic plane, Z toward ecliptic north. */
  x: number;
  y: number;
  z: number;
}

export interface RotationOrientation {
  primeMeridianDeg: number;
  pole: Vector3Au;
  primeMeridianAxis: Vector3Au;
  equatorialAxis: Vector3Au;
}
