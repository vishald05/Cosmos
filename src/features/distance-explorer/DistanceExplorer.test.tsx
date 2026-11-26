/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCustomObject, saveCustomObjects } from "../scale-lab/custom-objects";
import { DistanceExplorer } from "./DistanceExplorer";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Distance Explorer integration", () => {
  it("explains unavailable Moon positions and does not render a ruler", () => {
    const { container } = render(<DistanceExplorer />);
    fireEvent.change(screen.getByLabelText(/^DESTINATION OBJECT/), { target: { value: "moon" } });

    expect(container.querySelector(".placement-unavailable")?.textContent).toContain("The Moon has no supported lunar position model");
    expect(screen.getByText("Distance ruler unavailable")).toBeTruthy();
    expect(screen.queryByRole("img", { name: /Straight-line distance ruler/ })).toBeNull();
  });

  it("adds, reorders, removes, and resets independent journey stops", () => {
    const { container } = render(<DistanceExplorer />);
    const journeyTotal = container.querySelector(".journey-summary-grid")?.getAttribute("data-total-distance-metres");

    fireEvent.change(screen.getByLabelText("ADD A CELESTIAL STOP"), { target: { value: "jupiter" } });
    fireEvent.click(screen.getByRole("button", { name: "ADD STOP" }));
    expect(container.querySelectorAll(".journey-segment")).toHaveLength(2);
    expect(container.querySelector(".journey-summary-grid")?.getAttribute("data-total-distance-metres")).not.toBe(journeyTotal);

    fireEvent.click(screen.getByRole("button", { name: "Move Jupiter up" }));
    expect((screen.getByLabelText("JOURNEY INTERMEDIATE STOP 1") as HTMLSelectElement).value).toBe("jupiter");
    const reorderedTotal = container.querySelector(".journey-summary-grid")?.getAttribute("data-total-distance-metres");
    expect(reorderedTotal).not.toBe(journeyTotal);

    fireEvent.click(screen.getByRole("button", { name: "Remove Jupiter from journey" }));
    expect(container.querySelectorAll(".journey-segment")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "RESET JOURNEY" }));
    expect((screen.getByLabelText("JOURNEY STARTING OBJECT") as HTMLSelectElement).value).toBe("earth");
    expect((screen.getByLabelText("JOURNEY DESTINATION OBJECT") as HTMLSelectElement).value).toBe("mars");
  });

  it("marks Moon-adjacent journey segments unavailable without calling the direct displacement a journey total", () => {
    const { container } = render(<DistanceExplorer />);
    fireEvent.change(screen.getByLabelText("ADD A CELESTIAL STOP"), { target: { value: "jupiter" } });
    fireEvent.click(screen.getByRole("button", { name: "ADD STOP" }));
    fireEvent.change(screen.getByLabelText("JOURNEY INTERMEDIATE STOP 1"), { target: { value: "moon" } });

    expect(container.querySelectorAll(".journey-segment-unavailable")).toHaveLength(2);
    expect(container.querySelectorAll(".journey-segment-unavailable .journey-segment-measurements")).toHaveLength(2);
    expect(container.querySelector(".journey-segment-unavailable .journey-segment-measurements")?.textContent)
      .toContain("segment distance unavailable");
    expect(container.querySelector(".journey-summary-grid")?.getAttribute("data-total-distance-metres")).toBeNull();
    expect(screen.getByText(/This is not a complete journey total/)).toBeTruthy();
    expect(screen.getByText("DIRECT FIRST-TO-LAST DISPLACEMENT")).toBeTruthy();
    expect(container.querySelector(".journey-displacement-card strong")?.textContent).toContain("AU");
    expect(screen.getByRole("img", { name: /Straight-line distance ruler from Earth to Mars/ })).toBeTruthy();
    expect(container.querySelector(".placement-visualization-svg")).toBeTruthy();
  });

  it("updates every journey display unit without changing the underlying segment or aggregate values", () => {
    const { container } = render(<DistanceExplorer />);
    const journeySummary = container.querySelector(".journey-summary-grid");
    const total = journeySummary?.getAttribute("data-total-distance-metres");
    const segmentDistance = container.querySelector(".journey-segment")?.getAttribute("data-distance-metres");

    fireEvent.change(screen.getByLabelText("DISTANCE DISPLAY UNIT"), { target: { value: "km" } });

    expect(journeySummary?.getAttribute("data-total-distance-metres")).toBe(total);
    expect(container.querySelector(".journey-segment")?.getAttribute("data-distance-metres")).toBe(segmentDistance);
    expect(container.querySelector(".journey-segment-measurements strong")?.textContent).toContain("km");
  });

  it("renders the Earth–Mars ruler and updates the result when an endpoint changes", () => {
    const { container } = render(<DistanceExplorer />);
    const ruler = screen.getByRole("img", { name: "Straight-line distance ruler from Earth to Mars" });
    const initialDistance = ruler.getAttribute("data-distance-metres");

    expect(initialDistance).toBeTruthy();
    expect(screen.getByText("INSTANTANEOUS CENTER-TO-CENTER")).toBeTruthy();
    const measurementValues = [...container.querySelectorAll(".distance-measurement-card strong")].map((node) => node.textContent);
    expect(measurementValues[0]).not.toBe(measurementValues[1]);
    const initialPlacementCount = container.querySelector(".placement-visualization-svg")?.getAttribute("data-total-count");

    fireEvent.change(screen.getByLabelText(/^DESTINATION OBJECT/), { target: { value: "jupiter" } });
    const updatedRuler = screen.getByRole("img", { name: "Straight-line distance ruler from Earth to Jupiter" });
    expect(updatedRuler.getAttribute("data-distance-metres")).not.toBe(initialDistance);
    expect(container.querySelector(".placement-visualization-svg")?.getAttribute("data-total-count")).not.toBe(initialPlacementCount);
  });

  it("switches all ruler distance units without changing the engine distance", () => {
    const { container } = render(<DistanceExplorer />);
    const ruler = screen.getByRole("img", { name: "Straight-line distance ruler from Earth to Mars" });
    const distance = ruler.getAttribute("data-distance-metres");
    const initialScale = ruler.getAttribute("data-scale-px-per-metre");

    fireEvent.change(screen.getByLabelText("DISTANCE DISPLAY UNIT"), { target: { value: "light-hours" } });

    const updatedRuler = screen.getByRole("img", { name: "Straight-line distance ruler from Earth to Mars" });
    expect(updatedRuler.getAttribute("data-distance-metres")).toBe(distance);
    expect(updatedRuler.getAttribute("data-scale-px-per-metre")).toBe(initialScale);
    expect(container.querySelector(".distance-ruler-measurement")?.textContent).toContain("light-hours");
    expect(screen.getByText(/Light-based distance units express the distance/)).toBeTruthy();
  });

  it("renders a truthful zero-distance ruler when both endpoints are the same object", () => {
    render(<DistanceExplorer />);
    fireEvent.change(screen.getByLabelText(/^DESTINATION OBJECT/), { target: { value: "earth" } });

    const ruler = screen.getByRole("img", { name: "Straight-line distance ruler from Earth to Earth" });
    expect(ruler.getAttribute("data-distance-metres")).toBe("0");
    expect(ruler.querySelector(".distance-ruler-measurement")?.textContent).toBe("0 AU");
    expect(screen.getByText(/Overlapping by/)).toBeTruthy();
  });

  it("zooms the view while preserving the scientific result, and resets the view", () => {
    render(<DistanceExplorer />);
    const ruler = screen.getByRole("img", { name: "Straight-line distance ruler from Earth to Mars" });
    const distance = ruler.getAttribute("data-distance-metres");
    const initialScale = ruler.getAttribute("data-scale-px-per-metre");

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(ruler.getAttribute("data-distance-metres")).toBe(distance);
    expect(ruler.getAttribute("data-scale-px-per-metre")).not.toBe(initialScale);

    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(ruler.getAttribute("data-distance-metres")).toBe(distance);
    expect(ruler.getAttribute("data-scale-px-per-metre")).toBe(initialScale);
    fireEvent.click(screen.getByRole("button", { name: "Fit to view" }));
    expect(ruler.getAttribute("data-distance-metres")).toBe(distance);
  });

  it("updates placement when only the intermediate object or display unit changes", () => {
    const { container } = render(<DistanceExplorer />);
    const ruler = screen.getByRole("img", { name: "Straight-line distance ruler from Earth to Mars" });
    const distance = ruler.getAttribute("data-distance-metres");
    const placementSvg = container.querySelector(".placement-visualization-svg");
    const initialCount = placementSvg?.getAttribute("data-total-count");

    fireEvent.change(screen.getByLabelText(/INTERMEDIATE OBJECT/), { target: { value: "earth" } });
    const earthCount = container.querySelector(".placement-visualization-svg")?.getAttribute("data-total-count");
    expect(earthCount).not.toBe(initialCount);
    expect(ruler.getAttribute("data-distance-metres")).toBe(distance);

    fireEvent.change(screen.getByLabelText("DISTANCE DISPLAY UNIT"), { target: { value: "km" } });
    expect(container.querySelector(".placement-visualization-svg")?.getAttribute("data-total-count")).toBe(earthCount);
    expect(ruler.getAttribute("data-distance-metres")).toBe(distance);
  });

  it("loads persisted custom linear objects into placement and retains them after remount", () => {
    const custom = createCustomObject({
      name: "Saved custom length",
      description: "",
      dimension: 2,
      unit: "m",
      dimensionType: "length",
      shape: "linear",
      color: "#cc9966",
    });
    saveCustomObjects(window.localStorage, [custom]);

    const firstRender = render(<DistanceExplorer />);
    const selector = screen.getByLabelText(/INTERMEDIATE OBJECT/);
    expect(selector.querySelector(`option[value="${custom.id}"]`)?.textContent).toContain("custom · one-dimensional");
    fireEvent.change(selector, { target: { value: custom.id } });
    expect(screen.getByText("ONE-DIMENSIONAL PLACEMENT ESTIMATE")).toBeTruthy();
    expect(containerText(firstRender.container, ".placement-heading")).toContain("CUSTOM OBJECT");

    firstRender.unmount();
    render(<DistanceExplorer />);
    expect(screen.getByLabelText(/INTERMEDIATE OBJECT/).querySelector(`option[value="${custom.id}"]`)).toBeTruthy();
  });
});

function containerText(container: HTMLElement, selector: string): string {
  return container.querySelector(selector)?.textContent ?? "";
}
