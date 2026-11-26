import { useMemo, useState } from "react";
import { Orbit, Ruler } from "lucide-react";
import {
  calculateInstantaneousDistance,
  calculateLightTravelTime,
  calculateSurfaceSeparationFromDistance,
} from "../../science/distance";
import { formatMeasurement, normalizeDimension } from "../scale-lab/engine";
import { useCustomObjects } from "../scale-lab/useCustomObjects";
import { DISTANCE_ENDPOINTS, getIntermediateObjects } from "./catalogue";
import { DistanceRuler } from "./DistanceRuler";
import { DistanceJourney } from "./DistanceJourney";
import { calculateObjectPlacement, isPlacementObjectEligible } from "./placement";
import { ObjectPlacementSimulator } from "./ObjectPlacementSimulator";
import {
  formatLightTravelTime, formatRulerDistance, isRulerDisplayUnit, RULER_DISPLAY_UNITS,
} from "./ruler";
import type { RulerDisplayUnit } from "./ruler";

const J2000_DAYS = 0;

function endpointStatus(position: (typeof DISTANCE_ENDPOINTS)[number]["position"]): string {
  if (position.kind === "unavailable") return position.reason;
  if (position.kind === "heliocentric-origin") {
    return "The Sun is the origin of the existing heliocentric coordinate frame.";
  }
  return "Position is supplied by the existing JPL secular-element model.";
}

function surfaceDescription(
  relation: "separated" | "touching" | "overlapping",
  gapMetres: number,
  overlapMetres: number,
  unit: RulerDisplayUnit,
): string {
  if (relation === "overlapping") {
    return `Overlapping by ${formatRulerDistance(overlapMetres, unit, 6)}`;
  }
  if (relation === "touching") return "Surfaces touching";
  return `Surface gap ${formatRulerDistance(gapMetres, unit, 6)}`;
}

export function DistanceExplorer() {
  const { objects: customObjects, warning } = useCustomObjects();
  const intermediateObjects = getIntermediateObjects(customObjects).filter(isPlacementObjectEligible);
  const [startId, setStartId] = useState("earth");
  const [destinationId, setDestinationId] = useState("mars");
  const [intermediateId, setIntermediateId] = useState("moon");
  const [unit, setUnit] = useState<RulerDisplayUnit>("AU");
  const start = DISTANCE_ENDPOINTS.find(({ object }) => object.id === startId);
  const destination = DISTANCE_ENDPOINTS.find(({ object }) => object.id === destinationId);
  const intermediate = intermediateObjects.find(({ id }) => id === intermediateId);
  const startUnavailable = start?.position.kind === "unavailable";
  const destinationUnavailable = destination?.position.kind === "unavailable";

  const centerResult = useMemo(() => start && destination
    ? calculateInstantaneousDistance(start.object.id, destination.object.id, J2000_DAYS)
    : null, [start, destination]);
  const surfaceResult = useMemo(() => centerResult
    ? calculateSurfaceSeparationFromDistance(centerResult)
    : null, [centerResult]);
  const placementResult = useMemo(() => surfaceResult && intermediate
    ? calculateObjectPlacement(surfaceResult, intermediate)
    : null, [surfaceResult, intermediate]);
  const lightTravelResult = useMemo(() => centerResult?.status === "available"
    ? calculateLightTravelTime(centerResult.distanceMetres)
    : null, [centerResult]);

  return (
    <main className="distance-explorer">
      <header className="distance-explorer-heading">
        <div>
          <span className="eyebrow"><Orbit size={12} /> COSMOS / DISTANCE EXPLORER</span>
          <h1>How much space is <em>between?</em></h1>
          <p>Measure straight-line separation and explore geometric object placement at J2000.0.</p>
        </div>
        <span className="distance-foundation-badge">SCIENTIFIC DISTANCE LAB</span>
      </header>

      {warning && <p className="scale-storage-warning" role="status">{warning}</p>}

      <section className="distance-selection panel" aria-labelledby="distance-selection-heading">
        <div className="distance-section-title">
          <div>
            <span className="eyebrow">MEASUREMENT SETUP</span>
            <h2 id="distance-selection-heading">Choose your objects</h2>
          </div>
          <Ruler size={17} aria-hidden="true" />
        </div>

        <div className="distance-selector-grid">
          <label className="distance-selector-card" htmlFor="distance-start">
            <span>STARTING OBJECT</span>
            <select id="distance-start" value={startId} onChange={(event) => setStartId(event.target.value)}>
              {DISTANCE_ENDPOINTS.map(({ object, position }) => (
                <option key={object.id} value={object.id}>
                  {object.name} · {position.label}
                </option>
              ))}
            </select>
            {start && <small>{endpointStatus(start.position)}</small>}
          </label>

          <label className="distance-selector-card" htmlFor="distance-destination">
            <span>DESTINATION OBJECT</span>
            <select id="distance-destination" value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>
              {DISTANCE_ENDPOINTS.map(({ object, position }) => (
                <option key={object.id} value={object.id}>
                  {object.name} · {position.label}
                </option>
              ))}
            </select>
            {destination && <small>{endpointStatus(destination.position)}</small>}
          </label>

          <label className="distance-selector-card" htmlFor="distance-intermediate">
            <span>INTERMEDIATE OBJECT</span>
            <select
              id="distance-intermediate"
              value={intermediate?.id ?? ""}
              disabled={intermediateObjects.length === 0}
              onChange={(event) => setIntermediateId(event.target.value)}
            >
              {intermediateObjects.map((object) => {
                const measurementMode = object.shape === "sphere" && object.dimensionType === "diameter"
                  ? "spherical diameter"
                  : "one-dimensional";
                return (
                <option key={object.id} value={object.id}>
                  {object.name} · {formatMeasurement(normalizeDimension(object.dimension, object.unit), object.unit)}
                  {" · "}
                  {object.builtIn ? "catalogue" : "custom"} · {measurementMode}
                </option>
                );
              })}
            </select>
            {intermediate && (
              <small>
                {formatMeasurement(normalizeDimension(intermediate.dimension, intermediate.unit), intermediate.unit)}
                {" · "}{intermediate.builtIn ? "standard catalogue object" : "custom object"}
                {" · "}
                {intermediate.shape === "sphere" && intermediate.dimensionType === "diameter"
                  ? "spherical diameter"
                  : `one-dimensional ${intermediate.dimensionType}`}
              </small>
            )}
            {intermediateObjects.length === 0 && <small>No catalogue objects have valid supported dimensions.</small>}
          </label>
        </div>

        {startUnavailable || destinationUnavailable ? (
          <p className="distance-position-warning" role="status">
            A selected endpoint has no supported position model. Its catalogue entry remains selectable, but no distance can be calculated from an invented position.
          </p>
        ) : (
          <p className="distance-position-ready" role="status">
            Both endpoints have a position source in the existing Solar System model.
          </p>
        )}
      </section>

      <section className="distance-results panel" aria-labelledby="distance-results-heading">
        <div className="distance-results-heading">
          <div>
            <span className="eyebrow">J2000.0 · INSTANTANEOUS MEASUREMENT</span>
            <h2 id="distance-results-heading">
              {start?.object.name ?? "Starting object"} <span aria-hidden="true">→</span> {destination?.object.name ?? "Destination"}
            </h2>
          </div>
          <label className="distance-unit-control" htmlFor="distance-unit">
            <span>DISTANCE DISPLAY UNIT</span>
            <select
              id="distance-unit"
              value={unit}
              onChange={(event) => {
                if (isRulerDisplayUnit(event.target.value)) setUnit(event.target.value);
              }}
            >
              {RULER_DISPLAY_UNITS.map((displayUnit) => (
                <option key={displayUnit} value={displayUnit}>{displayUnit}</option>
              ))}
            </select>
          </label>
        </div>

        {centerResult?.status === "available" && start && destination ? (
          <>
            <DistanceRuler
              start={start.object}
              destination={destination.object}
              distanceMetres={centerResult.distanceMetres}
              unit={unit}
            />
            <div className="distance-measurement-grid">
              <article className="distance-measurement-card">
                <span className="eyebrow">INSTANTANEOUS CENTER-TO-CENTER</span>
                <strong>{formatRulerDistance(centerResult.distanceMetres, unit)}</strong>
                <small>Physical straight-line distance · J2000.0</small>
              </article>
              <article className="distance-measurement-card">
                <span className="eyebrow">INSTANTANEOUS SURFACE-TO-SURFACE</span>
                {surfaceResult?.status === "available" ? (
                  <>
                    <strong>{surfaceDescription(
                      surfaceResult.relation,
                      surfaceResult.availableSurfaceGapMetres,
                      surfaceResult.overlapMetres,
                      unit,
                    )}</strong>
                    <small>Calculated from catalogue mean radii; spherical-body assumption</small>
                  </>
                ) : (
                  <>
                    <strong>Unavailable</strong>
                    <small>{surfaceResult?.reason ?? "Surface separation is unavailable."}</small>
                  </>
                )}
              </article>
              <article className="distance-measurement-card">
                <span className="eyebrow">VACUUM LIGHT-TRAVEL TIME</span>
                <strong>{lightTravelResult ? formatLightTravelTime(lightTravelResult) : "Unavailable"}</strong>
                <small>Time at the vacuum speed of light · distinct from physical distance</small>
              </article>
            </div>
            <p className="distance-light-unit-note">
              Light-based distance units express the distance using light-travel time units; the separate travel-time result is shown above.
            </p>
          </>
        ) : (
          <div className="distance-unavailable" role="status">
            <strong>Distance ruler unavailable</strong>
            <p>
              {centerResult && centerResult.status !== "available"
                ? centerResult.reason
                : "Select two endpoints with supported positions to calculate and render their separation."}
            </p>
            <span>No endpoint positions or distance have been fabricated.</span>
          </div>
        )}
        {start && destination && (
          <ObjectPlacementSimulator
            start={start.object}
            destination={destination.object}
            intermediate={intermediate}
            surface={surfaceResult}
            placement={placementResult}
            unit={unit}
          />
        )}
        <DistanceJourney daysSinceJ2000Tdb={J2000_DAYS} unit={unit} />
      </section>

      <section className="distance-method-note" aria-label="Distance method">
        <span className="eyebrow">STRAIGHT-LINE METHOD</span>
        <p>
          The ruler maps the Phase 4.2 center-to-center distance to one shared linear scale. It does not show orbital paths,
          and changing its zoom or pan never changes the scientific result.
        </p>
      </section>
    </main>
  );
}
