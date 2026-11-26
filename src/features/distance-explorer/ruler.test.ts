import { describe, expect, it } from "vitest";
import {
  createRulerLayout,
  formatLightTravelSeconds,
  formatLightTravelTime,
  formatRulerDistance,
  generateRulerTicks,
  RULER_DISPLAY_UNITS,
  mapDistanceToRulerX,
  MAX_RULER_ZOOM,
  MIN_RULER_ZOOM,
  metresPerRulerUnit,
  nextRulerZoom,
} from "./ruler";
import { METRES_PER_AU, SPEED_OF_LIGHT_METRES_PER_SECOND } from "../../science/distance";

describe("ruler scale and endpoint mapping", () => {
  it("maps endpoint centers and physical diameters with one shared proportional scale", () => {
    const layout = createRulerLayout({
      distanceMetres: 1e11,
      diameterAMetres: 1e7,
      diameterBMetres: 2e7,
      viewportWidth: 800,
      unit: "km",
    });
    expect((layout.xEnd - layout.xStart) / layout.scalePxPerMetre).toBeCloseTo(1e11, 3);
    expect(layout.diameterAPixels / layout.diameterBPixels).toBeCloseTo(0.5, 12);
    expect(layout.xStart - layout.diameterAPixels / 2).toBeCloseTo(layout.margin, 10);
    expect(layout.xEnd + layout.diameterBPixels / 2).toBeCloseTo(800 - layout.margin, 10);
    expect(mapDistanceToRulerX(5e10, layout)).toBeCloseTo((layout.xStart + layout.xEnd) / 2, 10);
  });

  it("keeps sub-pixel physical dimensions small and flags them for locator rendering", () => {
    const layout = createRulerLayout({
      distanceMetres: 1e15,
      diameterAMetres: 1e7,
      diameterBMetres: 2e7,
      viewportWidth: 800,
      unit: "AU",
    });
    expect(layout.diameterAPixels).toBeLessThan(1);
    expect(layout.diameterBPixels).toBeLessThan(1);
    expect(layout.renderDiameterA).toBe(false);
    expect(layout.renderDiameterB).toBe(false);
  });

  it("supports coincident endpoints without inventing a non-zero center distance", () => {
    const layout = createRulerLayout({
      distanceMetres: 0,
      diameterAMetres: 1e7,
      diameterBMetres: 1e7,
      viewportWidth: 800,
      unit: "km",
    });
    expect(layout.xStart).toBe(layout.xEnd);
    expect(layout.scalePxPerMetre).toBeGreaterThan(0);
    expect(layout.ticks).toEqual([]);
    expect(mapDistanceToRulerX(0, layout)).toBe(layout.xStart);
  });

  it("fits responsively at narrow, tablet, and desktop widths", () => {
    for (const viewportWidth of [320, 768, 1_280]) {
      const layout = createRulerLayout({
        distanceMetres: METRES_PER_AU,
        diameterAMetres: 1.3914e9,
        diameterBMetres: 12_742_000,
        viewportWidth,
        unit: "AU",
      });
      expect(layout.xStart - layout.diameterAPixels / 2).toBeGreaterThanOrEqual(layout.margin - 1e-8);
      expect(layout.xEnd + layout.diameterBPixels / 2).toBeLessThanOrEqual(viewportWidth - layout.margin + 1e-8);
      expect((layout.xEnd - layout.xStart) / layout.scalePxPerMetre).toBeCloseTo(METRES_PER_AU, 2);
    }
  });

  it("pans within bounds so the ruler remains reachable and does not change distance", () => {
    const layout = createRulerLayout({
      distanceMetres: 1e11,
      diameterAMetres: 1e7,
      diameterBMetres: 2e7,
      viewportWidth: 800,
      unit: "km",
      zoom: 4,
      panX: 10_000,
    });
    const leftEdge = layout.xStart - layout.diameterAPixels / 2;
    const rightEdge = layout.xEnd + layout.diameterBPixels / 2;
    expect(layout.panX).not.toBe(10_000);
    expect(leftEdge).toBeLessThanOrEqual(800 - layout.margin);
    expect(rightEdge).toBeGreaterThanOrEqual(layout.margin);
    expect((layout.xEnd - layout.xStart) / layout.scalePxPerMetre).toBeCloseTo(1e11, 3);
  });
});

describe("ruler zoom and tick generation", () => {
  it("clamps zoom and scales screen coordinates without changing physical distance", () => {
    expect(nextRulerZoom(1, 1.25)).toBe(1.25);
    expect(nextRulerZoom(MAX_RULER_ZOOM - 1, 2)).toBe(MAX_RULER_ZOOM);
    expect(nextRulerZoom(MIN_RULER_ZOOM + 0.1, 0.1)).toBe(MIN_RULER_ZOOM);
    const normal = createRulerLayout({
      distanceMetres: 2e11, diameterAMetres: 1e7, diameterBMetres: 2e7,
      viewportWidth: 800, unit: "km",
    });
    const zoomed = createRulerLayout({
      distanceMetres: 2e11, diameterAMetres: 1e7, diameterBMetres: 2e7,
      viewportWidth: 800, unit: "km", zoom: 2,
    });
    expect(zoomed.scalePxPerMetre).toBe(normal.scalePxPerMetre * 2);
    expect((zoomed.xEnd - zoomed.xStart) / zoomed.scalePxPerMetre).toBeCloseTo(2e11, 3);
  });

  it("generates ordered, adaptive, endpoint-safe tick labels at the selected display unit", () => {
    const normal = createRulerLayout({
      distanceMetres: 1e12, diameterAMetres: 1e7, diameterBMetres: 2e7,
      viewportWidth: 900, unit: "km",
    });
    const zoomed = createRulerLayout({
      distanceMetres: 1e12, diameterAMetres: 1e7, diameterBMetres: 2e7,
      viewportWidth: 900, unit: "km", zoom: 3,
    });
    expect(normal.ticks.length).toBeGreaterThan(0);
    expect(normal.ticks.length).toBeLessThanOrEqual(10);
    expect(normal.ticks.every((tick) => tick.distanceMetres > 0 && tick.distanceMetres < 1e12)).toBe(true);
    expect(normal.ticks.map((tick) => tick.distanceMetres)).toEqual(
      [...normal.ticks.map((tick) => tick.distanceMetres)].sort((a, b) => a - b),
    );
    expect(zoomed.ticks).not.toEqual(normal.ticks);
    expect(generateRulerTicks(0, 0, 0, "km", 1)).toEqual([]);
  });

  it("keeps fit-to-view at the initial scale and rejects invalid geometry", () => {
    const fit = createRulerLayout({
      distanceMetres: 1e11, diameterAMetres: 1e7, diameterBMetres: 1e7,
      viewportWidth: 800, unit: "km", zoom: 1, panX: 0,
    });
    expect(fit.zoom).toBe(1);
    expect(fit.panX).toBe(0);
    expect(() => createRulerLayout({
      distanceMetres: -1, diameterAMetres: 1, diameterBMetres: 1,
      viewportWidth: 800, unit: "km",
    })).toThrow(RangeError);
  });
});

describe("distance and light-time display units", () => {
  it("uses the Phase 4.2 conversions for physical and light-based ruler units", () => {
    expect(metresPerRulerUnit("AU")).toBe(METRES_PER_AU);
    expect(metresPerRulerUnit("light-seconds")).toBe(SPEED_OF_LIGHT_METRES_PER_SECOND);
    expect(metresPerRulerUnit("light-minutes")).toBe(SPEED_OF_LIGHT_METRES_PER_SECOND * 60);
    for (const unit of RULER_DISPLAY_UNITS) {
      expect(formatRulerDistance(METRES_PER_AU, unit)).toContain(unit);
      expect(metresPerRulerUnit(unit)).toBeGreaterThan(0);
    }
    expect(formatRulerDistance(METRES_PER_AU, "km")).toContain("km");
    expect(formatRulerDistance(METRES_PER_AU, "light-minutes")).toContain("light-minutes");
    const sampleDistance = METRES_PER_AU * 1.234567;
    expect(formatRulerDistance(sampleDistance, "AU", 6)).not.toBe(formatRulerDistance(sampleDistance, "AU"));
    expect(formatLightTravelTime({
      status: "available",
      calculationType: "vacuum-light-travel-time",
      distanceMetres: SPEED_OF_LIGHT_METRES_PER_SECOND * 60,
      seconds: 60,
      minutes: 1,
      hours: 1 / 60,
      days: 1 / 1_440,
      julianYears: 1 / (365.25 * 1_440),
      model: "constant speed of light in vacuum; no relativistic or medium effects",
    })).toBe("1 minute");
    expect(formatLightTravelSeconds(0)).toBe("0 seconds");
    expect(formatLightTravelSeconds(60)).toBe("1 minute");
    expect(() => formatLightTravelSeconds(Number.NaN)).toThrow(RangeError);
  });
});
