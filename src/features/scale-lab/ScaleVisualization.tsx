import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { formatMeasurement, normalizeDimension, createSharedScaleLayout, MIN_ZOOM, MAX_ZOOM } from "./engine";
import type { ComparisonLayout, MeasurementUnit, ScaleObject } from "./types";

interface ScaleVisualizationProps {
  objects: readonly ScaleObject[];
  unit: MeasurementUnit;
  layout: ComparisonLayout;
  onLayoutChange: (layout: ComparisonLayout) => void;
}

interface Viewport {
  width: number;
  height: number;
}

const INITIAL_VIEWPORT: Viewport = { width: 900, height: 410 };

function nextZoom(current: number, multiplier: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * multiplier));
}

export function ScaleVisualization({ objects, unit, layout, onLayoutChange }: ScaleVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setViewport({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) => nextZoom(current, Math.exp(-event.deltaY * 0.001)));
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const measuredObjects = useMemo(() => objects.map((object) => ({
    object,
    dimensionMetres: normalizeDimension(object.dimension, object.unit),
  })), [objects]);
  const visual = useMemo(() => createSharedScaleLayout(
    measuredObjects.map(({ object, dimensionMetres }) => ({ id: object.id, dimensionMetres })),
    viewport.width,
    viewport.height,
    layout,
    zoom,
  ), [measuredObjects, viewport, layout, zoom]);
  const dimensionsById = useMemo(
    () => new Map(visual.dimensions.map((dimension) => [dimension.id, dimension])),
    [visual.dimensions],
  );
  const insetObject = measuredObjects.find(({ object }) => visual.belowResolutionIds.includes(object.id));
  const lineY = layout === "baseline" ? visual.baselineY : viewport.height / 2;
  const scaleLabel = visual.scaleFactor > 0
    ? `1 px represents ${formatMeasurement(1 / visual.scaleFactor, "m")}`
    : "Select an object to establish the scale";

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
  };
  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan({ x: drag.panX + event.clientX - drag.x, y: drag.panY + event.clientY - drag.y });
  };
  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };
  return (
    <div className="scale-chart">
      <div className="scale-chart-toolbar">
        <div className="scale-layout-switch" role="group" aria-label="Comparison layout">
          <button className={layout === "baseline" ? "active" : ""} onClick={() => onLayoutChange("baseline")}>SHARED BASELINE</button>
          <button className={layout === "centered" ? "active" : ""} onClick={() => onLayoutChange("centered")}>CENTERED</button>
        </div>
        <div className="scale-zoom-controls" role="group" aria-label="Visualization zoom">
          <button aria-label="Zoom out" title="Zoom out" onClick={() => setZoom((current) => nextZoom(current, 0.8))}><Minus size={13} /></button>
          <button aria-label="Reset zoom and pan" title="Reset zoom and pan" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw size={12} /></button>
          <button aria-label="Zoom in" title="Zoom in" onClick={() => setZoom((current) => nextZoom(current, 1.25))}><Plus size={13} /></button>
        </div>
      </div>
      <div className="scale-chart-viewport" ref={containerRef}>
        {objects.length === 0 ? (
          <div className="scale-empty-chart">Select at least one object to see its measured dimension.</div>
        ) : (
          <svg
            className="scale-svg"
            viewBox={`0 0 ${viewport.width} ${viewport.height}`}
            role="img"
            aria-label={`Proportional comparison of ${objects.map(({ name }) => name).join(", ")}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            <title>Objects are displayed with one shared scale multiplier.</title>
            <g transform={`translate(${pan.x} ${pan.y})`}>
              <line className="scale-baseline" x1="20" x2={viewport.width - 20} y1={lineY} y2={lineY} />
              {measuredObjects.map(({ object }) => {
                const item = dimensionsById.get(object.id);
                if (!item) return null;
                const dimensionPx = item.dimensionPixels;
                const isVisible = item.visibleInPrimaryScale;
                const centerY = object.shape === "linear" && layout === "baseline"
                  ? visual.baselineY
                  : item.centerY;
                const labelY = object.shape === "sphere"
                  ? Math.max(20, centerY - dimensionPx / 2 - 12)
                  : Math.max(20, centerY - 15);
                return (
                  <g key={object.id} className="scale-visual-object">
                    {isVisible && object.shape === "sphere" && (
                      <circle
                        cx={item.centerX}
                        cy={centerY}
                        r={dimensionPx / 2}
                        fill={object.color}
                        fillOpacity="0.82"
                      />
                    )}
                    {isVisible && object.shape === "linear" && (
                      <line
                        x1={item.centerX - dimensionPx / 2}
                        x2={item.centerX + dimensionPx / 2}
                        y1={centerY}
                        y2={centerY}
                        stroke={object.color}
                        strokeWidth="2"
                        strokeLinecap="butt"
                      />
                    )}
                    <text x={item.centerX} y={labelY} textAnchor="middle" className="scale-visual-name">{object.name}</text>
                    <text x={item.centerX} y={labelY + 13} textAnchor="middle" className="scale-visual-value">
                      {formatMeasurement(item.dimensionMetres, unit)}
                    </text>
                    {!isVisible && (
                      <text x={item.centerX} y={lineY + 18} textAnchor="middle" className="scale-below-resolution">
                        &lt; 1 px at this scale
                      </text>
                    )}
                    {isVisible && object.shape === "linear" && (
                      <text x={item.centerX} y={lineY + 18} textAnchor="middle" className="scale-dimension-kind">
                        {object.dimensionType.toUpperCase()} · LINEAR
                      </text>
                    )}
                    {isVisible && object.shape === "sphere" && (
                      <text x={item.centerX} y={lineY + 18} textAnchor="middle" className="scale-dimension-kind">
                        DIAMETER
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
            {insetObject && (
              <g className="scale-magnified-inset" aria-label="Magnified inset, not to the primary scale">
                <rect x={viewport.width - 160} y="12" width="148" height="82" rx="4" />
                <text x={viewport.width - 150} y="27" className="scale-inset-heading">MAGNIFIED · NOT TO SCALE</text>
                {insetObject.object.shape === "sphere" ? (
                  <circle cx={viewport.width - 140} cy="57" r="13" fill={insetObject.object.color} fillOpacity="0.82" />
                ) : (
                  <line x1={viewport.width - 153} x2={viewport.width - 127} y1="57" y2="57" stroke={insetObject.object.color} strokeWidth="2" />
                )}
                <text x={viewport.width - 119} y="54" className="scale-inset-name">{insetObject.object.name}</text>
                <text x={viewport.width - 119} y="68" className="scale-inset-value">
                  {formatMeasurement(insetObject.dimensionMetres, unit)}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>
      <div className="scale-chart-foot">
        <span>{scaleLabel}</span>
        <span>Drag to pan · scroll or use +/− to zoom</span>
      </div>
    </div>
  );
}
