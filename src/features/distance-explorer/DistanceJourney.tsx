import { useMemo, useState } from "react";
import {
  addJourneyStop,
  calculateDistanceJourney,
  MAX_JOURNEY_STOPS,
  moveJourneyStop,
  removeJourneyStop,
  replaceJourneyStop,
  resetJourneyStops,
} from "./journey";
import type { DistanceJourneyResult, JourneySegment, JourneyStateResult } from "./journey";
import { DISTANCE_ENDPOINTS } from "./catalogue";
import { formatLightTravelSeconds, formatLightTravelTime, formatRulerDistance } from "./ruler";
import type { RulerDisplayUnit } from "./ruler";

interface DistanceJourneyProps {
  daysSinceJ2000Tdb: number;
  unit: RulerDisplayUnit;
}

function simulationDate(segment: JourneySegment, daysSinceJ2000Tdb: number): string {
  return segment.simulationTime?.displayDateIso.slice(0, 10)
    ?? `J2000 TDB + ${daysSinceJ2000Tdb} days`;
}

function surfaceDescription(segment: JourneySegment, unit: RulerDisplayUnit): string {
  if (segment.surface.status !== "available") return `Unavailable · ${segment.surface.reason}`;
  if (segment.surface.relation === "overlapping") {
    return `Overlapping by ${formatRulerDistance(segment.surface.overlapMetres, unit)}`;
  }
  if (segment.surface.relation === "touching") return "Surfaces touching";
  return `Surface gap ${formatRulerDistance(segment.surface.signedSurfaceGapMetres, unit)}`;
}

function applyJourneyState(
  result: JourneyStateResult,
  setStopIds: (stopIds: readonly string[]) => void,
  setFeedback: (feedback: string) => void,
): void {
  if (result.status === "available") {
    setStopIds(result.stopIds);
    setFeedback("");
  } else {
    setFeedback(result.reason);
  }
}

function SegmentCard({
  segment,
  daysSinceJ2000Tdb,
  unit,
}: {
  segment: JourneySegment;
  daysSinceJ2000Tdb: number;
  unit: RulerDisplayUnit;
}) {
  return (
    <article
      className={`journey-segment${segment.distance.status === "available" ? "" : " journey-segment-unavailable"}`}
      aria-label={`Segment ${segment.index + 1}: ${segment.start.object.name} to ${segment.destination.object.name}`}
      data-distance-metres={segment.distance.status === "available" ? segment.distance.distanceMetres : undefined}
    >
      <div className="journey-segment-title">
        <span>SEGMENT {segment.index + 1}</span>
        <strong>{segment.start.object.name} → {segment.destination.object.name}</strong>
      </div>
      {segment.distance.status !== "available" && (
        <p className="journey-segment-reason" role="status">
          Segment unavailable · {segment.distance.reason}
        </p>
      )}
      <div className="journey-segment-measurements">
        <div>
          <span>Center-to-center distance</span>
          <strong>{segment.distance.status === "available"
            ? formatRulerDistance(segment.distance.distanceMetres, unit)
            : "Unavailable"}</strong>
        </div>
        <div>
          <span>Surface separation</span>
          <strong>{surfaceDescription(segment, unit)}</strong>
        </div>
        <div>
          <span>Vacuum light-travel duration</span>
          <strong>{segment.lightTravel
            ? formatLightTravelTime(segment.lightTravel)
            : "Unavailable · segment distance unavailable"}</strong>
        </div>
      </div>
      <small className="journey-segment-date">
        Simulation date · {simulationDate(segment, daysSinceJ2000Tdb)}
      </small>
    </article>
  );
}

function JourneyResults({
  journey,
  daysSinceJ2000Tdb,
  unit,
}: {
  journey: DistanceJourneyResult;
  daysSinceJ2000Tdb: number;
  unit: RulerDisplayUnit;
}) {
  if (journey.status === "invalid-journey") {
    return <p className="journey-feedback" role="status">{journey.reason}</p>;
  }

  const direct = journey.directDisplacement;
  return (
    <>
      <ol className="journey-route" aria-label="Ordered straight-line journey stops">
        {journey.segments.map((segment) => (
          <li className="journey-route-step" key={`${segment.start.object.id}-${segment.destination.object.id}`}>
            <div className="journey-route-stop">
              <span className="journey-stop-marker" aria-hidden="true">{segment.index + 1}</span>
              <strong>{segment.start.object.name}</strong>
            </div>
            <div className="journey-route-connector" aria-hidden="true">↓</div>
            <SegmentCard
              segment={segment}
              daysSinceJ2000Tdb={daysSinceJ2000Tdb}
              unit={unit}
            />
          </li>
        ))}
        <li className="journey-route-stop journey-route-final-stop">
          <span className="journey-stop-marker" aria-hidden="true">{journey.segments.length + 1}</span>
          <strong>{journey.segments[journey.segments.length - 1]?.destination.object.name}</strong>
        </li>
      </ol>

      <div
        className="journey-summary-grid"
        data-total-distance-metres={journey.totalDistanceMetres ?? undefined}
        data-total-light-travel-seconds={journey.totalLightTravelSeconds ?? undefined}
      >
        <article className={`journey-summary-card${journey.status === "partial" ? " is-incomplete" : ""}`}>
          <span className="eyebrow">{journey.status === "complete" ? "TOTAL JOURNEY DISTANCE" : "JOURNEY DISTANCE · INCOMPLETE"}</span>
          {journey.totalDistanceMetres !== null ? (
            <strong>{formatRulerDistance(journey.totalDistanceMetres, unit)}</strong>
          ) : (
            <>
              <strong>Incomplete</strong>
              <small>
                Available segments only: {formatRulerDistance(journey.availableSegmentDistanceMetres, unit)}.
                This is not a complete journey total.
              </small>
            </>
          )}
        </article>
        <article className={`journey-summary-card${journey.totalLightTravelSeconds === null ? " is-incomplete" : ""}`}>
          <span className="eyebrow">{journey.totalLightTravelSeconds === null
            ? "CUMULATIVE LIGHT-TRAVEL TIME · INCOMPLETE"
            : "CUMULATIVE VACUUM LIGHT-TRAVEL TIME"}</span>
          {journey.totalLightTravelSeconds !== null ? (
            <strong>{formatLightTravelSeconds(journey.totalLightTravelSeconds)}</strong>
          ) : (
            <>
              <strong>Incomplete</strong>
              <small>
                Available segments only: {formatLightTravelSeconds(journey.availableSegmentLightTravelSeconds)}.
                This is not a complete cumulative time.
              </small>
            </>
          )}
        </article>
        <article className="journey-summary-card journey-displacement-card">
          <span className="eyebrow">DIRECT FIRST-TO-LAST DISPLACEMENT</span>
          {direct.status === "available" ? (
            <>
              <strong>{formatRulerDistance(direct.distanceMetres, unit)}</strong>
              <small>Separate straight-line measurement; not the sum of journey segments.</small>
            </>
          ) : (
            <small>Unavailable · {direct.reason}</small>
          )}
        </article>
      </div>
      <p className="journey-model-note">
        Segment lengths are straight-line center-to-center measurements at the same simulation date.
        They do not describe an orbital path or a physically navigable spacecraft trajectory.
      </p>
    </>
  );
}

export function DistanceJourney({ daysSinceJ2000Tdb, unit }: DistanceJourneyProps) {
  const [stopIds, setStopIds] = useState<readonly string[]>(resetJourneyStops);
  const [candidateId, setCandidateId] = useState("");
  const [feedback, setFeedback] = useState("");
  const journey = useMemo(
    () => calculateDistanceJourney(stopIds, daysSinceJ2000Tdb),
    [stopIds, daysSinceJ2000Tdb],
  );
  const selectedIds = new Set(stopIds);
  const addOptions = DISTANCE_ENDPOINTS.filter(({ object }) => !selectedIds.has(object.id));

  const candidateIsAvailable = addOptions.some(({ object }) => object.id === candidateId);
  const updateStops = (result: JourneyStateResult) => {
    applyJourneyState(result, setStopIds, setFeedback);
    if (result.status === "available") setCandidateId("");
  };

  return (
    <section className="distance-journey" aria-labelledby="distance-journey-heading">
      <header className="distance-journey-heading">
        <div>
          <span className="eyebrow">MULTI-STOP DISTANCE JOURNEY · FIXED EPOCH</span>
          <h3 id="distance-journey-heading">Build a straight-line segment journey</h3>
          <p>Every adjacent pair is measured independently at J2000.0.</p>
        </div>
        <button type="button" className="journey-reset-button" onClick={() => {
          setStopIds(resetJourneyStops());
          setCandidateId("");
          setFeedback("");
        }}>
          RESET JOURNEY
        </button>
      </header>

      <div className="journey-stop-list" role="group" aria-label="Journey stop controls">
        {stopIds.map((id, index) => {
          const endpoint = DISTANCE_ENDPOINTS.find(({ object }) => object.id === id);
          const positionLabel = index === 0
            ? "JOURNEY STARTING OBJECT"
            : index === stopIds.length - 1 ? "JOURNEY DESTINATION OBJECT" : `JOURNEY INTERMEDIATE STOP ${index}`;
          return (
            <div className="journey-stop-control" key={id}>
              <label htmlFor={`journey-stop-${index}`}>
                <span>{positionLabel}</span>
                <select
                  id={`journey-stop-${index}`}
                  value={id}
                  onChange={(event) => updateStops(replaceJourneyStop(stopIds, index, event.target.value))}
                >
                  {DISTANCE_ENDPOINTS.map(({ object, position }) => (
                    <option
                      key={object.id}
                      value={object.id}
                      disabled={object.id !== id && selectedIds.has(object.id)}
                    >
                      {object.name} · {position.label}
                    </option>
                  ))}
                </select>
                {endpoint?.position.kind === "unavailable" && (
                  <small className="journey-unavailable-hint">Position unavailable; connected segments will be unavailable.</small>
                )}
              </label>
              <div className="journey-stop-actions" role="group" aria-label={`Reorder ${endpoint?.object.name ?? "journey stop"}`}>
                <button
                  type="button"
                  aria-label={`Move ${endpoint?.object.name ?? "stop"} up`}
                  title="Move up"
                  disabled={index === 0}
                  onClick={() => updateStops(moveJourneyStop(stopIds, index, index - 1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${endpoint?.object.name ?? "stop"} down`}
                  title="Move down"
                  disabled={index === stopIds.length - 1}
                  onClick={() => updateStops(moveJourneyStop(stopIds, index, index + 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${endpoint?.object.name ?? "stop"} from journey`}
                  title="Remove stop"
                  disabled={stopIds.length <= 2}
                  onClick={() => updateStops(removeJourneyStop(stopIds, index))}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="journey-add-stop">
        <label htmlFor="journey-add-stop-select">
          <span>ADD A CELESTIAL STOP</span>
          <select
            id="journey-add-stop-select"
            value={candidateIsAvailable ? candidateId : ""}
            disabled={addOptions.length === 0 || stopIds.length >= MAX_JOURNEY_STOPS}
            onChange={(event) => setCandidateId(event.target.value)}
          >
            <option value="">
              {addOptions.length === 0 ? "No unused objects available" : "Choose an object"}
            </option>
            {addOptions.map(({ object, position }) => (
              <option key={object.id} value={object.id}>
                {object.name} · {position.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="journey-add-button"
          disabled={!candidateIsAvailable || addOptions.length === 0 || stopIds.length >= MAX_JOURNEY_STOPS}
          onClick={() => {
            const result = addJourneyStop(stopIds, candidateId);
            updateStops(result);
          }}
        >
          ADD STOP
        </button>
        <small>{stopIds.length} / {MAX_JOURNEY_STOPS} stops · each celestial object can appear once</small>
      </div>

      {feedback && <p className="journey-feedback" role="status">{feedback}</p>}
      <JourneyResults journey={journey} daysSinceJ2000Tdb={daysSinceJ2000Tdb} unit={unit} />
    </section>
  );
}
