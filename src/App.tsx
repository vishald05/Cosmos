import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Activity, CircleHelp, Compass, Orbit, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { InfoPanel } from "./components/InfoPanel";
import { OrbitMap } from "./components/OrbitMap";
import { ScaleLab } from "./features/scale-lab/ScaleLab";
import { BODIES, EPOCH_LABEL } from "./science/planets";
import { advanceSimulationDays, INITIAL_DAYS, SPEED_PRESETS } from "./science/simulation";
import { simulationDate } from "./science/units";
import type { BodyId } from "./science/types";
import { readSimulationClock, writeSimulationClock } from "./state/clock";
import { useCosmosStore } from "./state/store";

const SolarSystem3D = lazy(() => import("./components/SolarSystem3D").then((module) => ({
  default: module.SolarSystem3D,
})));

function formattedDate(days: number): string {
  return simulationDate(days).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "2-digit", timeZone: "UTC",
  }).toUpperCase();
}

function App() {
  const controlsRef = useRef<OrbitControlsImpl>(null!);
  const [activePage, setActivePage] = useState<"solar-system" | "scale-lab">("solar-system");
  const days = useCosmosStore((state) => state.daysSinceEpoch);
  const playing = useCosmosStore((state) => state.playing);
  const speed = useCosmosStore((state) => state.speed);
  const selectedBody = useCosmosStore((state) => state.selectedBody);
  const focusedBody = useCosmosStore((state) => state.focusedBody);
  const scaleMode = useCosmosStore((state) => state.scaleMode);
  const viewMode = useCosmosStore((state) => state.viewMode);
  const store = useCosmosStore;

  useEffect(() => {
    let frameId = 0;
    let previous = performance.now();
    let uiAccumulator = 0;
    const tick = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      const current = store.getState();
      const next = advanceSimulationDays(readSimulationClock(), elapsed, current.speed, current.playing);
      writeSimulationClock(next);
      uiAccumulator += elapsed;
      if (uiAccumulator >= 0.12) {
        store.getState().setDays(next);
        uiAccumulator = 0;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [store]);

  const handleReset = () => {
    writeSimulationClock(INITIAL_DAYS);
    store.getState().reset();
  };

  const handleSelect = (id: BodyId | null) => {
    store.getState().selectBody(id);
    if (store.getState().focusedBody && id !== store.getState().focusedBody) {
      store.getState().focusBody(null);
    }
  };

  return (
    <div className={`app-shell ${activePage === "scale-lab" ? "app-shell-scale" : ""}`}>
      <header className="topbar">
        <a className="brand" href="#" aria-label="COSMOS home">
          <span className="brand-mark"><Orbit size={19} strokeWidth={1.6} /></span>
          <span className="brand-name">COSMOS<span className="brand-period">.</span></span>
          <span className="brand-divider" />
          <span className="brand-edition">SOLAR SYSTEM EXPLORER</span>
        </a>
        <div className="topbar-center">
          <nav className="main-navigation" aria-label="COSMOS sections">
            <button
              className={activePage === "solar-system" ? "active" : ""}
              aria-current={activePage === "solar-system" ? "page" : undefined}
              onClick={() => setActivePage("solar-system")}
            >
              SOLAR SYSTEM
            </button>
            <button
              className={activePage === "scale-lab" ? "active" : ""}
              aria-current={activePage === "scale-lab" ? "page" : undefined}
              onClick={() => setActivePage("scale-lab")}
            >
              SCALE LAB
            </button>
          </nav>
        </div>
        <div className="topbar-right">
          <span className="live-indicator"><i /> {activePage === "solar-system" ? (playing ? "SIMULATION LIVE" : "SIMULATION PAUSED") : "DIMENSION COMPARISON"}</span>
          <button className="icon-button help-button" aria-label="About this simulation" title={`JPL secular Keplerian elements and simplified IAU rotation · ${EPOCH_LABEL}`}><CircleHelp size={17} /></button>
        </div>
      </header>

      {activePage === "scale-lab" ? <ScaleLab /> : (
      <>
      <main className="workspace">
        <aside className="body-rail">
          <div className="rail-heading">
            <span className="eyebrow">THE NEIGHBOURHOOD</span>
            <span className="body-count">09 BODIES</span>
          </div>
          <div className="body-list">
            {BODIES.map((body, index) => (
              <button
                key={body.id}
                className={`body-item ${selectedBody === body.id ? "selected" : ""} ${body.id === "sun" ? "sun-item" : ""}`}
                onClick={() => handleSelect(body.id)}
                aria-pressed={selectedBody === body.id}
              >
                <span className="body-index">{String(index).padStart(2, "0")}</span>
                <span className="body-dot" style={{ backgroundColor: body.color, boxShadow: `0 0 10px ${body.color}55` }} />
                <span>{body.name}</span>
                {selectedBody === body.id && <span className="selected-marker" />}
              </button>
            ))}
          </div>
          <div className="rail-footer">
            <span className="eyebrow"><Activity size={12} /> DATA EPOCH</span>
            <span className="epoch-date">J2000.0</span>
            <span className="epoch-time">01 JAN 2000 · 11:58:56 UTC</span>
          </div>
        </aside>

        <section className={`scene-area ${viewMode === "map" ? "map-mode" : ""}`} aria-label="Solar system visualization">
          <div className="scene-topline">
            <div className="scene-heading">
              <span className="eyebrow">SOLAR SYSTEM <span className="separator">/</span> {viewMode === "3d" ? "INTERACTIVE VIEW" : "ORBITAL OVERVIEW"}</span>
              <h1>Our cosmic <em>neighbourhood.</em></h1>
              <p>Explore the worlds orbiting our star.</p>
            </div>
            <div className="scene-action-group">
              <div className="view-switch" role="tablist" aria-label="Visualization view">
                <button className={viewMode === "3d" ? "active" : ""} role="tab" aria-selected={viewMode === "3d"} onClick={() => store.getState().setViewMode("3d")}>
                  <Compass size={14} /> 3D SIMULATION
                </button>
                <button className={viewMode === "map" ? "active" : ""} role="tab" aria-selected={viewMode === "map"} onClick={() => store.getState().setViewMode("map")}>
                  <Orbit size={14} /> ORBITAL MAP
                </button>
              </div>
              <div className="scale-switch">
                <span className="eyebrow">DISTANCE SCALE</span>
                <div className="scale-options" role="group" aria-label="Display scale">
                  <button className={scaleMode === "cinematic" ? "active" : ""} onClick={() => store.getState().setScaleMode("cinematic")}>CINEMATIC</button>
                  <button className={scaleMode === "distance" ? "active" : ""} onClick={() => store.getState().setScaleMode("distance")}>DISTANCE</button>
                </div>
              </div>
            </div>
          </div>

          <div className="visualization">
            {viewMode === "3d" ? (
              <Suspense fallback={<div className="scene-loading"><Orbit size={20} /><span>PREPARING 3D SCENE</span></div>}>
                <SolarSystem3D
                  scaleMode={scaleMode}
                  selectedBody={selectedBody}
                  focusedBody={focusedBody}
                  onSelect={handleSelect}
                  onFocusChange={(id) => store.getState().focusBody(id)}
                  onRequestMap={() => store.getState().setViewMode("map")}
                  controlsRef={controlsRef}
                />
              </Suspense>
            ) : (
              <OrbitMap daysSinceEpoch={days} mode={scaleMode} selectedBody={selectedBody} onSelect={handleSelect} />
            )}
            <div className="view-caption">
              <span className="caption-dot" />
              {viewMode === "3d" ? "LIVE ORBITAL SIMULATION" : "LIVE TOP-DOWN PROJECTION"}
              <span className="caption-divider" />
              {formattedDate(days)}
            </div>
            <AnimatePresence>
              {selectedBody && (
                <InfoPanel
                  key={selectedBody}
                  bodyId={selectedBody}
                  daysSinceEpoch={days}
                  onClose={() => handleSelect(null)}
                  onFocus={(id) => {
                    if (viewMode !== "3d") store.getState().setViewMode("3d");
                    store.getState().focusBody(id);
                  }}
                />
              )}
            </AnimatePresence>
            <div className="scale-notice">
              <Sparkles size={12} />
              {scaleMode === "cinematic"
                ? "ARTISTIC DISTANCE SCALE · PLANET SIZES EXAGGERATED"
                : "DISTANCES PRESERVED · PLANET SIZES ENLARGED FOR VISIBILITY"}
            </div>
            {viewMode === "3d" && (
              <div className="navigation-hint">
                <span>DRAG <i>ORBIT</i></span><b>·</b><span>SCROLL <i>ZOOM</i></span><b>·</b><span>RIGHT-DRAG <i>PAN</i></span>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="control-dock">
        <div className="dock-status">
          <span className={`play-state ${playing ? "running" : ""}`}><i /></span>
          <span>{playing ? "RUNNING" : "PAUSED"}</span>
        </div>
        <div className="transport-controls">
          <button className="transport-button play-button" aria-label={playing ? "Pause simulation" : "Play simulation"} onClick={() => store.getState().setPlaying(!playing)}>
            {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          </button>
          <button className="transport-button reset-button" aria-label="Reset simulation" title="Reset to J2000.0" onClick={handleReset}><RotateCcw size={15} /></button>
        </div>
        <div className="time-readout">
          <span className="eyebrow">SIMULATION DATE</span>
          <strong>{formattedDate(days)}</strong>
        </div>
        <div className="speed-control">
          <span className="eyebrow">TIME SPEED</span>
          <div className="speed-options" role="group" aria-label="Simulation speed">
            {SPEED_PRESETS.map((preset) => (
              <button key={preset} className={speed === preset ? "active" : ""} onClick={() => store.getState().setSpeed(preset)}>
                {preset >= 1_000 ? `${preset / 1_000}K` : preset}×
              </button>
            ))}
          </div>
        </div>
        <div className="dock-end"><span>JPL ELEMENTS · APPROXIMATE</span><span className="dock-divider" /> <span>J2000 TDB</span></div>
      </footer>
      </>
      )}
    </div>
  );
}

export default App;
