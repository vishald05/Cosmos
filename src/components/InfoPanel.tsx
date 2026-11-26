import { ArrowUpRight, CircleDot, Crosshair, X } from "lucide-react";
import { motion } from "framer-motion";
import { getBody, getPlanet } from "../science/planets";
import { formatDistanceAu } from "../science/units";
import type { BodyId } from "../science/types";

interface InfoPanelProps {
  bodyId: BodyId | null;
  onClose: () => void;
  onFocus: (id: BodyId) => void;
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return value.toLocaleString("en-US", { maximumFractionDigits });
}

export function InfoPanel({ bodyId, onClose, onFocus }: InfoPanelProps) {
  if (!bodyId) return null;
  const body = getBody(bodyId);
  if (!body) return null;
  const planet = getPlanet(bodyId);

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
        <div className="measurement">
          <span>MEAN DIAMETER</span>
          <strong>{formatNumber(body.meanDiameterKm)} <small>km</small></strong>
        </div>
        {planet ? (
          <>
            <div className="measurement">
              <span>MEAN DISTANCE FROM SUN</span>
              <strong>{formatDistanceAu(planet.meanDistanceAu)}</strong>
            </div>
            <div className="measurement-pair">
              <div className="measurement">
                <span>ORBITAL PERIOD</span>
                <strong>{formatNumber(planet.orbitalPeriodDays, planet.orbitalPeriodDays < 1000 ? 1 : 0)} <small>days</small></strong>
              </div>
              <div className="measurement">
                <span>ROTATION PERIOD</span>
                <strong>{formatNumber(Math.abs(planet.rotationPeriodHours), 1)} <small>hrs{planet.rotationPeriodHours < 0 ? " · retrograde" : ""}</small></strong>
              </div>
            </div>
            <div className="measurement-pair">
              <div className="measurement">
                <span>ECCENTRICITY</span>
                <strong>{planet.eccentricity.toFixed(4)}</strong>
              </div>
              <div className="measurement">
                <span>ORBITAL INCLINATION</span>
                <strong>{(Math.abs(planet.inclinationDeg) < 0.005 ? 0 : planet.inclinationDeg).toFixed(2)}<small>°</small></strong>
              </div>
            </div>
          </>
        ) : (
          <div className="measurement">
            <span>STAR AT THE CENTRE</span>
            <strong>G2V <small>main sequence</small></strong>
          </div>
        )}
      </div>
      <button className="focus-button" onClick={() => onFocus(bodyId)}>
        <Crosshair size={15} /> Focus camera <ArrowUpRight size={14} className="focus-arrow" />
      </button>
    </motion.aside>
  );
}
