import { useEffect, useState } from "react";
import {
  createCustomObject, deleteCustomObject, editCustomObject, loadCustomObjects, saveCustomObjects,
} from "./custom-objects";
import type { CustomObjectInput } from "./custom-objects";
import type { ScaleObject } from "./types";

interface CustomObjectsState {
  objects: ScaleObject[];
  warning: string | null;
}

function loadFromBrowser(): CustomObjectsState {
  if (typeof window === "undefined") return { objects: [], warning: null };
  try {
    return loadCustomObjects(window.localStorage);
  } catch {
    return { objects: [], warning: "Browser storage is unavailable. Custom objects will not persist in this session." };
  }
}

export function useCustomObjects() {
  const [state, setState] = useState<CustomObjectsState>(loadFromBrowser);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      saveCustomObjects(window.localStorage, state.objects);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown storage error.";
      setState((current) => ({ ...current, warning: `Custom objects could not be saved: ${message}` }));
    }
  }, [state.objects]);

  const add = (input: CustomObjectInput) => {
    const object = createCustomObject(input);
    setState((current) => ({ ...current, objects: [...current.objects, object] }));
    return object;
  };
  const edit = (id: string, input: CustomObjectInput) => {
    const existing = state.objects.find((object) => object.id === id);
    if (!existing) throw new RangeError("The custom object no longer exists.");
    const object = editCustomObject(existing, input);
    setState((current) => ({
      ...current,
      objects: current.objects.map((item) => item.id === id ? object : item),
    }));
    return object;
  };
  const remove = (id: string) => {
    setState((current) => ({ ...current, objects: deleteCustomObject(current.objects, id) }));
  };

  return { ...state, add, edit, remove };
}
