import { formatRulerDistance } from "./ruler";
import type { RulerDisplayUnit } from "./ruler";
import type { SurfaceSeparationResult } from "../../science/distance";
import type { ScaleObject } from "../scale-lab/types";
import type { PlacementResult } from "./placement";
import { PlacementVisualization } from "./PlacementVisualization";

interface ObjectPlacementSimulatorProps {
  start: ScaleObject;
  destination: ScaleObject;
  intermediate: ScaleObject | undefined;
  surface: SurfaceSeparationResult | null;
  placement: PlacementResult | null;
  unit: RulerDisplayUnit;
}

function calculationLabel(placement: Extract<PlacementResult, { status: "available" | "overlapping-endpoints" }>): string {
  return placement.calculationType === "spherical-identical-object-placement"
    ? "SPHERICAL COPY PLACEMENT"
    : "ONE-DIMENSIONAL PLACEMENT ESTIMATE";
}

export function ObjectPlacementSimulator({
  start,
  destination,
  intermediate,
  surface,
  placement,
  unit,
}: ObjectPlacementSimulatorProps) {
  const completedPlacement = placement?.status === "available" || placement?.status === "overlapping-endpoints"
    ? placement
    : null;
  const surfaceAvailable = surface?.status === "available" ? surface : null;
  const isLinearEstimate = completedPlacement
    ? completedPlacement.calculationType === "linear-one-dimensional-placement-estimate"
    : intermediate?.shape === "linear";

  return (
    <section className="placement-simulator" aria-labelledby="placement-simulator-heading">
      <div className="placement-heading">
        <div>
          <span className="eyebrow">GEOMETRIC PLACEMENT · NOT AN ORBITAL SIMULATION</span>
          <h3 id="placement-simulator-heading">How many fit in the gap?</h3>
          {intermediate && (
            <p>
              {intermediate.name} · {intermediate.builtIn ? "STANDARD CATALOGUE OBJECT" : "CUSTOM OBJECT"}
              {" · "}
              {intermediate.shape === "sphere" && intermediate.dimensionType === "diameter"
                ? "spherical diameter"
                : "one-dimensional measurement"}
            </p>
          )}
        </div>
        {completedPlacement && (
          <span className="placement-calculation-badge">{calculationLabel(completedPlacement)}</span>
        )}
      </div>

      {completedPlacement ? (
        <>
          <div className="placement-result-grid">
            <article className="placement-result-card placement-count-card">
              <span className="eyebrow">COMPLETE IDENTICAL OBJECTS</span>
              <strong>{completedPlacement.objectCount.toLocaleString("en-US")}</strong>
              <small>{intermediate?.name ?? "Selected object"} copies · exact count</small>
            </article>
            <article className="placement-result-card">
              <span className="eyebrow">AVAILABLE SURFACE GAP</span>
              <strong>{formatRulerDistance(completedPlacement.availableGapMetres, unit)}</strong>
              <small>Center separation less both endpoint mean radii</small>
            </article>
            <article className="placement-result-card">
              <span className="eyebrow">INTERMEDIATE DIMENSION</span>
              <strong>{formatRulerDistance(completedPlacement.intermediateDimensionMetres, unit)}</strong>
              <small>{completedPlacement.sources.intermediate.measurementMode === "spherical-diameter"
                ? "Catalogue or user-supplied spherical diameter"
                : "One-dimensional length; no spherical assumption"}</small>
            </article>
            <article className="placement-result-card">
              <span className="eyebrow">UNUSED REMAINDER</span>
              <strong>{formatRulerDistance(completedPlacement.remainingMetres, unit)}</strong>
              <small>{completedPlacement.remainingMetres === 0
                ? "No unused gap remains"
                : "Space after the complete objects, before the destination surface"}</small>
            </article>
          </div>

          {completedPlacement.status === "overlapping-endpoints" && (
            <p className="placement-overlap-message" role="status">
              The selected endpoint bodies overlap by {formatRulerDistance(completedPlacement.overlapMetres, unit)}.
              No space is available for intermediate objects.
            </p>
          )}
          {completedPlacement.status === "available" && completedPlacement.objectCount === 0n && (
            <p className="placement-zero-message" role="status">
              This is a valid zero-object result: the available gap is smaller than one {intermediate?.name ?? "selected object"}.
            </p>
          )}

          {surfaceAvailable && (
            <PlacementVisualization
              start={start}
              destination={destination}
              surface={surfaceAvailable}
              placement={completedPlacement}
              unit={unit}
            />
          )}
        </>
      ) : (
        <div className="placement-unavailable" role="status">
          <strong>{placement?.status === "invalid-dimension" ? "Invalid object dimension" : "Placement unavailable"}</strong>
          <p>
            {placement && placement.status !== "available" && placement.status !== "overlapping-endpoints"
              ? placement.reason
              : surface?.status === "unavailable" || surface?.status === "invalid-input"
                ? surface.reason
                : intermediate
                  ? `The selected object ${intermediate.name} does not have a supported physical measurement.`
                  : "Choose an eligible intermediate object with a valid physical measurement."}
          </p>
          <span>No object count or placement has been fabricated.</span>
        </div>
      )}

      <p className="placement-assumptions">
        {placement?.status === "unsupported-measurement-type"
          ? "No geometry is estimated for this unsupported measurement."
          : isLinearEstimate
            ? "Linear estimates align the measured dimension end-to-end along one axis; thickness and orientation are not modeled."
            : "Spherical mode assumes identical spherical copies touching with no gaps."}
        {" "}Where a placement estimate is available, it assumes a straight line and excludes orbital dynamics, gravity,
        collision dynamics, and physical stability. It does not imply a naturally occurring arrangement in space.
      </p>
      <p className="placement-endpoints">
        Uses the existing {start.name} → {destination.name} Phase 4.2 surface-gap result. The distance ruler above remains a separate center-to-center view.
      </p>
    </section>
  );
}
