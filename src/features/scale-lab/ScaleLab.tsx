import { useMemo, useState } from "react";
import { RotateCcw, Search, Sparkles } from "lucide-react";
import { BUILT_IN_OBJECTS } from "./catalogue";
import { compareDimensions, compareSphericalVolumes, formatMeasurement, formatRatio, normalizeDimension } from "./engine";
import { ScaleVisualization } from "./ScaleVisualization";
import { CustomObjectManager } from "./CustomObjectManager";
import { useCustomObjects } from "./useCustomObjects";
import { isMeasurementUnit, MEASUREMENT_UNITS } from "./types";
import type { ComparisonLayout, MeasurementUnit, ScaleObject } from "./types";

const PRESETS = [
  { label: "Earth · Moon", ids: ["earth", "moon"] },
  { label: "Earth · Jupiter", ids: ["earth", "jupiter"] },
  { label: "Earth · Sun", ids: ["earth", "sun"] },
  { label: "Jupiter · Sun", ids: ["jupiter", "sun"] },
  { label: "Mercury · Earth", ids: ["mercury", "earth"] },
  { label: "Everest · Person", ids: ["mount-everest", "human-height"] },
  { label: "Football · Earth", ids: ["football", "earth"] },
];

function percentage(value: number): string {
  const formatted = value > 0 && value < 0.01
    ? value.toExponential(1)
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${formatted}%`;
}

export function ScaleLab() {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(["earth", "moon"]);
  const [unit, setUnit] = useState<MeasurementUnit>("km");
  const [layout, setLayout] = useState<ComparisonLayout>("baseline");
  const [allowSphericalApproximation, setAllowSphericalApproximation] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const customObjects = useCustomObjects();
  const allObjects = useMemo(() => [...BUILT_IN_OBJECTS, ...customObjects.objects], [customObjects.objects]);
  const filteredObjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return allObjects.filter((object) =>
      object.name.toLocaleLowerCase().includes(normalizedQuery)
      || object.category.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [allObjects, query]);
  const selectedObjects = selectedIds
    .map((id) => allObjects.find((object) => object.id === id))
    .filter((object): object is ScaleObject => object !== undefined);

  const toggleObject = (id: string) => {
    setSelectionMessage(null);
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else if (selectedIds.length >= 5) {
      setSelectionMessage("A comparison can contain at most five objects. Remove one before adding another.");
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };
  const selectSavedObject = (id: string) => {
    setSelectionMessage(null);
    if (selectedIds.includes(id)) return;
    if (selectedIds.length >= 5) {
      setSelectionMessage("The object was saved, but the comparison is full. Remove one object to select it.");
      return;
    }
    setSelectedIds([...selectedIds, id]);
  };
  const deleteSavedObject = (id: string) => {
    customObjects.remove(id);
    setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
  };
  const selectPreset = (ids: string[]) => {
    setSelectedIds(ids);
    setSelectionMessage(null);
  };
  const resetComparison = () => {
    setSelectedIds(["earth", "moon"]);
    setSelectionMessage(null);
    setAllowSphericalApproximation(false);
    setUnit("km");
    setLayout("baseline");
  };

  return (
    <main className="scale-lab">
      <header className="scale-lab-heading">
        <div>
          <span className="eyebrow"><Sparkles size={12} /> COSMOS / SCALE COMPARISON LAB</span>
          <h1>Put the universe <em>in perspective.</em></h1>
          <p>Compare sourced astronomical dimensions with everyday reference objects.</p>
        </div>
        <div className="scale-lab-heading-actions">
          <span className="scale-lab-count">{selectedObjects.length} / 5 OBJECTS</span>
          <button className="scale-secondary-button" onClick={resetComparison}><RotateCcw size={12} /> RESET</button>
        </div>
      </header>
      {selectionMessage && <p className="scale-selection-message" role="status">{selectionMessage}</p>}
      <div className="scale-presets" aria-label="Curated comparison presets">
        <span className="eyebrow">QUICK COMPARISONS</span>
        <div className="scale-preset-list">
          {PRESETS.map((preset) => (
            <button type="button" key={preset.label} onClick={() => selectPreset(preset.ids)}>{preset.label}</button>
          ))}
        </div>
      </div>
      <div className="scale-lab-workspace">
        <section className="scale-catalogue panel">
          <div className="scale-section-heading">
            <div>
              <span className="eyebrow">OBJECT CATALOGUE</span>
              <h2>Select objects</h2>
            </div>
          </div>
          <label className="scale-search">
            <Search size={15} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search worlds and references"
              aria-label="Search comparison objects"
            />
          </label>
          <div className="scale-object-list">
            {filteredObjects.map((object) => {
              const selected = selectedIds.includes(object.id);
              return (
                <button
                  type="button"
                  className={`scale-object-option ${selected ? "selected" : ""}`}
                  key={object.id}
                  onClick={() => toggleObject(object.id)}
                  aria-pressed={selected}
                  title={`${object.dimensionType}: ${object.dimension.toLocaleString()} ${object.unit}. Source: ${object.source.label}`}
                >
                  <span className="scale-object-swatch" style={{ backgroundColor: object.color }} />
                  <span className="scale-object-option-copy">
                    <strong>{object.name}</strong>
                    <small>{object.category} · {object.dimensionType}</small>
                  </span>
                  <span className="scale-object-value">{object.dimension.toLocaleString()} {object.unit}</span>
                </button>
              );
            })}
            {filteredObjects.length === 0 && <p className="scale-empty-state">No objects match that search.</p>}
          </div>
        </section>
        <section className="scale-visual-panel panel" aria-label="Comparison visualization">
          <div className="scale-section-heading">
            <div>
              <span className="eyebrow">PROPORTIONAL VIEW</span>
              <h2>True relative dimensions</h2>
            </div>
            <label className="scale-unit-picker">
              <span className="eyebrow">DISPLAY UNIT</span>
              <select value={unit} onChange={(event) => {
                if (isMeasurementUnit(event.target.value)) setUnit(event.target.value);
              }} aria-label="Measurement display unit">
                {MEASUREMENT_UNITS.map((measurementUnit) => <option key={measurementUnit} value={measurementUnit}>{measurementUnit}</option>)}
              </select>
            </label>
          </div>
          <ScaleVisualization objects={selectedObjects} unit={unit} layout={layout} onLayoutChange={setLayout} />
          <div className="scale-selected-list">
            {selectedObjects.map((object) => (
              <button className="scale-selected-chip" key={object.id} onClick={() => toggleObject(object.id)} aria-label={`Remove ${object.name} from comparison`}>
                <i style={{ backgroundColor: object.color }} />{object.name} · {formatMeasurement(normalizeDimension(object.dimension, object.unit), unit)} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        </section>
        <aside className="scale-results panel">
          <span className="eyebrow">DIMENSIONAL COMPARISON</span>
          <h2>Calculated results</h2>
          {selectedObjects.length > 1 ? (
            <div className="scale-result-list">
              {selectedObjects.slice(1).map((object) => {
                const anchor = selectedObjects[0];
                const comparison = compareDimensions(anchor, object);
                const larger = allObjects.find(({ id }) => id === comparison.largerId)!;
                const smaller = allObjects.find(({ id }) => id === comparison.smallerId)!;
                const ratio = Math.max(comparison.ratioAtoB, 1 / comparison.ratioAtoB);
                const sharedDimensionType = anchor.dimensionType === object.dimensionType;
                const dimensionPhrase = sharedDimensionType ? anchor.dimensionType : "measured dimension";
                const pluralDimension = sharedDimensionType
                  ? { diameter: "diameters", height: "heights", width: "widths", length: "lengths", custom: "dimensions" }[anchor.dimensionType]
                  : "measured dimensions";
                const volume = compareSphericalVolumes(anchor, object, allowSphericalApproximation);
                return (
                  <div className="scale-result-item" key={object.id}>
                    <strong>{larger.name} / {smaller.name}</strong>
                    <span>{larger.name} measures {formatRatio(ratio)}× the {dimensionPhrase} of {smaller.name}.</span>
                    <small>{larger.name} is {percentage(comparison.percentageDifference)} larger; {smaller.name} is {percentage(comparison.percentageSmaller)} smaller.</small>
                    <small>About {formatRatio(ratio)} {smaller.name} {pluralDimension} match {larger.name}'s dimension by linear ratio—not a packing calculation.</small>
                    {volume.available ? (
                      <small className="scale-volume-result">
                        {larger.name} has {formatRatio(Math.max(volume.ratioAtoB, 1 / volume.ratioAtoB))}× the
                        {volume.approximate ? " estimated" : ""} spherical volume of {smaller.name}.
                      </small>
                    ) : (
                      <small className="scale-volume-result">{volume.reason}</small>
                    )}
                    <small>Absolute difference: {formatMeasurement(comparison.absoluteDifferenceMetres, unit)}</small>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>Select at least two objects to calculate their dimensional ratio.</p>
          )}
          <p className="scale-results-footnote">
            Measurements are normalized to metres before comparison and rounded only for display.
          </p>
          {selectedObjects.some((object) => object.shape !== "sphere" || object.dimensionType !== "diameter") && (
            <label className="scale-approximation-toggle">
              <input
                type="checkbox"
                checked={allowSphericalApproximation}
                onChange={(event) => setAllowSphericalApproximation(event.target.checked)}
              />
              <span>Allow equivalent-sphere volume estimates for linear dimensions.</span>
            </label>
          )}
          <div className="scale-object-measurements">
            <span className="eyebrow">MEASUREMENTS & SOURCES</span>
            {selectedObjects.map((object) => (
              <div className="scale-measurement-note" key={object.id}>
                <strong>{object.name}</strong>
                <span>{formatMeasurement(normalizeDimension(object.dimension, object.unit), unit)} · {object.dimensionType}</span>
                <small>{object.description}</small>
                {object.source.url
                  ? <a href={object.source.url} target="_blank" rel="noreferrer" aria-label={`${object.name} source: ${object.source.label}`}>{object.source.label}</a>
                  : <span className="scale-source-label">{object.source.label}</span>}
                {object.approximationNote && <small className="scale-approximation-note">{object.approximationNote}</small>}
              </div>
            ))}
          </div>
        </aside>
      </div>
      <CustomObjectManager
        objects={customObjects.objects}
        warning={customObjects.warning}
        onCreate={customObjects.add}
        onEdit={customObjects.edit}
        onDelete={deleteSavedObject}
        onSelect={selectSavedObject}
      />
    </main>
  );
}
