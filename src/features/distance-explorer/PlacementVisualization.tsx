import { useEffect, useMemo, useRef, useState } from "react";
import type { ScaleObject } from "../scale-lab/types";
import { formatMeasurement } from "../scale-lab/engine";
import { createRulerLayout, formatRulerDistance, LOCATOR_THRESHOLD_PIXELS } from "./ruler";
import type { RulerDisplayUnit } from "./ruler";
import type { SurfaceSeparationResult } from "../../science/distance";
import type { AvailablePlacementResult, OverlappingPlacementResult } from "./placement";

interface PlacementVisualizationProps {
  start: ScaleObject;
  destination: ScaleObject;
  surface: Extract<SurfaceSeparationResult, { status: "available" }>;
  placement: AvailablePlacementResult | OverlappingPlacementResult;
  unit: RulerDisplayUnit;
}

const INITIAL_VIEWPORT_WIDTH = 820;
const VIEWPORT_HEIGHT = 280;
const AXIS_Y = 165;
export const MAX_INDIVIDUAL_PLACEMENT_OBJECTS = 24;
export const GROUPED_PLACEMENT_SAMPLE_COUNT = 12;

function locatorPath(x: number, y: number): string {
  return `M ${x - 5} ${y - 5} L ${x + 5} ${y + 5} M ${x + 5} ${y - 5} L ${x - 5} ${y + 5}`;
}

export function PlacementVisualization({
  start,
  destination,
  surface,
  placement,
  unit,
}: PlacementVisualizationProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(INITIAL_VIEWPORT_WIDTH);
  const layout = useMemo(() => createRulerLayout({
    distanceMetres: surface.centerDistanceMetres,
    diameterAMetres: surface.radiusAMetres * 2,
    diameterBMetres: surface.radiusBMetres * 2,
    viewportWidth,
    unit,
  }), [
    surface.centerDistanceMetres,
    surface.radiusAMetres,
    surface.radiusBMetres,
    viewportWidth,
    unit,
  ]);
  const scale = layout.scalePxPerMetre;
  const startSurfaceX = layout.xStart + surface.radiusAMetres * scale;
  const destinationSurfaceX = layout.xEnd - surface.radiusBMetres * scale;
  const availableGapEndX = startSurfaceX + placement.availableGapMetres * scale;
  const occupiedLengthMetres = placement.status === "available"
    ? Math.max(0, placement.availableGapMetres - placement.remainingMetres)
    : 0;
  const occupiedEndX = Math.min(destinationSurfaceX, startSurfaceX + occupiedLengthMetres * scale);
  const objectDiameterPixels = placement.intermediateDimensionMetres * scale;
  const isSpherical = placement.calculationType === "spherical-identical-object-placement";
  const objectBelowResolution = objectDiameterPixels < LOCATOR_THRESHOLD_PIXELS;
  const startDiameterPixels = surface.radiusAMetres * 2 * scale;
  const destinationDiameterPixels = surface.radiusBMetres * 2 * scale;
  const largestEndpointRadiusPixels = Math.max(startDiameterPixels, destinationDiameterPixels) / 2;
  const axisY = Math.max(AXIS_Y, largestEndpointRadiusPixels + 42);
  const locatorY = axisY + largestEndpointRadiusPixels + 12;
  const annotationY = locatorY + 27;
  const remainingLabelY = annotationY + 18;
  const viewHeight = Math.max(VIEWPORT_HEIGHT, remainingLabelY + 36);
  const renderMode = placement.status === "overlapping-endpoints"
    ? "none"
    : placement.objectCount > BigInt(MAX_INDIVIDUAL_PLACEMENT_OBJECTS)
      || (objectBelowResolution && placement.objectCount > 1n) ? "grouped" : "individual";
  const displayedObjectCount = renderMode === "individual"
    ? Number(placement.objectCount)
    : renderMode === "grouped"
      ? objectBelowResolution ? 1 : GROUPED_PLACEMENT_SAMPLE_COUNT
      : 0;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      if (width > 0) setViewportWidth((current) => current === width ? current : width);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const objectPositions = Array.from({ length: displayedObjectCount }, (_, index) => {
    if (renderMode === "individual") {
      return startSurfaceX + (index + 0.5) * objectDiameterPixels;
    }
    return startSurfaceX + occupiedLengthMetres * scale * ((index + 0.5) / displayedObjectCount);
  });
  const groupDescription = placement.objectCount.toLocaleString("en-US");
  const ariaDescription = placement.status === "overlapping-endpoints"
    ? `${start.name} and ${destination.name} overlap; no intermediate objects are placed.`
    : `${start.name}, ${groupDescription} complete ${placement.sources.intermediate.name} copies, then ${destination.name}.`;

  return (
    <div className="placement-visualization" ref={viewportRef}>
      <svg
        className="placement-visualization-svg"
        viewBox={`0 0 ${viewportWidth} ${viewHeight}`}
        role="img"
        aria-label={ariaDescription}
        data-total-count={placement.objectCount.toString()}
        data-render-mode={renderMode}
        data-sample-count={displayedObjectCount}
        data-locator-lane={renderMode !== "none" && objectBelowResolution ? "true" : "false"}
      >
        <title>Endpoint centers and object dimensions share the distance ruler's linear scale.</title>
        {placement.status === "available" && (
          <>
            <line
              className="placement-gap-base"
              x1={startSurfaceX}
              x2={availableGapEndX}
              y1={axisY}
              y2={axisY}
            />
            {occupiedLengthMetres > 0 && (
              renderMode === "grouped" ? (
                <rect
                  className="placement-group-band"
                  x={startSurfaceX}
                  y={axisY - 9}
                  width={occupiedEndX - startSurfaceX}
                  height={18}
                  rx={4}
                />
              ) : (
                <line
                  className="placement-occupied-range"
                  x1={startSurfaceX}
                  x2={occupiedEndX}
                  y1={axisY}
                  y2={axisY}
                />
              )
            )}
            {placement.remainingMetres > 0 && (
              <line
                className="placement-remaining-range"
                x1={occupiedEndX}
                x2={destinationSurfaceX}
                y1={axisY}
                y2={axisY}
              />
            )}
            {placement.remainingMetres === 0 && placement.availableGapMetres > 0 && (
              <line
                className="placement-exact-fit-mark"
                x1={destinationSurfaceX}
                x2={destinationSurfaceX}
                y1={axisY - 10}
                y2={axisY + 10}
              />
            )}
          </>
        )}

        <g className="placement-endpoint" data-endpoint="start">
          {startDiameterPixels >= LOCATOR_THRESHOLD_PIXELS ? (
            <circle cx={layout.xStart} cy={axisY} r={startDiameterPixels / 2} fill={start.color}>
              <title>{start.name} physical mean diameter: {formatMeasurement(surface.radiusAMetres * 2, "km")}</title>
            </circle>
          ) : (
            <path className="placement-locator" d={locatorPath(layout.xStart, axisY)}>
              <title>{start.name} locator only; endpoint size is below one pixel at this scale.</title>
            </path>
          )}
          <text className="placement-endpoint-name" x={layout.margin} y={axisY - largestEndpointRadiusPixels - 26} textAnchor="start">{start.name}</text>
          <text className="placement-endpoint-size" x={layout.margin} y={axisY - largestEndpointRadiusPixels - 11} textAnchor="start">
            {startDiameterPixels >= LOCATOR_THRESHOLD_PIXELS
              ? `Mean diameter · ${formatMeasurement(surface.radiusAMetres * 2, "km")}`
              : "LOCATOR · NOT TO SCALE"}
          </text>
        </g>

        {objectPositions.map((x, index) => (
          <g
            className="placement-intermediate"
            data-copy-index={renderMode === "individual" ? index : undefined}
            data-copy-sample={renderMode === "grouped" ? index : undefined}
            key={`${renderMode}-${index}`}
          >
            {objectDiameterPixels < LOCATOR_THRESHOLD_PIXELS ? (
              <>
                <line className="placement-locator-leader" x1={x} x2={x} y1={axisY + 5} y2={locatorY - 5} />
                <path className="placement-locator" d={locatorPath(x, locatorY)} />
                <title>
                  {placement.sources.intermediate.name} locator only; physical dimension {formatRulerDistance(placement.intermediateDimensionMetres, unit)} is below one pixel at this scale.
                </title>
              </>
            ) : isSpherical ? (
              <circle cx={x} cy={axisY} r={objectDiameterPixels / 2} fill={placement.sources.intermediate.color} />
            ) : (
              <line
                className="placement-linear-dimension"
                stroke={placement.sources.intermediate.color}
                x1={x - objectDiameterPixels / 2}
                x2={x + objectDiameterPixels / 2}
                y1={axisY}
                y2={axisY}
              />
            )}
          </g>
        ))}

        {placement.status === "overlapping-endpoints" && (
          <text className="placement-overlap-annotation" x={(layout.xStart + layout.xEnd) / 2} y={annotationY} textAnchor="middle">
            ENDPOINTS OVERLAP · NO AVAILABLE GAP
          </text>
        )}
        {placement.status === "available" && (
          <>
            <text className="placement-gap-label" x={(startSurfaceX + destinationSurfaceX) / 2} y={annotationY} textAnchor="middle">
              AVAILABLE SURFACE GAP · {placement.objectCount === 0n ? "NO COMPLETE OBJECTS FIT" : `${groupDescription} COMPLETE`}
            </text>
            <text className="placement-remaining-label" x={(occupiedEndX + destinationSurfaceX) / 2} y={remainingLabelY} textAnchor="middle">
              REMAINING · {formatRulerDistance(placement.remainingMetres, unit)}
            </text>
            <text className="placement-scale-label" x={layout.viewportWidth / 2} y={viewHeight - 8} textAnchor="middle">
              One shared linear scale · {formatRulerDistance(placement.intermediateDimensionMetres, unit)} per intermediate object
            </text>
          </>
        )}

        <g className="placement-endpoint" data-endpoint="destination">
          {destinationDiameterPixels >= LOCATOR_THRESHOLD_PIXELS ? (
            <circle cx={layout.xEnd} cy={axisY} r={destinationDiameterPixels / 2} fill={destination.color}>
              <title>{destination.name} physical mean diameter: {formatMeasurement(surface.radiusBMetres * 2, "km")}</title>
            </circle>
          ) : (
            <path className="placement-locator" d={locatorPath(layout.xEnd, axisY)}>
              <title>{destination.name} locator only; endpoint size is below one pixel at this scale.</title>
            </path>
          )}
          <text className="placement-endpoint-name" x={layout.viewportWidth - layout.margin} y={axisY - largestEndpointRadiusPixels - 26} textAnchor="end">{destination.name}</text>
          <text className="placement-endpoint-size" x={layout.viewportWidth - layout.margin} y={axisY - largestEndpointRadiusPixels - 11} textAnchor="end">
            {destinationDiameterPixels >= LOCATOR_THRESHOLD_PIXELS
              ? `Mean diameter · ${formatMeasurement(surface.radiusBMetres * 2, "km")}`
              : "LOCATOR · NOT TO SCALE"}
          </text>
        </g>
      </svg>
      {renderMode === "grouped" && placement.status === "available" && (
        <p className="placement-group-note" role="note">
          The highlighted span is the space occupied by all {groupDescription} copies. {displayedObjectCount} representative {displayedObjectCount === 1 ? "mark is" : "marks are"} shown, not every object.
        </p>
      )}
      <div className="placement-visual-legend">
        <span>Filled circles / line lengths use physical dimensions.</span>
        <span>Crosses are not enlarged; intermediate locator marks use a separate vertical lane.</span>
      </div>
    </div>
  );
}
