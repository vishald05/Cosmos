# COSMOS — Solar System Explorer

COSMOS is a client-side React application for exploring the eight planets with a live Three.js scene and synchronized SVG orbital map. It includes sourced physical profiles, an approximate JPL Keplerian model, and time-dependent planetary rotation.

## Run locally

```sh
npm install
npm run dev
```

Run `npm test` for the scientific-engine and ephemeris tests, and `npm run build` for a TypeScript check and production bundle.

## Structure

- `src/science/` — body profiles and sources, JPL element propagation, coordinate transforms, rotation, units, simulation time, and ephemeris fixtures.
- `src/state/` — Zustand UI state and the shared mutable simulation clock.
- `src/components/` — 3D scene, SVG orbital map, and sourced selected-body information panel.
- `src/App.tsx` — application layout, synchronized clock loop, and controls.

The map and 3D renderer use the same scientific orbital positions. The animation clock advances using elapsed wall time and clamps a long frame delta to 0.1 seconds after a suspended tab.

## Scientific model

Planetary elements and secular rates are from JPL Solar System Dynamics' [Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html), Table 1, referenced to the mean ecliptic and equinox of J2000.0 (JD 2451545.0 TDB). The model propagates semi-major axis, eccentricity, inclination, node, perihelion, and mean anomaly; mean motion comes from the tabulated mean-longitude and perihelion rates. It solves Kepler's equation and returns heliocentric ecliptic J2000 AU coordinates.

The JPL secular element fit is intended for 1800–2050. It is an approximation, not an integrated ephemeris: mutual perturbations and short-period terms are omitted. `npm test` compares J2000.0 and 2025 Horizons vectors for all eight planets against per-planet error budgets reflecting the published fit accuracy; Earth uses the Earth/Moon-barycenter element set while the Horizons fixture targets Earth's centre. These tolerances are validation bounds, not claims of navigation-grade accuracy.

Planetary and solar physical profiles use rounded values from NASA's [Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) and [Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html). Rotation poles and prime-meridian rates use the simplified IAU model in [NAIF PCK 00011](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc). Orientation is propagated from the J2000 TDB epoch; periodic nutation and other short-period terms are not modeled. The Sun's adopted rotation period applies at 16° latitude because solar rotation is differential.

## Display and controls

- **Cinematic:** applies the same monotonic logarithmic radial transform to all distances. Planet order and orbital shape are maintained, but distances are artistically compressed.
- **Distance:** linearly scales orbital coordinates from AU with one constant factor. The displayed planetary bodies are enlarged independently in either mode.
- Drag to orbit, scroll to zoom, and right-drag to pan in 3D. Select a body for its physical, orbital, rotation, and source details; use **Focus camera** to transition the camera target.
- The orbital map is a top-down ecliptic projection. It uses the same simulation clock and displays the same live heliocentric positions as the 3D scene.
- Speed presets denote simulated seconds per real second. Pause and reset are available in the bottom control dock; reset returns to J2000.0 and pauses playback.

Physical values and orbital distances remain in their scientific units and are not changed by display scaling.

## Limitations

Planetary materials are stylized procedural approximations rather than photographic surface maps. Moon systems, dwarf planets, and future Scale Explorer comparisons are out of scope. The 2D map does not show orbital inclination as a vertical dimension. The 3D rotation meridian is a visual indicator, not a surface feature map.
