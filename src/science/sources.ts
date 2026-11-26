import type { SourceId } from "./types";

export const DATA_SOURCES: Record<SourceId, { label: string; url: string; description: string }> = {
  "nasa-factsheet": {
    label: "NASA Planetary Fact Sheet",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
    description: "Rounded planetary physical properties, periods, temperature, tilt, and atmospheric pressure.",
  },
  "nasa-compare": {
    label: "NASA Planet Compare",
    url: "https://solarsystem.nasa.gov/planet-compare/",
    description: "Planetary radii and atmospheric constituent summaries.",
  },
  "nasa-sun": {
    label: "NASA Sun Fact Sheet",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html",
    description: "Solar bulk properties, rotation, pole, luminosity, and photosphere temperature.",
  },
  "jpl-elements": {
    label: "JPL Approximate Planet Positions",
    url: "https://ssd.jpl.nasa.gov/planets/approx_pos.html",
    description: "J2000 ecliptic Keplerian elements and secular rates, fitted for 1800–2050.",
  },
  "naif-pck": {
    label: "JPL NAIF PCK 00011",
    url: "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc",
    description: "IAU pole right ascension, declination, and prime meridian rotation models.",
  },
  "jpl-horizons": {
    label: "JPL Horizons",
    url: "https://ssd.jpl.nasa.gov/horizons/",
    description: "Independent heliocentric vector reference positions used by the validation fixtures.",
  },
};
