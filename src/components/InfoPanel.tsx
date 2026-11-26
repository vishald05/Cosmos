import { ArrowUpRight, CircleDot, Crosshair, X } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { elementsAt, orbitalPosition, trueAnomaly } from "../science/orbit";
import { getBody, getPlanet } from "../science/planets";
import { DATA_SOURCES } from "../science/sources";
import { formatDistanceAu } from "../science/units";
import type { BodyId } from "../science/types";

interface InfoPanelProps {
  bodyId: BodyId | null;
  daysSinceEpoch: number;
  onClose: () => void;
  onFocus: (id: BodyId) => void;
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return value.toLocaleString("en-US", { maximumFractionDigits });
}

function formatTemperature(value: number | null): string {
  return value === null ? "Not applicable" : `${formatNumber(value, 0)} °C`;
}

function Measurement({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="measurement">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

export function InfoPanel({ bodyId, daysSinceEpoch, onClose, onFocus }: InfoPanelProps) {
  if (!bodyId) return null;
  const body = getBody(bodyId);
  if (!body) return null;
  const planet = getPlanet(bodyId);
  const currentPosition = planet ? orbitalPosition(planet.orbitalElements, daysSinceEpoch) : null;
  const currentElements = planet ? elementsAt(planet.orbitalElements, daysSinceEpoch) : null;
  const sources = body.sourceIds.map((sourceId) => DATA_SOURCES[sourceId]);

  return (
    <motion.aside
      className="info-panel panel"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.22 }}
      aria-label={`${body.name} information`}
    >
      <div className="panel-topline">
        <span className="eyebrow"><CircleDot size={12} /> CELESTIAL BODY</span>
        <button className="icon-button" aria-label="Close information panel" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="planet-title-row">
        <span className="planet-swatch" style={{ backgroundColor: body.color, boxShadow: `0 0 18px ${body.color}66` }} />
        <h2>{body.name}</h2>
      </div>
      <p className="planet-description">{body.description}</p>
      <div className="measurements">
        <Measurement label="MEAN DIAMETER">{formatNumber(body.physical.meanDiameterKm)} <small>km</small></Measurement>
        {planet && currentPosition && (
          <div className="measurement-pair">
            <Measurement label="MEAN DISTANCE FROM SUN">{formatDistanceAu(planet.meanDistanceAu)}</Measurement>
            <Measurement label="ORBITAL PERIOD">
              {formatNumber(planet.orbitalPeriodDays, planet.orbitalPeriodDays < 1000 ? 1 : 0)} <small>days</small>
            </Measurement>
          </div>
        )}
      </div>

      <details className="info-section" open>
        <summary>Physical properties</summary>
        <div className="info-section-content">
          <Measurement label="MEAN RADIUS">{formatNumber(body.physical.meanRadiusKm, 1)} <small>km</small></Measurement>
          <Measurement label="MASS">{body.physical.massKg.toExponential(4)} <small>kg</small></Measurement>
          <Measurement label="MEAN DENSITY">{formatNumber(body.physical.meanDensityKgM3)} <small>kg/m³</small></Measurement>
          <div className="measurement-pair">
            <Measurement label="REFERENCE GRAVITY">{formatNumber(body.physical.referenceGravityMps2, 1)} <small>m/s²</small></Measurement>
            <Measurement label="ESCAPE SPEED">{formatNumber(body.physical.escapeVelocityKms, 1)} <small>km/s</small></Measurement>
          </div>
          <Measurement label="MEAN TEMPERATURE">{formatTemperature(body.physical.meanTemperatureC)}</Measurement>
          {body.id === "sun" && (
            <div className="measurement-pair">
              <Measurement label="LUMINOSITY">{body.stellar.luminosityW.toExponential(3)} <small>W</small></Measurement>
              <Measurement label="EFFECTIVE TEMPERATURE">{formatNumber(body.stellar.effectiveTemperatureK)} <small>K</small></Measurement>
            </div>
          )}
          <p className="measurement-note">{body.physical.atmosphere}</p>
          <p className="measurement-note">{body.measurementNote}</p>
        </div>
      </details>

      <details className="info-section">
        <summary>Orbit and position</summary>
        <div className="info-section-content">
          {planet && currentPosition && currentElements ? (
            <>
              <Measurement label="MEAN DISTANCE (SEMI-MAJOR AXIS)">{formatDistanceAu(planet.meanDistanceAu)}</Measurement>
              <div className="measurement-pair">
                <Measurement label="CURRENT HELIOCENTRIC DISTANCE">{formatDistanceAu(Math.hypot(currentPosition.x, currentPosition.y, currentPosition.z))}</Measurement>
                <Measurement label="ECCENTRICITY">{currentElements.eccentricity.toFixed(5)}</Measurement>
              </div>
              <div className="measurement-pair">
                <Measurement label="ORBITAL INCLINATION">{currentElements.inclinationDeg.toFixed(3)}<small>°</small></Measurement>
                <Measurement label="TRUE ANOMALY">{trueAnomaly(planet.orbitalElements, daysSinceEpoch).toFixed(2)}<small>°</small></Measurement>
              </div>
              <p className="measurement-note">
                Position is heliocentric in the J2000 mean ecliptic frame. Linear secular elements and a two-body Kepler solution are used; perturbations are not modeled.
              </p>
            </>
          ) : (
            <p className="measurement-note">The Sun is the origin of the heliocentric coordinate system.</p>
          )}
        </div>
      </details>

      <details className="info-section">
        <summary>Rotation and environment</summary>
        <div className="info-section-content">
          <Measurement label="SIDEREAL ROTATION">
            {formatNumber(Math.abs(body.rotation.siderealPeriodHours), 2)} <small>hours · {body.rotation.direction}</small>
          </Measurement>
          <Measurement label="AXIAL TILT">{formatNumber(body.rotation.axialTiltDeg, 2)}<small>°</small></Measurement>
          <Measurement label="PRIME MERIDIAN RATE">
            {formatNumber(body.rotation.primeMeridianRateDegPerDay, 3)} <small>°/day</small>
          </Measurement>
          <p className="measurement-note">
            Pole and prime-meridian orientation follows the simplified IAU model in NAIF PCK 00011; periodic nutation and other short-period terms are omitted.
          </p>
        </div>
      </details>

      <details className="info-section">
        <summary>Sources</summary>
        <ul className="source-list">
          {sources.map((source) => (
            <li key={source.label}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label} <ArrowUpRight size={11} />
              </a>
              <span>{source.description}</span>
            </li>
          ))}
          {planet && (
            <li>
              <a href={DATA_SOURCES["jpl-horizons"].url} target="_blank" rel="noreferrer">
                JPL Horizons <ArrowUpRight size={11} />
              </a>
              <span>Independent reference positions are compared in automated tests.</span>
            </li>
          )}
        </ul>
      </details>

      <button className="focus-button" onClick={() => onFocus(bodyId)}>
        <Crosshair size={15} /> Focus camera <ArrowUpRight size={14} className="focus-arrow" />
      </button>
    </motion.aside>
  );
}
