import {
  calculateLightTravelTime,
  convertDistance,
  distanceToMetres,
  DISTANCE_UNITS,
  SECONDS_PER_JULIAN_YEAR,
  SPEED_OF_LIGHT_METRES_PER_SECOND,
} from "../../science/distance";
import type { DistanceUnit, LightTravelTimeResult } from "../../science/distance";

export const RULER_DISPLAY_UNITS = [
  ...DISTANCE_UNITS,
  "light-seconds",
  "light-minutes",
  "light-hours",
  "light-days",
  "light-years",
] as const;
export type RulerDisplayUnit = (typeof RULER_DISPLAY_UNITS)[number];

export function isRulerDisplayUnit(value: string): value is RulerDisplayUnit {
  return (RULER_DISPLAY_UNITS as readonly string[]).includes(value);
}

export const MIN_RULER_ZOOM = 0.25;
export const MAX_RULER_ZOOM = 20;
export const LOCATOR_THRESHOLD_PIXELS = 1;

const LIGHT_SECONDS_PER_UNIT: Readonly<Record<Exclude<RulerDisplayUnit, DistanceUnit>, number>> = {
  "light-seconds": 1,
  "light-minutes": 60,
  "light-hours": 3_600,
  "light-days": 86_400,
  "light-years": SECONDS_PER_JULIAN_YEAR,
};

const UNIT_LABELS: Readonly<Record<RulerDisplayUnit, string>> = {
  m: "m",
  km: "km",
  mi: "mi",
  AU: "AU",
  "light-seconds": "light-seconds",
  "light-minutes": "light-minutes",
  "light-hours": "light-hours",
  "light-days": "light-days",
  "light-years": "light-years",
};

export interface RulerTick {
  distanceMetres: number;
  label: string;
}

export interface RulerLayoutInput {
  distanceMetres: number;
  diameterAMetres: number;
  diameterBMetres: number;
  viewportWidth: number;
  unit: RulerDisplayUnit;
  zoom?: number;
  panX?: number;
}

export interface RulerLayout {
  viewportWidth: number;
  margin: number;
  fitScalePxPerMetre: number;
  scalePxPerMetre: number;
  zoom: number;
  panX: number;
  xStart: number;
  xEnd: number;
  diameterAPixels: number;
  diameterBPixels: number;
  renderDiameterA: boolean;
  renderDiameterB: boolean;
  ticks: readonly (RulerTick & { x: number })[];
}

function isPhysicalDistanceUnit(unit: RulerDisplayUnit): unit is DistanceUnit {
  return (DISTANCE_UNITS as readonly string[]).includes(unit);
}

export function metresPerRulerUnit(unit: RulerDisplayUnit): number {
  if (isPhysicalDistanceUnit(unit)) return distanceToMetres(1, unit);
  return SPEED_OF_LIGHT_METRES_PER_SECOND * LIGHT_SECONDS_PER_UNIT[unit];
}

function formatNumber(value: number, significantDigits = 3): string {
  if (!Number.isFinite(value)) throw new RangeError("Ruler values must be finite.");
  if (!Number.isInteger(significantDigits) || significantDigits < 1 || significantDigits > 21) {
    throw new RangeError("Ruler formatting precision must be an integer from 1 to 21 significant digits.");
  }
  if (value === 0) return "0";
  if (Math.abs(value) >= 1e7 || Math.abs(value) < 1e-3) return value.toExponential(significantDigits - 1);
  return Number(value.toPrecision(significantDigits)).toLocaleString("en-US", { maximumSignificantDigits: significantDigits });
}

export function formatRulerDistance(
  distanceMetres: number,
  unit: RulerDisplayUnit,
  significantDigits = 3,
): string {
  if (!Number.isFinite(distanceMetres) || distanceMetres < 0) {
    throw new RangeError("Ruler distance must be finite and non-negative.");
  }
  if (isPhysicalDistanceUnit(unit)) {
    return `${formatNumber(convertDistance(distanceMetres, "m", unit), significantDigits)} ${UNIT_LABELS[unit]}`;
  }
  const lightTime = calculateLightTravelTime(distanceMetres);
  if (lightTime.status !== "available") throw new RangeError(lightTime.reason);
  const amount = lightDistanceAmount(lightTime, unit);
  return `${formatNumber(amount, significantDigits)} ${UNIT_LABELS[unit]}`;
}

function lightDistanceAmount(
  lightTime: Extract<LightTravelTimeResult, { status: "available" }>,
  unit: Exclude<RulerDisplayUnit, DistanceUnit>,
): number {
  switch (unit) {
    case "light-seconds": return lightTime.seconds;
    case "light-minutes": return lightTime.minutes;
    case "light-hours": return lightTime.hours;
    case "light-days": return lightTime.days;
    case "light-years": return lightTime.julianYears;
  }
}

export function formatLightTravelTime(result: LightTravelTimeResult): string {
  if (result.status !== "available") return "Unavailable";
  return formatLightTravelSeconds(result.seconds);
}

export function formatLightTravelSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError("Light-travel duration must be finite and non-negative.");
  }
  const minutes = seconds / 60;
  const hours = seconds / 3_600;
  const days = seconds / 86_400;
  const julianYears = seconds / SECONDS_PER_JULIAN_YEAR;
  if (julianYears >= 1) return `${formatNumber(julianYears)} ${julianYears === 1 ? "year" : "years"}`;
  if (days >= 1) return `${formatNumber(days)} ${days === 1 ? "day" : "days"}`;
  if (hours >= 1) return `${formatNumber(hours)} ${hours === 1 ? "hour" : "hours"}`;
  if (minutes >= 1) return `${formatNumber(minutes)} ${minutes === 1 ? "minute" : "minutes"}`;
  return `${formatNumber(seconds)} ${seconds === 1 ? "second" : "seconds"}`;
}

function niceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  for (const multiplier of [1, 2, 5, 10]) {
    const step = multiplier * magnitude;
    if (step >= rawStep) return step;
  }
  return 10 * magnitude;
}

export function generateRulerTicks(
  visibleStartMetres: number,
  visibleEndMetres: number,
  totalDistanceMetres: number,
  unit: RulerDisplayUnit,
  scalePxPerMetre: number,
): RulerTick[] {
  if (
    ![visibleStartMetres, visibleEndMetres, totalDistanceMetres, scalePxPerMetre].every(Number.isFinite)
    || visibleStartMetres < 0
    || visibleEndMetres < visibleStartMetres
    || totalDistanceMetres < visibleEndMetres
    || scalePxPerMetre < 0
  ) {
    throw new RangeError("Ruler tick range and scale must be finite and non-negative.");
  }
  if (totalDistanceMetres === 0 || visibleStartMetres === visibleEndMetres || scalePxPerMetre === 0) return [];

  const metresPerUnit = metresPerRulerUnit(unit);
  const visibleSpanMetres = visibleEndMetres - visibleStartMetres;
  const visibleWidth = visibleSpanMetres * scalePxPerMetre;
  const targetTickCount = Math.max(1, Math.min(10, Math.floor(visibleWidth / 90)));
  const visibleSpanUnits = visibleSpanMetres / metresPerUnit;
  const rawStep = visibleSpanUnits / targetTickCount;
  if (!Number.isFinite(rawStep) || rawStep <= 0) return [];
  const step = niceStep(rawStep);
  const firstTickIndex = Math.floor(visibleStartMetres / metresPerUnit / step) + 1;
  const ticks: RulerTick[] = [];

  for (let index = firstTickIndex; ticks.length < 12; index += 1) {
    const value = index * step;
    const distanceMetres = value * metresPerUnit;
    if (!(distanceMetres < visibleEndMetres) || !(distanceMetres < totalDistanceMetres)) break;
    ticks.push({ distanceMetres, label: formatNumber(value) });
  }
  return ticks;
}

export function nextRulerZoom(currentZoom: number, multiplier: number): number {
  if (!Number.isFinite(currentZoom) || !Number.isFinite(multiplier) || multiplier <= 0) {
    throw new RangeError("Ruler zoom and multiplier must be finite and positive.");
  }
  return Math.min(MAX_RULER_ZOOM, Math.max(MIN_RULER_ZOOM, currentZoom * multiplier));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createRulerLayout(input: RulerLayoutInput): RulerLayout {
  const {
    distanceMetres,
    diameterAMetres,
    diameterBMetres,
    viewportWidth,
    unit,
    zoom = 1,
    panX = 0,
  } = input;
  if (
    ![distanceMetres, diameterAMetres, diameterBMetres, viewportWidth, zoom, panX].every(Number.isFinite)
    || distanceMetres < 0
    || diameterAMetres < 0
    || diameterBMetres < 0
    || viewportWidth <= 0
    || zoom < MIN_RULER_ZOOM
    || zoom > MAX_RULER_ZOOM
  ) {
    throw new RangeError("Ruler dimensions, viewport, zoom, and pan must be finite and within supported bounds.");
  }

  const margin = Math.min(68, Math.max(16, viewportWidth * 0.1));
  const availableWidth = viewportWidth - margin * 2;
  if (availableWidth <= 0) throw new RangeError("Ruler viewport is too narrow to fit its endpoints.");

  const rulerExtent = distanceMetres + (diameterAMetres + diameterBMetres) / 2;
  if (!Number.isFinite(rulerExtent)) throw new RangeError("Combined ruler extent is outside the supported numeric range.");
  const fitScalePxPerMetre = rulerExtent > 0 ? availableWidth / rulerExtent : 0;
  const xStartAtFit = rulerExtent > 0
    ? margin + (diameterAMetres / 2) * fitScalePxPerMetre
    : viewportWidth / 2;
  const xEndAtFit = xStartAtFit + distanceMetres * fitScalePxPerMetre;
  const centerX = viewportWidth / 2;
  const zoomedLeft = centerX + (xStartAtFit - diameterAMetres * fitScalePxPerMetre / 2 - centerX) * zoom;
  const zoomedRight = centerX + (xEndAtFit + diameterBMetres * fitScalePxPerMetre / 2 - centerX) * zoom;
  const contentWidth = zoomedRight - zoomedLeft;
  const panMinimum = contentWidth <= availableWidth
    ? margin - zoomedLeft
    : viewportWidth - margin - zoomedRight;
  const panMaximum = contentWidth <= availableWidth
    ? viewportWidth - margin - zoomedRight
    : margin - zoomedLeft;
  const clampedPanX = clamp(panX, panMinimum, panMaximum);
  const xStart = centerX + (xStartAtFit - centerX) * zoom + clampedPanX;
  const scalePxPerMetre = fitScalePxPerMetre * zoom;
  const xEnd = xStart + distanceMetres * scalePxPerMetre;
  const diameterAPixels = diameterAMetres * scalePxPerMetre;
  const diameterBPixels = diameterBMetres * scalePxPerMetre;
  const visibleStartMetres = scalePxPerMetre > 0
    ? clamp((margin - xStart) / scalePxPerMetre, 0, distanceMetres)
    : 0;
  const visibleEndMetres = scalePxPerMetre > 0
    ? clamp((viewportWidth - margin - xStart) / scalePxPerMetre, 0, distanceMetres)
    : 0;
  const ticks = generateRulerTicks(
    visibleStartMetres,
    visibleEndMetres,
    distanceMetres,
    unit,
    scalePxPerMetre,
  ).map((tick) => ({
    ...tick,
    x: xStart + tick.distanceMetres * scalePxPerMetre,
  }));

  return {
    viewportWidth,
    margin,
    fitScalePxPerMetre,
    scalePxPerMetre,
    zoom,
    panX: clampedPanX,
    xStart,
    xEnd,
    diameterAPixels,
    diameterBPixels,
    renderDiameterA: diameterAPixels >= LOCATOR_THRESHOLD_PIXELS,
    renderDiameterB: diameterBPixels >= LOCATOR_THRESHOLD_PIXELS,
    ticks,
  };
}

export function mapDistanceToRulerX(distanceMetres: number, layout: RulerLayout): number {
  if (!Number.isFinite(distanceMetres) || distanceMetres < 0) {
    throw new RangeError("Ruler position must be finite and non-negative.");
  }
  return layout.xStart + distanceMetres * layout.scalePxPerMetre;
}
