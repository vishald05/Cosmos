# COSMOS — Solar System Explorer

COSMOS is a client-side React application for exploring the eight planets with a live Three.js scene and synchronized SVG orbital map. It includes sourced physical profiles, an approximate JPL Keplerian model, time-dependent planetary rotation, and a Scale Comparison Lab.

## Run locally

```sh
npm install
npm run dev
```

Run `npm test` for the scientific-engine and ephemeris tests, and `npm run build` for a TypeScript check and production bundle.

## Structure

- `src/science/` — body profiles and sources, JPL element propagation, coordinate transforms, rotation, units, distance/light-time calculations, simulation time, and ephemeris fixtures.
- `src/state/` — Zustand UI state and the shared mutable simulation clock.
- `src/components/` — 3D scene, SVG orbital map, and sourced selected-body information panel.
- `src/features/scale-lab/` — comparison catalogue, unit conversions, proportional SVG visualization, and custom-object persistence.
- `src/features/distance-explorer/` — endpoint and intermediate-object catalogues, scientific placement and journey engines, proportional SVG views, and the Distance Explorer UI.
- `src/App.tsx` — application navigation, synchronized clock loop, and controls.

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

## Scale Comparison Lab

Open **Scale Lab** to compare up to five sourced astronomical or approximate everyday dimensions. Sun and planet diameters come directly from the existing NASA-based profiles; the Moon and selected moons and Pluto link to their NASA sources. Everyday reference dimensions are labeled as approximate. Measurements are converted to metres for calculations and only rounded for display.

The SVG uses a single shared linear scale for every selected object. Zoom changes the shared scale, not individual sizes. An object smaller than one rendered pixel is not enlarged in the main view; the lab marks it below resolution and may show it in a separately labeled magnified inset. Comparisons distinguish diameters from linear dimensions. Spherical-volume estimates are available for diameter-based objects; estimating volume from a linear dimension requires opting in to an equivalent-sphere approximation. Such estimates are not packing or real-world volume calculations.

Custom references can be created, edited, and deleted. They are stored in this browser's `localStorage` under `cosmos.scale-lab.custom-objects`; they are not synced to an account or sent to a server. Invalid stored entries are skipped and storage failures are reported in the interface.

## Distance Explorer

The Distance Explorer reuses the Sun and planet profiles, the Phase 3 dimension catalogue, and existing custom-object persistence. Sun and planets use their heliocentric/JPL position sources. The Moon remains selectable, but is explicitly unavailable because no lunar position model is supplied. Custom objects remain dimension-only intermediate-object choices and are never used as distance endpoints.

## Distance calculation engine

The independent `src/science/distance.ts` module obtains planetary vectors from the existing JPL secular-element engine at the requested simulation time. Vectors are heliocentric, mean ecliptic/equinox J2000 coordinates in AU; the Sun is the origin. Simulation time is days from J2000 TDB, and results retain that authoritative value alongside the existing COSMOS epoch-to-date display conversion. The source orbit fit is an approximation intended for 1800–2050, so calculations outside that date range are unavailable. Numerical precision does not make the underlying ephemeris exact.

For coordinates `A` and `B`, center distance is `sqrt((xB-xA)^2 + (yB-yA)^2 + (zB-zA)^2)`, with each AU difference converted to metres before the Euclidean norm. AU uses the existing `AU_IN_KM` constant (149,597,870.7 km/AU). Distances are stored in metres without display rounding. The supported display conversions use 1 km = 1,000 m, 1 mi = 1,609.344 m, and the same AU constant. Surface separation is `center distance - radius A - radius B`; radii are sourced mean physical radii converted from kilometres to metres, and the calculation assumes spherical bodies. Overlap is reported separately; the non-negative available surface gap is clamped to zero.

Vacuum light time is distance divided by 299,792,458 m/s. Results include seconds, minutes, hours, days, and Julian years (365.25 days); they do not model relativistic effects or propagation through a medium. Orbital-average separation is explicitly unavailable rather than approximated from semi-major axes. The Moon remains unavailable because there is no lunar position model, and custom objects supply dimensions only—not celestial coordinates.

## Interactive Distance Ruler

The ruler is an SVG view driven by the Phase 4.2 `calculateInstantaneousDistance` result. It uses the engine's J2000.0 distance in metres directly; zoom, pan, fit, unit selection, and ticks only affect presentation. The default epoch is fixed at J2000.0 and is intentionally not connected to the live simulation clock. The SVG lays the endpoints on a horizontal axis to communicate their scalar center-to-center separation; it does not represent the 3D direction between the bodies or an orbital path.

The layout helper chooses one fit scale in pixels per metre from the center distance plus half of each endpoint's actual catalogue diameter. Both centers, physical diameters, and ruler ticks map through that same scale. Zoom multiplies the shared scale within fixed limits, and pan is clamped so the ruler extent cannot be moved completely beyond the viewport. Fit and reset return to the initial fitted view. A `ResizeObserver` keeps the SVG viewBox matched to its responsive container.

Endpoint circles use actual mean diameters. If a body's diameter would render smaller than one pixel, the physical circle is omitted and a cross locator is shown with an explicit “LOCATOR · NOT TO SCALE” label; the physical diameter is still stated separately. No planet is enlarged, and no magnified inset is used. Tick intervals are selected from a 1/2/5 × power-of-ten sequence over the visible distance range, converted to the selected display unit, and bounded away from endpoint labels.

Distance display units are metres, kilometres, miles, astronomical units, light-seconds, light-minutes, light-hours, light-days, and light-years. Physical units use the Phase 4.2 distance conversion functions; light-based distance units use that engine's vacuum light-travel result. A separate vacuum light-travel-time annotation is always displayed as time, not distance. Center-to-center distance and mean-radius surface gap/overlap are both reported where available.

The scalar ruler cannot show orientation, orbital motion, or time-varying distances. Its positions inherit the approximate JPL secular-element model's 1800–2050 validity range. The Moon has no supported position and therefore produces an explanation rather than a ruler. The object-placement simulator and fixed-epoch multi-stop journey are separate views documented below; live simulation-clock synchronization is not part of these milestones.

## Object Placement Simulator

The placement panel reuses the same Phase 4.2 surface-to-surface result as the ruler and never derives a second endpoint distance. For separated or touching endpoints, the available gap is `G = max(0, centerDistance - radiusA - radiusB)`. For a supported intermediate dimension `D`, the exact count is `N = floor(G / D)` and the unused remainder is `R = G - (N × D)`. Dimensions and gaps are normalized to metres, with no display rounding before counting; the engine retains exact integer counts as `bigint`. Overlapping endpoints are reported separately with zero available gap and zero placements. An unavailable position or invalid/unsupported measurement returns an explicit unavailable result rather than a fabricated count.

Spherical objects with a measured diameter use identical touching spherical copies. Objects explicitly designated as linear use a separately labeled one-dimensional estimate, aligning the measured length end-to-end; this does not treat them as spheres. Catalogue choices use the existing Phase 3 catalogue. Valid custom objects reuse the Scale Lab's `localStorage` persistence and retain their spherical-versus-linear measurement type; dimension-only custom objects cannot be endpoints. The selector excludes unsupported or invalid measurements and identifies custom entries.

The SVG uses the ruler's shared pixels-per-metre scale for endpoint centers, endpoint physical diameters, and intermediate physical dimensions. Dimensions below the rendering threshold use locator crosses, not enlarged objects; the intermediate-object locator lane is visually offset for readability and does not change the measured gap. For counts above 24, or multiple sub-pixel copies, the view switches to a grouped span with at most 12 representative marks (one locator for sub-pixel copies) and an explicit exact total. The grouped span represents the occupied distance; the marks are not the complete set of objects. Small counts show individual copies.

This is a straight-line geometric placement estimate for identical copies with no gaps. It does not model orbital dynamics, gravitational interaction, collisions, object orientation, physical stability, or whether the arrangement could occur naturally. Linear estimates also omit thickness and orientation. Zoom, pan, units, and grouped rendering affect only the visualization or display; none alters the Phase 4.2 distance or placement calculation.

## Multi-Stop Distance Journey

The journey builder uses the existing celestial endpoint catalogue and starts with Earth → Mars. Stops are unique and can be added, removed, replaced, and reordered with keyboard-accessible controls; journeys contain at least two and at most the catalogue's 10 celestial endpoints. Custom dimension-only references are excluded because they have no positions. The Moon remains selectable to make unavailable segments explicit. Journey state is local to the Distance Explorer and is not persisted.

For each consecutive pair, the independent `journey.ts` module uses the Phase 4.2 instantaneous center-to-center engine at the same fixed J2000.0 epoch. The batched engine evaluates planetary positions once per journey and reuses each stop's position across its adjacent segments and direct displacement. Optional surface-gap metadata is derived from each exact distance result and the existing physical-radius profiles, avoiding a second orbital-position calculation. Vacuum light-travel time is calculated for each available segment using the existing Phase 4.2 function. Segment calculations retain metres and seconds internally; changing the shared display unit only changes formatting.

The journey distance is the unrounded sum of all consecutive segment distances, and cumulative light-travel time is the sum of those segments' vacuum durations. If any segment is unavailable, the journey is marked incomplete: its complete total is withheld, and any available-segment subtotal is explicitly labeled partial. The first-to-last direct displacement is calculated separately with the same science engine and is never substituted for the segment sum. Each segment reports its date, distance status, surface separation where available, and light-travel duration where available.

The visualization is an ordered vertical route of straight-line segments, not an orbit or spacecraft path. It does not simulate navigation, intermediate spacecraft positions, orbital motion, or time-varying distances. The fixed epoch and existing JPL element model inherit the documented 1800–2050 validity range. Moon-adjacent segments remain unavailable; custom objects cannot participate until they have a genuine position model.

## Limitations

Planetary materials are stylized procedural approximations rather than photographic surface maps. Scale Lab everyday references are representative estimates, and equal-dimension comparisons do not imply equal mass, shape, or composition. The 2D map does not show orbital inclination as a vertical dimension. The 3D rotation meridian is a visual indicator, not a surface feature map.
