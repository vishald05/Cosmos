import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { ScaleObject } from "../scale-lab/types";
import { formatMeasurement, normalizeDimension } from "../scale-lab/engine";
import {
  createRulerLayout, formatRulerDistance, nextRulerZoom,
} from "./ruler";
import type { RulerDisplayUnit } from "./ruler";

interface DistanceRulerProps {
  start: ScaleObject;
  destination: ScaleObject;
  distanceMetres: number;
  unit: RulerDisplayUnit;
}

interface DragState {
  pointerId: number;
  startClientX: number;
  startPanX: number;
}

const INITIAL_VIEWPORT_WIDTH = 820;
const VIEWPORT_HEIGHT = 280;
const AXIS_Y = 145;

export function DistanceRuler({ start, destination, distanceMetres, unit }: DistanceRulerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [viewportWidth, setViewportWidth] = useState(INITIAL_VIEWPORT_WIDTH);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);

  const diameterAMetres = normalizeDimension(start.dimension, start.unit);
  const diameterBMetres = normalizeDimension(destination.dimension, destination.unit);
  const layout = useMemo(() => createRulerLayout({
    distanceMetres,
    diameterAMetres,
    diameterBMetres,
    viewportWidth,
    unit,
    zoom,
    panX,
  }), [distanceMetres, diameterAMetres, diameterBMetres, viewportWidth, unit, zoom, panX]);

  useEffect(() => {
    setZoom(1);
    setPanX(0);
  }, [distanceMetres, start.id, destination.id]);

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

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) => nextRulerZoom(current, Math.exp(-event.deltaY * 0.001)));
    };
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, []);

  const resetView = () => {
    setZoom(1);
    setPanX(0);
  };
  const fitToView = () => {
    const measuredWidth = viewportRef.current?.getBoundingClientRect().width;
    if (measuredWidth && measuredWidth > 0) setViewportWidth(Math.floor(measuredWidth));
    resetView();
  };
  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startPanX: layout.panX,
    };
  };
  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPanX(drag.startPanX + event.clientX - drag.startClientX);
  };
  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const startDiameterLabel = formatMeasurement(diameterAMetres, "km");
  const destinationDiameterLabel = formatMeasurement(diameterBMetres, "km");
  const distanceLabel = formatRulerDistance(distanceMetres, unit);
  const startLabelAnchor = distanceMetres === 0 ? "end" : "start";
  const destinationLabelAnchor = distanceMetres === 0 ? "start" : "end";
  const startLabelX = distanceMetres === 0 ? layout.xStart - 9 : layout.xStart;
  const destinationLabelX = distanceMetres === 0 ? layout.xEnd + 9 : layout.xEnd;

  return (
    <div className="distance-ruler">
      <div className="distance-ruler-toolbar">
        <div>
          <span className="eyebrow">PROPORTIONAL DISTANCE RULER</span>
          <small>Scale fit to the selected endpoints</small>
        </div>
        <div className="distance-ruler-controls" role="group" aria-label="Ruler view controls">
          <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => setZoom((value) => nextRulerZoom(value, 0.8))}>−</button>
          <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => setZoom((value) => nextRulerZoom(value, 1.25))}>+</button>
          <button type="button" aria-label="Fit to view" title="Fit to view" onClick={fitToView}>FIT</button>
          <button type="button" aria-label="Reset view" title="Reset view" onClick={resetView}>RESET</button>
        </div>
      </div>

      <div className="distance-ruler-viewport" ref={viewportRef}>
        <svg
          className="distance-ruler-svg"
          viewBox={`0 0 ${viewportWidth} ${VIEWPORT_HEIGHT}`}
          role="img"
          aria-label={`Straight-line distance ruler from ${start.name} to ${destination.name}`}
          data-distance-metres={distanceMetres}
          data-scale-px-per-metre={layout.scalePxPerMetre}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <title>Endpoint centers and ruler ticks share one linear scale. Object size is shown only when it fits that scale.</title>
          <line
            className="distance-ruler-axis"
            x1={layout.xStart}
            x2={layout.xEnd}
            y1={AXIS_Y}
            y2={AXIS_Y}
          />
          {layout.ticks.map((tick) => (
            <g className="distance-ruler-tick" key={tick.distanceMetres}>
              <line x1={tick.x} x2={tick.x} y1={AXIS_Y - 5} y2={AXIS_Y + 7} />
              <text x={tick.x} y={AXIS_Y + 25} textAnchor="middle">{tick.label}</text>
            </g>
          ))}

          <line className="distance-ruler-center-mark" x1={layout.xStart} x2={layout.xStart} y1={AXIS_Y - 7} y2={AXIS_Y + 8} />
          <line className="distance-ruler-center-mark" x1={layout.xEnd} x2={layout.xEnd} y1={AXIS_Y - 7} y2={AXIS_Y + 8} />
          <text className="distance-ruler-measurement" x={(layout.xStart + layout.xEnd) / 2} y={AXIS_Y - 19} textAnchor="middle">
            {distanceLabel}
          </text>
          <text className="distance-ruler-measurement-kind" x={(layout.xStart + layout.xEnd) / 2} y={AXIS_Y - 7} textAnchor="middle">
            CENTER-TO-CENTER · STRAIGHT LINE
          </text>

          {layout.renderDiameterA ? (
            <circle className="distance-ruler-body" cx={layout.xStart} cy={AXIS_Y} r={layout.diameterAPixels / 2} fill={start.color}>
              <title>{start.name} mean diameter: {startDiameterLabel}</title>
            </circle>
          ) : (
            <g className="distance-ruler-locator">
              <path d={`M ${layout.xStart - 6} ${AXIS_Y - 6} L ${layout.xStart + 6} ${AXIS_Y + 6} M ${layout.xStart + 6} ${AXIS_Y - 6} L ${layout.xStart - 6} ${AXIS_Y + 6}`} />
              <title>{start.name} locator; physical diameter {startDiameterLabel}, not to scale.</title>
            </g>
          )}
          {layout.renderDiameterB ? (
            <circle className="distance-ruler-body" cx={layout.xEnd} cy={AXIS_Y} r={layout.diameterBPixels / 2} fill={destination.color}>
              <title>{destination.name} mean diameter: {destinationDiameterLabel}</title>
            </circle>
          ) : (
            <g className="distance-ruler-locator">
              <path d={`M ${layout.xEnd - 6} ${AXIS_Y - 6} L ${layout.xEnd + 6} ${AXIS_Y + 6} M ${layout.xEnd + 6} ${AXIS_Y - 6} L ${layout.xEnd - 6} ${AXIS_Y + 6}`} />
              <title>{destination.name} locator; physical diameter {destinationDiameterLabel}, not to scale.</title>
            </g>
          )}

          <text className="distance-ruler-object-name" x={startLabelX} y={AXIS_Y - 66} textAnchor={startLabelAnchor}>
            {start.name}
          </text>
          <text className="distance-ruler-object-size" x={startLabelX} y={AXIS_Y - 51} textAnchor={startLabelAnchor}>
            {layout.renderDiameterA ? "Mean diameter" : "LOCATOR · NOT TO SCALE"}{layout.renderDiameterA ? ` · ${startDiameterLabel}` : ""}
          </text>
          <text className="distance-ruler-object-name" x={destinationLabelX} y={distanceMetres === 0 ? AXIS_Y - 28 : AXIS_Y - 66} textAnchor={destinationLabelAnchor}>
            {destination.name}
          </text>
          <text className="distance-ruler-object-size" x={destinationLabelX} y={distanceMetres === 0 ? AXIS_Y - 13 : AXIS_Y - 51} textAnchor={destinationLabelAnchor}>
            {layout.renderDiameterB ? "Mean diameter" : "LOCATOR · NOT TO SCALE"}{layout.renderDiameterB ? ` · ${destinationDiameterLabel}` : ""}
          </text>
        </svg>
      </div>

      <div className="distance-ruler-footer">
        <span>
          {layout.scalePxPerMetre > 0
            ? `1 px represents ${formatRulerDistance(1 / layout.scalePxPerMetre, unit)}`
            : "No non-zero distance scale"}
        </span>
        <span>Circles show true diameter; crosses are locator marks only.</span>
      </div>
      <div className="distance-ruler-hint">Drag to pan · scroll or use +/− to zoom · zoom {zoom.toFixed(2)}×</div>
    </div>
  );
}
