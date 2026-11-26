/** @vitest-environment jsdom */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { calculateInstantaneousSurfaceSeparation } from "../../science/distance";
import { BUILT_IN_OBJECTS } from "../scale-lab/catalogue";
import { createCustomObject } from "../scale-lab/custom-objects";
import { normalizeDimension } from "../scale-lab/engine";
import type { ScaleObject } from "../scale-lab/types";
import { calculateObjectPlacement } from "./placement";
import type { SurfaceSeparationResult } from "../../science/distance";
import { PlacementVisualization } from "./PlacementVisualization";

afterEach(cleanup);

const start = BUILT_IN_OBJECTS.find(({ id }) => id === "earth")!;
const destination = BUILT_IN_OBJECTS.find(({ id }) => id === "mars")!;

function getInitialSurface() {
  const surface = calculateInstantaneousSurfaceSeparation("earth", "mars", 0);
  if (surface.status !== "available") throw new Error(surface.reason);
  return surface;
}

const initialSurface = getInitialSurface();

function surfaceWithGap(
  gapMetres: number,
  startObject = start,
  destinationObject = destination,
): Extract<SurfaceSeparationResult, { status: "available" }> {
  const radiusAMetres = normalizeDimension(startObject.dimension, startObject.unit) / 2;
  const radiusBMetres = normalizeDimension(destinationObject.dimension, destinationObject.unit) / 2;
  const radiusSum = radiusAMetres + radiusBMetres;
  return {
    ...initialSurface,
    centerDistanceMetres: radiusSum + gapMetres,
    radiusAMetres,
    radiusBMetres,
    signedSurfaceGapMetres: gapMetres,
    availableSurfaceGapMetres: gapMetres,
    overlapMetres: 0,
    relation: gapMetres === 0 ? "touching" : "separated",
  };
}

function renderPlacement(
  gapMetres: number,
  object = start,
  endpoints: readonly [ScaleObject, ScaleObject] = [start, destination],
) {
  const [startObject, destinationObject] = endpoints;
  const surface = surfaceWithGap(gapMetres, startObject, destinationObject);
  const placement = calculateObjectPlacement(surface, object);
  if (placement.status !== "available" && placement.status !== "overlapping-endpoints") {
    throw new Error(placement.reason);
  }
  const result = render(
    <PlacementVisualization
      start={startObject}
      destination={destinationObject}
      surface={surface}
      placement={placement}
      unit="km"
    />,
  );
  return { ...result, placement };
}

describe("placement visualization geometry", () => {
  it("renders endpoints in order and one mark per complete object for small counts", () => {
    const diameterMetres = start.dimension * 1_000;
    const { container, placement } = renderPlacement(diameterMetres * 3 + diameterMetres / 4);
    const svg = container.querySelector(".placement-visualization-svg");

    expect(placement.status).toBe("available");
    if (placement.status !== "available") return;
    expect(placement.objectCount).toBe(3n);
    expect(svg?.getAttribute("data-total-count")).toBe("3");
    expect(svg?.getAttribute("data-render-mode")).toBe("individual");
    expect(svg?.querySelectorAll("[data-copy-index]")).toHaveLength(3);
    expect([...svg!.querySelectorAll("[data-endpoint]")].map((node) => node.getAttribute("data-endpoint")))
      .toEqual(["start", "destination"]);
    const startCenter = Number(svg?.querySelector('[data-endpoint="start"] circle')?.getAttribute("cx"));
    const destinationCenter = Number(svg?.querySelector('[data-endpoint="destination"] circle')?.getAttribute("cx"));
    expect(startCenter).toBeLessThan(destinationCenter);
    const remaining = svg?.querySelector(".placement-remaining-range");
    expect(Number(remaining?.getAttribute("x2"))).toBeGreaterThan(Number(remaining?.getAttribute("x1")));
  });

  it("groups repeated objects above the DOM threshold while retaining the exact total", () => {
    const diameterMetres = start.dimension * 1_000;
    const { container, placement } = renderPlacement(diameterMetres * 100);
    const svg = container.querySelector(".placement-visualization-svg");

    expect(placement.status).toBe("available");
    if (placement.status !== "available") return;
    expect(placement.objectCount).toBe(100n);
    expect(svg?.getAttribute("data-total-count")).toBe("100");
    expect(svg?.getAttribute("data-render-mode")).toBe("grouped");
    expect(svg?.querySelectorAll("[data-copy-sample]")).toHaveLength(12);
    expect(container.querySelector(".placement-group-note")?.textContent).toContain("12 representative marks are shown");
  });

  it("represents very small custom objects with one grouped locator instead of overlapping symbols", () => {
    const smallObject = createCustomObject({
      name: "Millimetre sphere",
      description: "",
      dimension: 1,
      unit: "mm",
      dimensionType: "diameter",
      shape: "sphere",
      color: "#cc9966",
    });
    const { container, placement } = renderPlacement(1e12, smallObject);
    const svg = container.querySelector(".placement-visualization-svg");

    expect(placement.status).toBe("available");
    if (placement.status !== "available") return;
    expect(placement.objectCount).toBeGreaterThan(1n);
    expect(svg?.getAttribute("data-render-mode")).toBe("grouped");
    expect(svg?.getAttribute("data-sample-count")).toBe("1");
    expect(svg?.getAttribute("data-locator-lane")).toBe("true");
    expect(svg?.querySelectorAll(".placement-intermediate .placement-locator")).toHaveLength(1);
    expect(svg?.querySelectorAll(".placement-locator-leader")).toHaveLength(1);
    expect(svg?.querySelector('[data-endpoint="start"] .placement-locator')?.getAttribute("d"))
      .not.toBe(svg?.querySelector(".placement-intermediate .placement-locator")?.getAttribute("d"));
    expect(container.querySelector(".placement-group-note")?.textContent).toContain("representative mark is shown");
  });

  it("draws linear dimensions as measured-length segments", () => {
    const car = BUILT_IN_OBJECTS.find(({ id }) => id === "car")!;
    const smallStart = createCustomObject({
      name: "Small start",
      description: "",
      dimension: 1,
      unit: "m",
      dimensionType: "diameter",
      shape: "sphere",
      color: "#cc9966",
    });
    const smallDestination = createCustomObject({
      name: "Small destination",
      description: "",
      dimension: 1,
      unit: "m",
      dimensionType: "diameter",
      shape: "sphere",
      color: "#6699cc",
    });
    const { container, placement } = renderPlacement(500, car, [smallStart, smallDestination]);

    expect(placement.status).toBe("available");
    if (placement.status !== "available") return;
    expect(placement.calculationType).toBe("linear-one-dimensional-placement-estimate");
    expect(container.querySelectorAll(".placement-linear-dimension").length).toBeGreaterThan(0);
  });
});
