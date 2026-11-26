import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { DIMENSION_TYPES, isDimensionType, isMeasurementUnit, MEASUREMENT_UNITS } from "./types";
import type { DimensionType, MeasurementUnit, ScaleObject, ScaleShape } from "./types";
import type { CustomObjectInput } from "./custom-objects";
import { normalizeDimension, formatMeasurement } from "./engine";

interface CustomObjectManagerProps {
  objects: readonly ScaleObject[];
  warning: string | null;
  onCreate: (input: CustomObjectInput) => ScaleObject;
  onEdit: (id: string, input: CustomObjectInput) => ScaleObject;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

interface FormDraft {
  name: string;
  description: string;
  dimension: string;
  unit: MeasurementUnit;
  dimensionType: DimensionType;
  shape: ScaleShape;
  color: string;
}

const EMPTY_DRAFT: FormDraft = {
  name: "",
  description: "",
  dimension: "",
  unit: "m",
  dimensionType: "height",
  shape: "linear",
  color: "#e6ba7a",
};

function draftFromObject(object: ScaleObject): FormDraft {
  return {
    name: object.name,
    description: object.description,
    dimension: String(object.dimension),
    unit: object.unit,
    dimensionType: object.dimensionType,
    shape: object.shape,
    color: object.color,
  };
}

export function CustomObjectManager({
  objects, warning, onCreate, onEdit, onDelete, onSelect,
}: CustomObjectManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
    setDialogOpen(true);
  };
  const openEdit = (object: ScaleObject) => {
    setEditingId(object.id);
    setDraft(draftFromObject(object));
    setError(null);
    setDialogOpen(true);
  };
  const closeDialog = () => {
    setDialogOpen(false);
    setError(null);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const input: CustomObjectInput = {
        ...draft,
        dimension: Number(draft.dimension),
      };
      const saved = editingId ? onEdit(editingId, input) : onCreate(input);
      onSelect(saved.id);
      closeDialog();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The custom object could not be saved.");
    }
  };

  return (
    <section className="scale-custom-manager panel" aria-labelledby="custom-objects-heading">
      <div className="scale-section-heading">
        <div>
          <span className="eyebrow">YOUR REFERENCES</span>
          <h2 id="custom-objects-heading">Custom objects</h2>
        </div>
        <button className="scale-primary-button" onClick={openCreate}><Plus size={13} /> CREATE OBJECT</button>
      </div>
      {warning && <p className="scale-storage-warning" role="status">{warning}</p>}
      {objects.length === 0 ? (
        <p className="scale-custom-empty">No saved objects yet. Add a personal reference to compare it with the catalogue.</p>
      ) : (
        <div className="scale-saved-object-list">
          {objects.map((object) => (
            <div className="scale-saved-object" key={object.id}>
              <button className="scale-saved-object-select" onClick={() => onSelect(object.id)}>
                <i style={{ backgroundColor: object.color }} />
                <span><strong>{object.name}</strong><small>{object.dimensionType} · {formatMeasurement(normalizeDimension(object.dimension, object.unit), object.unit)}</small></span>
              </button>
              <button className="scale-mini-button" aria-label={`Edit ${object.name}`} title={`Edit ${object.name}`} onClick={() => openEdit(object)}><Pencil size={13} /></button>
              <button className="scale-mini-button danger" aria-label={`Delete ${object.name}`} title={`Delete ${object.name}`} onClick={() => onDelete(object.id)}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
      {dialogOpen && (
        <div className="scale-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}>
          <section className="scale-object-dialog panel" role="dialog" aria-modal="true" aria-labelledby="scale-object-dialog-title">
            <div className="scale-section-heading">
              <div>
                <span className="eyebrow">USER-DEFINED REFERENCE</span>
                <h2 id="scale-object-dialog-title">{editingId ? "Edit object" : "Create custom object"}</h2>
              </div>
              <button className="icon-button" aria-label="Close custom object form" onClick={closeDialog}><X size={15} /></button>
            </div>
            <form className="scale-object-form" onSubmit={submit}>
              <label>
                <span>OBJECT NAME</span>
                <input required maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} autoFocus />
              </label>
              <label>
                <span>DIMENSION VALUE</span>
                <input type="number" min="0" step="any" required value={draft.dimension} onChange={(event) => setDraft({ ...draft, dimension: event.target.value })} />
              </label>
              <div className="scale-form-pair">
                <label>
                  <span>UNIT</span>
                  <select value={draft.unit} onChange={(event) => {
                    if (isMeasurementUnit(event.target.value)) setDraft({ ...draft, unit: event.target.value });
                  }}>
                    {MEASUREMENT_UNITS.map((unit) => <option value={unit} key={unit}>{unit}</option>)}
                  </select>
                </label>
                <label>
                  <span>MEASUREMENT TYPE</span>
                  <select value={draft.dimensionType} onChange={(event) => {
                    if (isDimensionType(event.target.value)) setDraft({ ...draft, dimensionType: event.target.value });
                  }}>
                    {DIMENSION_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}
                  </select>
                </label>
              </div>
              <label className="scale-sphere-option">
                <input
                  type="checkbox"
                  checked={draft.shape === "sphere"}
                  onChange={(event) => setDraft({
                    ...draft,
                    shape: event.target.checked ? "sphere" : "linear",
                    dimensionType: event.target.checked ? "diameter" : draft.dimensionType,
                  })}
                />
                <span>Model this object as a sphere using its diameter for volume estimates.</span>
              </label>
              <label>
                <span>DESCRIPTION <small>OPTIONAL</small></span>
                <textarea maxLength={280} rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </label>
              <label className="scale-color-field">
                <span>DISPLAY COLOUR</span>
                <input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
              </label>
              {error && <p className="scale-form-error" role="alert">{error}</p>}
              <div className="scale-form-actions">
                <button type="button" className="scale-secondary-button" onClick={closeDialog}>CANCEL</button>
                <button type="submit" className="scale-primary-button">{editingId ? "SAVE CHANGES" : "SAVE OBJECT"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
