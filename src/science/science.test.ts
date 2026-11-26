import { describe, expect, it } from "vitest";
import { PLANETS, SUN } from "./planets";
import { orbitalPosition, solveKepler } from "./orbit";
import { displayDistance, displayPosition } from "./scale";
import { advanceSimulationDays, INITIAL_DAYS, MAX_FRAME_DELTA_SECONDS } from "./simulation";
import { auToKm, kmToAu } from "./units";

describe("unit conversions", () => {
  it("converts AU and kilometres reversibly", () => {
    expect(auToKm(1)).toBeCloseTo(149_597_870.7, 5);
    expect(kmToAu(auToKm(1.7))).toBeCloseTo(1.7, 12);
  });
});

describe("planetary data", () => {
  it("defines the Sun and all eight planets with valid physical and orbital data", () => {
    expect(SUN.meanDiameterKm).toBeGreaterThan(1_000_000);
    expect(PLANETS).toHaveLength(8);
    for (const planet of PLANETS) {
      expect(planet.meanDiameterKm).toBeGreaterThan(0);
      expect(planet.meanDistanceAu).toBeGreaterThan(0);
      expect(planet.orbitalElements.eccentricity).toBe(planet.eccentricity);
      expect(planet.orbitalElements.eccentricity).toBeGreaterThanOrEqual(0);
      expect(planet.orbitalElements.eccentricity).toBeLessThan(1);
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
});

describe("simulation time", () => {
  it("advances by elapsed time and speed, freezes while paused, and clamps suspended frames", () => {
    expect(advanceSimulationDays(0, 1, 864_000, true)).toBeCloseTo(1);
    expect(advanceSimulationDays(5, 1, 86_400, false)).toBe(5);
    expect(advanceSimulationDays(0, 10, 86_400, true)).toBeCloseTo(MAX_FRAME_DELTA_SECONDS);
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
