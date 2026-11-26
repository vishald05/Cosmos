import { describe, expect, it } from "vitest";
import {
  addJourneyStop,
  calculateDistanceJourney,
  MAX_JOURNEY_STOPS,
  moveJourneyStop,
  removeJourneyStop,
  replaceJourneyStop,
  resetJourneyStops,
} from "./journey";

describe("journey stop state", () => {
  it("adds, removes, reorders, replaces, and resets unique catalogue stops", () => {
    const initial = resetJourneyStops();
    const added = addJourneyStop(initial, "jupiter");
    expect(added).toEqual({ status: "available", stopIds: ["earth", "mars", "jupiter"] });
    if (added.status !== "available") return;

    expect(moveJourneyStop(added.stopIds, 1, 2)).toEqual({
      status: "available",
      stopIds: ["earth", "jupiter", "mars"],
    });
    expect(removeJourneyStop(added.stopIds, 1)).toEqual({
      status: "available",
      stopIds: ["earth", "jupiter"],
    });
    expect(replaceJourneyStop(initial, 1, "saturn")).toEqual({
      status: "available",
      stopIds: ["earth", "saturn"],
    });
    expect(resetJourneyStops()).toEqual(["earth", "mars"]);
  });

  it("rejects duplicate, unknown, invalid reorder, and too-short journeys", () => {
    const fullJourney = [
      "earth", "mars", "jupiter", "saturn", "mercury",
      "venus", "uranus", "neptune", "sun", "moon",
    ];
    expect(addJourneyStop(["earth", "mars"], "mars")).toMatchObject({ status: "invalid-input" });
    expect(addJourneyStop(["earth", "mars"], "custom-example")).toMatchObject({ status: "invalid-input" });
    expect(replaceJourneyStop(["earth", "mars"], 1, "earth")).toMatchObject({ status: "invalid-input" });
    expect(moveJourneyStop(["earth", "mars"], 0, 2)).toMatchObject({ status: "invalid-input" });
    expect(removeJourneyStop(["earth", "mars"], 0)).toMatchObject({ status: "invalid-input" });
    expect(fullJourney).toHaveLength(MAX_JOURNEY_STOPS);
    expect(addJourneyStop(fullJourney, "custom-example")).toMatchObject({ status: "invalid-input" });
  });
});

describe("distance journey calculations", () => {
  it("calculates every consecutive segment at one simulation date with surface and light-time metadata", () => {
    const result = calculateDistanceJourney(["earth", "mars", "jupiter", "saturn"], 0);

    expect(result.status).toBe("complete");
    if (result.status !== "complete") return;
    expect(result.segments.map(({ start, destination }) => [start.object.id, destination.object.id]))
      .toEqual([["earth", "mars"], ["mars", "jupiter"], ["jupiter", "saturn"]]);
    expect(result.segments.every((segment) => (
      segment.distance.status === "available"
      && segment.distance.simulationTime.daysSinceJ2000Tdb === 0
      && segment.surface.status === "available"
      && segment.lightTravel?.status === "available"
    ))).toBe(true);
    for (const segment of result.segments) {
      if (segment.distance.status === "available" && segment.surface.status === "available") {
        expect(segment.surface.centerDistanceMetres).toBe(segment.distance.distanceMetres);
        expect(segment.simulationTime?.displayDateIso).toBe(segment.distance.simulationTime.displayDateIso);
      }
    }

    const segmentDistances = result.segments.map(({ distance }) => (
      distance.status === "available" ? distance.distanceMetres : 0
    ));
    const segmentTimes = result.segments.map(({ lightTravel }) => (
      lightTravel?.status === "available" ? lightTravel.seconds : 0
    ));
    expect(result.totalDistanceMetres).toBe(segmentDistances.reduce((total, value) => total + value, 0));
    expect(result.totalLightTravelSeconds).toBe(segmentTimes.reduce((total, value) => total + value, 0));
    expect(result.directDisplacement.status).toBe("available");
    if (result.directDisplacement.status === "available") {
      expect(result.directDisplacement.simulationTime.daysSinceJ2000Tdb).toBe(0);
      const total = result.totalDistanceMetres;
      if (total === null) throw new Error("Complete journey must have a total distance.");
      expect(total).toBeGreaterThan(result.directDisplacement.distanceMetres);
      expect(total).not.toBe(result.directDisplacement.distanceMetres);
    }
  });

  it("uses the direct segment as the journey total for a two-stop route", () => {
    const result = calculateDistanceJourney(["earth", "mars"], 0);
    expect(result.status).toBe("complete");
    if (result.status !== "complete") return;
    expect(result.segments).toHaveLength(1);
    expect(result.totalDistanceMetres).toBe(result.segments[0].distance.status === "available"
      ? result.segments[0].distance.distanceMetres
      : null);
    expect(result.directDisplacement).toEqual(result.segments[0].distance);
  });

  it("marks Moon-adjacent segments unavailable without fabricating a total, while retaining direct displacement", () => {
    const result = calculateDistanceJourney(["earth", "moon", "jupiter"], 0);
    expect(result.status).toBe("partial");
    if (result.status !== "partial") return;
    expect(result.segments.map(({ distance }) => distance.status)).toEqual(["unavailable", "unavailable"]);
    expect(result.totalDistanceMetres).toBeNull();
    expect(result.totalLightTravelSeconds).toBeNull();
    expect(result.availableSegmentDistanceMetres).toBe(0);
    expect(result.directDisplacement.status).toBe("available");
  });

  it("reports an explicitly partial subtotal when only some segments are available", () => {
    const result = calculateDistanceJourney(["earth", "mars", "moon", "jupiter"], 0);
    expect(result.status).toBe("partial");
    if (result.status !== "partial") return;
    expect(result.segments.map(({ distance }) => distance.status))
      .toEqual(["available", "unavailable", "unavailable"]);
    expect(result.totalDistanceMetres).toBeNull();
    expect(result.availableSegmentDistanceMetres).toBe(
      result.segments[0].distance.status === "available"
        ? result.segments[0].distance.distanceMetres
        : NaN,
    );
    expect(result.totalLightTravelSeconds).toBeNull();
    expect(result.availableSegmentLightTravelSeconds).toBeGreaterThan(0);
  });

  it("reports invalid dates and model-range failures on every affected segment", () => {
    const outOfRange = calculateDistanceJourney(["earth", "mars", "jupiter"], 100_000);
    expect(outOfRange.status).toBe("partial");
    if (outOfRange.status === "partial") {
      expect(outOfRange.segments.every(({ distance }) => distance.status === "unavailable")).toBe(true);
      expect(outOfRange.totalDistanceMetres).toBeNull();
    }
    const invalidTime = calculateDistanceJourney(["earth", "mars"], Number.NaN);
    expect(invalidTime.status).toBe("partial");
    if (invalidTime.status === "partial") {
      expect(invalidTime.segments[0].distance.status).toBe("invalid-input");
      expect(invalidTime.directDisplacement.status).toBe("invalid-input");
    }
  });

  it("rejects insufficient, duplicate, and unknown journey stops", () => {
    expect(calculateDistanceJourney(["earth"], 0)).toMatchObject({ status: "invalid-journey" });
    expect(calculateDistanceJourney(["earth", "earth"], 0)).toMatchObject({ status: "invalid-journey" });
    expect(calculateDistanceJourney(["earth", "not-a-body"], 0)).toMatchObject({ status: "invalid-journey" });
  });
});
