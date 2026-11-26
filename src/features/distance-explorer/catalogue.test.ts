import { describe, expect, it } from "vitest";
import { BODIES } from "../../science/planets";
import { createCustomObject } from "../scale-lab/custom-objects";
import { BUILT_IN_OBJECTS } from "../scale-lab/catalogue";
import { DISTANCE_ENDPOINTS, getIntermediateObjects } from "./catalogue";

describe("Distance Explorer catalogue foundation", () => {
  it("reuses the existing Sun and planet dimension records and exposes their position models", () => {
    expect(DISTANCE_ENDPOINTS.map(({ object }) => object.id)).toEqual([
      ...BODIES.map(({ id }) => id),
      "moon",
    ]);

    for (const body of BODIES) {
      const endpoint = DISTANCE_ENDPOINTS.find(({ object }) => object.id === body.id);
      expect(endpoint?.object).toBe(BUILT_IN_OBJECTS.find(({ id }) => id === body.id));
      expect(endpoint?.position.kind).toBe(body.id === "sun" ? "heliocentric-origin" : "jpl-secular-elements");
    }
  });

  it("includes the Moon without inventing a position model", () => {
    const moon = DISTANCE_ENDPOINTS.find(({ object }) => object.id === "moon");
    expect(moon?.position).toMatchObject({
      kind: "unavailable",
      label: "Position model unavailable",
    });
  });

  it("offers custom dimensions as intermediate objects but never as endpoints", () => {
    const custom = createCustomObject({
      name: "Test sphere",
      description: "",
      dimension: 2,
      unit: "m",
      dimensionType: "diameter",
      shape: "sphere",
      color: "#e6ba7a",
    });
    const intermediateObjects = getIntermediateObjects([custom]);

    expect(intermediateObjects).toContain(custom);
    expect(intermediateObjects).toContain(BUILT_IN_OBJECTS.find(({ id }) => id === "earth"));
    expect(DISTANCE_ENDPOINTS.some(({ object }) => object.id === custom.id)).toBe(false);
    expect(custom.shape).toBe("sphere");
    expect(custom.dimensionType).toBe("diameter");
  });
});
