import { BUILT_IN_OBJECT_IDS } from "./catalogue";
import { MAX_DIMENSION_METRES, MIN_DIMENSION_METRES, normalizeDimension } from "./engine";
import { DIMENSION_TYPES, isMeasurementUnit } from "./types";
import type { DimensionType, MeasurementUnit, ScaleObject, ScaleShape } from "./types";

export const CUSTOM_OBJECTS_STORAGE_KEY = "cosmos.scale-lab.custom-objects";
export const CUSTOM_OBJECTS_STORAGE_VERSION = 1;
const CUSTOM_ID_PREFIX = "custom-";
const COLOR_PATTERN = /^#[\da-f]{6}$/i;

export interface CustomObjectInput {
  name: string;
  description: string;
  dimension: number;
  unit: MeasurementUnit;
  dimensionType: DimensionType;
  shape: ScaleShape;
  color: string;
}

export interface CustomObjectsLoadResult {
  objects: ScaleObject[];
  warning: string | null;
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function assertCustomInput(input: CustomObjectInput): void {
  if (!input || typeof input !== "object") throw new RangeError("Enter custom object details.");
  if (typeof input.name !== "string" || input.name.trim().length === 0) {
    throw new RangeError("Object name cannot be empty.");
  }
  if (input.name.trim().length > 80) throw new RangeError("Object name must be 80 characters or fewer.");
  if (typeof input.description !== "string" || input.description.length > 280) {
    throw new RangeError("Description must be 280 characters or fewer.");
  }
  if (!isMeasurementUnit(input.unit)) throw new RangeError("Choose a supported measurement unit.");
  if (!(DIMENSION_TYPES as readonly string[]).includes(input.dimensionType)) {
    throw new RangeError("Choose a supported dimension type.");
  }
  if (input.shape !== "sphere" && input.shape !== "linear") {
    throw new RangeError("Choose whether the object is spherical or a linear measurement.");
  }
  if (input.shape === "sphere" && input.dimensionType !== "diameter") {
    throw new RangeError("A spherical object must be measured by its diameter.");
  }
  if (typeof input.color !== "string" || !COLOR_PATTERN.test(input.color)) {
    throw new RangeError("Choose a valid six-digit hex colour.");
  }
  const dimensionMetres = normalizeDimension(input.dimension, input.unit);
  if (dimensionMetres < MIN_DIMENSION_METRES || dimensionMetres > MAX_DIMENSION_METRES) {
    throw new RangeError("Dimension is outside the supported numeric range.");
  }
}

function createId(): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${CUSTOM_ID_PREFIX}${randomId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function objectFromInput(input: CustomObjectInput, id: string): ScaleObject {
  assertCustomInput(input);
  if (BUILT_IN_OBJECT_IDS.has(id) || !id.startsWith(CUSTOM_ID_PREFIX)) {
    throw new RangeError("A custom object cannot replace a built-in scientific object.");
  }
  const shapeNote = input.shape === "sphere"
    ? "User-selected spherical model; actual object shape may differ."
    : undefined;
  return {
    id,
    name: input.name.trim(),
    category: "custom",
    description: input.description.trim() || "User-defined comparison object.",
    dimension: input.dimension,
    unit: input.unit,
    dimensionType: input.dimensionType,
    source: { label: "User-provided measurement" },
    builtIn: false,
    shape: input.shape,
    color: input.color.toLowerCase(),
    ...(shapeNote ? { approximationNote: shapeNote } : {}),
  };
}

export function createCustomObject(input: CustomObjectInput): ScaleObject {
  return objectFromInput(input, createId());
}

export function editCustomObject(existing: ScaleObject, input: CustomObjectInput): ScaleObject {
  if (existing.builtIn || !existing.id.startsWith(CUSTOM_ID_PREFIX)) {
    throw new RangeError("Built-in scientific objects cannot be edited.");
  }
  return objectFromInput(input, existing.id);
}

export function deleteCustomObject(objects: readonly ScaleObject[], id: string): ScaleObject[] {
  if (BUILT_IN_OBJECT_IDS.has(id)) throw new RangeError("Built-in scientific objects cannot be deleted.");
  return objects.filter((object) => object.id !== id);
}

function parseStoredObject(value: unknown): ScaleObject | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Partial<ScaleObject>;
  const storedUnit = typeof stored.unit === "string" ? stored.unit : "";
  if (
    typeof stored.id !== "string"
    || !stored.id.startsWith(CUSTOM_ID_PREFIX)
    || stored.builtIn !== false
    || typeof stored.name !== "string"
    || typeof stored.description !== "string"
    || typeof stored.dimension !== "number"
    || !isMeasurementUnit(storedUnit)
    || typeof stored.dimensionType !== "string"
    || (stored.shape !== "sphere" && stored.shape !== "linear")
    || typeof stored.color !== "string"
  ) return null;

  try {
    return objectFromInput({
      name: stored.name,
      description: stored.description,
      dimension: stored.dimension,
      unit: storedUnit,
      dimensionType: stored.dimensionType as DimensionType,
      shape: stored.shape,
      color: stored.color,
    }, stored.id);
  } catch {
    return null;
  }
}

export function parseCustomObjects(raw: string | null): CustomObjectsLoadResult {
  if (raw === null) return { objects: [], warning: null };
  let document: unknown;
  try {
    document = JSON.parse(raw);
  } catch {
    return {
      objects: [],
      warning: "Saved custom objects were malformed and could not be restored. Create new objects to save them again.",
    };
  }
  if (
    !document
    || typeof document !== "object"
    || !("version" in document)
    || !("objects" in document)
    || document.version !== CUSTOM_OBJECTS_STORAGE_VERSION
    || !Array.isArray(document.objects)
  ) {
    return {
      objects: [],
      warning: "Saved custom objects use an unsupported format. They were not loaded.",
    };
  }

  const objects: ScaleObject[] = [];
  let invalidCount = 0;
  const ids = new Set<string>();
  for (const rawObject of document.objects) {
    const object = parseStoredObject(rawObject);
    if (!object || ids.has(object.id)) {
      invalidCount += 1;
      continue;
    }
    ids.add(object.id);
    objects.push(object);
  }
  return {
    objects,
    warning: invalidCount > 0
      ? `${invalidCount} invalid or duplicate saved object${invalidCount === 1 ? " was" : "s were"} skipped.`
      : null,
  };
}

export function loadCustomObjects(storage: StorageAdapter): CustomObjectsLoadResult {
  try {
    return parseCustomObjects(storage.getItem(CUSTOM_OBJECTS_STORAGE_KEY));
  } catch {
    return {
      objects: [],
      warning: "Browser storage is unavailable. Custom objects will not persist in this session.",
    };
  }
}

export function saveCustomObjects(storage: StorageAdapter, objects: readonly ScaleObject[]): void {
  const validObjects = objects.map((object) => {
    if (object.builtIn || !object.id.startsWith(CUSTOM_ID_PREFIX)) {
      throw new RangeError("Only user-created objects can be saved as custom objects.");
    }
    return parseStoredObject(object);
  });
  if (validObjects.some((object) => object === null)) {
    throw new RangeError("A custom object is invalid and could not be saved.");
  }
  storage.setItem(CUSTOM_OBJECTS_STORAGE_KEY, JSON.stringify({
    version: CUSTOM_OBJECTS_STORAGE_VERSION,
    objects: validObjects,
  }));
}
