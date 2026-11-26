import { DATA_SOURCES } from "../../science/sources";
import { PLANETS, SUN } from "../../science/planets";
import type { ScaleObject } from "./types";

const meanDiameterNote = "Modeled as a sphere using the sourced mean diameter.";

const planetsAndSun: ScaleObject[] = [SUN, ...PLANETS].map((body) => {
  const isSun = body.id === "sun";
  const source = DATA_SOURCES[isSun ? "nasa-sun" : "nasa-factsheet"];
  return {
    id: body.id,
    name: body.name,
    category: isSun ? "star" : "planet",
    description: body.description,
    dimension: body.physical.meanDiameterKm,
    unit: "km",
    dimensionType: "diameter",
    source: { label: source.label, url: source.url },
    builtIn: true,
    shape: "sphere",
    color: body.color,
    approximationNote: meanDiameterNote,
  };
});

const additionalAstronomy: ScaleObject[] = [
  {
    id: "moon", name: "Moon", category: "moon",
    description: "Earth's natural satellite.",
    dimension: 3_474.8, unit: "km", dimensionType: "diameter",
    source: { label: "NASA Moon facts", url: "https://science.nasa.gov/moon/facts/" },
    builtIn: true, shape: "sphere", color: "#b9c3cf",
    approximationNote: meanDiameterNote,
  },
  {
    id: "pluto", name: "Pluto", category: "dwarf planet",
    description: "An icy dwarf planet in the Kuiper Belt.",
    dimension: 2_376.6, unit: "km", dimensionType: "diameter",
    source: { label: "NASA Pluto facts", url: "https://science.nasa.gov/dwarf-planets/pluto/facts/" },
    builtIn: true, shape: "sphere", color: "#c89d82",
    approximationNote: "Rounded mean diameter; modeled as a sphere.",
  },
  {
    id: "ganymede", name: "Ganymede", category: "moon",
    description: "Jupiter's largest moon and the largest moon in the Solar System.",
    dimension: 5_268.2, unit: "km", dimensionType: "diameter",
    source: { label: "NASA Ganymede facts", url: "https://science.nasa.gov/jupiter/moons/ganymede/facts/" },
    builtIn: true, shape: "sphere", color: "#b9a58f",
    approximationNote: "Rounded mean diameter; modeled as a sphere.",
  },
  {
    id: "titan", name: "Titan", category: "moon",
    description: "Saturn's largest moon, with a dense atmosphere.",
    dimension: 5_149.5, unit: "km", dimensionType: "diameter",
    source: { label: "NASA Titan facts", url: "https://science.nasa.gov/saturn/moons/titan/facts/" },
    builtIn: true, shape: "sphere", color: "#d69c63",
    approximationNote: "Rounded mean diameter; modeled as a sphere.",
  },
  {
    id: "europa", name: "Europa", category: "moon",
    description: "An icy moon of Jupiter with a likely subsurface ocean.",
    dimension: 3_121.6, unit: "km", dimensionType: "diameter",
    source: { label: "NASA Europa facts", url: "https://science.nasa.gov/jupiter/moons/europa/facts/" },
    builtIn: true, shape: "sphere", color: "#d4c6a9",
    approximationNote: "Rounded mean diameter; modeled as a sphere.",
  },
];

const everydayObjects: ScaleObject[] = [
  {
    id: "human-height", name: "Human height reference", category: "everyday",
    description: "A rounded 1.70 m comparison reference, not a population average.",
    dimension: 1.7, unit: "m", dimensionType: "height",
    source: { label: "Illustrative reference value" },
    builtIn: true, shape: "linear", color: "#91b8bd",
  },
  {
    id: "football", name: "Association football", category: "everyday",
    description: "Representative size-5 ball; diameter is estimated from its regulated circumference.",
    dimension: 0.22, unit: "m", dimensionType: "diameter",
    source: { label: "IFAB Laws of the Game — The Ball", url: "https://www.theifab.com/laws/latest/the-ball/" },
    builtIn: true, shape: "sphere", color: "#e5e8e9",
    approximationNote: "Approximate sphere: diameter is derived from the allowed circumference range.",
  },
  {
    id: "basketball", name: "Basketball", category: "everyday",
    description: "Representative size-7 ball; diameter is estimated from its nominal circumference.",
    dimension: 0.24, unit: "m", dimensionType: "diameter",
    source: { label: "NBA equipment rules", url: "https://official.nba.com/rule-no-1-court-dimensions-equipment/" },
    builtIn: true, shape: "sphere", color: "#d98948",
    approximationNote: "Approximate sphere: diameter is derived from the nominal circumference.",
  },
  {
    id: "car", name: "Passenger car reference", category: "everyday",
    description: "A rounded representative length; actual vehicles vary substantially.",
    dimension: 4.5, unit: "m", dimensionType: "length",
    source: { label: "Illustrative reference value" },
    builtIn: true, shape: "linear", color: "#7697b7",
  },
  {
    id: "building", name: "Ten-storey building", category: "everyday",
    description: "An illustrative height reference; floor heights and buildings vary.",
    dimension: 30, unit: "m", dimensionType: "height",
    source: { label: "Illustrative reference value" },
    builtIn: true, shape: "linear", color: "#9b8cb8",
  },
  {
    id: "mount-everest", name: "Mount Everest", category: "everyday",
    description: "Officially reported height above sea level.",
    dimension: 8_848.86, unit: "m", dimensionType: "height",
    source: { label: "Survey Department of Nepal", url: "https://dos.gov.np/" },
    builtIn: true, shape: "linear", color: "#c6d0d5",
  },
];

export const BUILT_IN_OBJECTS: readonly ScaleObject[] = [
  ...planetsAndSun,
  ...additionalAstronomy,
  ...everydayObjects,
];

export const BUILT_IN_OBJECT_IDS = new Set(BUILT_IN_OBJECTS.map(({ id }) => id));
