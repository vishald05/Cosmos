import { BODIES } from "../../science/planets";
import type { BodyId } from "../../science/types";
import { BUILT_IN_OBJECTS, BUILT_IN_OBJECT_IDS } from "../scale-lab/catalogue";
import type { ScaleObject } from "../scale-lab/types";

export type DistanceEndpointId = BodyId | "moon";

export type PositionModel =
  | { kind: "heliocentric-origin"; label: "Heliocentric origin" }
  | { kind: "jpl-secular-elements"; label: "JPL secular elements" }
  | { kind: "unavailable"; label: "Position model unavailable"; reason: string };

export interface DistanceEndpointOption {
  object: ScaleObject;
  position: PositionModel;
}

function requiredBuiltInObject(id: string): ScaleObject {
  const object = BUILT_IN_OBJECTS.find((candidate) => candidate.id === id);
  if (!object) throw new Error(`Distance Explorer is missing the built-in object "${id}".`);
  return object;
}

export const DISTANCE_ENDPOINTS: readonly DistanceEndpointOption[] = [
  ...BODIES.map((body) => ({
    object: requiredBuiltInObject(body.id),
    position: body.id === "sun"
      ? { kind: "heliocentric-origin", label: "Heliocentric origin" } as const
      : { kind: "jpl-secular-elements", label: "JPL secular elements" } as const,
  })),
  {
    object: requiredBuiltInObject("moon"),
    position: {
      kind: "unavailable",
      label: "Position model unavailable",
      reason: "The current science engine has no lunar orbit model. A position will not be fabricated.",
    },
  },
];

export function getIntermediateObjects(customObjects: readonly ScaleObject[]): ScaleObject[] {
  return [
    ...BUILT_IN_OBJECTS,
    ...customObjects.filter((object) => !BUILT_IN_OBJECT_IDS.has(object.id)),
  ];
}
