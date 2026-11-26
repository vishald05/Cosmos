import { describe, expect, it } from "vitest";
import { DATA_SOURCES } from "./sources";
import { HORIZONS_EPOCHS } from "./ephemeris.fixtures";
import { PLANETS, SUN, DAYS_PER_JULIAN_CENTURY } from "./planets";
import { eclipticToMap, eclipticToScene, dot, normalize } from "./coordinates";
import { positionErrorKm } from "./ephemeris";
import { elementsAt, orbitalNormal, orbitalPosition, orbitalRadiusAu, solveKepler, trueAnomaly } from "./orbit";
import { axialTiltFromPole, rotationAtTime, rotationDirectionMatchesRate, rotationPeriodDays } from "./rotation";
import { displayDistance, displayPosition } from "./scale";
import { advanceSimulationDays, INITIAL_DAYS, MAX_FRAME_DELTA_SECONDS, SPEED_PRESETS } from "./simulation";
import { auToKm, kmToAu } from "./units";

describe("unit conversions", () => {
  it("converts AU and kilometres reversibly", () => {
    expect(auToKm(1)).toBeCloseTo(149_597_870.7, 5);
    expect(kmToAu(auToKm(1.7))).toBeCloseTo(1.7, 12);
  });
});

describe("planetary data", () => {
  it("defines the Sun and all eight planets with valid physical and orbital data", () => {
    expect(SUN.physical.meanDiameterKm).toBeGreaterThan(1_000_000);
    expect(PLANETS).toHaveLength(8);
    for (const planet of PLANETS) {
      expect(planet.physical.meanDiameterKm).toBeGreaterThan(0);
      expect(planet.physical.meanRadiusKm * 2).toBe(planet.physical.meanDiameterKm);
      expect(planet.physical.massKg).toBeGreaterThan(0);
      expect(planet.physical.meanDensityKgM3).toBeGreaterThan(0);
      expect(planet.meanDistanceAu).toBeGreaterThan(0);
      expect(planet.orbitalElements.eccentricity).toBe(planet.eccentricity);
      expect(planet.orbitalElements.eccentricity).toBeGreaterThanOrEqual(0);
      expect(planet.orbitalElements.eccentricity).toBeLessThan(1);
      expect(planet.sourceIds.every((sourceId) => sourceId in DATA_SOURCES)).toBe(true);
      expect(rotationDirectionMatchesRate(planet.rotation)).toBe(true);
      expect(Math.abs(planet.rotation.primeMeridianRateDegPerDay * rotationPeriodDays(planet.rotation) - 360)).toBeLessThan(5);
    }
  });
});

describe("Keplerian orbit engine", () => {
  it("solves Kepler's equation for a high-eccentricity ellipse", () => {
    const meanAnomaly = 1.2;
    const eccentricity = 0.8;
    const eccentricAnomaly = solveKepler(meanAnomaly, eccentricity);
    expect(eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly)).toBeCloseTo(meanAnomaly, 9);
  });

  it("rejects non-elliptical inputs", () => {
    expect(() => solveKepler(1, 1)).toThrow(RangeError);
    expect(() => solveKepler(Number.NaN, 0.2)).toThrow(RangeError);
  });

  it("places a body at its perihelion and aphelion distances", () => {
    const elements = PLANETS.find((planet) => planet.id === "mars")!.orbitalElements;
    const perihelion = orbitalPosition({ ...elements, meanAnomalyAtEpochDeg: 0 }, 0);
    const aphelion = orbitalPosition({ ...elements, meanAnomalyAtEpochDeg: 180 }, 0);
    expect(Math.hypot(perihelion.x, perihelion.y, perihelion.z)).toBeCloseTo(
      elements.semiMajorAxisAu * (1 - elements.eccentricity), 8,
    );
    expect(Math.hypot(aphelion.x, aphelion.y, aphelion.z)).toBeCloseTo(
      elements.semiMajorAxisAu * (1 + elements.eccentricity), 8,
    );
  });

  it("returns finite 3D coordinates for every planet and reflects orbital eccentricity", () => {
    for (const planet of PLANETS) {
      const current = orbitalPosition(planet.orbitalElements, 0);
      const later = orbitalPosition(planet.orbitalElements, planet.orbitalPeriodDays / 4);
      expect([current.x, current.y, current.z, later.x, later.y, later.z].every(Number.isFinite)).toBe(true);
      expect(Math.hypot(current.x, current.y, current.z)).toBeLessThan(planet.orbitalElements.semiMajorAxisAu * (1 + planet.eccentricity));
      expect(Math.hypot(current.x, current.y, current.z)).toBeGreaterThan(planet.orbitalElements.semiMajorAxisAu * (1 - planet.eccentricity) - 0.001);
      expect(Math.hypot(later.x - current.x, later.y - current.y, later.z - current.z)).toBeGreaterThan(0.001);
    }
  });

  it("propagates JPL secular elements and derives true anomaly and radius consistently", () => {
    const earth = PLANETS.find((planet) => planet.id === "earth")!;
    const propagated = elementsAt(earth.orbitalElements, DAYS_PER_JULIAN_CENTURY);
    expect(propagated.semiMajorAxisAu).toBeCloseTo(
      earth.orbitalElements.semiMajorAxisAu + earth.orbitalElements.ratesPerCentury.semiMajorAxisAuPerCentury, 12,
    );
    expect(trueAnomaly(earth.orbitalElements, 0)).toBeGreaterThanOrEqual(-180);
    expect(trueAnomaly(earth.orbitalElements, 0)).toBeLessThanOrEqual(180);
    expect(orbitalRadiusAu(earth.orbitalElements, 0)).toBeCloseTo(
      Math.hypot(...Object.values(orbitalPosition(earth.orbitalElements, 0))), 12,
    );
  });
});

describe("JPL Horizons ephemeris comparison", () => {
  // The documented JPL fit errors grow substantially for the outer planets.
  const maximumErrorKm: Record<string, number> = {
    mercury: 10_000, venus: 20_000, earth: 15_000, mars: 30_000,
    jupiter: 1_400_000, saturn: 4_500_000, uranus: 1_500_000, neptune: 1_500_000,
  };

  it.each(HORIZONS_EPOCHS)("$label heliocentric positions remain within the model error budget", (epoch) => {
    for (const planet of PLANETS) {
      const position = orbitalPosition(planet.orbitalElements, epoch.daysSinceJ2000Tdb);
      const errorKm = positionErrorKm(position, epoch.positionEclipticAu[planet.id]);
      expect(errorKm, `${planet.name} at ${epoch.label}: ${errorKm.toFixed(0)} km`).toBeLessThan(maximumErrorKm[planet.id]);
    }
  });
});

describe("rotation and coordinate frames", () => {
  it("maps ecliptic positions consistently into scene and top-down map coordinates", () => {
    const ecliptic = { x: 1, y: 2, z: 3 };
    expect(eclipticToScene(ecliptic)).toEqual({ x: 1, y: 3, z: -2 });
    expect(eclipticToMap(ecliptic)).toEqual({ x: 1, y: 2 });
  });

  it("propagates the IAU pole and prime meridian as an orthonormal, right-handed frame", () => {
    for (const body of [SUN, ...PLANETS]) {
      for (const days of [0, 9_131.5008]) {
        const orientation = rotationAtTime(body.rotation, days);
        expect(Math.hypot(orientation.pole.x, orientation.pole.y, orientation.pole.z)).toBeCloseTo(1, 12);
        expect(dot(orientation.pole, orientation.primeMeridianAxis)).toBeCloseTo(0, 12);
        expect(dot(orientation.pole, orientation.equatorialAxis)).toBeCloseTo(0, 12);
        expect(dot(orientation.primeMeridianAxis, orientation.equatorialAxis)).toBeCloseTo(0, 12);
        const handedness = {
          x: orientation.primeMeridianAxis.y * orientation.pole.z - orientation.primeMeridianAxis.z * orientation.pole.y,
          y: orientation.primeMeridianAxis.z * orientation.pole.x - orientation.primeMeridianAxis.x * orientation.pole.z,
          z: orientation.primeMeridianAxis.x * orientation.pole.y - orientation.primeMeridianAxis.y * orientation.pole.x,
        };
        expect(dot(normalize(handedness), orientation.equatorialAxis)).toBeCloseTo(-1, 12);
      }
    }
  });

  it("matches the rotation axis to the published axial tilt and orbital plane", () => {
    const sunTilt = axialTiltFromPole(rotationAtTime(SUN.rotation, 0).pole, { x: 0, y: 0, z: 1 });
    expect(sunTilt).toBeCloseTo(SUN.rotation.axialTiltDeg, 1);
    for (const planet of PLANETS) {
      const pole = rotationAtTime(planet.rotation, 0).pole;
      const normal = orbitalNormal(planet.orbitalElements, 0);
      const poleAngle = axialTiltFromPole(pole, normal);
      const spinAxisTilt = planet.rotation.direction === "retrograde" ? 180 - poleAngle : poleAngle;
      expect(spinAxisTilt).toBeCloseTo(planet.rotation.axialTiltDeg, 0);
    }
  });
});

describe("simulation time", () => {
  it("advances by elapsed time and speed, freezes while paused, and clamps suspended frames", () => {
    expect(advanceSimulationDays(0, 1, 864_000, true)).toBeCloseTo(1);
    expect(advanceSimulationDays(5, 1, 86_400, false)).toBe(5);
    expect(advanceSimulationDays(0, 10, 86_400, true)).toBeCloseTo(MAX_FRAME_DELTA_SECONDS);
  });

  it("offers faster playback presets for visibly advancing orbital motion", () => {
    expect(SPEED_PRESETS).toEqual([1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000]);
    expect(advanceSimulationDays(0, 1, 10_000_000, true)).toBeCloseTo(10_000_000 * MAX_FRAME_DELTA_SECONDS / 86_400);
  });

  it("defines J2000.0 as the initial simulation state", () => {
    expect(INITIAL_DAYS).toBe(0);
  });

  it("restores initial playback settings and clears the running simulation on reset", async () => {
    const { useCosmosStore } = await import("../state/store");
    useCosmosStore.getState().setDays(450);
    useCosmosStore.getState().setSpeed(10_000);
    useCosmosStore.getState().setPlaying(true);
    useCosmosStore.getState().selectBody("earth");
    useCosmosStore.getState().focusBody("earth");
    useCosmosStore.getState().reset();
    const state = useCosmosStore.getState();
    expect(state.daysSinceEpoch).toBe(INITIAL_DAYS);
    expect(state.playing).toBe(false);
    expect(state.speed).toBe(100);
    expect(state.selectedBody).toBeNull();
    expect(state.focusedBody).toBeNull();
  });
});

describe("display transforms", () => {
  it("preserves order in both modes and uses linear proportional distances in distance mode", () => {
    for (const mode of ["cinematic", "distance"] as const) {
      expect(displayDistance(30, mode)).toBeGreaterThan(displayDistance(1, mode));
      expect(displayDistance(1, mode)).toBeGreaterThan(displayDistance(0.3, mode));
    }
    expect(displayDistance(2, "distance") / displayDistance(1, "distance")).toBeCloseTo(2);
  });

  it("does not mutate scientific source coordinates while rescaling the visual coordinates", () => {
    const scientificPosition = orbitalPosition(PLANETS[0].orbitalElements, 123);
    const original = { ...scientificPosition };
    const cinematic = displayPosition(scientificPosition, "cinematic");
    const distance = displayPosition(scientificPosition, "distance");
    expect(scientificPosition).toEqual(original);
    expect(cinematic).not.toEqual(original);
    expect(distance).not.toEqual(original);
  });
});
