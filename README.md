# COSMOS — Solar System Explorer

Phase 1 is a client-side React application for exploring the eight planets with a live Three.js scene and synchronized SVG orbital map.

## Run locally

```sh
npm install
npm run dev
```

Use `npm test` for the scientific-engine unit tests and `npm run build` for a TypeScript check and production bundle.

## Structure

- `src/science/` — framework-independent body data, unit conversions, Kepler solver, orbit positions, time progression, and render-scale transforms.
- `src/state/` — lightweight Zustand UI state and a shared mutable simulation clock.
- `src/components/` — reusable 3D scene, SVG map, and selected-body information panel.
- `src/App.tsx` — application layout, synchronized clock loop, and controls.

The renderer and the map both obtain live positions from `orbitalPosition` in the scientific engine. The animation clock advances using elapsed wall time and clamps a long frame delta to 0.1 seconds after a suspended tab.

## Scientific model

Planetary semi-major axes, eccentricities, inclinations, mean longitudes, longitudes of perihelion, and ascending nodes are based on JPL Solar System Dynamics' [Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html), with the J2000.0 epoch (2000-01-01 12:00 UTC). Approximate sidereal periods and mean diameters are taken from NASA's [Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/). Rotation periods are approximate mean values; the negative Venus and Uranus values denote retrograde rotation.

Mean anomaly at the epoch is calculated as mean longitude minus longitude of perihelion; argument of perihelion is longitude of perihelion minus ascending node. Mean motion is calculated from the listed sidereal orbital period. The engine solves Kepler's equation using Newton iteration and rotates the resulting ellipse by the orbital elements.

This is a Phase 1 two-body Keplerian approximation, not an ephemeris. It neglects mutual planetary perturbations and other small effects, and should not be used for precise navigation or long-term ephemeris work. JPL's cited element set is intended for approximate planetary positions over 1800–2050; the additional period-derived mean motion is a simplified propagation model.

## Display scale

- **Cinematic:** applies the same monotonic logarithmic radial transform to all distances. Planet order and orbital shape are maintained, but distances are artistically compressed.
- **Distance:** linearly scales orbital coordinates from AU with one constant factor. The displayed planetary bodies are enlarged independently in either mode.

Physical diameters and orbital distances are kept in source data and are used in information panels without modification by display scaling.

## Controls

Drag to orbit, scroll to zoom, and right-drag to pan in 3D. Select a body from the scene or body list for its measurements; use **Focus camera** to transition the camera target. The map uses the same orbital calculation and simulation clock. Speed presets denote simulated seconds per real second; pause and reset are available in the bottom control dock. Reset returns to J2000.0 and pauses playback.

## Phase 1 limitations

Planetary materials are procedural, stylized approximations rather than photographic surface maps. Moon systems, dwarf planets, and future Scale Explorer comparisons are intentionally out of scope. The 2D map is a top-down projection and does not display orbital inclination as a vertical dimension.
