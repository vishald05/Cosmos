import { describe, expect, it } from "vitest";
import {
  CUSTOM_OBJECTS_STORAGE_KEY, CUSTOM_OBJECTS_STORAGE_VERSION,
  createCustomObject, deleteCustomObject, editCustomObject,
  loadCustomObjects, parseCustomObjects, saveCustomObjects,
} from "./custom-objects";
import { BUILT_IN_OBJECTS } from "./catalogue";
import type { CustomObjectInput, StorageAdapter } from "./custom-objects";

class MemoryStorage implements StorageAdapter {
  values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const validInput: CustomObjectInput = {
  name: "Test marker",
  description: "A user-defined linear size.",
  dimension: 2,
  unit: "m",
  dimensionType: "length",
  shape: "linear",
  color: "#cc9966",
};

describe("custom object validation and CRUD", () => {
  it("creates and edits valid objects without changing the saved identity", () => {
    const created = createCustomObject(validInput);
    expect(created.name).toBe("Test marker");
    expect(created.builtIn).toBe(false);
    expect(created.id).not.toBe(BUILT_IN_OBJECTS[0].id);
    const edited = editCustomObject(created, { ...validInput, name: "Edited marker", dimension: 3 });
    expect(edited.id).toBe(created.id);
    expect(edited.name).toBe("Edited marker");
    expect(edited.dimension).toBe(3);
    expect(deleteCustomObject([created], created.id)).toEqual([]);
  });

  it("rejects empty names, invalid dimensions, unsupported units, and invalid sphere dimensions", () => {
    for (const invalid of [
      { ...validInput, name: " " },
      { ...validInput, dimension: 0 },
      { ...validInput, dimension: -1 },
      { ...validInput, dimension: Number.NaN },
      { ...validInput, dimension: 1e308, unit: "km" as const },
      { ...validInput, unit: "yd" as CustomObjectInput["unit"] },
      { ...validInput, shape: "sphere" as const },
    ]) {
      expect(() => createCustomObject(invalid)).toThrow(RangeError);
    }
  });

  it("never permits editing or deleting a built-in science object", () => {
    const earth = BUILT_IN_OBJECTS.find((object) => object.id === "earth")!;
    expect(() => editCustomObject(earth, validInput)).toThrow(RangeError);
    expect(() => deleteCustomObject(BUILT_IN_OBJECTS, "earth")).toThrow(RangeError);
  });
});

describe("versioned custom object persistence", () => {
  it("saves and restores versioned custom objects", () => {
    const storage = new MemoryStorage();
    const object = createCustomObject(validInput);
    saveCustomObjects(storage, [object]);
    const serialized = JSON.parse(storage.getItem(CUSTOM_OBJECTS_STORAGE_KEY)!);
    expect(serialized.version).toBe(CUSTOM_OBJECTS_STORAGE_VERSION);
    expect(loadCustomObjects(storage)).toEqual({ objects: [object], warning: null });
  });

  it("recovers visibly from malformed, unsupported, and invalid stored data", () => {
    expect(parseCustomObjects("{").warning).toContain("malformed");
    expect(parseCustomObjects(JSON.stringify({ version: 99, objects: [] })).warning).toContain("unsupported");
    const invalidObject = { ...createCustomObject(validInput), id: "earth" };
    const result = parseCustomObjects(JSON.stringify({ version: 1, objects: [invalidObject] }));
    expect(result.objects).toEqual([]);
    expect(result.warning).toContain("invalid");
  });

  it("surfaces browser storage read and write failures", () => {
    const unreadable: StorageAdapter = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    };
    expect(loadCustomObjects(unreadable).warning).toContain("unavailable");
    expect(() => saveCustomObjects(unreadable, [createCustomObject(validInput)])).toThrow("blocked");
  });

  it("does not serialize built-in entries as user-created data", () => {
    const storage = new MemoryStorage();
    expect(() => saveCustomObjects(storage, [BUILT_IN_OBJECTS[0]])).toThrow(RangeError);
    expect(storage.getItem(CUSTOM_OBJECTS_STORAGE_KEY)).toBeNull();
  });
});
